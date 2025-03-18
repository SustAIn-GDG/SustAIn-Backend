import axios from "axios";

// Cache for carbon intensity data
let localMemory = {};

// Constants
const CARBON_API_ENDPOINT =
  "https://api.electricitymap.org/v3/carbon-intensity/latest";
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const DEFAULT_TIMEOUT = 8000; // 8 seconds timeout
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500; // 1.5 seconds between retries

const predictCarbon = async (
  longitude,
  latitude,
  retryCount = MAX_RETRIES,
  retryDelay = RETRY_DELAY
) => {
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

  // Implement retry logic
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for coordinates: ${cacheKey}`);
      }

      const response = await axios.get(CARBON_API_ENDPOINT, config);

      // Verify that the response contains the expected data
      if (response.data && response.data.carbonIntensity !== undefined) {
        console.log(
          `Successfully fetched carbon intensity data for: ${cacheKey}`
        );

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

      // If this was the last retry attempt, log detailed error and return null
      if (attempt === retryCount) {
        console.error(
          `Error fetching carbon intensity for ${cacheKey} after ${retryCount} attempts:`,
          errorMessage
        );

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
        }

        return getEstimatedCarbonIntensity(latitude, longitude);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
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

const getEstimatedCarbonIntensity = (longitude, latitude) => {
  // Rough mapping of world regions by latitude/longitude
  let estimatedIntensity = 450; // Default: global average ~450 gCO2eq/kWh
  // Northern Europe (typically lower carbon intensity)
  if (latitude > 50 && longitude > -10 && longitude < 30) {
    estimatedIntensity = 200;
  }
  // North America
  else if (latitude > 30 && longitude < -50 && longitude > -130) {
    estimatedIntensity = 380;
  }
  // Parts of Asia
  else if (latitude > 20 && longitude > 100) {
    estimatedIntensity = 550;
  }
  return estimatedIntensity;
};

export { predictCarbon, clearCarbonCache, getEstimatedCarbonIntensity };
