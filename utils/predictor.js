function predictSustainabilityMetrics(data) {
  const AI_MODEL_ENERGY_FACTORS = {
    "GPT-4": 0.3, // Wh per query
    "DALL·E": 2.9, // Wh per image generation
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
