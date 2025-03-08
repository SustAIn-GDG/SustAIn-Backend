import axios from "axios";

let timeZoneCache = {};

const timeApiEndpoint = "https://timeapi.io/api/time/current/zone?timeZone=";

const getTimeData = async (timeZone) => {
  const cacheKey = timeZone;

  if (timeZoneCache[cacheKey] && Date.now() - timeZoneCache[cacheKey].timestamp < 3600000) {
    console.log("Returning cached time data for:", cacheKey);
    return timeZoneCache[cacheKey].data;
  }

  const url = `${timeApiEndpoint}${timeZone}`;

  try {
    const response = await axios.get(url);
    console.log("Fetched fresh time data for:", cacheKey);

    timeZoneCache[cacheKey] = {
      data: response.data,
      timestamp: Date.now(),
    };

    return response.data;
  } catch (error) {
    console.error("Error fetching time data:", error.response?.data || error.message);
    return null;
  }
};

export { getTimeData };