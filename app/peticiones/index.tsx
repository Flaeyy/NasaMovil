import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Platform, Alert, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useWeatherResults } from '../_contexts/WeatherResultsContext'
import type { WeatherForecastAPIResponse } from '../interfaces/in/Iresponse.API'
import { exportToCSV, exportToJSON } from '../services/exportService'

type ExtendedWeatherResult = WeatherForecastAPIResponse & { customName?: string; locationName?: string }

export default function PeticionesScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const route = useRoute()
  const { results, removeResult, clearAllResults, addResult } = useWeatherResults()
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedResult, setSelectedResult] = useState<ExtendedWeatherResult | null>(null)
  const [selectedCondition, setSelectedCondition] = useState<string>('all')

  // Handle incoming result from Consulta screen via navigation params
  useEffect(() => {
    const params: any = (route && (route as any).params) || {}
    if (params.result) {
      try {
        const incomingResult = typeof params.result === 'string' ? JSON.parse(params.result) : params.result
        // Check if this result already exists (avoid duplicates)
        const exists = results.some(r => r.metadata?.analysis_completed_at === incomingResult.metadata?.analysis_completed_at)
        if (!exists) {
          addResult(incomingResult)
        }
        // Clear the param to avoid re-adding on every render
        try {
          ;(navigation as any).setParams?.({ result: undefined })
        } catch {}
      } catch (e) {
        console.warn('Failed to parse incoming result param', e)
      }
    }
  }, [route])

  useEffect(() => {
    // On entering Peticiones, expand all cards by default to show full details
    const map: Record<number, boolean> = {}
    results.forEach((_, i) => { map[i] = true })
    setExpanded(map)
  }, [results])

  const toggleExpand = (index: number) => setExpanded(prev => ({ ...prev, [index]: !prev[index] }))

  const handleExportCSV = async (r: ExtendedWeatherResult) => {
    try {
      await exportToCSV({ 
        data: r, 
        customName: r.customName,
        locationName: r.locationName 
      })
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'No se pudo generar el archivo CSV')
    }
  }

  const handleExportJSON = async (r: ExtendedWeatherResult) => {
    try {
      await exportToJSON({ 
        data: r,
        customName: r.customName,
        locationName: r.locationName
      })
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'No se pudo generar el archivo JSON')
    }
  }

  React.useEffect(() => {
    // ensure the top native header shows a friendly title instead of the route path
    try {
      ;(navigation as any).setOptions?.({ title: 'Peticiones' })
    } catch (e) {}
  }, [navigation])

  return (
    <ScrollView contentContainerStyle={{ padding: 12, backgroundColor: '#f3f4f6', flexGrow: 1 }}>
      <View style={{ maxWidth: 900, alignSelf: 'center' }}>
        <View style={{ marginBottom: 6, alignItems: 'center' }}>
          <Text style={styles.headerTitleCentered}>📊 Peticiones Climáticas</Text>
          <Text style={styles.headerSubtitleCentered}>{results.length > 0 ? `${results.length} análisis disponibles` : 'Gestiona tus análisis climáticos'}</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => router.push('/consulta')} style={[styles.actionBtn, styles.primaryBtn]}>
            <Text style={styles.actionBtnText}>🔍 Nuevo Análisis</Text>
          </TouchableOpacity>

          {results.length > 0 && (
            <>
              {Platform.OS === 'web' && (
                <>
                  <TouchableOpacity onPress={() => { try { (globalThis as any).dispatchEvent(new CustomEvent('expandAllCards')) } catch {} }} style={[styles.actionBtn, styles.greenBtn]}>
                    <Text style={styles.actionBtnText}>📂</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { try { (globalThis as any).dispatchEvent(new CustomEvent('minimizeAllCards')) } catch {} }} style={[styles.actionBtn, styles.purpleBtn]}>
                    <Text style={styles.actionBtnText}>📁</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={clearAllResults} style={[styles.actionBtn, styles.redBtn]}>
                <Text style={styles.actionBtnText}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {results.length > 0 ? (
          <>
            {results.map((r0, idx) => {
              const r = r0 as ExtendedWeatherResult
              return (
                <View key={`${r.metadata.analysis_completed_at}-${idx}`} style={styles.cardContainer}>
                  <TouchableOpacity onPress={() => toggleExpand(idx)} style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{r.customName || (r.startDate ? `Predicción del ${r.startDate}` : `Análisis #${idx+1}`)}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardLocation} numberOfLines={1}>📍 {r.cityName || `${r.query_info?.location?.latitude?.toFixed(2) ?? 'N/A'}, ${r.query_info?.location?.longitude?.toFixed(2) ?? 'N/A'}`}</Text>
                    <Text style={styles.cardDate}>{r.query_info?.target_date ?? 'N/A'}</Text>
                  </View>

                  {expanded[idx] && (
                    <View style={styles.expandedContent}>
                      <TouchableOpacity 
                        style={styles.mapButton} 
                        onPress={() => {
                          setSelectedResult(r)
                          setSelectedCondition('all')
                          setModalVisible(true)
                        }}
                      >
                        <Text style={styles.mapButtonText}>🔥 Ver Mapa de Intensidad</Text>
                      </TouchableOpacity>

                      {r.general_summary && (
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryTitle}>� Resumen General</Text>
                          <Text style={styles.summaryText}>{r.general_summary}</Text>
                        </View>
                      )}

                      <View style={styles.conditionsSection}>
                        <Text style={styles.conditionsSectionTitle}>Análisis Detallado por Condición</Text>
                        {r.results && r.results.length > 0 ? r.results.map((c, ci) => (
                          <View key={c.condition_id || ci} style={styles.conditionCard}>
                            <View style={styles.conditionRow}>
                              <Text style={styles.conditionLabel} numberOfLines={2}>{c.condition_label}</Text>
                              <View style={styles.probabilityBadge}>
                                <Text style={styles.probabilityText}>{String(c.stats?.probability_percent ?? 0)}%</Text>
                                <Text style={styles.probabilityLabel}>Probabilidad</Text>
                              </View>
                            </View>
                            <Text style={styles.conditionCategory}>{c.category}</Text>
                          </View>
                        )) : <Text style={styles.noConditions}>No hay condiciones en este análisis.</Text>}
                      </View>

                      <View style={styles.actionsFooter}>
                        <TouchableOpacity onPress={() => handleExportCSV(r)} style={styles.exportButton}>
                          <Text style={styles.exportButtonText}>⬇ CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleExportJSON(r)} style={[styles.exportButton, { backgroundColor: '#7C3AED' }]}>
                          <Text style={styles.exportButtonText}>📋 JSON</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => removeResult(idx)}>
                          <Text style={styles.deleteButtonText}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )
            })}
          </>
        ) : (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151' }}>No hay análisis disponibles</Text>
            <Text style={{ color: '#6b7280', marginTop: 8 }}>Crea un nuevo análisis climático usando el formulario principal</Text>
            <TouchableOpacity onPress={() => router.push('/consulta')} style={{ marginTop: 12, backgroundColor: '#14B8A6', padding: 12, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>🚀 Crear Análisis</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal de Intensidad */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔥 Mapa de Intensidad de Probabilidades</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedResult && (
              <>
                {/* Escala de Intensidad */}
                <View style={styles.intensityScale}>
                  <Text style={styles.intensityScaleTitle}>Escala de Intensidad</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.intensityRow}>
                      <View style={[styles.intensityBox, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.intensityLabel}>Muy{`\n`}Bajo</Text>
                        <Text style={styles.intensityRange}>0-20%</Text>
                      </View>
                      <View style={[styles.intensityBox, { backgroundColor: '#FBBF24' }]}>
                        <Text style={styles.intensityLabel}>Bajo</Text>
                        <Text style={styles.intensityRange}>21-40%</Text>
                      </View>
                      <View style={[styles.intensityBox, { backgroundColor: '#FB923C' }]}>
                        <Text style={styles.intensityLabel}>Medio</Text>
                        <Text style={styles.intensityRange}>41-60{`\n`}%</Text>
                      </View>
                      <View style={[styles.intensityBox, { backgroundColor: '#F97316' }]}>
                        <Text style={styles.intensityLabel}>Alto</Text>
                        <Text style={styles.intensityRange}>61-80{`\n`}%</Text>
                      </View>
                      <View style={[styles.intensityBox, { backgroundColor: '#DC2626' }]}>
                        <Text style={styles.intensityLabel}>Muy{`\n`}Alto</Text>
                        <Text style={styles.intensityRange}>81-100%</Text>
                      </View>
                    </View>
                  </ScrollView>
                </View>

                {/* Filtros de Condición */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterTitle}>Filtrar por Condición</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity 
                      style={[styles.filterPill, selectedCondition === 'all' && styles.filterPillActive]}
                      onPress={() => setSelectedCondition('all')}
                    >
                      <Text style={[styles.filterPillText, selectedCondition === 'all' && styles.filterPillTextActive]}>
                        Todas
                      </Text>
                    </TouchableOpacity>
                    {selectedResult.results?.map((cond, idx) => (
                      <TouchableOpacity 
                        key={cond.condition_id || idx}
                        style={[styles.filterPill, selectedCondition === cond.condition_id && styles.filterPillActive]}
                        onPress={() => setSelectedCondition(cond.condition_id || 'all')}
                      >
                        <Text style={[styles.filterPillText, selectedCondition === cond.condition_id && styles.filterPillTextActive]} numberOfLines={1}>
                          {cond.condition_label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Gráfica de Probabilidades */}
                <View style={styles.chartSection}>
                  <Text style={styles.chartTitle}>Probabilidades por Día</Text>
                  {selectedResult.window_chart_data?.date_labels && selectedResult.window_chart_data?.probabilities_by_event ? (
                    <>
                      {selectedResult.results
                        ?.filter(r => selectedCondition === 'all' || r.condition_id === selectedCondition)
                        .map((condition, condIdx) => {
                          // probabilities_by_event es un objeto, no un array
                          const eventData = selectedResult.window_chart_data?.probabilities_by_event?.[condition.condition_id]
                          return (
                            <View key={condition.condition_id || condIdx} style={styles.chartRow}>
                              <Text style={styles.chartConditionName} numberOfLines={2}>{condition.condition_label}</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                                <View style={styles.probabilityGrid}>
                                  {selectedResult.window_chart_data?.date_labels?.map((date, dateIdx) => {
                                    const prob = eventData?.values?.[dateIdx] ?? 0
                                    const color = getProbabilityColor(prob)
                                    // Quitar el año de la fecha (YYYY-MM-DD -> MM-DD)
                                    const shortDate = date.split('-').slice(1).join('-')
                                    return (
                                      <View key={dateIdx} style={styles.gridColumn}>
                                        <Text style={styles.gridDate}>{shortDate}</Text>
                                        <View style={[styles.gridCell, { backgroundColor: color }]}>
                                          <Text style={styles.gridValue}>{Math.round(prob)}%</Text>
                                        </View>
                                      </View>
                                    )
                                  })}
                                </View>
                              </ScrollView>
                            </View>
                          )
                        })}
                      
                      {/* Información del Rango */}
                      <View style={styles.rangeInfo}>
                        <Text style={styles.rangeInfoText}>
                          📅 Período: {selectedResult.window_chart_data.date_labels[0]} - {selectedResult.window_chart_data.date_labels[selectedResult.window_chart_data.date_labels.length - 1]}
                        </Text>
                        <Text style={styles.rangeInfoText}>
                          📊 Total de días analizados: {selectedResult.window_chart_data.date_labels.length}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.noDataText}>No hay datos de gráfica disponibles</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  )
}

// Función helper para obtener color según probabilidad
function getProbabilityColor(probability: number): string {
  if (probability <= 20) return '#10B981'
  if (probability <= 40) return '#FBBF24'
  if (probability <= 60) return '#FB923C'
  if (probability <= 80) return '#F97316'
  return '#DC2626'
}

const styles = {
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as any,
  headerTitleWrap: { flex: 1 } as any,
  headerTitle: { fontSize: 28, fontWeight: '400', color: '#0B3D91' } as any,
  headerSubtitle: { color: '#919191', marginTop: 4 } as any,
  headerTitleCentered: { fontSize: 24, fontWeight: '800', color: '#0B3D91', textAlign: 'center' } as any,
  headerSubtitleCentered: { color: '#919191', marginTop: 4, textAlign: 'center' } as any,
  headerActions: { flexDirection: 'row', alignItems: 'center' } as any,
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 } as any,
  actionBtn: { padding: 10, borderRadius: 8, marginLeft: 8 } as any,
  primaryBtn: { backgroundColor: '#0b63ff' } as any,
  greenBtn: { backgroundColor: '#10B981' } as any,
  purpleBtn: { backgroundColor: '#A855F7' } as any,
  redBtn: { backgroundColor: '#FC3D21' } as any,
  actionBtnText: { color: '#fff', fontWeight: '700' } as any,
  resultCardContainer: { maxWidth: 720, alignSelf: 'stretch' } as any,
  // Card styles
  cardContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, maxWidth: 720, alignSelf: 'stretch' } as any,
  cardHeader: { marginBottom: 8 } as any,
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0B3D91', flexShrink: 1 } as any,
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 } as any,
  cardLocation: { flex: 1, color: '#374151', fontSize: 13, marginRight: 8 } as any,
  cardDate: { color: '#919191', fontSize: 13 } as any,
  expandedContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 } as any,
  mapButton: { backgroundColor: '#ef4444', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 } as any,
  mapButtonText: { color: '#fff', fontWeight: '800' } as any,
  summaryBox: { backgroundColor: '#ecfdf5', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#d1fae5', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#10b981' } as any,
  summaryTitle: { fontWeight: '800', color: '#065f46', fontSize: 14 } as any,
  summaryText: { color: '#065f46', marginTop: 6, lineHeight: 20 } as any,
  conditionsSection: { marginBottom: 12 } as any,
  conditionsSectionTitle: { fontWeight: '800', color: '#0B3D91', marginBottom: 10, fontSize: 15 } as any,
  conditionCard: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' } as any,
  conditionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any,
  conditionLabel: { flex: 1, fontWeight: '700', fontSize: 14, color: '#1e293b', marginRight: 12 } as any,
  probabilityBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center', minWidth: 60 } as any,
  probabilityText: { fontWeight: '800', color: '#0B3D91', fontSize: 16 } as any,
  probabilityLabel: { fontSize: 10, color: '#64748b', marginTop: 2 } as any,
  conditionCategory: { color: '#64748b', marginTop: 6, fontSize: 12 } as any,
  noConditions: { color: '#94a3b8', textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' } as any,
  actionsFooter: { flexDirection: 'row', gap: 8, marginTop: 8 } as any,
  exportButton: { flex: 1, backgroundColor: '#10B981', padding: 10, borderRadius: 8, alignItems: 'center' } as any,
  exportButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 } as any,
  deleteButton: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' } as any,
  deleteButtonText: { color: '#dc2626', fontWeight: '600', fontSize: 13 } as any,
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#fff' } as any,
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#0B3D91', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' } as any,
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 } as any,
  closeButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' } as any,
  closeButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' } as any,
  modalContent: { padding: 16 } as any,
  intensityScale: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' } as any,
  intensityScaleTitle: { fontSize: 16, fontWeight: '800', color: '#0B3D91', marginBottom: 12 } as any,
  intensityRow: { flexDirection: 'row', gap: 6 } as any,
  intensityBox: { width: 70, padding: 10, borderRadius: 8, alignItems: 'center', minHeight: 70, justifyContent: 'center' } as any,
  intensityLabel: { color: '#fff', fontWeight: '700', fontSize: 10, textAlign: 'center', lineHeight: 13 } as any,
  intensityRange: { color: '#fff', fontSize: 9, marginTop: 4, fontWeight: '600', textAlign: 'center', lineHeight: 11 } as any,
  filterSection: { marginBottom: 16 } as any,
  filterTitle: { fontSize: 16, fontWeight: '800', color: '#0B3D91', marginBottom: 10 } as any,
  filterPill: { backgroundColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: 'transparent' } as any,
  filterPillActive: { backgroundColor: '#dbeafe', borderColor: '#0B3D91' } as any,
  filterPillText: { color: '#374151', fontWeight: '600', fontSize: 13 } as any,
  filterPillTextActive: { color: '#0B3D91', fontWeight: '800' } as any,
  chartSection: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' } as any,
  chartTitle: { fontSize: 18, fontWeight: '800', color: '#0B3D91', marginBottom: 12 } as any,
  chartRow: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' } as any,
  chartConditionName: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 10, paddingHorizontal: 4 } as any,
  probabilityGrid: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 } as any,
  gridColumn: { alignItems: 'center' } as any,
  gridDate: { fontSize: 9, color: '#64748b', marginBottom: 4, fontWeight: '600', width: 55, textAlign: 'center' } as any,
  gridCell: { width: 55, height: 55, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' } as any,
  gridValue: { color: '#fff', fontWeight: '800', fontSize: 13 } as any,
  rangeInfo: { marginTop: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#0B3D91' } as any,
  rangeInfoText: { color: '#1e40af', fontSize: 13, fontWeight: '600', marginBottom: 4 } as any,
  noDataText: { color: '#94a3b8', textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' } as any,
}
