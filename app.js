// Default location: Boca Raton, FL
const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

const $ = (id) => document.getElementById(id);

// WMO weather codes -> [description, day icon, night icon]
const CODES = {
  0: ["Clear", "☀️", "🌙"],
  1: ["Mostly Clear", "🌤️", "🌙"],
  2: ["Partly Cloudy", "⛅", "☁️"],
  3: ["Cloudy", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"],
  48: ["Fog", "🌫️", "🌫️"],
  51: ["Light Drizzle", "🌦️", "🌧️"],
  53: ["Drizzle", "🌦️", "🌧️"],
  55: ["Heavy Drizzle", "🌧️", "🌧️"],
  61: ["Light Rain", "🌦️", "🌧️"],
  63: ["Rain", "🌧️", "🌧️"],
  65: ["Heavy Rain", "🌧️", "🌧️"],
  71: ["Light Snow", "🌨️", "🌨️"],
  73: ["Snow", "🌨️", "🌨️"],
  75: ["Heavy Snow", "❄️", "❄️"],
  80: ["Showers", "🌦️", "🌧️"],
  81: ["Showers", "🌧️", "🌧️"],
  82: ["Heavy Showers", "⛈️", "⛈️"],
  95: ["Thunderstorm", "⛈️", "⛈️"],
  96: ["Thunderstorm", "⛈️", "⛈️"],
  99: ["Thunderstorm", "⛈️", "⛈️"],
};
const info = (code, isDay = 1) => {
  const c = CODES[code] || ["—", "🌡️", "🌡️"];
  return { text: c[0], icon: isDay ? c[1] : c[2] };
};

async function loadWeather({ name, lat, lon }) {
  $("error").hidden = true;
  $("city").textContent = name;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day` +
    `&hourly=temperature_2m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather request failed");
    render(await res.json());
  } catch (err) {
    showError("Couldn't load weather. Please try again.");
  }
}

function render(data) {
  const { current, hourly, daily } = data;
  const r = Math.round;

  // Current
  const now = info(current.weather_code, current.is_day);
  $("temp").textContent = `${r(current.temperature_2m)}°`;
  $("desc").textContent = now.text;
  $("hilo").textContent = `H:${r(daily.temperature_2m_max[0])}°  L:${r(daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${r(current.apparent_temperature)}°`;
  $("humidity").textContent = `${r(current.relative_humidity_2m)}%`;
  $("wind").textContent = `${r(current.wind_speed_10m)} mph`;
  $("uv").textContent = r(daily.uv_index_max[0]);

  // Hourly: next 24 hours starting from the current hour
  const start = Math.max(0, hourly.time.findIndex((t) => t >= current.time.slice(0, 13)));
  $("hourly").innerHTML = hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const idx = start + i;
      const h = new Date(t).getHours();
      const label = i === 0 ? "Now" : `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
      return `<div class="hour">
        <span>${label}</span>
        <span class="icon">${info(hourly.weather_code[idx], hourly.is_day[idx]).icon}</span>
        <span>${r(hourly.temperature_2m[idx])}°</span>
      </div>`;
    })
    .join("");

  // Daily with range bars scaled to the week's min/max
  const weekMin = Math.min(...daily.temperature_2m_min);
  const weekMax = Math.max(...daily.temperature_2m_max);
  const span = weekMax - weekMin || 1;
  $("daily").innerHTML = daily.time
    .map((t, i) => {
      const day = i === 0 ? "Today" : new Date(t + "T00:00").toLocaleDateString("en-US", { weekday: "short" });
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const left = ((lo - weekMin) / span) * 100;
      const width = ((hi - lo) / span) * 100;
      return `<li>
        <span>${day}</span>
        <span class="icon">${info(daily.weather_code[i]).icon}</span>
        <span class="lo">${r(lo)}°</span>
        <div class="bar"><span style="left:${left}%;width:${width}%"></span></div>
        <span>${r(hi)}°</span>
      </li>`;
    })
    .join("");
}

function showError(msg) {
  $("error").textContent = msg;
  $("error").hidden = false;
}

// City search via Open-Meteo geocoding
$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("query").value.trim();
  if (!q) return;
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
    );
    const data = await res.json();
    const place = data.results && data.results[0];
    if (!place) return showError(`No results for "${q}".`);
    loadWeather({ name: place.name, lat: place.latitude, lon: place.longitude });
    $("query").value = "";
    $("query").blur();
  } catch {
    showError("Search failed. Please try again.");
  }
});

// Greeting
const USER_NAME = "Juanjo Valdez";
function greet() {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  $("greeting").innerHTML = `${part},<strong>${USER_NAME}</strong>`;
}

// Theme switch: light / dark / system (saved in localStorage)
const themeButtons = document.querySelectorAll(".theme-switch button");
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButtons.forEach((b) => b.classList.toggle("active", b.dataset.theme === theme));
  try { localStorage.setItem("theme", theme); } catch {}
}
themeButtons.forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme)));
setTheme(document.documentElement.dataset.theme || "system");

greet();
loadWeather(DEFAULT);
