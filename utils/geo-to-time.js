import axios from "axios";

// Time cache to store results and reduce API calls
let timeZoneCache = {};

const TIME_API_ENDPOINT = "https://timeapi.io/api/time/current/zone";
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

const getTimeData = async (timeZone, retryCount = 1, retryDelay = 5000) => {
  const cacheKey = timeZone;

  // Return cached data if available and not expired
  if (
    timeZoneCache[cacheKey] &&
    Date.now() - timeZoneCache[cacheKey].timestamp < CACHE_DURATION
  ) {
    console.log(`Returning cached time data for: ${cacheKey}`);
    return timeZoneCache[cacheKey].data;
  }

  // Configure request with timeout and proper error handling
  const config = {
    params: { timeZone },
    timeout: 10000, // 10 second timeout
  };

  // Implement retry logic
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for ${timeZone}`);
      }

      const response = await axios.get(TIME_API_ENDPOINT, config);
      // Cache successful response
      timeZoneCache[cacheKey] = {
        data: response.data,
        timestamp: Date.now(),
      };

      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data || error.message;

      // If this was the last retry attempt, log and return null
      if (attempt === retryCount) {
        console.error(
          `Error fetching time data for ${timeZone} after ${retryCount} attempts:`,
          errorMessage
        );

        // Log more specific error information for debugging
        if (error.code === "ECONNABORTED") {
          console.error("Request timeout");
        } else if (error.code === "ENOTFOUND") {
          console.error("Network error: Host not found");
        } else if (error.code === "ETIMEDOUT") {
          console.error("Network error: Connection timed out");
        } else {
          console.error("Unidentified error: ", errorMessage);
        }

        return getFallbackTimeData(timeZone);
      }

      if (attempt < retryCount) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Waiting ${delay}ms before retry attempt ${attempt + 1} for ${timeZone}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
};

const clearTimeCache = () => {
  timeZoneCache = {};
  console.log("Time zone cache cleared");
};

const getFallbackTimeData = (timeZone) => {
  const now = new Date();

  try {
    // Attempt to format the date according to the timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    return {
      timeZone,
      datetime: formatter.format(now),
      localSource: true,
      unixtime: Math.floor(now.getTime() / 1000),
    };
  } catch (error) {
    console.error(`Invalid timezone: ${timeZone}`);
    return null;
  }
};

export { getTimeData, clearTimeCache, getFallbackTimeData };
