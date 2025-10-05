// Use built-in fetch to avoid adding axios dependency in the React Native app
import type { WeatherForecastRequest } from '../interfaces/out/Iout'
import type { WeatherForecastAPIResponse } from '../interfaces/in/Iresponse.API'

import { API_NASA_WEATHER } from '../config'

// Use the centralized config for the API base so it's easy to change.
const URL_API_NASA = API_NASA_WEATHER

export { URL_API_NASA }

export const GetStatus = async () => {
  try {
    const start = Date.now()
    const statusUrl = `${URL_API_NASA}/status`
    console.log('📡 Probing NASA API status at', statusUrl)
    const res = await fetch(statusUrl)
    const elapsed = Date.now() - start
    console.log(`📶 Probe finished in ${elapsed}ms - ok=${res.ok} status=${res.status}`)

    const contentType = res.headers.get('content-type') || ''

    // If response is JSON, parse it safely
    if (contentType.includes('application/json')) {
      try {
        const data = await res.json()
        return { ok: res.ok, status: res.status, data }
      } catch (parseErr) {
        const text = await res.text().catch(() => '')
        return { ok: res.ok, status: res.status, data: null, bodyText: text, parseError: String(parseErr) }
      }
    }

    // If the server returned HTML (dev server/index page), try a direct NASA POWER probe as a useful fallback
    const text = await res.text().catch(() => '')
    if (text.trim().startsWith('<')) {
      // fallback to NASA POWER metadata endpoint
      try {
        const POWER_BASE = 'https://power.larc.nasa.gov'
        const probe = await fetch(`${POWER_BASE}/api/temporal/climatology?request=metadata`)
        if (probe.ok && (probe.headers.get('content-type') || '').includes('application/json')) {
          const pdata = await probe.json()
          return { ok: true, status: 200, data: { source: 'POWER_METADATA', metadata: pdata } }
        }
        const ptext = await probe.text().catch(() => '')
        return { ok: false, status: res.status, data: null, bodyText: text, probeBody: ptext }
      } catch (probeErr) {
        return { ok: res.ok, status: res.status, data: null, bodyText: text, probeError: String(probeErr) }
      }
    }

    // Not JSON and not HTML (or HTML didn't start with '<'), return the body text for inspection
    return { ok: res.ok, status: res.status, data: null, bodyText: text }
  } catch (error) {
    // Provide more diagnostics to help debug "Network request failed"
    try {
      console.error('Error fetching NASA status:', error)
      const probeResults: any = {}
      // Try hitting base API root and /docs to check tunnel availability
      // These are best-effort probes and won't throw the original error away.
      const probes = [
        { name: 'API_BASE', url: (URL_API_NASA || '').replace(/\/api\/v1\/weather$/, '') },
        { name: 'API_DOCS', url: (URL_API_NASA || '').replace(/\/weather$/, '') + '/docs' }
      ]
      for (const p of probes) {
        try {
          const t0 = Date.now()
          const r = await fetch(p.url)
          const t1 = Date.now()
          probeResults[p.name] = { ok: r.ok, status: r.status, timeMs: t1 - t0 }
        } catch (pe) {
          probeResults[p.name] = { error: String(pe) }
        }
      }

      console.error('Network probes results:', probeResults)
      return { ok: false, status: null, data: null, error: String(error), probes: probeResults }
    } catch (finalErr) {
      console.error('Error during diagnostic probes:', finalErr)
      return { ok: false, status: null, data: null, error: String(error) }
    }
  }
}

