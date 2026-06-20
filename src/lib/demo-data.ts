import type { CarbonScheme, PredictPayload, SamplePayload, ShapFeature, SummaryPayload } from './api'

const anchors = [
  { name: '成都平原西缘', lon: 103.7, lat: 30.7 },
  { name: '岷江上游', lon: 103.0, lat: 31.5 },
  { name: '川东北丘陵', lon: 106.1, lat: 31.7 },
  { name: '雅安雨城带', lon: 103.0, lat: 29.9 },
  { name: '凉山山地', lon: 102.2, lat: 27.9 },
  { name: '川南低山', lon: 104.8, lat: 28.8 },
  { name: '阿坝高山峡谷', lon: 102.6, lat: 32.2 },
  { name: '甘孜东缘', lon: 101.8, lat: 30.1 },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 3) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function riskLevel(index: number) {
  if (index < 10) return '极高风险'
  if (index < 41) return '高风险'
  if (index < 92) return '中风险'
  return '低风险'
}

function riskProbability(index: number) {
  if (index < 10) return round(0.91 - index * 0.011, 3)
  if (index < 41) return round(0.78 - (index - 10) * 0.006, 3)
  if (index < 92) return round(0.57 - (index - 41) * 0.003, 3)
  return round(0.28 - (index - 92) * 0.0012, 3)
}

function recommendation(level: string, index: number) {
  if (level === '极高风险') return index % 2 === 0 ? 'MICP + 截排水 + 锚固框架复合处治' : '优先现场复核，MICP 试验段 + 排水系统加固'
  if (level === '高风险') return index % 3 === 0 ? 'MICP 表层固化 + 坡脚排水' : 'MICP 低扰动处治 + 巡检加密'
  if (level === '中风险') return '生态护坡 + 重点雨后巡查，视渗流情况使用 MICP'
  return '常规巡查，保留低碳生态修复预案'
}

function makeReport(sample: SamplePayload) {
  return [
    '# 路段辅助研判报告',
    '',
    `- 路段编号：${sample.sample_id}`,
    `- 风险等级：${sample.risk_level}`,
    `- 风险排序评分：${Math.round(Number(sample.risk_probability ?? 0) * 1000) / 10}%`,
    `- MICP 适宜性：${sample.micp_suitability ?? '待核验'}`,
    `- 推荐策略：${sample.recommended_strategy ?? sample.recommended_method ?? '待现场复核'}`,
    '',
    '## 证据边界',
    '公开版使用脱敏/合成坐标和示例属性，仅演示风险地图、Top-K 巡查、低碳比选与报告生成流程；不替代现场勘察、设计计算或正式处置决策。',
  ].join('\n')
}

