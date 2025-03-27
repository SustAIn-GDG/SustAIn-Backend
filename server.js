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
import { getTimeData } from "./utils/geo-to-time.js";
dotenv.config();

const app = express();

app.use(bodyParser.json());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin.startsWith("chrome-extension://")) {
      callback(null, origin);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// const options = {
//   key: fs.readFileSync("certificate/server.key"), // Use your key file
//   cert: fs.readFileSync("certificate/server.cert"), // Use your cert file
// };

const auth = new GoogleAuth({
  keyFilename: "/etc/secrets/GCP_Key.json",
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

let cachedToken = null;
let tokenExpiry = 0;

export async function getValidAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) {
    // Refresh 1 min early
    return cachedToken;
  }

  const client = await auth.getClient();
  const { token, res } = await client.getAccessToken();

  cachedToken = token;
  tokenExpiry = now + 1800 * 1000; // Tokens usually valid for 1 hour (But keeping it 30mins)
  return cachedToken;
}

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
    console.error("Request has no conversation body");
    res.status(400).json("No data was sent");
  }
  const processedData = {};
  var EnergyConsumption, WaterConsumption, CarbonEmission;

  for (const conversationId in conversationData) {
    const conv = conversationData[conversationId];
    if (
      conv.server_ip == null ||
      conv.server_ip == "" ||
      conv.server_ip == undefined
    ) {
      console.error("Request body has no ip address");
      return res
        .status(400)
        .json("IP address of datacenter not found..Retry again.");
    }
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
      const modelName = conv.queries.length > 0 ? conv.queries[0].model : "GPT";

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
        const category = categories[index] || "text generation";
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

      if (err.message.includes("Bad Request to Vertex AI")) {
        return res.status(400).json({ error: err.message });
      }
      
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
