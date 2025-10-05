import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useNavigation } from '@react-navigation/native'
import { useWeatherResults } from '../_contexts/WeatherResultsContext'
import type { WeatherForecastAPIResponse } from '../interfaces/in/Iresponse.API'

type ExtendedWeatherResult = WeatherForecastAPIResponse & { customName?: string; locationName?: string }

export default function PeticionesScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { results, removeResult, clearAllResults } = useWeatherResults()

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
              <TouchableOpacity onPress={() => { window.dispatchEvent(new CustomEvent('expandAllCards')) }} style={[styles.actionBtn, styles.greenBtn]}>
                <Text style={styles.actionBtnText}>📂</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { window.dispatchEvent(new CustomEvent('minimizeAllCards')) }} style={[styles.actionBtn, styles.purpleBtn]}>
                <Text style={styles.actionBtnText}>📁</Text>
              </TouchableOpacity>
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
                <View key={`${r.metadata.analysis_completed_at}-${idx}`} style={[{ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 }, styles.resultCardContainer]}>
                  <Text style={{ fontWeight: '800', color: '#0B3D91' }}>{r.customName || (r.startDate ? `Predicción ${r.startDate}` : `Análisis #${idx+1}`)}</Text>
                  <Text style={{ color: '#374151', marginTop: 6 }}>{r.cityName || `${r.query_info.location.latitude}, ${r.query_info.location.longitude}`}</Text>
                  <Text style={{ color: '#919191', marginTop: 6 }}>{r.query_info?.target_date ?? 'N/A'}</Text>
                  <View style={{ marginTop: 8, flexDirection: 'row' }}>
                    <TouchableOpacity style={{ backgroundColor: '#10B981', padding: 8, borderRadius: 8, marginRight: 8 }} onPress={() => { /* open map modal */ }}>
                      <Text style={{ color: '#fff' }}>🔥 Ver Mapa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ backgroundColor: '#3B82F6', padding: 8, borderRadius: 8, marginRight: 8 }} onPress={() => { /* download JSON */ }}>
                      <Text style={{ color: '#fff' }}>📋 JSON</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ backgroundColor: '#10B981', padding: 8, borderRadius: 8 }} onPress={() => { /* download CSV */ }}>
                      <Text style={{ color: '#fff' }}>⬇ CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => removeResult(idx)}>
                      <Text style={{ color: '#FC3D21' }}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
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
    </ScrollView>
  )
}

const styles = {
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as any,
  headerTitleWrap: { flex: 1 } as any,
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0B3D91' } as any,
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
}
