import express from "express";
import https from "https";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fs from "fs";
import axios from "axios";
import { encoding_for_model } from "tiktoken";
import classifyQuery from "./utils/query-classifier.js";
import { getPartOfDay, getSeason } from "./utils/datacenter-details.js";
dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());

import initializeDatabase from "./database/initDB.js";
import simModel from "./utils/model-sim.js";
import pool from "./database/db.js";
import { predictCarbon } from "./utils/carbonPredictor.js";
import predictSustainabilityMetrics from "./utils/predictor.js";

// initialising data base
initializeDatabase();

const options = {
  key: fs.readFileSync("certificate/server.key"), // Use your key file
  cert: fs.readFileSync("certificate/server.cert"), // Use your cert file
};

app.get("/test", (req, res) => {
  res.status(200).json({ MSG: "Server is runnning :)" });
});

app.get("/carbon", async (req, res) => {
  const { lon, lat } = req.query;
  const result = await predictCarbon(4, lon, lat);
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
  const processedData = {};

  for (const conversationId in conversationData) {
    const conv = conversationData[conversationId];
    const metrics = {
      total_tokens: 0,
      total_words: 0,
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

    const modelName =
      conv.queries.length > 0 ? conv.queries[0].model : "Unknown";

    // Sequential processing with error handling
    for (const { query } of conv.queries) {
      try {
        if (typeof query !== "string") continue;

        const encoder = encoding_for_model("gpt-4");
        metrics.total_tokens += encoder.encode(query).length;
        metrics.total_words += query.split(/\s+/).filter(Boolean).length;

        const category = await classifyQuery(query);
        metrics.query_types[category]++;
      } catch (error) {
        console.error(`Error processing query ${query}:`, error);
      }
    }

    // Get location and time data
    try {
      const geoResponse = await axios.get(
        `http://ip-api.com/json/${conv.server_ip}`
      );
      const { lat, lon } = geoResponse.data;
      const region = `${geoResponse.data.country} - ${geoResponse.data.city}`;
      const timeData = await axios.get(
        `https://timeapi.io/api/time/current/zone?timeZone=${geoResponse.data.timezone}`
      );
      const { month, day, hour } = timeData.data;
      console.log(timeData.data, geoResponse.data);

      processedData[conversationId] = {
        ...metrics,
        server_ip: conv.server_ip,
        region,
        datacenter_season: getSeason(month, day, geoResponse.data.timezone),
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
    } catch (error) {
      console.error(
        `Error getting location/time data for ${conv.server_ip}:`,
        error
      );
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
  console.log("Processed Query: ", processedData);
  try {
    for (const conversationId in processedData) {
      const { EnergyConsumption, WaterConsumption, CarbonEmission } =
        await predictSustainabilityMetrics(processedData[conversationId]);
      await pool.query(`INSERT INTO sustainmetrics VALUES(?,?,?,?)`, [
        conversationId,
        EnergyConsumption,
        WaterConsumption,
        CarbonEmission,
      ]);
    }
    console.log("Data inserted into database successfully!");
  } catch (err) {
    console.log(err);
  }
  res.status(200).json(processedData);
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
