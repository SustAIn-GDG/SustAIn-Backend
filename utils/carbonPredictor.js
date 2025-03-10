import axios from "axios";

// runtime memory for reducing the latency.
let localMemory = {};

const carbonAPIEndpoint =
  "https://api.electricitymap.org/v3/carbon-intensity/latest?";

const predictCarbon = async (longitude, latitude) => {
  const cacheKey = `${longitude},${latitude}`;
  if (
    localMemory[cacheKey] &&
    Date.now() - localMemory[cacheKey].timestamp < 3600000
  ) {
    console.log("Returning cached data for:", cacheKey);
    return localMemory[cacheKey].carbonIntensity;
  }

  let url = `${carbonAPIEndpoint}lon=${longitude}&lat=${latitude}`;
  try {
    const response = await axios.get(url, {
      headers: {
        "auth-token": process.env.ENERGY_API_KEY,
      },
    });

    localMemory[cacheKey] = {
      carbonIntensity: response.data.carbonIntensity,
      timestamp: Date.now(),
    };
    console.log("Fetched fresh data for:", cacheKey);
    return response.data.carbonIntensity;
  } catch (error) {
    console.error(
      "Error fetching carbon intensity:",
      error.response?.data || error.message
    );
    return null;
  }
};

export { predictCarbon };
