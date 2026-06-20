import { useEffect, useState } from 'react'
import { animate, motion, useSpring } from 'framer-motion'

import { CardContent } from '@/components/ui/card'
import { AnimatedCard } from '@/components/ui/animated-card'
import { KpiSkeletonGrid } from '@/components/ui/loading-skeleton'
import { loadSummary, type SummaryPayload } from '@/lib/api'
import { fadeIn, numberCounter, premiumSpring, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'

type Tone = 'positive' | 'negative' | 'neutral'

interface KPIItem {
  label: string
  target?: number
  textValue?: string
  suffix?: string
  decimals?: number
  note: string
  tone: Tone
  sparkline: number[]
}

const toneClasses: Record<Tone, { accent: string; glow: string; text: string; line: string }> = {
  positive: {
    accent: 'bg-emerald-100 text-emerald-600 ring-emerald-200 dark:bg-emerald-400/18 dark:text-emerald-300 dark:ring-emerald-300/25',
    glow: 'bg-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-300',
    line: 'from-emerald-400/20 via-emerald-300/80 to-emerald-400/20',
  },
  negative: {
    accent: 'bg-rose-100 text-rose-500 ring-rose-200 dark:bg-rose-400/18 dark:text-rose-300 dark:ring-rose-300/25',
    glow: 'bg-rose-400',
    text: 'text-rose-500 dark:text-rose-300',
    line: 'from-rose-400/20 via-rose-300/80 to-rose-400/20',
  },
  neutral: {
    accent: 'bg-sky-100 text-sky-500 ring-sky-200 dark:bg-sky-400/18 dark:text-sky-300 dark:ring-sky-300/25',
    glow: 'bg-sky-400',
    text: 'text-sky-500 dark:text-sky-300',
    line: 'from-sky-400/20 via-sky-300/80 to-sky-400/20',
  },
}

function buildKpis(summary: SummaryPayload): KPIItem[] {
  const riskDistribution = summary.risk_distribution ?? {}
  const highRiskFromDistribution = (riskDistribution['高风险'] ?? 0) + (riskDistribution['极高风险'] ?? 0)
  const highRiskTotal = summary.high_risk_count ?? (highRiskFromDistribution > 0 ? highRiskFromDistribution : summary.extreme_risk_count ?? 0)

  return [
    {
      label: '样本总数',
      target: summary.sample_count ?? 0,
      note: '四川道路边坡样本',
      tone: 'neutral',
      sparkline: [24, 32, 28, 46, 44, 58, 61],
    },
    {
      label: '高/极高风险',
      target: highRiskTotal,
      note: '优先巡查与工程复核对象',
      tone: 'negative',
      sparkline: [18, 28, 25, 36, 44, 52, 48],
    },
    {
      label: 'MICP推荐',
      target: summary.micp_recommended_count ?? 0,
      note: '绿色处治候选路段',
      tone: 'positive',
      sparkline: [12, 18, 26, 30, 38, 42, 52],
    },
    {
      label: '平均节碳',
      target: summary.avg_micp_saving_vs_shotcrete_pct ?? 0,
      suffix: '%',
      decimals: 1,
      note: '相对喷混参考方案',
      tone: 'positive',
      sparkline: [22, 24, 31, 29, 35, 42, 46],
    },
    {
      label: 'Top-K巡查',
      target: 20,
      note: '按模型风险评分排序',
      tone: 'neutral',
      sparkline: [15, 21, 26, 34, 33, 45, 50],
    },
    {
      label: '证据边界',
      textValue: '审慎',
      note: '模型边界已显式标注',
      tone: 'negative',
      sparkline: [38, 36, 35, 34, 36, 34, 35],
    },
  ]
}

function formatCounter(value: number, decimals = 0) {
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}

function MiniSparkline({ values, tone }: { values: number[]; tone: Tone }) {
  const max = Math.max(...values, 1)
  const first = values[0] ?? 0
  const last = values.at(-1) ?? first
  const rising = last > first
  const delta = first === 0 ? last - first : ((last - first) / Math.abs(first)) * 100
  const deltaText = (delta > 0 ? '+' : '') + delta.toFixed(1) + '%'

  return (
    <>
      <div className="mt-4 flex h-10 items-end gap-1.5" aria-hidden="true">
        {values.map((value, index) => (
          <motion.span
            key={index}
            className={cn('w-full rounded-full bg-gradient-to-t', toneClasses[tone].line)}
            initial={{ height: 4, opacity: 0 }}
            animate={{ height: Math.max(7, (value / max) * 38), opacity: 1 }}
            transition={{ ...premiumSpring, delay: index * 0.04 }}
          />
        ))}
      </div>
      <div className={cn('mt-2 text-xs font-black', rising ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400 dark:text-white/44')}>
        {rising ? '↗' : '→'} {deltaText} 趋势
      </div>
    </>
  )
}

function AnimatedKpiValue({ item }: { item: KPIItem }) {
  const springCounter = useSpring(0, { stiffness: 120, damping: 20, mass: 0.8, restDelta: 0.001 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (typeof item.target !== 'number') return

    springCounter.jump(0)
    springCounter.set(item.target)
    const controls = animate(0, item.target, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(formatCounter(latest, item.decimals ?? 0)),
    })

    return () => controls.stop()
  }, [item.decimals, item.target, springCounter])

  if (item.textValue) {
    return (
      <motion.strong variants={numberCounter} className={cn('mt-2 block text-4xl font-black tracking-[-0.025em]', toneClasses[item.tone].text)}>
        {item.textValue}
      </motion.strong>
    )
  }

  return (
    <motion.strong variants={numberCounter} className={cn('mt-2 block text-4xl font-black tracking-[-0.025em]', toneClasses[item.tone].text)}>
      {display}
      {item.suffix}
    </motion.strong>
  )
}

export function KPICards() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    loadSummary()
      .then((payload) => {
        if (!ignore) setSummary(payload)
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'summary 加载失败')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  if (loading) return <KpiSkeletonGrid />

  if (!summary) {
    return (
      <motion.p variants={fadeIn} initial="hidden" animate="visible" className="glass-card rounded-3xl px-4 py-3 text-sm font-bold text-rose-200">
        KPI 数据暂未加载：{error ?? 'summary 为空'}
      </motion.p>
    )
  }

  const kpis = buildKpis(summary)

  return (
    <motion.section
      aria-labelledby="kpi-heading"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <h2 id="kpi-heading" className="sr-only">
        核心指标
      </h2>
      {kpis.map((item, index) => (
        <AnimatedCard
          key={item.label}
        variant="solid"
          magnetic
          variants={staggerItem}
          initial="hidden"
          animate="visible"
          transition={{ ...premiumSpring, delay: index * 0.08 }}
          className="min-h-[178px]"
        >
          <CardContent className="relative z-10 px-5 py-4">
            <motion.div
              aria-hidden="true"
              className={cn('absolute right-4 top-4 size-10 rounded-full blur-sm ring-1', toneClasses[item.tone].accent)}
              animate={{ scale: [1, 1.08, 1], opacity: [0.58, 0.92, 0.58] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-xs font-black tracking-wide text-slate-500 dark:text-white/62">{item.label}</span>
            <AnimatedKpiValue item={item} />
            <small className="mt-1 block text-xs font-bold leading-5 text-slate-500 dark:text-white/58">{item.note}</small>
            <MiniSparkline values={item.sparkline} tone={item.tone} />
          </CardContent>
        </AnimatedCard>
      ))}
    </motion.section>
  )
}
