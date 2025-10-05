import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useWeatherResults } from '../_contexts/WeatherResultsContext'
import { getCoordinates, getLocationName, PostWeatherForecast, createWeatherForecastRequest, exportToCSV, exportToJSON } from '../services/nasaServices'
import type { WeatherForecastAPIResponse } from '../interfaces/in/Iresponse.API'

// Try to dynamically require WebView and react-native-maps to keep Expo Go compatibility
let WebView: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView
} catch (e) {
  WebView = null
}

let MapView: any = null
let Marker: any = null
let PROVIDER_GOOGLE: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Maps = require('react-native-maps')
  MapView = Maps.default || Maps
  Marker = Maps.Marker || Maps
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE
} catch (e) {
  MapView = null
  Marker = null
}

export default function ConsultaScreen() {
  const navigation = useNavigation()
  const { addResult } = useWeatherResults()

  useEffect(() => {
    // set a friendly header title
    // @ts-ignore - navigation typing can be noisy here
    if (navigation && (navigation as any).setOptions) (navigation as any).setOptions({ title: 'Consulta' })
  }, [navigation])

  const [destino, setDestino] = useState('')
  const [activity, setActivity] = useState('')
  const [conditions, setConditions] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [result, setResult] = useState<WeatherForecastAPIResponse | null>(null)
  const [showMap, setShowMap] = useState(false)

  const route = useRoute()

  const mapRegion = useMemo(() => coords ? ({ latitude: coords.lat, longitude: coords.lon, latitudeDelta: 0.2, longitudeDelta: 0.2 }) : undefined, [coords])

  const handleSearch = async () => {
    if (!destino) return
    setLoading(true)
    try {
      const c = await getCoordinates(destino)
      if (c) setCoords(c)
    } catch (e) {
      console.warn('Error buscando coordenadas', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    // Build a simple request based on first condition (keep it minimal)
    if (!coords) {
      await handleSearch()
      if (!coords) return
    }

    setLoading(true)
    try {
      const targetDate = new Date().toISOString().split('T')[0]
      const req = createWeatherForecastRequest({ latitude: coords!.lat, longitude: coords!.lon }, targetDate, {})
      const apiResp = await PostWeatherForecast(req)
      setResult(apiResp)
      // if API returned location info, synchronise coords for map toggles
      try {
        const lat = apiResp?.query_info?.location?.latitude
        const lon = apiResp?.query_info?.location?.longitude
        if (lat !== undefined && lon !== undefined) setCoords({ lat: Number(lat), lon: Number(lon) })
      } catch {}
      addResult(apiResp)
      // try to fill human-readable name
      try {
        const name = await getLocationName(coords!.lat, coords!.lon)
        // patch the stored item with a cityName if available
        if (name) apiResp.cityName = name
      } catch {}
    } catch (err) {
      console.error('Error submitting forecast', err)
    } finally {
      setLoading(false)
    }
  }

  // If opened from Peticiones (or navigation) with a saved request/result, prefill or show
  useEffect(() => {
    const params: any = (route && (route as any).params) || {}
    if (!params) return

    // If Peticiones passed an API response (saved result), show it
    if (params.result) {
      try {
        const r = typeof params.result === 'string' ? JSON.parse(params.result) : params.result
        setResult(r)
        const lat = r?.query_info?.location?.latitude
        const lon = r?.query_info?.location?.longitude
        if (lat !== undefined && lon !== undefined) setCoords({ lat: Number(lat), lon: Number(lon) })
      } catch (e) {
        console.warn('Invalid result param', e)
      }
    }

    // If Peticiones passed a request (to prefill the form), populate inputs
    if (params.request) {
      try {
        const q = typeof params.request === 'string' ? JSON.parse(params.request) : params.request
        // try to extract an address or coordinates
        if (q.location && q.location.latitude && q.location.longitude) {
          setCoords({ lat: Number(q.location.latitude), lon: Number(q.location.longitude) })
        }
        if (q.customName) setActivity(q.customName)
        if (q.prefillAddress) setDestino(q.prefillAddress)
      } catch (e) {
        console.warn('Invalid request param', e)
      }
    }
  }, [route])

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.topCard}>
        <View style={styles.row}>
          <View style={styles.colLarge}>
            <Text style={styles.label}>📍 Ubicación</Text>
            <TextInput style={styles.input} value={destino} onChangeText={setDestino} placeholder="Ciudad o dirección" />
          </View>

          <View style={styles.colSmall}>
            <Text style={styles.label}>📅 Fecha objetivo</Text>
            <TextInput style={styles.input} value={new Date().toISOString().split('T')[0]} editable={false} />
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={async () => {
            // try to use geolocation if available
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { getCurrentPosition } = require('@react-native-community/geolocation')
              getCurrentPosition((pos: any) => {
                const { latitude, longitude } = pos.coords
                setCoords({ lat: latitude, lon: longitude })
              }, (err: any) => console.warn('geo err', err))
            } catch (e) {
              console.warn('Geolocation not available', e)
            }
          }}>
            <Text style={styles.actionText}>📍 Mi ubicación</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]} onPress={handleSearch}>
            <Text style={[styles.actionText, { color: '#111' }]}>🔍 Buscar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0B3D91' }]} onPress={handleSubmit}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.actionText, { color: '#fff' }]}>🚀 Analizar</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Map area shown under the top inputs (like the web layout) */}
      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.mapLoading}><ActivityIndicator size="large" color="#0B3D91" /></View>
        ) : MapView ? (
          // Always show a native map when available. Use coords if present, otherwise fall back to default center.
          // @ts-ignore
          <MapView style={styles.map} region={mapRegion ?? { latitude: 31.8659, longitude: -116.6030, latitudeDelta: 0.5, longitudeDelta: 0.5 }} provider={PROVIDER_GOOGLE}>
            {Marker && coords ? <Marker coordinate={{ latitude: coords.lat, longitude: coords.lon }} /> : null}
          </MapView>
        ) : WebView ? (
          // WebView (Leaflet) fallback: always render centered map (coords or default)
          <WebView originWhitelist={["*"]} style={styles.map} source={{ html: `<!doctype html><html><head><meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><style>html,body,#map{height:100%;margin:0;padding:0}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const lat = ${coords?.lat ?? 31.8659}; const lon = ${coords?.lon ?? -116.6030}; const map = L.map('map').setView([lat, lon], 10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);${coords ? `L.marker([${coords.lat}, ${coords.lon}]).addTo(map);` : ''}</script></body></html>` }} javaScriptEnabled domStorageEnabled startInLoadingState />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderTitle}>Mapa no disponible</Text>
            <Text style={styles.mapPlaceholderText}>Ni MapView ni WebView están disponibles en este entorno. Instala react-native-maps o react-native-webview.</Text>
          </View>
        )}
      </View>

      {/* Request / activity form (below map) */}
      <View style={styles.formCardLarge}>
        <Text style={styles.formTitle}>📋 Configurar Análisis Climático</Text>

        <View style={styles.activityCard}>
          <Text style={styles.activityLabel}>✨ ¿Qué actividad o evento estás planeando?</Text>
          <TextInput value={activity} onChangeText={setActivity} style={styles.activityInput} placeholder="Ej: Caminata por la montaña, Boda en jardín, Festival al aire libre..." />
          <Text style={styles.activityNote}>💡 Dale un nombre descriptivo para identificar fácilmente este análisis en tus predicciones</Text>
        </View>

        <View style={styles.conditionsBlock}>
          <View style={styles.conditionsHeader}>
            <Text style={styles.sectionTitle}>☀️ Condiciones Climáticas ({conditions.length})</Text>
            <Text style={styles.conditionsHint}>Agrega las condiciones que quieres analizar</Text>
          </View>

          <View style={styles.pillsRow}>
            {['Temperatura máxima', 'Temperatura mínima', 'Precipitación', 'Humedad relativa', 'Velocidad del viento'].map((c) => (
              <TouchableOpacity key={c} style={styles.pill} onPress={() => {
                setConditions(prev => [...prev, { id: String(Date.now()) + Math.random().toString(36).slice(2,6), metric: c, comparator: 'mayor a', threshold: '', unit: c.includes('Temperatura') ? '°C' : c.includes('Velocidad') ? 'm/s' : c.includes('Humedad') ? '%' : '' }])
              }}>
                <Text style={styles.pillText}>🔧 {c} +</Text>
              </TouchableOpacity>
            ))}
          </View>

          {conditions.length > 0 && (
            <View style={styles.conditionCard}>
              <View style={styles.conditionCardHeader}>
                <Text style={styles.conditionTitle}>🔬 {conditions[0].metric}</Text>
                <TouchableOpacity onPress={() => setConditions(prev => prev.slice(1))}>
                  <Text style={styles.removeX}>✖️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.conditionRow}>
                <View style={styles.conditionCol}>
                  <Text style={styles.small}>Condición</Text>
                  <View style={styles.selectBox}><Text>{conditions[0].comparator}</Text></View>
                </View>

                <View style={[styles.conditionCol, { flex: 1.2 }]}>
                  <Text style={styles.small}>Valor umbral</Text>
                  <TextInput style={styles.input} value={conditions[0].threshold} onChangeText={(v) => setConditions(prev => [{ ...prev[0], threshold: v }, ...prev.slice(1)])} placeholder="32" keyboardType="numeric" />
                </View>

                <View style={[styles.conditionCol, { width: 80 }]}>
                  <Text style={styles.small}>Unidad</Text>
                  <TextInput style={[styles.input, { padding: 8 }]} value={conditions[0].unit} onChangeText={(v) => setConditions(prev => [{ ...prev[0], unit: v }, ...prev.slice(1)])} />
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.ctaBtnLarge} onPress={handleSubmit}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>🚀 Analizar {conditions.length} condición</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Result card (appears after the request form) */}
      {result && (
        <View style={styles.resultOuterCard}>
          <View style={styles.resultHeaderRow}>
            <Text style={styles.resultHeaderTitle}>🔎 Análisis</Text>
            <TouchableOpacity style={styles.resultHeaderButton} onPress={() => { /* open details */ }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>📊 Detalles</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.intensityBtn} onPress={() => setShowMap(prev => !prev)}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{showMap ? '🗺 Ocultar mapa' : '🔥 Ver Mapa de Intensidad'}</Text>
          </TouchableOpacity>

          {showMap && (
            <View style={[styles.mapWrap, { marginTop: 12 }]}> 
              {loading ? (
                <View style={styles.mapLoading}><ActivityIndicator size="large" color="#0B3D91" /></View>
              ) : MapView && mapRegion ? (
                // @ts-ignore
                <MapView style={styles.map} region={mapRegion} provider={PROVIDER_GOOGLE}>
                  {Marker && coords ? <Marker coordinate={{ latitude: coords.lat, longitude: coords.lon }} /> : null}
                </MapView>
              ) : WebView && coords ? (
                <WebView originWhitelist={["*"]} style={styles.map} source={{ html: `<!doctype html><html><head><meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><style>html,body,#map{height:100%;margin:0;padding:0}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map = L.map('map').setView([${coords?.lat ?? 31.8659}, ${coords?.lon ?? -116.6030}], 10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);L.marker([${coords?.lat ?? 31.8659}, ${coords?.lon ?? -116.6030}]).addTo(map);</script></body></html>` }} javaScriptEnabled domStorageEnabled startInLoadingState />
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Text style={styles.mapPlaceholderTitle}>Mapa no disponible</Text>
                  <Text style={styles.mapPlaceholderText}>El módulo react-native-maps no está instalado o no está disponible en Expo Go. Usa Expo dev client para mapas nativos o instala la dependencia.</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.small}>📍 {result.cityName ?? `${result.query_info?.location?.latitude ?? 'N/A'}, ${result.query_info?.location?.longitude ?? 'N/A'}`}</Text>
            <Text style={styles.small}>{result.query_info?.target_date ?? ''}</Text>
          </View>

          {result.general_summary ? (
            <View style={styles.summaryBox}>
              <Text style={{ fontWeight: '800', color: '#065f46' }}>🟢 Resumen</Text>
              <Text style={styles.summaryText}>{result.general_summary}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: '800', color: '#0B3D91', marginBottom: 8 }}>Por Condición</Text>
            {result.results && result.results.length > 0 ? result.results.map((r, idx) => (
              <View key={r.condition_id || idx} style={styles.conditionCardSmall}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700' }}>{r.condition_label}</Text>
                  <Text style={{ fontWeight: '800', color: '#0B3D91' }}>{String(r.stats?.probability_percent ?? 0)}%</Text>
                </View>
                <Text style={styles.small}>{r.category}</Text>
              </View>
            )) : <Text style={styles.small}>No hay condiciones en el resultado.</Text>}
          </View>

          <View style={styles.downloadRow}>
            <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: '#10B981' }]} onPress={() => {
              const csv = exportToCSV({ data: result })
              console.log('CSV length', typeof csv === 'string' ? csv.length : 'n/a')
            }}>
              <Text style={styles.downloadBtnText}>⬇ CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: '#7C3AED' }]} onPress={() => {
              const json = exportToJSON({ data: result })
              console.log('JSON len', typeof json === 'string' ? json.length : 'n/a')
            }}>
              <Text style={styles.downloadBtnText}>📋 JSON</Text>
            </TouchableOpacity>
          </View>
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
,
  /* New styles for activity + conditions UI */
  formCardLarge: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 12 },
  activityCard: { borderWidth: 1, borderColor: '#dbeafe', borderRadius: 10, padding: 12, backgroundColor: '#f8fbff' },
  activityLabel: { fontWeight: '700', color: '#0B3D91', marginBottom: 8 },
  activityInput: { borderWidth: 1, borderColor: '#e6eef9', padding: 10, borderRadius: 8, backgroundColor: '#fff' },
  activityNote: { color: '#6b7280', marginTop: 8, fontSize: 12 },

  conditionsBlock: { marginTop: 12 },
  conditionsHeader: { marginBottom: 8 },
  conditionsHint: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: '#0b63ff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  pillText: { color: '#fff', fontWeight: '700' },

  conditionCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e6eef9' },
  conditionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conditionTitle: { fontWeight: '700', color: '#0B3D91' },
  removeX: { color: '#ef4444', fontWeight: '700' },
  conditionRow: { flexDirection: 'row', marginTop: 10, gap: 8, alignItems: 'center' },
  conditionCol: { flex: 1 },
  selectBox: { borderWidth: 1, borderColor: '#e6eef9', padding: 10, borderRadius: 8, backgroundColor: '#fff' },

  ctaBtnLarge: { marginTop: 14, backgroundColor: '#4754ff', padding: 14, borderRadius: 12, alignItems: 'center' }
  ,
  resultItem: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 8 },
  exportBtn: { backgroundColor: '#0b63ff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }
  ,
  /* Result area styles */
  resultOuterCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  resultHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultHeaderTitle: { fontWeight: '800', color: '#0B3D91', fontSize: 16 },
  resultHeaderButton: { backgroundColor: '#0B3D91', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  intensityBtn: { marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  summaryBox: { backgroundColor: '#ecfdf5', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#d1fae5', marginTop: 8 },
  summaryText: { color: '#065f46', marginTop: 6 },
  conditionCardSmall: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#eef2ff' },
  downloadRow: { flexDirection: 'row', marginTop: 12 },
  downloadBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  downloadBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center' }
})
