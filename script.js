/**
 * Skyflow Weather - Core Application Logic
 * Implements OpenWeather API integration, unit conversion, local storage caching,
 * geolocation auto-detection, responsive UI rendering, and weather background animations.
 */

// Load config dynamically (handles missing config.js on GitHub Pages)
let CONFIG;
try {
  const configModule = await import('./config.js');
  CONFIG = configModule.default;
} catch (e) {
  console.warn('config.js not found, falling back to default placeholders.');
  CONFIG = {
    OPENWEATHER_API_KEY: 'YOUR_' + 'API_KEY_HERE',
    DEFAULT_CITY: 'London',
    REFRESH_INTERVAL_MS: 5 * 60 * 1000,
    MAX_HISTORY_ITEMS: 5
  };
}

// ==========================================================================
// Application State
// ==========================================================================
const state = {
  city: localStorage.getItem('skyflow_city') || CONFIG.DEFAULT_CITY,
  coords: null, // Stores { lat, lon } when using geolocation
  units: localStorage.getItem('skyflow_units') || 'metric', // 'metric' (°C) or 'imperial' (°F)
  theme: localStorage.getItem('skyflow_theme') || 'dark', // 'dark' or 'light'
  searchHistory: JSON.parse(localStorage.getItem('skyflow_history')) || [],
  refreshTimer: null,
  localTimeInterval: null
};

// ==========================================================================
// DOM Elements
// ==========================================================================
const DOM = {
  body: document.body,
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  historyDropdown: document.getElementById('historyDropdown'),
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  geoBtn: document.getElementById('geoBtn'),
  unitBtn: document.getElementById('unitBtn'),
  unitBtnText: document.getElementById('unitBtnText'),
  themeBtn: document.getElementById('themeBtn'),
  themeIcon: document.getElementById('themeIcon'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  saveKeyBtn: document.getElementById('saveKeyBtn'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  
  // Current Weather Cards
  currentTime: document.getElementById('currentTime'),
  cityName: document.getElementById('cityName'),
  countryName: document.getElementById('countryName'),
  weatherIcon: document.getElementById('weatherIcon'),
  tempValue: document.getElementById('tempValue'),
  tempUnitLabel: document.getElementById('tempUnitLabel'),
  weatherCondition: document.getElementById('weatherCondition'),
  weatherTipText: document.getElementById('weatherTipText'),
  
  // Detailed Cards
  feelsLikeValue: document.getElementById('feelsLikeValue'),
  feelsLikeSubtext: document.getElementById('feelsLikeSubtext'),
  humidityValue: document.getElementById('humidityValue'),
  humiditySubtext: document.getElementById('humiditySubtext'),
  windValue: document.getElementById('windValue'),
  windSubtext: document.getElementById('windSubtext'),
  pressureValue: document.getElementById('pressureValue'),
  visibilityValue: document.getElementById('visibilityValue'),
  visibilitySubtext: document.getElementById('visibilitySubtext'),
  sunCycleValue: document.getElementById('sunCycleValue'),
  sunCycleSubtext: document.getElementById('sunCycleSubtext'),
  
  // Forecast
  forecastGrid: document.getElementById('forecastGrid'),
  
  // Overlays
  loadingOverlay: document.getElementById('loadingOverlay'),
  toastContainer: document.getElementById('toastContainer'),
  rainOverlay: document.getElementById('rainOverlay'),
  snowOverlay: document.getElementById('snowOverlay'),
  cloudsOverlay: document.getElementById('cloudsOverlay')
};

// ==========================================================================
// Initialization & Startup
// ==========================================================================
function init() {
  setupEventListeners();
  applyTheme(state.theme);
  updateUnitToggleUI();
  renderHistoryList();
  
  const apiKey = getApiKey();
  if (!apiKey) {
    openSettingsModal(true);
  } else {
    // Try fetching the initial city
    fetchWeather(state.city);
  }
  
  setupAutoRefresh();
}

// Set up automatic data refreshing
function setupAutoRefresh() {
  if (state.refreshTimer) clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    
    showToast('Refreshing weather data...', 'success');
    if (state.coords) {
      fetchWeatherByCoords(state.coords.lat, state.coords.lon);
    } else {
      fetchWeather(state.city);
    }
  }, CONFIG.REFRESH_INTERVAL_MS);
}

