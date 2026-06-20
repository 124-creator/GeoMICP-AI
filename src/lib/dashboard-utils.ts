import type { SamplePayload } from '@/lib/api'

export const riskOrder = ['极高风险', '高风险', '中风险', '低风险']

export function riskColor(level?: string, fallback = '#0ea5e9') {
  if (level === '极高风险') return '#ef4444'
  if (level === '高风险') return '#f97316'
  if (level === '中风险') return '#eab308'
  if (level === '低风险') return '#10b981'
  return fallback
}

export function percent(value?: number, decimals = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return (value * 100).toFixed(decimals) + '%'
}

export function pct(value?: number, decimals = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return value.toFixed(decimals) + '%'
}

export function numberText(value?: number, decimals = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return value.toLocaleString('zh-CN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

export function sortedByRisk(samples: SamplePayload[]) {
  return [...samples].sort((a, b) => Number(b.risk_probability ?? 0) - Number(a.risk_probability ?? 0))
}

export function sampleBounds(samples: SamplePayload[]) {
  const longitudes = samples.map((item) => item.longitude).filter(Number.isFinite)
  const latitudes = samples.map((item) => item.latitude).filter(Number.isFinite)
  return {
    minLon: Math.min(...longitudes),
    maxLon: Math.max(...longitudes),
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
  }
}

export function compactRules(ruleHits?: string) {
  return String(ruleHits ?? '')
    .split('；')
    .map((item) => item.trim())
    .filter(Boolean)
}
