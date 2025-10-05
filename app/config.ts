// Centralized API configuration for local/ngrok development
// Update these values if the tunnel or host changes.
export const API_BASE = 'http://10.41.100.117:8000'
export const API_NASA_WEATHER = `${API_BASE}/api/v1/weather`
export const API_DOCS = `${API_BASE}/docs`

export default {
  API_BASE,
  API_NASA_WEATHER,
  API_DOCS
}
