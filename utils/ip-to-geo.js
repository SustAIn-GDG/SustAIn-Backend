import axios from "axios";

// Geolocation cache to store results and reduce API calls
let geoCache = {};

const GEO_API_ENDPOINT = "http://ip-api.com/json";
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const DEFAULT_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const getGeoLocation = async (
  ipAddress = "",
  retryCount = MAX_RETRIES,
  retryDelay = RETRY_DELAY
) => {
  const cacheKey = ipAddress || "self"; // Use "self" as key for empty IP address

  // Return cached data if available and not expired
  if (
    geoCache[cacheKey] &&
    Date.now() - geoCache[cacheKey].timestamp < CACHE_DURATION
  ) {
    console.log(`Returning cached geolocation data for: ${cacheKey}`);
    return geoCache[cacheKey].data;
  }

  // Handle empty ipAddress (which means current IP)
  const url = ipAddress ? `${GEO_API_ENDPOINT}/${ipAddress}` : GEO_API_ENDPOINT;

  // Configure request with timeout
  const config = {
    timeout: DEFAULT_TIMEOUT,
    headers: {
      Accept: "application/json",
    },
  };

  // Implement retry logic
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for IP: ${ipAddress || "self"}`);
      }

      const response = await axios.get(url, config);

      // Verify API response has expected data
      if (response.data && response.data.status === "success") {
        // Cache successful response
        geoCache[cacheKey] = {
          data: response.data,
          timestamp: Date.now(),
        };

        return response.data;
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (error) {
      const errorMessage = error.response?.data || error.message;

      // If this was the last retry attempt, log detailed error and return null
      if (attempt === retryCount) {
        console.error(
          `Error fetching geolocation data for ${
            ipAddress || "self"
          } after ${retryCount} attempts:`,
          errorMessage
        );

        // Log specific error information for debugging
        if (error.code === "ECONNABORTED") {
          console.error("Request timeout");
        } else if (error.code === "ENOTFOUND") {
          console.error("Network error: Host not found");
        } else if (error.code === "ETIMEDOUT") {
          console.error("Network error: Connection timed out");
        } else if (error.response?.status) {
          console.error(
            `HTTP error ${error.response.status}: ${error.response.statusText}`
          );
        }

        return null;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

const clearGeoCache = (ipAddress) => {
  if (ipAddress) {
    const key = ipAddress || "self";
    if (geoCache[key]) {
      delete geoCache[key];
      console.log(`Geolocation cache cleared for: ${key}`);
    }
  } else {
    geoCache = {};
    console.log("Geolocation cache cleared completely");
  }
};

export { getGeoLocation, clearGeoCache };
