import axios from "axios";

// Cache for carbon intensity data
let localMemory = {};

// Constants
const CARBON_API_ENDPOINT =
  "https://api.electricitymap.org/v3/carbon-intensity/latest";
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const DEFAULT_TIMEOUT = 5000; // 5 seconds timeout

const predictCarbon = async (longitude, latitude) => {
  // Validate input parameters
  if (typeof longitude !== "number" || typeof latitude !== "number") {
    console.error(
      "Invalid coordinates: longitude and latitude must be numbers"
    );
    return null;
  }

  // Create cache key from coordinates, rounded to 4 decimal places for consistency
  const cacheKey = `${longitude.toFixed(4)},${latitude.toFixed(4)}`;

  // Return cached data if available and not expired
  if (
    localMemory[cacheKey] &&
    Date.now() - localMemory[cacheKey].timestamp < CACHE_DURATION
  ) {
    console.log(`Returning cached carbon intensity data for: ${cacheKey}`);
    return localMemory[cacheKey].carbonIntensity;
  }

  // Configure request parameters and headers
  const config = {
    params: {
      lon: longitude,
      lat: latitude,
    },
    headers: {
      "auth-token": process.env.ENERGY_API_KEY,
      Accept: "application/json",
    },
    timeout: DEFAULT_TIMEOUT,
  };

  try {
    const response = await axios.get(CARBON_API_ENDPOINT, config);

    // Verify that the response contains the expected data
    if (response.data && response.data.carbonIntensity !== undefined) {
      // Cache successful response with metadata
      localMemory[cacheKey] = {
        carbonIntensity: response.data.carbonIntensity,
        unit: response.data.units || "gCO2eq/kWh",
        updatedAt: response.data.updatedAt || new Date().toISOString(),
        timestamp: Date.now(),
      };

      return response.data.carbonIntensity;
    } else {
      throw new Error("Invalid API response format");
    }
  } catch (error) {
    const errorMessage = error.response?.data || error.message;

    // Log specific error information for debugging
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout");
    } else if (error.code === "ENOTFOUND") {
      console.error("Network error: Host not found");
    } else if (error.code === "ETIMEDOUT") {
      console.error("Network error: Connection timed out");
    } else if (error.response?.status === 401) {
      console.error("Authentication error: Invalid API key");
    } else if (error.response?.status === 429) {
      console.error("Rate limit exceeded");
    } else if (error.response?.status) {
      console.error(
        `HTTP error ${error.response.status}: ${error.response.statusText}`
      );
    } else {
      console.error("Unidentified error occured: ", errorMessage);
    }

    // returning global average of grid emmission
    return 450;
  }
};

const clearCarbonCache = (coordinates) => {
  if (coordinates) {
    if (localMemory[coordinates]) {
      delete localMemory[coordinates];
      console.log(`Carbon intensity cache cleared for: ${coordinates}`);
    }
  } else {
    localMemory = {};
    console.log("Carbon intensity cache cleared completely");
  }
};

export { predictCarbon, clearCarbonCache };
