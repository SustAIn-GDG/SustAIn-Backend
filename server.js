import express from "express";
import https from "https";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fs from "fs";
import axios from "axios";
import { encoding_for_model } from "tiktoken";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());

import { pipeline } from "@xenova/transformers"; // Install using npm i @xenova/transformers

const classifier = await pipeline(
  "zero-shot-classification",
  "Xenova/distilbert-base-mnli"
);

async function classifyQuery(query) {
  const labels = [
    "text classification",
    "generation",
    "code generation",
    "information retrieval",
    "sentiment analysis",
    "question answering",
    "translation",
    "summarization",
  ];
  const result = await classifier(query, labels);
  return result.labels[0]; // Return the top category
}

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

app.post("/calculate_metrics", async (req, res) => {
  console.log("Connection established!");
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
  const conversationData = req.body;

  // Result Object
  let processedData = {};

  for (const conversationId in conversationData) {
    const conv = conversationData[conversationId];

    // Get Region of IP Address
    let geo = await axios.get(`http://ip-api.com/json/${conv.server_ip}`);
    geo = geo.data;
    const region = geo ? geo.country + " - " + geo.city : "Unknown";

    let timeData = await axios.get(
      `https://timeapi.io/api/time/current/zone?timeZone=${geo.timezone}`
    );
    timeData = timeData.data;
    let { month, day, hour } = timeData;
    // Get season and part of day
    let season = getSeason(month, day, geo.timezone);
    let partOfDay = getPartOfDay(hour);

    let totalTokens = 0;
    let totalWords = 0;
    let queryTypes = {
      text_classification: 0,
      generation: 0,
      code_generation: 0,
      unknown: 0,
    };

    const encoder = encoding_for_model("gpt-4"); // Load tokenizer
    console.log(conv.queries);
    conv.queries.forEach(async ({ query }) => {
      // Token Count
      if (typeof query === "string") {
        const tokens = encoder.encode(query);
        totalTokens += tokens.length;
      } else {
        console.error("Invalid query:", query);
      }

      // Word Count
      const words = query.split(/\s+/).filter(Boolean).length;
      totalWords += words;

      const category = await classifyQuery(query);
      console.log("Category: ", category);

      if (category.includes("positive") || category.includes("negative")) {
        queryTypes.text_classification++;
      } else if (
        category.includes("generation") ||
        category.includes("creative")
      ) {
        queryTypes.generation++;
      } else if (
        category.includes("code") ||
        category.includes("programming")
      ) {
        queryTypes.code_generation++;
      } else {
        queryTypes.unknown++; // Default category
      }
    });

    // Store Processed Data
    processedData[conversationId] = {
      server_ip: conv.server_ip,
      region: region,
      total_tokens: totalTokens,
      total_words: totalWords,
      query_types: queryTypes,
      datacenter_season: season,
      datacenter_partOfDay: partOfDay,
    };
  }

  console.log(
    "######################################\nOUTPUT: ",
    JSON.stringify(processedData, null, 4)
  );
  res.status(200);
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
