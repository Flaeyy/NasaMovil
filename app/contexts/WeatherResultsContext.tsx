import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WeatherForecastAPIResponse } from '../interfaces/in/Iresponse.API'

type WeatherResultsContextType = {
  results: WeatherForecastAPIResponse[]
  addResult: (r: WeatherForecastAPIResponse) => void
  removeResult: (index: number) => void
  clearAllResults: () => void
  updateResultName: (index: number, name: string) => void
}

const KEY = '@nasa_movile_results_v1'
const WeatherResultsContext = createContext<WeatherResultsContextType | undefined>(undefined)

export const WeatherResultsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [results, setResults] = useState<WeatherForecastAPIResponse[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY)
        if (raw) setResults(JSON.parse(raw))
      } catch (e) {
        console.warn('Failed to load results from storage', e)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(results))
      } catch (e) {
        console.warn('Failed to save results', e)
      }
    })()
  }, [results])

  const addResult = (r: WeatherForecastAPIResponse) => setResults(prev => [r, ...prev])
  const removeResult = (index: number) => setResults(prev => prev.filter((_, i) => i !== index))
  const clearAllResults = () => setResults([])
  const updateResultName = (index: number, name: string) => setResults(prev => prev.map((r, i) => i === index ? { ...r, customName: name } : r))

  return (
    <WeatherResultsContext.Provider value={{ results, addResult, removeResult, clearAllResults, updateResultName }}>
      {children}
    </WeatherResultsContext.Provider>
  )
}

export function useWeatherResults() {
  const ctx = useContext(WeatherResultsContext)
  if (!ctx) throw new Error('useWeatherResults must be used inside WeatherResultsProvider')
  return ctx
}