// Resolve the API Key from localStorage or configuration
function getApiKey() {
  const localKey = localStorage.getItem('skyflow_api_key');
  if (localKey && localKey.trim() !== '') {
    return localKey.trim();
  }
  if (CONFIG.OPENWEATHER_API_KEY && CONFIG.OPENWEATHER_API_KEY !== 'YOUR_API_KEY_HERE') {
    return CONFIG.OPENWEATHER_API_KEY;
  }
  return null;
}

// Open/Close the API configuration modal
function openSettingsModal(forcePrompt = false) {
  DOM.settingsModal.classList.add('active');
  const activeKey = localStorage.getItem('skyflow_api_key') || (CONFIG.OPENWEATHER_API_KEY !== 'YOUR_API_KEY_HERE' ? CONFIG.OPENWEATHER_API_KEY : '');
  DOM.apiKeyInput.value = activeKey;
  
  // If forced (no key present at startup), hide close button to mandate key input
  if (forcePrompt) {
    DOM.closeSettingsBtn.style.display = 'none';
  } else {
    DOM.closeSettingsBtn.style.display = 'flex';
  }
}

function closeSettingsModal() {
  DOM.settingsModal.classList.remove('active');
}

// ==========================================================================
// Event Listeners Configuration
// ==========================================================================
function setupEventListeners() {
  // Search Form Submit
  DOM.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = DOM.searchInput.value.trim();
    if (query) {
      state.coords = null; // Clear coords since we are doing manual city search
      fetchWeather(query);
      DOM.searchInput.value = '';
      DOM.historyDropdown.classList.remove('active');
    }
  });

  // Search History Input Interactions
  DOM.searchInput.addEventListener('focus', () => {
    if (state.searchHistory.length > 0) {
      DOM.historyDropdown.classList.add('active');
    }
  });

  // Click outside search history dropdown closes it
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      DOM.historyDropdown.classList.remove('active');
    }
  });

  // Clear all search history
  DOM.clearHistoryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.searchHistory = [];
    localStorage.setItem('skyflow_history', JSON.stringify(state.searchHistory));
    renderHistoryList();
    DOM.historyDropdown.classList.remove('active');
    showToast('Search history cleared', 'success');
  });

  // Geolocation Button Click
  DOM.geoBtn.addEventListener('click', () => {
    detectLocation();
  });

  // Unit Switcher Toggle
  DOM.unitBtn.addEventListener('click', () => {
    state.units = state.units === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('skyflow_units', state.units);
    updateUnitToggleUI();
    
    // Refetch weather with new units
    if (state.coords) {
      fetchWeatherByCoords(state.coords.lat, state.coords.lon);
    } else {
      fetchWeather(state.city);
    }
  });

  // Theme Switcher Toggle
  DOM.themeBtn.addEventListener('click', () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    state.theme = newTheme;
    localStorage.setItem('skyflow_theme', newTheme);
    applyTheme(newTheme);
  });

  // API Key Settings Modal toggles
  DOM.settingsBtn.addEventListener('click', () => {
    openSettingsModal(false);
  });

  DOM.closeSettingsBtn.addEventListener('click', () => {
    closeSettingsModal();
  });

  DOM.saveKeyBtn.addEventListener('click', () => {
    const keyVal = DOM.apiKeyInput.value.trim();
    if (keyVal === '') {
      localStorage.removeItem('skyflow_api_key');
      showToast('API Key cleared. Using default configuration.', 'success');
    } else if (keyVal.length !== 32) {
      showToast('Invalid key length! OpenWeather API keys must be 32 characters long.', 'danger');
      return;
    } else {
      localStorage.setItem('skyflow_api_key', keyVal);
      showToast('API Key saved successfully!', 'success');
    }
    
    closeSettingsModal();
    // Trigger fresh data fetch
    if (state.coords) {
      fetchWeatherByCoords(state.coords.lat, state.coords.lon);
    } else {
      fetchWeather(state.city);
    }
  });
}

