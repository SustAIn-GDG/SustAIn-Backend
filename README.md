# 🌱 Sustainable Metrics Backend

Estimate energy, carbon, and water footprints for generative AI tasks using contextual runtime data, model types, and geographical carbon intensity. This backend is designed with resilience, efficiency, and environmental consciousness in mind.

---

## 🧰 Features Overview

| Feature                           | Description                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| ⚡ Energy, 💨 Carbon, 💧 Water     | Estimates environmental impact of AI tasks                                 |
| 🌍 Location-aware API            | Fetches real-time carbon intensity by coordinates                          |
| 🧠 Adaptive Baseline             | Adjusts query time expectations dynamically                                |
| 🔄 Retry & Timeout Handling      | Resilient API requests with fallback logic                                 |
| 🧮 Scaling Factor Logic          | Dynamically scales footprint based on duration                             |
| 🏷️ Prompt Classification         | Categorizes AI prompts for better context                                |

---

## 🛰️ External API Access – Cache & Retry Logic

The system uses multiple external APIs for proper working. All of these API calls use cache logic and fallback mechanisms.

An example: The carbon intensity is fetched based on geolocation via [ElectricityMap API](https://www.electricitymap.org/). To ensure fast and fault-tolerant behavior, it uses:

### 🧠 Caching Mechanism

- **Stored In-Memory** with coordinate key: `longitude.toFixed(4),latitude.toFixed(4)`
- **Cache Duration:** 1 hour (3600000 ms)

```js
if (
  localMemory[cacheKey] &&
  Date.now() - localMemory[cacheKey].timestamp < CACHE_DURATION
) {
  return localMemory[cacheKey].carbonIntensity;
}
```

### 🔁 Retry & Fallback Strategy

- **Axios timeout:** 5 seconds
- Handles:
  - Timeout (`ECONNABORTED`, `ETIMEDOUT`)
  - DNS errors (`ENOTFOUND`)
  - Auth errors (401), rate limits (429)
- **Fallback Value:** Returns `450 gCO₂eq/kWh` (global avg) if the API fails

```js
} catch (error) {
  if (error.code === "ECONNABORTED") console.error("Request timeout");
  // ...
  return 450; // fallback value
}
```

---

## ⏱️ Adaptive Time Baseline

Each prompt is associated with a duration. We maintain a **moving baseline** for average duration across sessions to normalize spikes.

### 🔄 Exponential Moving Average (EMA)

```js
baseline = (1 - alpha) * previousBaseline + alpha * newDuration;
```

- `alpha = 0.1` (smooth adaptation)
- Helps ignore random outliers

| Scenario              | Impact on Baseline      |
|-----------------------|-------------------------|
| One long task         | Slight increase         |
| Multiple short tasks  | Gradual decrease        |
| Burst of variation    | Smooth averaging        |

---

## 📏 Time-Based Scaling Factor

Final environmental metrics are scaled using:

```js
scalingFactor = averageDuration / baseline;
```

### 🚦 Bounded Range

```js
if (scalingFactor < 1) scalingFactor = 0.8;
if (scalingFactor >= 1 && scalingFactor < 10)  scalingFactor;
if (scalingFactor >= 10)  scalingFactor = 10;
```

This prevents manipulation via extremely short or long queries.

### Example Effect

| Duration (s) | Baseline (s) | Scaling Factor | Multiplier Applied |
|--------------|---------------|----------------|---------------------|
| 3.0          | 4.0           | 0.8            | 80% of base values  |
| 6.0          | 3.0           | 2.0            | 200% of base values |
| 120.0          | 6.0         | 10.0 (clamped) | 1000% of base values|

---

## 📦 Example: External API Integration

```js
import axios from "axios";

const CARBON_API_ENDPOINT = "https://api.electricitymap.org/v3/carbon-intensity/latest";
const CACHE_DURATION = 3600000; // 1 hour
const DEFAULT_TIMEOUT = 5000;   // 5 seconds
let localMemory = {};

const predictCarbon = async (longitude, latitude) => {
  const cacheKey = `${longitude.toFixed(4)},${latitude.toFixed(4)}`;
  
  if (
    localMemory[cacheKey] &&
    Date.now() - localMemory[cacheKey].timestamp < CACHE_DURATION
  ) return localMemory[cacheKey].carbonIntensity;

  const config = {
    params: { lon: longitude, lat: latitude },
    headers: {
      "auth-token": process.env.ENERGY_API_KEY,
      Accept: "application/json",
    },
    timeout: DEFAULT_TIMEOUT,
  };

  try {
    const res = await axios.get(CARBON_API_ENDPOINT, config);
    localMemory[cacheKey] = {
      carbonIntensity: res.data.carbonIntensity,
      timestamp: Date.now(),
    };
    return res.data.carbonIntensity;
  } catch (error) {
    console.error("API error:", error.message);
    return 450; // fallback
  }
};
```

---

## 🔒 Security Considerations

- API keys are stored in `.env` and **never exposed**
- CORS is enforced to protect access
- No personally identifiable data is handled or logged

---

## 🧼 Cleanup Utilities

You can programmatically clear the carbon intensity cache if needed:

```js
clearCarbonCache("80.2274,13.0827"); // specific location
clearCarbonCache(); // entire cache
```

---

## 🧑‍💻 Maintainers

Created and maintained by the SustAIn team.  
Please reach out via issues or email for bugs, suggestions, or integrations.