export const PostWeatherForecast = async (data: WeatherForecastRequest): Promise<WeatherForecastAPIResponse> => {
  try {
    const url = `${URL_API_NASA}/probability`
    console.log('➡️ Posting forecast to', url)
    console.log('➡️ Request payload:', JSON.stringify(data).substring(0, 2000))
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const contentType = res.headers.get('content-type') || ''
    // Read body once and reuse it to avoid "Already read" errors
    let bodyText = ''
    try {
      bodyText = await res.text()
    } catch (readErr) {
      bodyText = `<<unreadable body: ${String(readErr)}>>`
    }

    let parsedBody: any = null
    if (contentType.includes('application/json')) {
      try {
        parsedBody = bodyText ? JSON.parse(bodyText) : null
      } catch (parseErr) {
        parsedBody = `<<invalid json: ${String(parseErr)}>>`
      }
    }

    if (!res.ok) {
      console.error('❌ Server returned error for POST /probability:', { status: res.status, body: bodyText })
      const err: any = new Error(`HTTP ${res.status}`)
      err.status = res.status
      err.body = bodyText
      throw err
    }

    const json = contentType.includes('application/json') ? parsedBody : (bodyText ? bodyText : {})
    console.log('✅ Weather forecast posted successfully:', json)
    return json as WeatherForecastAPIResponse
  } catch (error) {
    console.error('Error posting weather forecast:', error)
    // Re-throw after logging so callers receive the richer error
    throw error
  }
}

export const createWeatherForecastRequest = (
  location: { latitude: number; longitude: number },
  targetDate: string,
  customConditions?: Partial<WeatherForecastRequest>
): WeatherForecastRequest => {
  const defaultRequest: WeatherForecastRequest = {
    conditions: [
      {
        category: "Temperatura",
        id: "temp.muy_caliente",
        rule: {
          operator: ">=",
          threshold: 32,
          unit: "°C"
        },
        variable: "T2M_MAX"
      }
    ],
    include_ai_description: true,
    location,
    target_date: targetDate,
    window_days: 7,
    years_back: 15
  }

  return { ...defaultRequest, ...(customConditions as any) }
}

const API_KEY = "68e1400920d9f427368340cfjf457e4";

export async function getCoordinates(address: string): Promise<{ lat: number; lon: number } | null> {
  // Try a list of public geocoders until one returns a usable result.
  const providers = [
    // geocode.maps.co (lightweight OpenStreetMap-based service)
    async (q: string) => {
      const url = `https://geocode.maps.co/search?q=${encodeURIComponent(q)}`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
      return null
    },
    // Nominatim (OpenStreetMap) as a fallback
    async (q: string) => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`
      const res = await fetch(url, { headers: { 'User-Agent': 'rn-movil/1.0 (+https://example.com)' } })
      if (!res.ok) return null
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
      return null
    }
  ]

  for (const fn of providers) {
    try {
      const out = await fn(address)
      if (out) return out
    } catch (err) {
      // continue to next provider
      console.warn('Geocoder provider failed:', err)
    }
  }

  console.warn('getCoordinates: no geocoder returned results for:', address)
  return null
}

export async function getLocationName(lat: number, lon: number): Promise<string | null> {
  // Try reverse geocoding with a couple of free services.
  try {
    // First: geocode.maps.co
    try {
      const url = `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data && data.address) {
          const locationName = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state || data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
          const region = data.address.state || data.address.country
          return region ? `${locationName}, ${region}` : locationName
        }
      }
    } catch (e) {
      console.warn('reverse geocode (maps.co) failed', e)
    }

    // Fallback: Nominatim
    try {
      const url2 = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      const res2 = await fetch(url2, { headers: { 'User-Agent': 'rn-movil/1.0 (+https://example.com)' } })
      if (res2.ok) {
        const d2 = await res2.json()
        if (d2 && d2.address) {
          const locationName = d2.address.city || d2.address.town || d2.address.village || d2.address.county || d2.address.state || d2.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
          const region = d2.address.state || d2.address.country
          return region ? `${locationName}, ${region}` : locationName
        }
      }
    } catch (e) {
      console.warn('reverse geocode (nominatim) failed', e)
    }

    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  } catch (error) {
    console.error('Error obteniendo nombre de ubicación:', error)
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  }
}

import type { WeatherForecastAPIResponse as WFR } from '../interfaces/in/Iresponse.API'

interface ExportData {
  data: WFR
  customName?: string
  locationName?: string
}

