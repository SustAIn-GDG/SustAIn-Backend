import { pipeline, env } from "@xenova/transformers";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Delete existing environment settings
delete env.localModelPath;
delete env.allowRemoteModels;

// Set correct model path structure
const baseModelPath = path.join(__dirname, "models");
env.localModelPath = baseModelPath;
env.allowRemoteModels = false;

const classifier = await pipeline(
  "zero-shot-classification",
  "Xenova/distilbert-base-uncased-mnli"
);
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

const classifyQuery = async (query) => {
  try {
    const result = await classifier(query, labels);
    return result.labels[0];
  } catch (error) {
    console.error("Error:", error);
  }
};

export default classifyQuery;