// ==========================================================================
// API Weather Fetching Functions
// ==========================================================================

// Main fetch logic by City Name
async function fetchWeather(cityName) {
  const apiKey = getApiKey();
  if (!apiKey) {
    openSettingsModal(true);
    showToast('API Key is missing! Please configure it in Settings.', 'danger');
    return;
  }

  showLoader(true);
  try {
    const encodedCity = encodeURIComponent(cityName);
    // Fetch Current Weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&units=${state.units}&appid=${apiKey}`;
    const weatherRes = await fetch(weatherUrl);
    
    if (!weatherRes.ok) {
      if (weatherRes.status === 404) {
        throw new Error(`City "${cityName}" not found.`);
      } else if (weatherRes.status === 401) {
        throw new Error("Invalid API key. Please check settings.");
      } else {
        throw new Error("Failed to fetch current weather data.");
      }
    }
    
    const weatherData = await weatherRes.json();

    // Fetch Forecast Weather
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&units=${state.units}&appid=${apiKey}`;
    const forecastRes = await fetch(forecastUrl);
    
    if (!forecastRes.ok) {
      throw new Error("Failed to fetch 5-day forecast data.");
    }
    
    const forecastData = await forecastRes.json();

    // Update state and store locally
    state.city = weatherData.name;
    localStorage.setItem('skyflow_city', state.city);
    
    // Add to history list
    addToHistory(state.city);

    // Update GUI
    renderWeatherData(weatherData, forecastData);
    
  } catch (error) {
    console.error(error);
    showToast(error.message, 'danger');
  } finally {
    showLoader(false);
  }
}

// Fetch logic by Coordinates (Geolocation)
async function fetchWeatherByCoords(lat, lon) {
  const apiKey = getApiKey();
  if (!apiKey) {
    openSettingsModal(true);
    showToast('API Key is missing! Please configure it in Settings.', 'danger');
    return;
  }

  showLoader(true);
  try {
    // Current Weather Coords API
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${state.units}&appid=${apiKey}`;
    const weatherRes = await fetch(weatherUrl);
    
    if (!weatherRes.ok) {
      throw new Error("Unable to fetch weather for coordinates.");
    }
    const weatherData = await weatherRes.json();

    // Forecast Coords API
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${state.units}&appid=${apiKey}`;
    const forecastRes = await fetch(forecastUrl);
    
    if (!forecastRes.ok) {
      throw new Error("Unable to fetch forecast for coordinates.");
    }
    const forecastData = await forecastRes.json();

    // Save coords and location name to state
    state.coords = { lat, lon };
    state.city = weatherData.name;
    localStorage.setItem('skyflow_city', state.city);
    
    addToHistory(state.city);
    renderWeatherData(weatherData, forecastData);
    showToast(`Detected location: ${state.city}`, 'success');

  } catch (error) {
    console.error(error);
    showToast(error.message, 'danger');
  } finally {
    showLoader(false);
  }
}

// Auto-detect location via Geolocation API
function detectLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'danger');
    return;
  }

  showToast('Locating your position...', 'success');
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      fetchWeatherByCoords(latitude, longitude);
    },
    (error) => {
      console.warn(`Geolocation error (${error.code}): ${error.message}`);
      let errorMsg = 'Access to location denied.';
      if (error.code === error.POSITION_UNAVAILABLE) {
        errorMsg = 'Location information is unavailable.';
      } else if (error.code === error.TIMEOUT) {
        errorMsg = 'Location request timed out.';
      }
      showToast(`${errorMsg} Using default city.`, 'danger');
      // Fallback
      fetchWeather(state.city);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

// ==========================================================================
// Data Parsing and Dynamic Rendering
// ==========================================================================
function renderWeatherData(weather, forecast) {
  // 1. Current Local Time of query destination
  startLocalTimeTracker(weather.timezone);

  // 2. City name and Country Code
  DOM.cityName.textContent = weather.name;
  DOM.countryName.textContent = weather.sys.country;

  // 3. Current Temperature details
  const roundedTemp = Math.round(weather.main.temp);
  DOM.tempValue.textContent = roundedTemp;
  DOM.tempUnitLabel.textContent = state.units === 'metric' ? '°C' : '°F';

  // 4. Conditions
  const mainCond = weather.weather[0].main;
  const descCond = weather.weather[0].description;
  DOM.weatherCondition.textContent = descCond;

  // 5. Select custom weather SVG icon
  const weatherIconFile = getWeatherIconPath(weather.weather[0].icon, mainCond);
  DOM.weatherIcon.src = `assets/weather-icons/${weatherIconFile}`;
  DOM.weatherIcon.alt = descCond;

  // 6. Detailed Cards Info
  // Feels Like
  const feelsLike = Math.round(weather.main.feels_like);
  const tempSymbol = state.units === 'metric' ? '°C' : '°F';
  DOM.feelsLikeValue.textContent = `${feelsLike}${tempSymbol}`;
  
  const tempDiff = feelsLike - roundedTemp;
  let feelsLikeText = 'Similar to actual temp';
  if (tempDiff > 2) feelsLikeText = 'Warmer than actual temp';
  if (tempDiff < -2) feelsLikeText = 'Colder than actual temp';
  DOM.feelsLikeSubtext.textContent = feelsLikeText;

  // Humidity
  DOM.humidityValue.textContent = `${weather.main.humidity}%`;
  let humidityText = 'Comfortable moisture';
  if (weather.main.humidity > 65) humidityText = 'Sticky / Humid air';
  if (weather.main.humidity < 35) humidityText = 'Dry / Crisp air';
  DOM.humiditySubtext.textContent = humidityText;

  // Wind Speed & Angle
  const speedUnit = state.units === 'metric' ? 'm/s' : 'mph';
  DOM.windValue.textContent = `${weather.wind.speed} ${speedUnit}`;
  DOM.windSubtext.textContent = `Direction: ${getWindDirectionName(weather.wind.deg)}`;

  // Barometric Pressure
  DOM.pressureValue.textContent = `${weather.main.pressure} hPa`;

  // Visibility
  const visDistance = weather.visibility ? (weather.visibility / 1000) : 10;
  const visUnit = state.units === 'metric' ? 'km' : 'mi';
  const visFormatted = state.units === 'metric' ? visDistance.toFixed(1) : (visDistance * 0.621371).toFixed(1);
  DOM.visibilityValue.textContent = `${visFormatted} ${visUnit}`;
  DOM.visibilitySubtext.textContent = visDistance > 8 ? 'Excellent visibility' : 'Slight haze / fog';

  // Solar Cycle (Times adjusted to target city's timezone offset)
  const sunriseStr = formatUnixTime(weather.sys.sunrise, weather.timezone);
  const sunsetStr = formatUnixTime(weather.sys.sunset, weather.timezone);
  DOM.sunCycleValue.textContent = `${sunriseStr}`;
  DOM.sunCycleSubtext.textContent = `Sunset: ${sunsetStr}`;

  // 7. Render dynamic background gradient & animations based on weather code
  applyWeatherBackground(weather.weather[0].icon, mainCond);

  // 8. Generate helpful tips
  generateWeatherTips(mainCond, weather.main.temp);

  // 9. Generate 5-Day Forecast
  renderForecast(forecast);

  // Refresh Lucide SVGs
  lucide.createIcons();
}

// Parse and render the 5-day forecast cards
function renderForecast(forecastData) {
  DOM.forecastGrid.innerHTML = '';

  // OpenWeather returns 40 records (3-hour intervals).
  // Filter for one forecast per day (taking the one closest to 12:00 PM local timezone).
  const dailyForecasts = [];
  const processedDays = new Set();

  forecastData.list.forEach((item) => {
    // Convert current list item unix date to a simple date string (YYYY-MM-DD)
    const dateObj = new Date(item.dt * 1000);
    const dateString = dateObj.toISOString().split('T')[0];
    
    // Filter forecast that corresponds to midday (approx 12:00 PM) or first entry of the day
    const timeHour = dateObj.getHours();
    
    if (!processedDays.has(dateString)) {
      // If we don't have this day yet, or if it is closer to midday
      if (timeHour >= 11 && timeHour <= 14) {
        dailyForecasts.push(item);
        processedDays.add(dateString);
      }
    }
  });

  // Fallback: If midday wasn't hit or we have less than 5 days, backfill with remaining daily items
  if (dailyForecasts.length < 5) {
    forecastData.list.forEach((item) => {
      const dateObj = new Date(item.dt * 1000);
      const dateString = dateObj.toISOString().split('T')[0];
      if (!processedDays.has(dateString) && dailyForecasts.length < 5) {
        dailyForecasts.push(item);
        processedDays.add(dateString);
      }
    });
  }

  // Draw daily cards
  dailyForecasts.forEach((dayData) => {
    const dateObj = new Date(dayData.dt * 1000);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const temp = Math.round(dayData.main.temp);
    const condition = dayData.weather[0].main;
    const iconFile = getWeatherIconPath(dayData.weather[0].icon, condition);

    const card = document.createElement('div');
    card.className = 'forecast-card glass-card';
    card.style.animation = 'slideUp 0.4s ease forwards';
    
    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <div class="forecast-date">${formattedDate}</div>
      <div class="forecast-icon">
        <img src="assets/weather-icons/${iconFile}" alt="${dayData.weather[0].description}">
      </div>
      <div class="forecast-temp">${temp}°</div>
      <div class="forecast-desc">${dayData.weather[0].description}</div>
    `;

    DOM.forecastGrid.appendChild(card);
  });
}

