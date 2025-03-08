import { predictCarbon } from "./carbonPredictor.js";

// Wh per query
const AI_MODEL_ENERGY_FACTORS = {
  "GPT-4": {
    "text generation": 0.843998215,
    "text classification": 0.966038979,
    "code generation": 2.109995538,
    summarization: 1.210097828,
    "question answering": 0.88606455,
    "image generation": 81.5171156,
    "image classification": 0.105678213,
  },
  GPT: {
    "text generation": 0.165017172,
    "text classification": 0.188878385,
    "code generation": 0.412542929,
    summarization: 0.236596378,
    "question answering": 0.173241914,
    "image generation": 15.93809514,
    "image classification": 0.020662034,
  },
  Gemini: {
    "text generation": 0.757667704,
    "text classification": 0.867225217,
    "code generation": 1.894169259,
    summarization: 1.086319883,
    "question answering": 0.795431176,
    "image generation": 73.17892939,
  },
  Claude: {
    "text generation": 0.184899566,
    "text classification": 0.211635741,
    "code generation": 0.462248914,
    summarization: 0.265103123,
    "question answering": 0.194115281,
    "image generation": 17.85842553,
  },
  "LLaMA 3": {
    "text generation": 0.088671391,
    "text classification": 0.10149313,
    "code generation": 0.221678478,
    summarization: 0.127134224,
    "question answering": 0.093090927,
    "image generation": 8.564278826,
  },
  "LLaMA 2": {
    "text generation": 0.027288222,
    "text classification": 0.031234054,
    "code generation": 0.068220555,
    summarization: 0.039124986,
    "question answering": 0.028648314,
    "image generation": 2.635618314,
  },
};

const WATER_USE_PER_KWH = 1.8;

function getPUE(season, partOfDay) {
  if (season === "Summer") {
    return partOfDay === "Afternoon" ? 1.6 : 1.2;
  }
  return partOfDay === "Afternoon" ? 1.4 : 1.1;
}

async function predictSustainabilityMetrics(data) {
  let totalEnergyUsed = 0;

  for (const [queryType, count] of Object.entries(data.query_types)) {
    const energyPerQuery = AI_MODEL_ENERGY_FACTORS[data.model][queryType];
    if (!isNaN(energyPerQuery) && energyPerQuery !== 0) {
      totalEnergyUsed += count * energyPerQuery;
    }
    console.log(queryType, count, "\n");
  }

  const gridEmissionFactor = await predictCarbon(
    totalEnergyUsed,
    data.lon,
    data.lat
  );
  console.log("TOTAL ENERGY: ", totalEnergyUsed);
  console.log("Grid emission factor:", gridEmissionFactor);

  const PUE = getPUE(data.datacenter_season, data.datacenter_partOfDay, false);

  const actualEnergyUsage = totalEnergyUsed * PUE;
  const carbonEmission =
    gridEmissionFactor == null
      ? actualEnergyUsage * 450
      : actualEnergyUsage * gridEmissionFactor.carbonIntensity;
  const waterConsumption = actualEnergyUsage * WATER_USE_PER_KWH;
  console.log(
    "Final answer:",
    actualEnergyUsage,
    carbonEmission,
    waterConsumption
  );
  return {
    EnergyConsumption: actualEnergyUsage.toFixed(4), // kWh
    CarbonEmission: carbonEmission.toFixed(4), // kg CO₂e
    WaterConsumption: waterConsumption.toFixed(4), // Liters
  };
}

export default predictSustainabilityMetrics;
