function predictSustainabilityMetrics(data) {
  // Wh per query
  const AI_MODEL_ENERGY_FACTORS = {
    "GPT-4": {
      "text generation": 3.592646875,
      "text classification": 4.420671659,
      "code generation": 8.981617188,
      summarization: 5.537504477,
      "question answering": 28.33888098,
      "image generation": 434.8075115,
      "image classification": 0.513598944,
    },
    GPT: {
      "text generation": 0.348999982,
      "text classification": 0.429436675,
      "code generation": 0.872499955,
      summarization: 0.537929006,
      "question answering": 2.752919866,
      "image generation": 42.23844398,
      "image classification": 0.049892469,
    },
    Gemini: {
      "text generation": 3.079411607,
      "text classification": 3.789147136,
      "code generation": 7.698529018,
      summarization: 4.746432409,
      "question answering": 24.29046941,
      "image generation": 372.6921527,
    },
    Claude: {
      "text generation": 0.410588214,
      "text classification": 0.505219618,
      "code generation": 1.026470536,
      summarization: 0.632857655,
      "question answering": 3.238729255,
      "image generation": 49.69228703,
    },
    "LLaMA 3": {
      "text generation": 0.143705875,
      "text classification": 0.176826866,
      "code generation": 0.359264688,
      summarization: 0.221500179,
      "question answering": 1.133555239,
      "image generation": 17.39230046,
    },
    "LLaMA 2": {
      "text generation": 0.026688234,
      "text classification": 0.032839275,
      "code generation": 0.066720585,
      summarization: 0.041135748,
      "question answering": 0.210517402,
      "image generation": 3.229998657,
    },
  };

  const REGION_GRID_EMISSIONS = {
    India: 0.8, // kg CO₂e/kWh
    Germany: 0.3,
    USA: 0.4,
  };

  const WATER_USE_PER_KWH = 1.8;

  function getPUE(season, partOfDay) {
    if (season === "Summer") {
      return partOfDay === "Afternoon" ? 1.6 : 1.2;
    }
    return partOfDay === "Afternoon" ? 1.4 : 1.1;
  }

  let totalEnergyUsed = 0;

  for (const [queryType, count] of Object.entries(data.query_types)) {
    const energyPerQuery = AI_MODEL_ENERGY_FACTORS[queryType] || 0.2;
    totalEnergyUsed += count * energyPerQuery;
  }

  const region = data.region.split(" - ")[0]; // Extract country
  const gridEmissionFactor = REGION_GRID_EMISSIONS[region] || 0.5; // Default if not listed

  const PUE = getPUE(data.datacenter_season, data.datacenter_partOfDay, false); // Assuming not a major DC

  const actualEnergyUsage = totalEnergyUsed * PUE; // Adjusted by PUE
  const carbonEmission = actualEnergyUsage * gridEmissionFactor;
  const waterConsumption = actualEnergyUsage * WATER_USE_PER_KWH;

  return {
    EnergyConsumption: actualEnergyUsage.toFixed(4), // kWh
    CarbonEmission: carbonEmission.toFixed(4), // kg CO₂e
    WaterConsumption: waterConsumption.toFixed(4), // Liters
  };
}