// Track and update current local clock of the searched city
function startLocalTimeTracker(timezoneOffsetSeconds) {
  if (state.localTimeInterval) clearInterval(state.localTimeInterval);

  const updateClock = () => {
    // Current UTC time in milliseconds
    const utcTimeMs = Date.now() + (new Date().getTimezoneOffset() * 60000);
    // Target city local time
    const cityLocalTime = new Date(utcTimeMs + (timezoneOffsetSeconds * 1000));
    
    const timeOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    DOM.currentTime.textContent = cityLocalTime.toLocaleString('en-US', timeOptions);
  };

  updateClock();
  state.localTimeInterval = setInterval(updateClock, 1000);
}

// Generate weather warnings / tips
function generateWeatherTips(condition, temp) {
  let tip = "Standard day. Be prepared for regular weather fluctuations.";
  
  const isMetric = state.units === 'metric';
  const realTemp = isMetric ? temp : (temp - 32) * 5/9; // Convert to Celsius for uniform checks

  switch (condition.toLowerCase()) {
    case 'clear':
      if (realTemp > 28) {
        tip = "Hot and clear. Stay hydrated, apply SPF 30+ sunscreen, and wear lightweight, light-colored clothing.";
      } else {
        tip = "Clear skies! Perfect weather for outdoors, jogging, or a picnic. Don't forget your sunglasses.";
      }
      break;
    case 'clouds':
      tip = "Overcast. A pleasant day for outdoor exploration or a stroll. Keep a light windbreaker handy.";
      break;
    case 'rain':
    case 'drizzle':
      tip = "Rainy day. Keep your umbrella close, wear slip-resistant waterproof boots, and drive with extra safety margins.";
      break;
    case 'thunderstorm':
      tip = "Atmospheric storm alert! Stay safely indoors, avoid using water fixtures, and protect sensitive devices.";
      break;
    case 'snow':
      tip = "Snowy and freezing. Layer up in warm knitwear, wear insulated boots, and avoid unnecessary driving on icy roads.";
      break;
    case 'mist':
    case 'smoke':
    case 'haze':
    case 'dust':
    case 'fog':
      tip = "Foggy air with reduced visibility. Drive slow with headlights on low beam. Limit intense outdoor aerobic activities.";
      break;
    default:
      tip = "Keep an eye on the shifting clouds and enjoy your day!";
  }

  DOM.weatherTipText.textContent = tip;
}

