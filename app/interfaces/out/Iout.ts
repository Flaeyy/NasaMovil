// Minimal outbound request interfaces for weather forecast
export interface ConditionRule {
  operator: string
  threshold: number
  unit?: string
}

export interface Condition {
  category: string
  id: string
  rule: ConditionRule
  variable: string
}

export interface WeatherForecastRequest {
  conditions: Condition[]
  include_ai_description: boolean
  location: { latitude: number; longitude: number }
  target_date: string
  window_days: number
  years_back: number
}

export default WeatherForecastRequest
