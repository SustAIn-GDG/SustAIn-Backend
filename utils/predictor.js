import { predictCarbon } from "./carbonPredictor.js";
import { AI_MODEL_ENERGY_FACTORS } from "../data/ai_models_energy.js";

const WATER_USE_PER_KWH = 1.8;

function getPUE(season, partOfDay) {
  if (season === "Summer") {
    return partOfDay === "Afternoon" ? 1.6 : 1.2;
  }
  return partOfDay === "Afternoon" ? 1.4 : 1.1;
}

export default async function predictSustainabilityMetrics(data) {
  let totalEnergyUsed = 0;

  for (const [queryType, count] of Object.entries(data.query_types)) {
    const energyPerQuery = AI_MODEL_ENERGY_FACTORS[data.model][queryType];
    if (!isNaN(energyPerQuery) && energyPerQuery !== 0) {
      totalEnergyUsed += count * energyPerQuery;
    }
  }

  const gridEmissionFactor = await predictCarbon(
    data.lon,
    data.lat
  );
  console.log("TOTAL ENERGY: ", totalEnergyUsed);
  console.log("Grid emission factor:", gridEmissionFactor);

  const PUE = getPUE(data.datacenter_season, data.datacenter_partOfDay, false);

  const actualEnergyUsage = totalEnergyUsed * PUE;
  const carbonEmission =
    gridEmissionFactor == null
      ? (actualEnergyUsage * 450) / 1000
      : (actualEnergyUsage * gridEmissionFactor) / 1000;
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