export const exportToCSV = ({ data, customName, locationName }: ExportData): string | void => {
  try {
    const csvLines: string[] = []
    csvLines.push(' INFORMACIÓN DEL ANÁLISIS ')
    csvLines.push('')
    csvLines.push(`Título,${escapeCSV(customName || 'Sin título')}`)
    csvLines.push(`Ubicación,${escapeCSV(data.cityName || locationName || 'No especificada')}`)
    csvLines.push(`Coordenadas,"Lat: ${data.query_info.location.latitude}, Lon: ${data.query_info.location.longitude}"`)

    if (data.startDate && data.endDate) {
      csvLines.push(`Período Analizado,${data.startDate} a ${data.endDate}`)
    }

    csvLines.push(`Fecha Objetivo,${data.query_info.target_date}`)
    csvLines.push(`Ventana de Análisis,${data.query_info.window_days} días`)
    csvLines.push(`Período Histórico,${data.query_info.analysis_period}`)
    csvLines.push(`Fecha de Análisis,${formatDate(data.metadata.analysis_completed_at || '')}`)
    csvLines.push(`Condiciones Analizadas,${data.metadata.total_conditions_analyzed || ''}`)
    csvLines.push(`Fuente de Datos,${data.metadata.data_source || ''}`)
    csvLines.push('')
    csvLines.push('')

    csvLines.push(' RESUMEN DE CONDICIONES CLIMÁTICAS ')
    csvLines.push('')
    csvLines.push('ID Condición,Nombre,Categoría,Probabilidad,Eventos,Total Días,Intervalo Confianza,Prob. Raw')

    data.results.forEach(result => {
      csvLines.push([
        escapeCSV(result.condition_id),
        escapeCSV(result.condition_label),
        escapeCSV(result.category),
        result.stats.probability_percent,
        result.stats.events_count,
        result.stats.total_days,
        result.stats.confidence_interval_95,
        result.stats.raw_probability.toFixed(4)
      ].join(','))
    })

    csvLines.push('')
    csvLines.push('')

    if (data.general_summary) {
      csvLines.push(' ANÁLISIS GENERAL GENERADO POR IA ')
      csvLines.push('')
      csvLines.push('Descripción Completa')
      csvLines.push(escapeCSV(data.general_summary))
      csvLines.push('')
      csvLines.push('')
    }

    csvLines.push(' PROBABILIDADES POR DÍA (DATOS DE GRÁFICAS)')
    csvLines.push('')

    if (data.window_chart_data?.probabilities_by_event) {
      const events = Object.entries(data.window_chart_data.probabilities_by_event)
      if (events.length > 0) {
        const dateLabels = data.window_chart_data.date_labels || []
        const headers = ['Fecha', ...events.map(([_, eventData]) => escapeCSV((eventData as any).label))]
        csvLines.push(headers.join(','))
        dateLabels.forEach((date: string, dayIndex: number) => {
          const row = [date]
          events.forEach(([_, eventData]) => {
            const value = (eventData as any).values[dayIndex]
            row.push(value !== undefined ? `${value.toFixed(2)}%` : 'N/A')
          })
          csvLines.push(row.join(','))
        })
      } else {
        csvLines.push('No hay datos de probabilidades diarias disponibles')
      }
    } else {
      csvLines.push('No hay datos de gráficas disponibles')
    }

    csvLines.push('')
    csvLines.push('')

    csvLines.push(' ESTADÍSTICAS DETALLADAS POR CONDICIÓN ')
    csvLines.push('')

    data.results.forEach((result, index) => {
      csvLines.push(`--- Condición ${index + 1}: ${escapeCSV(result.condition_label)} ---`)
      csvLines.push(`ID,${escapeCSV(result.condition_id)}`)
      csvLines.push(`Categoría,${escapeCSV(result.category)}`)
      csvLines.push('')

      csvLines.push('Métrica,Valor')
      csvLines.push(`Probabilidad,${result.stats.probability_percent}`)
      csvLines.push(`Eventos Contados,${result.stats.events_count}`)
      csvLines.push(`Total de Días Analizados,${result.stats.total_days}`)
      csvLines.push(`Intervalo de Confianza 95%,${result.stats.confidence_interval_95}`)
      csvLines.push(`Probabilidad Raw,${result.stats.raw_probability.toFixed(4)}`)

      if (result.ai_description) {
        csvLines.push('')
        csvLines.push('Descripción IA')
        csvLines.push(escapeCSV(result.ai_description))
      }

      csvLines.push('')
    })

    const csvContent = csvLines.join('\n')

    // In a web environment we trigger download. In React Native return the CSV string so caller can handle it.
    if (typeof document !== 'undefined') {
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const fileName = generateFileName(customName, data.startDate)
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log('✅ CSV exportado exitosamente:', fileName)
      return
    }

    return csvContent
  } catch (error) {
    console.error('❌ Error al exportar CSV:', error)
    throw error
  }
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes(';')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function formatDate(isoDate: string): string {
  try {
    if (!isoDate) return ''
    const date = new Date(isoDate)
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return isoDate
  }
}

function generateFileName(customName?: string, startDate?: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().split('T')[0]
  let baseName = 'analisis_climatico'
  if (customName) {
    baseName = customName
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
  } else if (startDate) {
    baseName = `analisis_${startDate}`
  }
  return `${baseName}_${timestamp}.${extension}`
}

export const exportToJSON = ({ data, customName, locationName }: ExportData): string | void => {
  try {
    const exportData = {
      metadata: {
        titulo: customName || 'Sin título',
        ubicacion: data.cityName || locationName || 'No especificada',
        coordenadas: {
          latitud: data.query_info.location.latitude,
          longitud: data.query_info.location.longitude
        },
        periodo_analizado: data.startDate && data.endDate 
          ? { inicio: data.startDate, fin: data.endDate }
          : null,
        fecha_objetivo: data.query_info.target_date,
        ventana_analisis_dias: data.query_info.window_days,
        periodo_historico: data.query_info.analysis_period,
        fecha_analisis: data.metadata.analysis_completed_at,
        condiciones_analizadas: data.metadata.total_conditions_analyzed,
        fuente_datos: data.metadata.data_source,
        descripcion_ia_incluida: data.metadata.ai_descriptions_included
      },
      analisis_general: { resumen: data.general_summary },
      condiciones: data.results.map(result => ({
        id: result.condition_id,
        nombre: result.condition_label,
        categoria: result.category,
        estadisticas: {
          probabilidad: result.stats.probability_percent,
          probabilidad_raw: result.stats.raw_probability,
          eventos_contados: result.stats.events_count,
          total_dias_analizados: result.stats.total_days,
          intervalo_confianza_95: result.stats.confidence_interval_95
        },
        descripcion_ia: result.ai_description
      })),
      datos_graficas: data.window_chart_data ? {
        fechas: data.window_chart_data.date_labels,
        info_ventana: data.window_chart_data.window_info,
        probabilidades_por_evento: Object.entries(data.window_chart_data.probabilities_by_event || {}).map(([eventId, eventData]: [string, any]) => ({
          id_evento: eventId,
          nombre: eventData.label,
          probabilidad_base: eventData.base_probability,
          valores_diarios: eventData.values
        })),
        indice_dia_objetivo: data.window_chart_data.target_day_index
      } : null,
      datos_completos_api: data
    }

    const jsonString = JSON.stringify(exportData, null, 2)

    if (typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
      const link = document.createElement('a')
      const fileName = generateFileName(customName, data.startDate, 'json')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log('✅ JSON exportado exitosamente:', fileName)
      return
    }

    return jsonString
  } catch (error) {
    console.error('❌ Error al exportar JSON:', error)
    throw error
  }
}

export default {
  GetStatus,
  PostWeatherForecast,
  createWeatherForecastRequest,
  getCoordinates,
  getLocationName,
  exportToCSV,
  exportToJSON
}
