import express from "express";
import https from "https";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fs from "fs";
import classifyQueryBatch from "./utils/query-classifier.js";
import { getPartOfDay, getSeason } from "./utils/datacenter-details.js";
import { GoogleAuth } from "google-auth-library";
import predictSustainabilityMetrics from "./utils/predictor.js";
import { getGeoLocation } from "./utils/ip-to-geo.js";
import { getTimeData } from "./geo-to-time.js";
dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());

const options = {
  key: fs.readFileSync("certificate/server.key"), // Use your key file
  cert: fs.readFileSync("certificate/server.cert"), // Use your cert file
};

async function getAccessToken() {
  let accessToken;
  try {
    const auth = new GoogleAuth({
      keyFilename: "./certificate/GCP_Key.json",
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    accessToken = await client.getAccessToken();
  } catch (err) {
    console.log("Error fetching GCP key: ", err);
  }
  const envFile = ".env";
  const keyValue = `GCP_ACCESS_TOKEN=${accessToken.token}\n`;

  let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
  
  if (envContent.includes("GCP_ACCESS_TOKEN=")) {
    envContent = envContent.replace(/GCP_ACCESS_TOKEN=.*/g, keyValue.trim());
    fs.writeFileSync(envFile, envContent);
  } else {
    fs.appendFileSync(envFile, keyValue);
  }

  console.log("Token saved to .env");
  dotenv.config();
}

// storing the gcp access token to .env file
getAccessToken();

app.get("/test", (req, res) => {
  res.status(200).json({ MSG: "Server is runnning :)" });
});

/*
  Conversation data structure in storageAPI.
  {
    "conv123": {
      "server_ip": "192.168.1.10",
      "queries": [
        { "query": "Hello, how are you?", "model": "GPT-4" },
        { "query": "What's the weather today?", "model": "GPT-4" }
      ]
    }
  }
  */
app.post("/calculate_metrics", async (req, res) => {
  const conversationData = req.body;
  if (
    conversationData == "" ||
    conversationData == null ||
    conversationData == {}
  ) {
    res.status(400).json("No data was sent");
  }
  console.log("CONV", conversationData)
  const processedData = {};
  var EnergyConsumption, WaterConsumption, CarbonEmission;

  for (const conversationId in conversationData) {
    const conv = conversationData[conversationId];
    const metrics = {
      query_types: {
        "text classification": 0,
        "text generation": 0,
        "code generation": 0,
        summarization: 0,
        "question answering": 0,
        "image generation": 0,
        "image classification": 0,
      },
    };
    try {
      const modelName =
        conv.queries.length > 0 ? conv.queries[0].model : "Unknown";

      const queries = conv.queries.map(({ query }) => query).filter(Boolean);

      // Run classifyQueryBatch and getGeoLocation in parallel
      const [categories, geoResponse] = await Promise.all([
        classifyQueryBatch(queries),
        getGeoLocation(conv.server_ip),
      ]);

      // Extract latitude, longitude, and region
      const { lat, lon, timezone, country, city } = geoResponse;
      const region = `${country} - ${city}`;

      // Now fetch time data (dependent on geoResponse)
      const timeData = await getTimeData(timezone);
      const { month, day, hour } = timeData;

      // Process query categories
      queries.forEach((query, index) => {
        const category = categories[index] || "unknown";
        metrics.query_types[category] =
          (metrics.query_types[category] || 0) + 1;
      });

      processedData[conversationId] = {
        ...metrics,
        server_ip: conv.server_ip,
        region,
        datacenter_season: getSeason(month, day, geoResponse.timezone),
        datacenter_partOfDay: getPartOfDay(hour),
        lat: lat,
        lon: lon,
        model:
          modelName == "auto"
            ? "GPT-4"
            : modelName.startsWith("Gemini")
            ? "Gemini"
            : modelName,
      };

      console.log("Processed Query: ", processedData);

      // Predicting the energy, carbon and water usage
      for (const conversationId in processedData) {
        ({ EnergyConsumption, WaterConsumption, CarbonEmission } =
          await predictSustainabilityMetrics(processedData[conversationId]));
      }
    } catch (error) {
      console.error(`Error Occured!\n`, error);
      processedData[conversationId] = {
        ...metrics,
        server_ip: conv.server_ip,
        region: "Unknown",
        datacenter_season: "Unknown",
        datacenter_partOfDay: "Unknown",
        lat: "Unknown",
        lon: "Unknown",
        model: modelName,
      };
    }
  }
  res.status(200).json({
    EnergyConsumption,
    WaterConsumption,
    CarbonEmission,
  });
});

// https.createServer(options, app).listen(443, () => {
//   console.log("HTTPS Server running on https://localhost:443");
// });

// http
//   .createServer((req, res) => {
//     res.writeHead(301, { Location: "https://" + req.headers.host + req.url });
//     res.end();
//   })
//   .listen(80, () => {
//     console.log(
//       "HTTP Server running on http://localhost:80 (Redirects to HTTPS)"
//     );
//   });

app.listen(8080, () => {
  console.log("server is running on port 8080!");
});