export const demoSamples: SamplePayload[] = Array.from({ length: 202 }, (_, i) => {
  const anchor = anchors[i % anchors.length]
  const level = riskLevel(i)
  const prob = riskProbability(i)
  const lon = anchor.lon + Math.sin(i * 1.73) * 0.55 + ((i % 7) - 3) * 0.035
  const lat = anchor.lat + Math.cos(i * 1.37) * 0.42 + ((i % 5) - 2) * 0.028
  const slope = clamp(18 + (i % 24) + prob * 18, 8, 58)
  const rainfall7d = clamp(24 + (i % 9) * 9 + prob * 70, 12, 148)
  const riverDistance = clamp(80 + (i % 17) * 35 - prob * 45, 30, 760)
  const clay = clamp(12 + (i % 11) * 1.7, 6, 38)
  const sand = clamp(48 + (i % 13) * 1.9, 25, 78)
  const silt = clamp(100 - clay - sand, 8, 50)
  const strategy = recommendation(level, i)
  const micpScore = level === '低风险' ? 62 + (i % 12) : level === '中风险' ? 72 + (i % 14) : 84 + (i % 13)
  const sample: SamplePayload = {
    sample_id: `ROAD-${String(i + 1).padStart(3, '0')}`,
    true_label: i < 82 ? 1 : 0,
    longitude: round(lon, 5),
    latitude: round(lat, 5),
    risk_probability: prob,
    risk_level: level,
    micp_suitability: micpScore >= 82 ? '高适宜' : micpScore >= 70 ? '中适宜' : '低扰动备选',
    micp_suitability_score: micpScore,
    soil_texture_proxy: sand > 58 ? '砂性土优势' : clay > 25 ? '黏粒偏高' : '级配适中',
    recommended_strategy: strategy,
    recommended_method: strategy,
    recommended_intensity: level === '极高风险' ? '强' : level === '高风险' ? '中-强' : level === '中风险' ? '中' : '低',
    cementation_solution_mol_L: level === '低风险' ? '0.25-0.35' : '0.50-0.75',
    suggested_treatment_rounds: level === '极高风险' ? '4-6' : level === '高风险' ? '3-4' : '1-2',
    environmental_warning: '需现场复核地下水、坡面扰动与排水条件。',
    engineering_notes: `${anchor.name}示例路段，公开版坐标已脱敏/合成。`,
    rule_hits: `坡度=${round(slope, 1)}；7日降雨=${round(rainfall7d, 1)}；距河流=${round(riverDistance, 0)}`,
    slope_deg: round(slope, 1),
    ndvi_30d: round(clamp(0.18 + (i % 10) * 0.045, 0.12, 0.78), 3),
    rainfall_max3_30d: round(rainfall7d * 0.58, 1),
    rainfall_7d: round(rainfall7d, 1),
    river_distance_m: round(riverDistance, 0),
    clay_pct: round(clay, 1),
    sand_pct: round(sand, 1),
    silt_pct: round(silt, 1),
    ph: round(6.6 + (i % 9) * 0.12, 2),
    recommended_carbon: round(level === '低风险' ? 320 + (i % 20) * 4 : 430 + (i % 30) * 6, 1),
    carbon_saving_vs_shotcrete_pct: round(level === '低风险' ? 68 + (i % 8) : 52 + (i % 14), 1),
    carbon_saving_vs_cement_soil_pct: round(28 + (i % 12), 1),
    eco_disturbance_score: round(0.18 + prob * 0.38, 3),
    water_environment_risk_score: round(0.22 + prob * 0.42, 3),
    low_carbon_grade: level === '低风险' || level === '中风险' ? '优先' : '约束下可选',
    carbon_method_note: '以公开演示参数估算，正式方案需工程量清单复核。',
    offline_demo: true,
  }
  sample.report_markdown = makeReport(sample)
  return sample
})

export const demoSummary: SummaryPayload = {
  platform_name: 'GeoMICP-AI Demo',
  sample_count: 202,
  positive_label_count: 82,
  high_risk_count: 41,
  extreme_risk_count: 10,
  micp_recommended_count: 126,
  low_carbon_priority_count: 118,
  avg_recommended_carbon: 438.6,
  avg_micp_saving_vs_shotcrete_pct: 58.4,
  risk_distribution: {
    极高风险: 10,
    高风险: 31,
    中风险: 51,
    低风险: 110,
  },
  micp_suitability_distribution: {
    高适宜: 54,
    中适宜: 72,
    低扰动备选: 76,
  },
  recommended_strategy_distribution: {
    'MICP复合处治': 41,
    'MICP低扰动处治': 62,
    '生态护坡与巡查': 55,
    '常规巡查': 44,
  },
  low_carbon_grade_distribution: {
    优先: 118,
    约束下可选: 84,
  },
  model_metrics: {
    model: 'ExtraTrees_step140_train202_demo',
    train_sample_count: 202,
    train_positive_count: 82,
    train_negative_count: 120,
    auc: 0.9098,
    f2: 0.842,
    recall: 0.829,
    spatial_auc: 0.8742,
    note: 'Public demo uses desensitized/synthetic coordinates; metrics are copied from the audited project summary for resume demonstration.',
  },
  scope_note: '公开演示版：不含原始竞赛样本、真实工程坐标或正式处置结论。',
}

