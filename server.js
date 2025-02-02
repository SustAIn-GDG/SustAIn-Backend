import express from "express";
import https from "https";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fs from "fs";
import axios from "axios";
import { encoding_for_model } from "tiktoken";
import classifyQuery from "./model.js";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());

// List of timezones in the Southern Hemisphere
const southernTimeZones = new Set([
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Brisbane",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Pacific/Auckland",
  "Africa/Johannesburg",
  "America/Santiago",
]);

function getSeason(month, day, timeZone) {
  // Check if the timezone is in the Southern Hemisphere
  let isSouthernHemisphere = southernTimeZones.has(timeZone);

  if (!isSouthernHemisphere) {
    // Northern Hemisphere (Default)
    if (
      (month === 12 && day >= 21) ||
      month <= 2 ||
      (month === 3 && day < 20)
    ) {
      return "Winter";
    } else if (
      (month === 3 && day >= 20) ||
      month <= 5 ||
      (month === 6 && day < 21)
    ) {
      return "Spring";
    } else if (
      (month === 6 && day >= 21) ||
      month <= 8 ||
      (month === 9 && day < 23)
    ) {
      return "Summer";
    } else {
      return "Autumn";
    }
  } else {
    // Southern Hemisphere (Seasons are reversed)
    if (
      (month === 12 && day >= 21) ||
      month <= 2 ||
      (month === 3 && day < 20)
    ) {
      return "Summer";
    } else if (
      (month === 3 && day >= 20) ||
      month <= 5 ||
      (month === 6 && day < 21)
    ) {
      return "Autumn";
    } else if (
      (month === 6 && day >= 21) ||
      month <= 8 ||
      (month === 9 && day < 23)
    ) {
      return "Winter";
    } else {
      return "Spring";
    }
  }
}

function getPartOfDay(hour) {
  if (hour >= 5 && hour < 12) {
    return "Morning";
  } else if (hour >= 12 && hour < 17) {
    return "Afternoon";
  } else if (hour >= 17 && hour < 21) {
    return "Evening";
  } else {
    return "Night";
  }
}

const options = {
  key: fs.readFileSync("certificate/server.key"), // Use your key file
  cert: fs.readFileSync("certificate/server.cert"), // Use your cert file
};

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
  const processedData = {};

  for (const conversationId in conversationData) {
    const conv = conversationData[conversationId];
    const metrics = {
      total_tokens: 0,
      total_words: 0,
      query_types: {
        "text classification": 0,
        generation: 0,
        "code generation": 0,
        "information retrieval": 0,
        "sentiment analysis": 0,
        "question answering": 0,
        translation: 0,
        summarization: 0,
      },
    };

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
      const region = `${geoResponse.data.country} - ${geoResponse.data.city}`;
      const timeData = await axios.get(
        `https://timeapi.io/api/time/current/zone?timeZone=${geoResponse.data.timezone}`
      );
      const { month, day, hour } = timeData.data;

      processedData[conversationId] = {
        ...metrics,
        server_ip: conv.server_ip,
        region,
        datacenter_season: getSeason(month, day, geoResponse.data.timezone),
        datacenter_partOfDay: getPartOfDay(hour),
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
      };
    }
  }
  console.log("Processed Query: ", processedData);
  res.status(200).json(processedData);
});

https.createServer(options, app).listen(443, () => {
  console.log("HTTPS Server running on https://localhost:443");
});

http
  .createServer((req, res) => {
    res.writeHead(301, { Location: "https://" + req.headers.host + req.url });
    res.end();
  })
  .listen(80, () => {
    console.log(
      "HTTP Server running on http://localhost:80 (Redirects to HTTPS)"
    );
  });
