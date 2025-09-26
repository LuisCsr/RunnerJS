// app.js — lógica principal (CORREGIDO)
const API_KEY = "03f44ffc1b47b702045d37e256956e4c"; // tu clave
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather"; // <-- endpoint correcto
const COMMON_PARAMS = "&units=metric&lang=es";

const els = {
  useLocationBtn: document.getElementById("use-location"),
  searchForm: document.getElementById("search-form"),
  cityInput: document.getElementById("city-input"),
  place: document.getElementById("place"),
  desc: document.getElementById("desc"),
  temp: document.getElementById("temp"),
  feels: document.getElementById("feels"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  icon: document.getElementById("icon"),
  error: document.getElementById("error"),
  loading: document.getElementById("loading"),
  body: document.body
};

function showLoading() { els.loading.classList.add("show"); }
function hideLoading() { els.loading.classList.remove("show"); }
function showError(msg) { els.error.textContent = msg; els.error.hidden = false; }
function clearError() { els.error.hidden = true; els.error.textContent = ""; }
function kmhFromMs(ms) { return Math.round((ms || 0) * 3.6); }

function setBackgroundByWeather(main, id) {
  els.body.classList.remove("bg-sunny","bg-cloudy","bg-rainy","bg-snowy","bg-default");
  let cls = "bg-default";
  if (main === "Clear") cls = "bg-sunny";
  else if (main === "Clouds") cls = "bg-cloudy";
  else if (main === "Snow") cls = "bg-snowy";
  else if (["Rain","Drizzle","Thunderstorm"].includes(main)) cls = "bg-rainy";
  else if (id >= 600 && id <= 622) cls = "bg-snowy";
  else if (id >= 500 && id <= 531) cls = "bg-rainy";
  else if (id === 800) cls = "bg-sunny";
  else if (id >= 801 && id <= 804) cls = "bg-cloudy";
  els.body.classList.add(cls);
}

function iconFor(main) {
  switch (main) {
    case "Clear": return "☀️";
    case "Clouds": return "☁️";
    case "Rain": return "🌧️";
    case "Drizzle": return "🌦️";
    case "Thunderstorm": return "⛈️";
    case "Snow": return "❄️";
    case "Mist": case "Fog": case "Haze": return "🌫️";
    default: return "⛅";
  }
}

async function fetchWeatherByCoords(lat, lon) {
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}${COMMON_PARAMS}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo obtener el clima.");
  return res.json();
}

async function fetchWeatherByCity(city) {
  const url = `${BASE_URL}?q=${encodeURIComponent(city)}${COMMON_PARAMS}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Ciudad no encontrada.");
  return res.json();
}

function updateUI(data) {
  const main = data.weather?.[0]?.main ?? "";
  const id = data.weather?.[0]?.id ?? 800;
  els.place.textContent = `${data.name || ""}${data.sys?.country ? ", " + data.sys.country : ""}`;
  els.desc.textContent = data.weather?.[0]?.description ?? "—";
  els.temp.textContent = Math.round(data.main?.temp ?? 0);
  els.feels.textContent = Math.round(data.main?.feels_like ?? 0);
  els.humidity.textContent = Math.round(data.main?.humidity ?? 0);
  els.wind.textContent = kmhFromMs(data.wind?.speed);
  els.icon.textContent = iconFor(main);
  setBackgroundByWeather(main, id);
}

async function getLocationAndFetch() {
  clearError();
  if (!navigator.onLine) return showError("Sin conexión a internet.");
  if (!("geolocation" in navigator)) return showError("Tu navegador no soporta geolocalización.");
  showLoading();
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const { latitude, longitude } = pos.coords;
      const data = await fetchWeatherByCoords(latitude, longitude);
      updateUI(data);
    } catch (err) {
      console.error(err);
      showError("No se pudo obtener el clima por ubicación.");
    } finally { hideLoading(); }
  }, () => {
    showError("Permiso denegado. Busca por ciudad.");
    hideLoading();
  }, { enableHighAccuracy: true, timeout: 10000 });
}

els.useLocationBtn.addEventListener("click", getLocationAndFetch);
els.searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const city = els.cityInput.value.trim();
  if (!city) return;
  showLoading();
  try {
    const data = await fetchWeatherByCity(city);
    updateUI(data);
  } catch (err) {
    console.error(err);
    showError("No se pudo obtener el clima de esa ciudad.");
  } finally { hideLoading(); }
});

window.addEventListener("DOMContentLoaded", getLocationAndFetch);
