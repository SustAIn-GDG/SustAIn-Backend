import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const VERTEX_AI_ENDPOINT = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.PROJECT_ID}/locations/us-central1/endpoints/${process.env.ENDPOINT_ID}:predict`;

async function classifyQueryBatch(queries) {
  if (queries.length === 0) return [];

  const requestData = {
    instances: queries.map((query) => ({ Query: query })),
  };

  try {
    const response = await axios.post(VERTEX_AI_ENDPOINT, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GCP_ACCESS_TOKEN}`,
      },
    });

    // Extract the highest scoring class for each query
    const predictions = response.data.predictions.map((prediction) => {
      const { classes, scores } = prediction;
      if (!classes || !scores || classes.length === 0 || scores.length === 0) {
        return "unknown"; // Default if no valid data
      }

      // Find index of max score
      const maxIndex = scores.indexOf(Math.max(...scores));
      return classes[maxIndex] || "unknown";
    });

    return predictions;
  } catch (error) {
    console.error("Error calling Vertex AI:", error);
    return queries.map(() => "unknown"); // Default category for failed requests
  }
}

export default classifyQueryBatch;
