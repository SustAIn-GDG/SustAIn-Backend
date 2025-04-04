import axios from "axios";
import { getValidAccessToken } from "../server.js";
import dotenv from "dotenv";
dotenv.config();

const VERTEX_AI_ENDPOINT = `https://sustain-ai-model.onrender.com/predict`;

async function classifyQueryBatch(queries) {
  if (queries.length === 0) return [];

  const accessToken = await getValidAccessToken();
  const requestData = {
    instances: queries.map((query) => ({ Query: query })),
  };

  try {
    const response = await axios.post(VERTEX_AI_ENDPOINT, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Extract the highest scoring class for each query
    const predictions = response.data.predictions.map((prediction) => {
      const { classes, scores } = prediction;
      if (!classes || !scores || classes.length === 0 || scores.length === 0) {
        return "text generation"; // Default if no valid data
      }

      // Find index of max score
      const maxIndex = scores.indexOf(Math.max(...scores));
      return classes[maxIndex] || "text generation";
    });

    return predictions;
  } catch (error) {
    console.error(`Error Occurred: ${error.message}`);
    if (error.stack) {
      console.error(
        `Stack Trace:\n${error.stack.split("\n").slice(0, 5).join("\n")}`
      );
    }
    return queries.map(() => "text generation"); // Default category for failed requests is text generation
  }
}

export default classifyQueryBatch;
