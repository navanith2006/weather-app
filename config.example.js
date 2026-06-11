// OpenWeather API Configuration Example
// Copy this file to config.js and replace the placeholder with your actual key.

const CONFIG = {
  // Replace this placeholder with your actual OpenWeatherMap API Key
  OPENWEATHER_API_KEY: 'YOUR_API_KEY_HERE',
  
  // Default fallback city if Geolocation is denied or unavailable
  DEFAULT_CITY: 'London',
  
  // Weather data auto-refresh interval (5 minutes)
  REFRESH_INTERVAL_MS: 5 * 60 * 1000,
  
  // Maximum number of items in search history
  MAX_HISTORY_ITEMS: 5
};

export default CONFIG;
