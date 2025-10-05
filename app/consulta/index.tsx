import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native'
// WebView fallback for Leaflet (pure JS map) when native maps aren't available
let WebView: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView
} catch (e) {
  WebView = null
}
import { useRouter } from 'expo-router'
// Dynamically require react-native-maps to avoid bundler errors when the native module
// isn't installed. If it's not available we'll render a friendly placeholder.
let MapView: any = null
let Marker: any = null
let PROVIDER_GOOGLE: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNMaps = require('react-native-maps')
  MapView = RNMaps.default || RNMaps
  Marker = RNMaps.Marker
  PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE
} catch (e) {
  // Module not installed — we will show a placeholder in the UI and instructions
  MapView = null
}
import { getCoordinates, getLocationName, createWeatherForecastRequest, PostWeatherForecast } from '../services/nasaServices'
import type { WeatherForecastRequest } from '../interfaces/out/Iout'
import type { WeatherForecastAPIResponse } from '../interfaces/in/Iresponse.API'

export default function ConsultaScreen() {
  const router = useRouter()
  const [destino, setDestino] = useState('Ensenada, B.C.')
  const [fecha, setFecha] = useState('2025-11-27')
  const [fechaFinal, setFechaFinal] = useState('2025-12-04')
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<WeatherForecastAPIResponse | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const c = await getCoordinates(destino)
        if (mounted && c) setCoords(c)
      } catch (err) {
        console.error('default coords error', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const handleSearch = async () => {
    setError(null)
    setLoading(true)
    try {
      const c = await getCoordinates(destino)
      if (c) setCoords(c)
      else setError('No se encontraron coordenadas para la dirección')
    } catch (err) {
      console.error(err)
      setError('Error buscando coordenadas')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!coords) {
      setError('Ingresa una ubicación antes de enviar')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const start = new Date(fecha)
      const end = new Date(fechaFinal)
      const diff = Math.abs(end.getTime() - start.getTime())
      const baseDays = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
      const windowDays = baseDays + 3

      const request: WeatherForecastRequest = createWeatherForecastRequest({ latitude: coords.lat, longitude: coords.lon }, fecha)
      request.window_days = windowDays

      const apiResponse = await PostWeatherForecast(request)
      const enriched: WeatherForecastAPIResponse = { ...apiResponse, cityName: destino, startDate: fecha, endDate: fechaFinal }
      setResult(enriched)
    } catch (err) {
      console.error('submit error', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const mapRegion = coords ? {
    latitude: coords.lat,
    longitude: coords.lon,
    latitudeDelta: 0.6,
    longitudeDelta: 0.6
  } : {
    latitude: 31.8659,
    longitude: -116.6030,
    latitudeDelta: 6,
    longitudeDelta: 6
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.topCard}>
        <View style={styles.row}>
          <View style={styles.colLarge}>
            <Text style={styles.label}>📍 Ubicación</Text>
            <TextInput style={styles.input} value={destino} onChangeText={setDestino} placeholder="Ciudad o dirección" />
          </View>

          <View style={styles.colSmall}>
            <Text style={styles.label}>📅 Fecha inicio</Text>
            <TextInput style={styles.input} value={fecha} onChangeText={setFecha} placeholder="YYYY-MM-DD" />
          </View>

          <View style={styles.colSmall}>
            <Text style={styles.label}>📅 Fecha final</Text>
            <TextInput style={styles.input} value={fechaFinal} onChangeText={setFechaFinal} placeholder="YYYY-MM-DD" />
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={async () => {
            // try to get device location - web will not have geolocation in RN environment
            try {
              // noop on mobile - user can use map to move marker
            } catch (e) {}
          }}>
            <Text style={styles.actionText}>📍 Mi ubicación</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => { /* toggle coordinates input if needed */ }}>
            <Text style={[styles.actionText, { color: '#111' }]}>📌 Coordenadas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0B3D91' }]} onPress={handleSearch}>
            <Text style={[styles.actionText, { color: '#fff' }]}>🔍 Buscar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.mapLoading}><ActivityIndicator size="large" color="#0B3D91" /></View>
        ) : MapView ? (
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_GOOGLE as any}
            style={styles.map}
            region={mapRegion as any}
          >
            {coords && (
              <Marker coordinate={{ latitude: coords.lat, longitude: coords.lon }} />
            )}
          </MapView>
        ) : WebView && coords ? (
          // Render a Leaflet map inside a WebView when native maps are unavailable.
          <WebView
            originWhitelist={["*"]}
            style={styles.map}
            source={{ html: `
              <!doctype html>
              <html>
              <head>
                <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <style>html,body,#map{height:100%;margin:0;padding:0}</style>
              </head>
              <body>
                <div id="map"></div>
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <script>
                  const map = L.map('map').setView([${(coords && coords.lat) || 31.8659}, ${(coords && coords.lon) || -116.6030}], 10);
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                  }).addTo(map);
                  L.marker([${coords?.lat ?? 31.8659}, ${coords?.lon ?? -116.6030}]).addTo(map);
                </script>
              </body>
              </html>
            ` }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderTitle}>Mapa no disponible</Text>
            <Text style={styles.mapPlaceholderText}>El módulo <Text style={{ fontWeight: '700' }}>react-native-maps</Text> no está instalado o no está disponible en Expo Go.</Text>
            <Text style={styles.mapPlaceholderText}>Para ver el mapa instala la dependencia y reconstruye el proyecto:</Text>
            <Text style={styles.mapPlaceholderCode}>npm install react-native-maps</Text>
            <Text style={styles.mapPlaceholderText}>Si usas Expo Managed, es posible que necesites crear un dev client con EAS (expo.dev/eas).</Text>
          </View>
        )}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Configurar Análisis Climático</Text>
        <Text style={styles.formHint}>¿Qué actividad o evento estás planeando?</Text>
        <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Ej: Caminata, Boda, Festival..." />

        <View style={{ height: 12 }} />

        <Text style={styles.sectionTitle}>Condiciones Climáticas</Text>
        <View style={{ height: 8 }} />
        <TouchableOpacity style={styles.ctaBtn} onPress={handleSubmit}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Analizar 1 condición</Text>}
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Análisis</Text>
          <Text style={styles.small}>Ubicación: {result.cityName ?? `${result.query_info.location.latitude}, ${result.query_info.location.longitude}`}</Text>
          <Text style={styles.small}>Condiciones: {result.results?.length ?? 0}</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { padding: 12, backgroundColor: '#f3f4f6' },
  topCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  colLarge: { flex: 2, paddingRight: 6 },
  colSmall: { flex: 1, paddingLeft: 6 },
  label: { fontSize: 12, color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e6eef9', padding: 10, borderRadius: 8, backgroundColor: '#fff' },
  actionsRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },

  mapWrap: { height: 240, borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  map: { flex: 1 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6eef9' },

  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  formTitle: { fontWeight: '800', fontSize: 16, color: '#0B3D91' },
  formHint: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  sectionTitle: { fontWeight: '700', marginTop: 10, color: '#0B3D91' },
  ctaBtn: { marginTop: 12, backgroundColor: '#0B3D91', padding: 12, borderRadius: 10, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800' },

  resultCard: { marginTop: 12, backgroundColor: '#fff', padding: 12, borderRadius: 12 },
  resultTitle: { fontWeight: '800', marginBottom: 6 },
  small: { color: '#374151', fontSize: 13 }
  ,
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#eef2ff' },
  mapPlaceholderTitle: { fontWeight: '800', fontSize: 16, color: '#0B3D91', marginBottom: 8 },
  mapPlaceholderText: { color: '#374151', textAlign: 'center', marginBottom: 6 },
  mapPlaceholderCode: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', backgroundColor: '#fff', padding: 6, borderRadius: 6 }
})
