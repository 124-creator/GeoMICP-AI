import { demoCarbonSchemes, demoSamples, demoShapFeatures, demoSummary, makeDemoPrediction, makeDemoReport } from './demo-data'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function buildApiUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const path = url.startsWith('/') ? url : '/' + url
  if (!API_BASE_URL) return path
  return API_BASE_URL.replace(/\/$/, '') + path
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

async function parseJSON<T>(response: Response, url: string): Promise<T> {
  if (!response.ok) {
    throw new Error(url + ' 请求失败：' + response.status)
  }

  return (await response.json()) as T
}

export interface ModelMetrics {
  model?: string
  train_sample_count?: number
  train_positive_count?: number
  train_negative_count?: number
  auc?: number | string
  f2?: number | string
  recall?: number | string
  spatial_auc?: number | string
  note?: string
}

export interface SummaryPayload {
  platform_name?: string
  sample_count?: number
  positive_label_count?: number
  high_risk_count?: number
  extreme_risk_count?: number
  micp_recommended_count?: number
  low_carbon_priority_count?: number
  avg_recommended_carbon?: number
  avg_micp_saving_vs_shotcrete_pct?: number
  risk_distribution?: Record<string, number>
  micp_suitability_distribution?: Record<string, number>
  recommended_strategy_distribution?: Record<string, number>
  low_carbon_grade_distribution?: Record<string, number>
  model_metrics?: ModelMetrics
  scope_note?: string
}

export interface SamplePayload {
  sample_id: string
  true_label?: number
  longitude: number
  latitude: number
  risk_probability?: number
  risk_level?: string
  risk_color?: string
  micp_suitability?: string
  micp_suitability_score?: number
  soil_texture_proxy?: string
  recommended_strategy?: string
  recommended_method?: string
  recommended_intensity?: string
  cementation_solution_mol_L?: string
  suggested_treatment_rounds?: string
  environmental_warning?: string
  engineering_notes?: string
  rule_hits?: string
  slope_deg?: number
  ndvi_30d?: number
  rainfall_max3_30d?: number
  rainfall_7d?: number
  river_distance_m?: number
  clay_pct?: number
  sand_pct?: number
  silt_pct?: number
  ph?: number
  recommended_carbon?: number
  carbon_saving_vs_shotcrete_pct?: number
  carbon_saving_vs_cement_soil_pct?: number
  eco_disturbance_score?: number
  water_environment_risk_score?: number
  low_carbon_grade?: string
  carbon_method_note?: string
  report_markdown?: string
  input_warnings?: string[]
  offline_demo?: boolean
  [key: string]: unknown
}

export interface CarbonScheme {
  scheme: string
  carbon_kgCO2e_per_100m2: number
  category?: string
}

export interface ShapFeature {
  feature: string
  mean_abs_shap: number
  rank: number
}

export interface ReportPayload {
  sample_id: string
  markdown: string
}

export type PredictPayload = Record<string, string | number>

function demoGet<T>(url: string): T | undefined {
  const path = url.split('?')[0]
  if (path === '/api/summary') return clone(demoSummary) as T
  if (path === '/api/samples') return clone(demoSamples) as T
  if (path === '/api/carbon-schemes') return clone(demoCarbonSchemes) as T
  if (path === '/api/shap-top-features') return clone(demoShapFeatures) as T
  if (path.startsWith('/api/report/')) {
    const sampleId = decodeURIComponent(path.replace('/api/report/', ''))
    return { sample_id: sampleId, markdown: makeDemoReport(sampleId) } as T
  }
  return undefined
}

function demoPost<T, TBody>(url: string, body: TBody): T | undefined {
  if (url === '/api/predict') return makeDemoPrediction(body as PredictPayload) as T
  return undefined
}

export async function getJSON<T>(url: string): Promise<T> {
  try {
    const response = await fetch(buildApiUrl(url))
    return await parseJSON<T>(response, url)
  } catch (error) {
    const fallback = demoGet<T>(url)
    if (fallback !== undefined) return fallback
    throw error
  }
}

export async function postJSON<T, TBody = unknown>(url: string, body: TBody): Promise<T> {
  try {
    const response = await fetch(buildApiUrl(url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    return await parseJSON<T>(response, url)
  } catch (error) {
    const fallback = demoPost<T, TBody>(url, body)
    if (fallback !== undefined) return fallback
    throw error
  }
}

export function loadSummary() {
  return getJSON<SummaryPayload>('/api/summary')
}

export function loadSamples() {
  return getJSON<SamplePayload[]>('/api/samples')
}

export function loadCarbonSchemes() {
  return getJSON<CarbonScheme[]>('/api/carbon-schemes')
}

export function loadShapTopFeatures() {
  return getJSON<ShapFeature[]>('/api/shap-top-features')
}

export function loadReport(sampleId: string) {
  return getJSON<ReportPayload>('/api/report/' + encodeURIComponent(sampleId))
}

export function predictSegment(body: PredictPayload) {
  return postJSON<SamplePayload, PredictPayload>('/api/predict', body)
}
