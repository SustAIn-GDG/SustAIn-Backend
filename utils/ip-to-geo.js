import axios from "axios";

// Runtime memory for reducing latency.
let geoCache = {};

const geoApiEndpoint = "http://ip-api.com/json/";

const getGeoLocation = async (ipAddress) => {
  const cacheKey = ipAddress;

  // Check if data is in cache and not older than 1 hour (3600000 ms)
  if (geoCache[cacheKey] && Date.now() - geoCache[cacheKey].timestamp < 3600000) {
    console.log("Returning cached geolocation data for:", cacheKey);
    return geoCache[cacheKey].data;
  }

  const url = `${geoApiEndpoint}${ipAddress}`;

  try {
    const response = await axios.get(url);
    console.log("Fetched fresh geolocation data for:", cacheKey);

    // Store data in cache with timestamp
    geoCache[cacheKey] = {
      data: response.data,
      timestamp: Date.now(),
    };

    return response.data;
  } catch (error) {
    console.error("Error fetching geolocation data:", error.response?.data || error.message);
    return null;
  }
};

export { getGeoLocation };