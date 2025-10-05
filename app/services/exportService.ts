// Servicio para exportar datos de pronósticos a CSV y JSON para React Native
import { Platform, Alert } from 'react-native'
import * as Sharing from 'expo-sharing'
import type { WeatherForecastAPIResponse } from '../interfaces/in/Iresponse.API'

interface ExportData {
  data: WeatherForecastAPIResponse
  customName?: string
  locationName?: string
}

/**
 * Convierte los datos del pronóstico a formato CSV con estructura organizada
 */
export const exportToCSV = async ({ data, customName, locationName }: ExportData): Promise<void> => {
  try {
    const csvLines: string[] = []
    
    // ==================== SECCIÓN 1: INFORMACIÓN GENERAL ====================
    csvLines.push('=== INFORMACIÓN DEL ANÁLISIS ===')
    csvLines.push('')
    csvLines.push(`Título,${escapeCSV(customName || 'Sin título')}`)
    csvLines.push(`Ubicación,${escapeCSV(data.cityName || locationName || 'No especificada')}`)
    csvLines.push(`Coordenadas,"Lat: ${data.query_info.location.latitude}, Lon: ${data.query_info.location.longitude}"`)
    
    // Fechas del análisis
    if (data.startDate && data.endDate) {
      csvLines.push(`Período Analizado,${data.startDate} a ${data.endDate}`)
    }
    
    csvLines.push(`Fecha Objetivo,${data.query_info.target_date}`)
    csvLines.push(`Ventana de Análisis,${data.query_info.window_days} días`)
    csvLines.push(`Período Histórico,${data.query_info.analysis_period || 'N/A'}`)
    csvLines.push(`Fecha de Análisis,${formatDate(data.metadata.analysis_completed_at)}`)
    csvLines.push(`Condiciones Analizadas,${data.metadata.total_conditions_analyzed}`)
    csvLines.push(`Fuente de Datos,${data.metadata.data_source || 'N/A'}`)
    csvLines.push('')
    csvLines.push('')
    
    // ==================== SECCIÓN 2: RESUMEN DE CONDICIONES ====================
    csvLines.push('=== RESUMEN DE CONDICIONES CLIMÁTICAS ===')
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
    
    // ==================== SECCIÓN 3: DESCRIPCIÓN DE IA ====================
    if (data.general_summary) {
      csvLines.push('=== ANÁLISIS GENERAL GENERADO POR IA ===')
      csvLines.push('')
      csvLines.push('Descripción Completa')
      csvLines.push(escapeCSV(data.general_summary))
      csvLines.push('')
      csvLines.push('')
    }
    
    // ==================== SECCIÓN 4: PROBABILIDADES DIARIAS ====================
    csvLines.push('=== PROBABILIDADES POR DÍA (DATOS DE GRÁFICAS) ===')
    csvLines.push('')
    
    // Verificar si hay datos de probabilidad por día
    if (data.window_chart_data?.probabilities_by_event) {
      const events = Object.entries(data.window_chart_data.probabilities_by_event)
      
      if (events.length > 0) {
        // Encabezado: Fecha + nombre de cada condición
        const dateLabels = data.window_chart_data.date_labels || []
        const headers = ['Fecha', ...events.map(([_, eventData]) => escapeCSV((eventData as any).label))]
        csvLines.push(headers.join(','))
        
        // Filas: cada fecha con las probabilidades de todas las condiciones
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
    
    // ==================== SECCIÓN 5: ESTADÍSTICAS ADICIONALES ====================
    csvLines.push('=== ESTADÍSTICAS DETALLADAS POR CONDICIÓN ===')
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
      
      // Descripción de IA específica de la condición
      if (result.ai_description) {
        csvLines.push('')
        csvLines.push('Descripción IA')
        csvLines.push(escapeCSV(result.ai_description))
      }
      
      csvLines.push('')
    })
    
    // ==================== GENERAR Y COMPARTIR ARCHIVO ====================
    const csvContent = '\ufeff' + csvLines.join('\n')
    const fileName = generateFileName(customName, data.startDate, 'csv')
    
    await shareContent(csvContent, fileName, 'text/csv')
    
    console.log('✅ CSV exportado exitosamente:', fileName)
  } catch (error) {
    console.error('❌ Error al exportar CSV:', error)
    Alert.alert('Error', 'No se pudo generar el archivo CSV. Por favor intenta de nuevo.')
    throw error
  }
}

/**
 * Exporta los datos del pronóstico a formato JSON con estructura completa
 */
export const exportToJSON = async ({ data, customName, locationName }: ExportData): Promise<void> => {
  try {
    // Crear objeto estructurado con toda la información
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
      
      analisis_general: {
        resumen: data.general_summary
      },
      
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
    
    // Convertir a JSON con formato legible
    const jsonString = JSON.stringify(exportData, null, 2)
    const fileName = generateFileName(customName, data.startDate, 'json')
    
    await shareContent(jsonString, fileName, 'application/json')
    
    console.log('✅ JSON exportado exitosamente:', fileName)
  } catch (error) {
    console.error('❌ Error al exportar JSON:', error)
    Alert.alert('Error', 'No se pudo generar el archivo JSON. Por favor intenta de nuevo.')
    throw error
  }
}

/**
 * Comparte el contenido como archivo usando expo-sharing
 */
async function shareContent(content: string, fileName: string, mimeType: string): Promise<void> {
  try {
    // Para React Native necesitamos usar react-native-fs o similar
    // Por ahora, solo mostraremos el contenido en consola y un alert
    console.log('📄 Contenido generado:', content.substring(0, 200) + '...')
    
    // Verificar si sharing está disponible
    const isAvailable = await Sharing.isAvailableAsync()
    
    if (!isAvailable) {
      // Si no está disponible sharing, al menos mostramos un mensaje
      Alert.alert(
        'Archivo generado',
        `El archivo ${fileName} fue generado correctamente. Contenido disponible en consola.`,
        [
          { text: 'Ver en consola', onPress: () => console.log('Contenido completo:', content) },
          { text: 'OK' }
        ]
      )
      return
    }
    
    // Intentar compartir usando expo-sharing con FileSystem
    // Como workaround, usaremos data URI
    if (Platform.OS === 'web') {
      // En web, crear un blob y descargarlo
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
      Alert.alert('Éxito', `Archivo ${fileName} descargado`)
    } else {
      // En móvil, mostrar mensaje con opción de copiar
      Alert.alert(
        'Archivo generado',
        `El archivo ${fileName} fue generado. El contenido está disponible en la consola de desarrollo.`,
        [
          { text: 'Ver en consola', onPress: () => console.log(`\n\n=== ${fileName} ===\n\n${content}\n\n`) },
          { text: 'OK' }
        ]
      )
    }
  } catch (error) {
    console.error('Error compartiendo contenido:', error)
    throw error
  }
}

/**
 * Escapa caracteres especiales para CSV
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  
  const stringValue = String(value)
  
  // Si contiene coma, comillas, saltos de línea o punto y coma, envolver en comillas
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes(';')) {
    // Escapar comillas dobles duplicándolas
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Formatea fecha ISO a formato legible
 */
function formatDate(isoDate?: string): string {
  if (!isoDate) return 'N/A'
  
  try {
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

/**
 * Genera nombre de archivo descriptivo
 */
function generateFileName(customName?: string, startDate?: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  
  let baseName = 'analisis_climatico'
  
  if (customName) {
    // Limpiar nombre personalizado para usar en archivo
    baseName = customName
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50) // Limitar longitud
  } else if (startDate) {
    baseName = `analisis_${startDate}`
  }
  
  return `${baseName}_${timestamp}.${extension}`
}