export const demoCarbonSchemes: CarbonScheme[] = [
  { scheme: 'MICP 低扰动处治', carbon_kgCO2e_per_100m2: 430, category: 'bio-cementation' },
  { scheme: '生态护坡', carbon_kgCO2e_per_100m2: 360, category: 'eco-restoration' },
  { scheme: '水泥土加固', carbon_kgCO2e_per_100m2: 780, category: 'cement-soil' },
  { scheme: '喷射混凝土', carbon_kgCO2e_per_100m2: 1080, category: 'shotcrete' },
]

export const demoShapFeatures: ShapFeature[] = [
  { feature: 'slope_deg', mean_abs_shap: 0.183, rank: 1 },
  { feature: 'rainfall_7d', mean_abs_shap: 0.162, rank: 2 },
  { feature: 'river_distance_m', mean_abs_shap: 0.139, rank: 3 },
  { feature: 'rainfall_max3_30d', mean_abs_shap: 0.128, rank: 4 },
  { feature: 'ndvi_30d', mean_abs_shap: 0.101, rank: 5 },
  { feature: 'sand_pct', mean_abs_shap: 0.086, rank: 6 },
  { feature: 'clay_pct', mean_abs_shap: 0.074, rank: 7 },
  { feature: 'ph', mean_abs_shap: 0.052, rank: 8 },
]

export function makeDemoReport(sampleId: string) {
  const sample = demoSamples.find((item) => item.sample_id === sampleId) ?? demoSamples[0]
  return makeReport(sample)
}

export function makeDemoPrediction(body: PredictPayload): SamplePayload {
  const slope = Number(body.slope_deg ?? 30)
  const rainfall7d = Number(body.rainfall_7d ?? 80)
  const river = Number(body.river_distance_m ?? 280)
  const ndvi = Number(body.ndvi_30d ?? 0.42)
  const score = clamp(0.18 + slope / 110 + rainfall7d / 280 - river / 2200 - ndvi / 5, 0.05, 0.94)
  const level = score >= 0.8 ? '极高风险' : score >= 0.62 ? '高风险' : score >= 0.38 ? '中风险' : '低风险'
  const sample: SamplePayload = {
    sample_id: String(body.sample_id ?? 'NEW_SEGMENT'),
    longitude: Number(body.longitude ?? 103.9),
    latitude: Number(body.latitude ?? 30.65),
    risk_probability: round(score, 3),
    risk_level: level,
    micp_suitability: level === '低风险' ? '低扰动备选' : '高适宜',
    micp_suitability_score: level === '低风险' ? 66 : 88,
    recommended_strategy: recommendation(level, 1),
    recommended_method: recommendation(level, 1),
    slope_deg: slope,
    ndvi_30d: ndvi,
    rainfall_7d: rainfall7d,
    rainfall_max3_30d: Number(body.rainfall_max3_30d ?? rainfall7d * 0.58),
    river_distance_m: river,
    clay_pct: Number(body.clay_pct ?? 24),
    sand_pct: Number(body.sand_pct ?? 58),
    silt_pct: Number(body.silt_pct ?? 18),
    ph: Number(body.ph ?? 7.2),
    recommended_carbon: 430,
    carbon_saving_vs_shotcrete_pct: 58.5,
    carbon_saving_vs_cement_soil_pct: 32.4,
    low_carbon_grade: '约束下可选',
    engineering_notes: '公开 demo 本地推理结果，仅用于展示交互闭环。',
    rule_hits: `坡度=${slope}；7日降雨=${rainfall7d}；距河流=${river}`,
    offline_demo: true,
  }
  sample.report_markdown = makeReport(sample)
  return sample
}
