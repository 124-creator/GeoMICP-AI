import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Play, Sparkles } from 'lucide-react'

import type { SamplePayload } from '@/lib/api'
import { predictSegment } from '@/lib/api'
import { fadeIn } from '@/lib/animations'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface PredictPanelProps {
  onPredicted: (sample: SamplePayload) => void
}

const landCoverItems = [
  { value: 'forest', label: '林地/植被覆盖' },
  { value: 'road', label: '道路建设扰动' },
  { value: 'bare', label: '裸地/建设用地' },
]

interface StepperInputProps {
  value: string
  step: number
  onChange: (value: string) => void
}

function decimalPlaces(step: number) {
  const [, decimal = ''] = String(step).split('.')
  return decimal.length
}

function StepperInput({ value, step, onChange }: StepperInputProps) {
  const decimals = decimalPlaces(step)

  function nudge(direction: -1 | 1) {
    const current = Number(value)
    const safeCurrent = Number.isFinite(current) ? current : 0
    const next = safeCurrent + direction * step
    onChange(next.toFixed(decimals))
  }

  return (
    <div className="flex h-10 overflow-hidden rounded-xl border border-slate-200 bg-white/82 shadow-inner shadow-slate-100 focus-within:border-sky-300/70 focus-within:ring-4 focus-within:ring-sky-400/15 dark:border-white/15 dark:bg-white/10 dark:shadow-black/10">
      <motion.button
        type="button"
        aria-label="减少数值"
        className="grid w-10 place-items-center border-r border-slate-200 text-base font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/74 dark:hover:bg-white/10 dark:hover:text-white"
        whileTap={{ scale: 0.92 }}
        onClick={() => nudge(-1)}
      >
        −
      </motion.button>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full rounded-none border-0 bg-transparent px-2 text-center text-slate-800 shadow-none focus:border-transparent focus:ring-0 dark:text-white"
      />
      <motion.button
        type="button"
        aria-label="增加数值"
        className="grid w-10 place-items-center border-l border-slate-200 text-base font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-white/74 dark:hover:bg-white/10 dark:hover:text-white"
        whileTap={{ scale: 0.92 }}
        onClick={() => nudge(1)}
      >
        +
      </motion.button>
    </div>
  )
}

export function PredictPanel({ onPredicted }: PredictPanelProps) {
  const [landCover, setLandCover] = useState('road')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    sample_id: 'NEW_SEGMENT',
    longitude: '103.90',
    latitude: '30.65',
    slope_deg: '32',
    ndvi_30d: '0.42',
    rainfall_7d: '86',
    rainfall_max3_30d: '118',
    river_distance_m: '280',
    clay_pct: '24',
    sand_pct: '58',
    silt_pct: '18',
    ph: '7.2',
  })

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const numericFields: Array<{ field: keyof typeof form; label: string; step: number }> = [
    { field: 'slope_deg', label: '坡度(°)', step: 0.5 },
    { field: 'ndvi_30d', label: 'NDVI 30日', step: 0.01 },
    { field: 'rainfall_7d', label: '7日降雨(mm)', step: 1 },
    { field: 'rainfall_max3_30d', label: '30日最大3日雨(mm)', step: 1 },
    { field: 'river_distance_m', label: '距河流(m)', step: 10 },
    { field: 'clay_pct', label: '黏粒(%)', step: 1 },
    { field: 'sand_pct', label: '砂粒(%)', step: 1 },
    { field: 'silt_pct', label: '粉粒(%)', step: 1 },
  ]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const payload = {
        ...form,
        land_cover_code: landCover,
        bare_built: landCover === 'bare' || landCover === 'road' ? 1 : 0,
        longitude: Number(form.longitude),
        latitude: Number(form.latitude),
        slope_deg: Number(form.slope_deg),
        ndvi_30d: Number(form.ndvi_30d),
        rain_7d: Number(form.rainfall_7d),
        rainfall_7d: Number(form.rainfall_7d),
        rain_max3_30d: Number(form.rainfall_max3_30d),
        rainfall_max3_30d: Number(form.rainfall_max3_30d),
        river_distance_m: Number(form.river_distance_m),
        clay_pct: Number(form.clay_pct),
        sand_pct: Number(form.sand_pct),
        silt_pct: Number(form.silt_pct),
        ph: Number(form.ph),
      }
      const result = await predictSegment(payload)
      onPredicted({ ...payload, ...result, offline_demo: true } as SamplePayload)
      setMessage('新路段筛查完成，已联动地图、沙盘、研判和报告。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '预测请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatedCard variant="solid" magnetic>
      <CardContent className="relative z-10 p-6">
        <SectionTitle
          eyebrow="New Segment Screening"
          title="新路段快速筛查"
          description="输入关键工程与环境字段，调用 /api/predict；公开版无后端时自动使用本地 demo 推理。"
        />
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="grid gap-1 text-xs font-black text-slate-600 dark:text-white/72">
              路段编号
              <Input value={form.sample_id} onChange={(event) => updateField('sample_id', event.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600 dark:text-white/72">
              经度
              <StepperInput step={0.0001} value={form.longitude} onChange={(value) => updateField('longitude', value)} />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600 dark:text-white/72">
              纬度
              <StepperInput step={0.0001} value={form.latitude} onChange={(value) => updateField('latitude', value)} />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600 dark:text-white/72">
              土地覆盖
              <Select value={landCover} onValueChange={(value) => setLandCover(String(value))} items={landCoverItems}>
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white/82 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {landCoverItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {numericFields.map(({ field, label, step }) => (
              <label key={field} className="grid gap-1 text-xs font-black text-slate-600 dark:text-white/72">
                {label}
                <StepperInput step={step} value={form[field]} onChange={(value) => updateField(field, value)} />
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="grid max-w-xs flex-1 gap-1 text-xs font-black text-slate-600 dark:text-white/72">
              pH
              <StepperInput step={0.1} value={form.ph} onChange={(value) => updateField('ph', value)} />
            </label>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button type="submit" className="h-11 rounded-full bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-6 font-black text-slate-950 shadow-xl shadow-emerald-200/60 dark:shadow-none" disabled={loading}>
                {loading ? <Sparkles className="animate-spin" /> : <Play />}
                {loading ? '筛查中' : '提交筛查'}
              </Button>
            </motion.div>
          </div>
        </form>
        {message ? (
          <motion.div variants={fadeIn} initial="hidden" animate="visible" className="mt-4 rounded-2xl border border-slate-200 bg-white/72 px-4 py-3 text-sm font-bold text-slate-600 dark:border-white/12 dark:bg-white/10 dark:text-white/78">
            {message}
          </motion.div>
        ) : null}
      </CardContent>
    </AnimatedCard>
  )
}