// Map OpenWeather weather states to our custom vector files
function getWeatherIconPath(iconCode, mainCondition) {
  // iconCode ends with 'd' for day or 'n' for night
  const isNight = iconCode.endsWith('n');
  const cond = mainCondition.toLowerCase();

  if (cond === 'clear') {
    return isNight ? 'clear-night.svg' : 'clear-day.svg';
  } else if (cond === 'clouds') {
    return 'cloudy.svg';
  } else if (cond === 'rain' || cond === 'drizzle') {
    return 'rainy.svg';
  } else if (cond === 'thunderstorm') {
    return 'thunderstorm.svg';
  } else if (cond === 'snow') {
    return 'snowy.svg';
  } else if (['mist', 'smoke', 'haze', 'dust', 'fog', 'sand', 'ash', 'squall', 'tornado'].includes(cond)) {
    return 'mist.svg';
  }
  
  // Default fallback
  return isNight ? 'clear-night.svg' : 'clear-day.svg';
}

// Convert wind angle degrees to descriptive name compass directions
function getWindDirectionName(degree) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degree / 22.5) % 16;
  return directions[index];
}

// Format Unix Timestamp according to City Local Time timezone offset
function formatUnixTime(unixTimestamp, timezoneOffsetSeconds) {
  const utcTimeMs = (unixTimestamp * 1000) + (new Date().getTimezoneOffset() * 60000);
  const cityTime = new Date(utcTimeMs + (timezoneOffsetSeconds * 1000));
  
  return cityTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// ==========================================================================
// Ambient Weather Styling & Particles Injection
// ==========================================================================
function applyWeatherBackground(iconCode, condition) {
  const isNight = iconCode.endsWith('n');
  const cond = condition.toLowerCase();

  // Clear existing weather classes from body
  DOM.body.className = DOM.body.className
    .split(' ')
    .filter(c => !c.startsWith('weather-') && c !== 'light-mode')
    .join(' ');

  // Add the base light-mode check back if set
  if (state.theme === 'light') {
    DOM.body.classList.add('light-mode');
  }

  // Clear running particle intervals/containers
  DOM.rainOverlay.innerHTML = '';
  DOM.snowOverlay.innerHTML = '';
  DOM.cloudsOverlay.innerHTML = '';

  // Determine current class
  let weatherClass = 'weather-clear';
  if (isNight && cond === 'clear') {
    weatherClass = 'weather-night';
  } else if (cond === 'clouds') {
    weatherClass = 'weather-clouds';
    generateCloudBubbles();
  } else if (cond === 'rain' || cond === 'drizzle') {
    weatherClass = 'weather-rain';
    generateRaindrops();
  } else if (cond === 'thunderstorm') {
    weatherClass = 'weather-thunderstorm';
    generateRaindrops(); // Storms also have rain
  } else if (cond === 'snow') {
    weatherClass = 'weather-snow';
    generateSnowflakes();
  } else if (['mist', 'smoke', 'haze', 'dust', 'fog', 'sand', 'ash', 'squall', 'tornado'].includes(cond)) {
    weatherClass = 'weather-mist';
  }

  DOM.body.classList.add(weatherClass);
}

// Generate rain particles
function generateRaindrops() {
  const containerWidth = window.innerWidth;
  const count = Math.min(Math.floor(containerWidth / 30), 40); // responsive count
  
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.className = 'rain-drop-ambient';
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * 1.5}s`;
    drop.style.animationDuration = `${0.6 + Math.random() * 0.6}s`;
    DOM.rainOverlay.appendChild(drop);
  }
}

// Generate snow particles
function generateSnowflakes() {
  const containerWidth = window.innerWidth;
  const count = Math.min(Math.floor(containerWidth / 25), 50);

  for (let i = 0; i < count; i++) {
    const flake = document.createElement('div');
    flake.className = 'snow-flake-ambient';
    
    const size = 2 + Math.random() * 4;
    flake.style.width = `${size}px`;
    flake.style.height = `${size}px`;
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.animationDelay = `${Math.random() * 5}s`;
    flake.style.animationDuration = `${4 + Math.random() * 5}s`;
    DOM.snowOverlay.appendChild(flake);
  }
}

// Generate cloud background blur blobs
function generateCloudBubbles() {
  const count = 4;
  for (let i = 0; i < count; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'cloud-bubble';
    
    const size = 200 + Math.random() * 300;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size * 0.6}px`;
    bubble.style.top = `${Math.random() * 30}%`;
    bubble.style.animationDelay = `${Math.random() * -120}s`;
    bubble.style.animationDuration = `${90 + Math.random() * 90}s`;
    
    DOM.cloudsOverlay.appendChild(bubble);
  }
}

