// List of timezones in the Southern Hemisphere
const southernTimeZones = new Set([
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Brisbane",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Pacific/Auckland",
  "Africa/Johannesburg",
  "America/Santiago",
]);

function getSeason(month, day, timeZone) {
  // Check if the timezone is in the Southern Hemisphere
  let isSouthernHemisphere = southernTimeZones.has(timeZone);

  if (!isSouthernHemisphere) {
    // Northern Hemisphere (Default)
    if (
      (month === 12 && day >= 21) ||
      month <= 2 ||
      (month === 3 && day < 20)
    ) {
      return "Winter";
    } else if (
      (month === 3 && day >= 20) ||
      month <= 5 ||
      (month === 6 && day < 21)
    ) {
      return "Spring";
    } else if (
      (month === 6 && day >= 21) ||
      month <= 8 ||
      (month === 9 && day < 23)
    ) {
      return "Summer";
    } else {
      return "Autumn";
    }
  } else {
    // Southern Hemisphere (Seasons are reversed)
    if (
      (month === 12 && day >= 21) ||
      month <= 2 ||
      (month === 3 && day < 20)
    ) {
      return "Summer";
    } else if (
      (month === 3 && day >= 20) ||
      month <= 5 ||
      (month === 6 && day < 21)
    ) {
      return "Autumn";
    } else if (
      (month === 6 && day >= 21) ||
      month <= 8 ||
      (month === 9 && day < 23)
    ) {
      return "Winter";
    } else {
      return "Spring";
    }
  }
}

function getPartOfDay(hour) {
  if (hour >= 5 && hour < 12) {
    return "Morning";
  } else if (hour >= 12 && hour < 17) {
    return "Afternoon";
  } else if (hour >= 17 && hour < 21) {
    return "Evening";
  } else {
    return "Night";
  }
}

export { getPartOfDay, getSeason };
