# Skyflow Weather Website

A modern, responsive, and feature-rich Live Weather application built from scratch with semantic HTML, vanilla CSS (with CSS animations for atmospheric effects), and modular JavaScript. The application integrates with the OpenWeatherMap API to deliver current atmospheric data and a 5-day forecast.

![Skyflow Preview](https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=1200&q=80)

---

## 🌟 Key Features

1. **Modern Premium UI Layout**:
   - **Glassmorphism Design**: Frosted glass cards with saturate highlights and soft drop shadows.
   - **Dynamic Gradient Backgrounds**: The backdrop colors automatically shift based on the weather state (Clear Day, Clear Night, Cloudy, Rainy, Snowy, Mist/Fog, and Thunderstorms).
   - **Responsive Design**: Fluid flex and grid layouts tailored for mobile, tablet, and desktop viewports.
   - **Micro-Animations**: Hover states, interactive controls, cascading forecast lists, and loading indicators.
   - **Animated SVG Icons**: Custom built SVGs with CSS keyframes to illustrate weather conditions.

2. **Weather Indicators & Metrics**:
   - City Name and Country
   - Target Local Time (synchronized to the timezone of the searched city, not the browser locale)
   - Real Temperature & "Feels Like" Temperature
   - Weather condition text description
   - Humidity percentage
   - Wind speed and compass direction (e.g. N, ENE, SW)
   - Atmospheric Barometric Pressure (hPa)
   - Horizontal Visibility distance (km or miles)
   - Solar Cycle (Sunrise / Sunset times adjusted to the target city timezone)
   - **5-Day Weather Outlook**: Filtered daily cards showing upcoming dates, minimum/maximum temperature range, and condition state.

3. **Interactivity & Integration**:
   - **Geolocation Integration**: Auto-detects the user's current location to fetch regional data instantly.
   - **Unit Converter**: Toggle between Metric (°C, m/s, km) and Imperial (°F, mph, miles).
   - **Theme Selector**: Toggle between Dark/Light modes, persisting choices across sessions.
   - **Search History**: Local Storage caching of recent successful searches (up to 5 cities) with quick re-querying and item deletion.
   - **Auto-Refresh**: Background interval that updates weather parameters every 5 minutes automatically.
   - **Error Handling**: Displays clear user-friendly Toast alerts for issues like invalid city names, internet issues, or missing configuration details.

---

## 📂 Project Structure

```
/weather-app
├── index.html                 # App layout, semantic HTML5 structure
├── style.css                  # UI Design, themes, glassmorphism, weather animations
├── config.js                  # Global configuration & OpenWeatherMap API key storage
├── script.js                  # Fetching processes, timezone conversions, DOM binding
├── README.md                  # This documentation file
└── assets/
    └── weather-icons/         # Custom animated weather SVG icons
        ├── clear-day.svg
        ├── clear-night.svg
        ├── cloudy.svg
        ├── rainy.svg
        ├── snowy.svg
        ├── thunderstorm.svg
        └── mist.svg
```

---

## ⚙️ Installation & Setup

### Step 1: Clone or Copy files
Download the folder to your local system and navigate to the project directory:
```bash
cd weather-app
```

### Step 2: Configure OpenWeatherMap API Key
1. Sign up for a free account at [OpenWeatherMap](https://openweathermap.org/).
2. Navigate to your Member Dashboard and click **API Keys**.
3. Generate or copy your API Key.
4. Open the `config.js` file in your editor and replace `'YOUR_API_KEY_HERE'` with your actual key:
   ```javascript
   const CONFIG = {
     OPENWEATHER_API_KEY: 'YOUR_API_KEY_HERE',
     DEFAULT_CITY: 'London',
     REFRESH_INTERVAL_MS: 300000,
     MAX_HISTORY_ITEMS: 5
   };
   ```

### Step 3: Run the Application
Since this application uses ES Modules (`import CONFIG from './config.js'`), **browsers block local file access (`file://`) due to CORS security rules**. You **MUST** host the files using a local server.

Here are a few quick ways to spin up a server:

#### Option A: Using Visual Studio Code (Recommended)
1. Open the project in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Click the **Go Live** button at the bottom-right of the window.

#### Option B: Using Node.js & npm
If you have Node.js installed, run:
```bash
# Install static server globally (one-time)
npm install -g http-server

# Start the server in the current directory
http-server .
```
Open the provided URL (usually `http://127.0.0.1:8080`) in your browser.

#### Option C: Using Python
If Python is installed:
```bash
# Python 3.x
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

---

## 🧭 Accessibility & SEO

- **SEO Optimized**: Standard meta descriptions, viewport tags, search engine indexing attributes, and structured headers.
- **Screen Reader Friendly**: Image nodes contain description tags (`alt`), action items contain `aria-label` tags, and loading backdrops use `aria-live` containers.
- **Keyboard navigation**: Semantic buttons and forms allow users to tab through search fields and controls comfortably.