// ==========================================================================
// Theme and Layout UI State updates
// ==========================================================================
function applyTheme(theme) {
  if (theme === 'light') {
    DOM.body.classList.add('light-mode');
    DOM.themeIcon.setAttribute('data-lucide', 'sun');
  } else {
    DOM.body.classList.remove('light-mode');
    DOM.themeIcon.setAttribute('data-lucide', 'moon');
  }
  lucide.createIcons();
}

function updateUnitToggleUI() {
  DOM.unitBtnText.textContent = state.units === 'metric' ? 'Metric (°C)' : 'Imperial (°F)';
}

// ==========================================================================
// Search History Caching
// ==========================================================================
function addToHistory(city) {
  // Avoid duplicate entries
  state.searchHistory = state.searchHistory.filter(item => item.toLowerCase() !== city.toLowerCase());
  
  // Unshift to front
  state.searchHistory.unshift(city);
  
  // Cap history size
  if (state.searchHistory.length > CONFIG.MAX_HISTORY_ITEMS) {
    state.searchHistory.pop();
  }
  
  localStorage.setItem('skyflow_history', JSON.stringify(state.searchHistory));
  renderHistoryList();
}

function renderHistoryList() {
  DOM.historyList.innerHTML = '';
  
  if (state.searchHistory.length === 0) {
    DOM.historyDropdown.classList.remove('active');
    return;
  }

  state.searchHistory.forEach((city) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    item.innerHTML = `
      <button class="history-item-content" style="background:none; border:none; color:inherit; font:inherit; text-align:left; flex:1; cursor:pointer;">
        <i data-lucide="history" style="width:14px; height:14px; color:var(--text-secondary);"></i>
        <span>${city}</span>
      </button>
      <button class="history-item-remove" aria-label="Remove ${city} from search history">
        <i data-lucide="x" style="width:12px; height:12px;"></i>
      </button>
    `;
    
    // Bind click to search
    item.querySelector('.history-item-content').addEventListener('click', (e) => {
      e.stopPropagation();
      state.coords = null;
      fetchWeather(city);
      DOM.historyDropdown.classList.remove('active');
    });
    
    // Bind remove button click
    item.querySelector('.history-item-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeCityFromHistory(city);
    });
    
    DOM.historyList.appendChild(item);
  });
  
  lucide.createIcons();
}

function removeCityFromHistory(city) {
  state.searchHistory = state.searchHistory.filter(item => item.toLowerCase() !== city.toLowerCase());
  localStorage.setItem('skyflow_history', JSON.stringify(state.searchHistory));
  renderHistoryList();
  
  if (state.searchHistory.length === 0) {
    DOM.historyDropdown.classList.remove('active');
  }
  showToast(`Removed "${city}" from history`, 'success');
}

// ==========================================================================
// Feedback Overlays (Loading Screen, Alert Toast Messages)
// ==========================================================================
function showLoader(visible) {
  if (visible) {
    DOM.loadingOverlay.classList.add('active');
  } else {
    DOM.loadingOverlay.classList.remove('active');
  }
}

function showToast(message, type = 'danger') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconName = type === 'danger' ? 'alert-triangle' : 'check-circle';
  
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="toast-icon"></i>
    <div class="toast-content">${message}</div>
  `;
  
  DOM.toastContainer.appendChild(toast);
  lucide.createIcons();
  
  // Trigger transition
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto-remove after 4.5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    // Remove from DOM after transition completes
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4500);
}

// Launch the app
init();
