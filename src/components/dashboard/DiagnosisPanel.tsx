import type { SamplePayload } from '@/lib/api'
import { compactRules, numberText, percent, riskColor } from '@/lib/dashboard-utils'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { CardContent } from '@/components/ui/card'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface DiagnosisPanelProps {
  sample?: SamplePayload
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-inner shadow-white/80 dark:border-white/12 dark:bg-white/8 dark:shadow-black/10">
      <span className="block text-xs font-black text-slate-500 dark:text-white/58">{label}</span>
      <strong className="mt-2 block text-lg font-black text-slate-900 dark:text-white">{value}</strong>
    </div>
  )
}

export function DiagnosisPanel({ sample }: DiagnosisPanelProps) {
  if (!sample) return null
  const risk = Math.round(Number(sample.risk_probability ?? 0) * 100)
  const rules = compactRules(sample.rule_hits).slice(0, 5)

  return (
    <AnimatedCard variant="solid" magnetic>
      <CardContent className="p-6">
        <SectionTitle
          eyebrow="Segment Diagnosis"
          title="单路段辅助研判"
          description="风险评分用于优先巡查排序；下方展示模型输入、MICP规则命中和工程提醒。"
          action={<Badge className="h-8 rounded-full px-4 font-black" style={{ backgroundColor: riskColor(sample.risk_level) + '22', color: riskColor(sample.risk_level) }}>{sample.risk_level}</Badge>}
        />
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-500 dark:text-white/58">当前选中路段</span>
                <strong className="mt-1 block text-3xl font-black text-slate-900 dark:text-white">{sample.sample_id}</strong>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-500 dark:text-white/58">模型风险评分</span>
                <strong className="block text-4xl font-black" style={{ color: riskColor(sample.risk_level) }}>{percent(sample.risk_probability)}</strong>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/12">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-green),var(--color-yellow),var(--color-danger))]" style={{ width: risk + '%' }} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="坡度" value={numberText(sample.slope_deg, 1) + '°'} />
              <Metric label="NDVI_30日" value={numberText(sample.ndvi_30d, 3)} />
              <Metric label="7日降雨" value={numberText(sample.rainfall_7d, 1) + ' mm'} />
              <Metric label="距河流" value={numberText(sample.river_distance_m, 0) + ' m'} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-300/22 dark:bg-emerald-300/10">
              <h3 className="font-black text-emerald-800 dark:text-emerald-100">MICP与工程建议</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-700 dark:text-white/74">{sample.recommended_method ?? sample.recommended_strategy ?? '暂无推荐策略'}</p>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-white/66">{sample.engineering_notes ?? '暂无工程备注'}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-300/24 dark:bg-amber-300/10">
              <h3 className="font-black text-amber-800 dark:text-amber-100">环境与边界提醒</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-amber-800 dark:text-white/70">{sample.environmental_warning ?? '暂无环境提醒'}</p>
            </div>
            <div className="grid gap-2">
              {rules.map((rule) => (
                <div key={rule} className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-600 dark:border-white/12 dark:bg-white/8 dark:text-white/70">
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </AnimatedCard>
  )
}
