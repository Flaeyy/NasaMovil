// Minimal shapes for API responses used by the services
export interface ResultStats {
  probability_percent: number | string
  raw_probability: number
  events_count: number
  total_days: number
  confidence_interval_95: string
}

export interface ResultItem {
  condition_id: string
  condition_label: string
  category: string
  stats: ResultStats
  ai_description?: string
}

export interface WindowChartData {
  date_labels?: string[]
  probabilities_by_event?: Record<string, { label: string; values: number[]; base_probability?: number }>
  window_info?: any
  target_day_index?: number
}

export interface QueryInfo {
  location: { latitude: number; longitude: number }
  target_date: string
  window_days: number
  analysis_period?: string
}

export interface Metadata {
  analysis_completed_at?: string
  total_conditions_analyzed?: number
  data_source?: string
  ai_descriptions_included?: boolean
}

export interface WeatherForecastAPIResponse {
  startDate?: string
  endDate?: string
  cityName?: string
  query_info: QueryInfo
  metadata: Metadata
  results: ResultItem[]
  window_chart_data?: WindowChartData
  general_summary?: string
}

export default WeatherForecastAPIResponse
