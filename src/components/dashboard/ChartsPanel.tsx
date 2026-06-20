import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { motion } from 'framer-motion'

import type { SamplePayload } from '@/lib/api'
import { fadeIn } from '@/lib/animations'
import { riskOrder } from '@/lib/dashboard-utils'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { CardContent } from '@/components/ui/card'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface ChartsPanelProps {
  samples: SamplePayload[]
}

interface DistributionDatum {
  name: string
  value: number
}

function countBy(samples: SamplePayload[], pick: (sample: SamplePayload) => string | undefined, fallback: string) {
  return samples.reduce<Record<string, number>>((accumulator, sample) => {
    const key = pick(sample)?.trim() || fallback
    accumulator[key] = (accumulator[key] ?? 0) + 1
    return accumulator
  }, {})
}

function toDistribution(record: Record<string, number>, preferredOrder: string[] = []): DistributionDatum[] {
  const ordered = preferredOrder.map((name) => ({ name, value: record[name] ?? 0 }))
  const orderedNames = new Set(preferredOrder)
  const rest = Object.entries(record)
    .filter(([name]) => !orderedNames.has(name))
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([name, value]) => ({ name, value }))

  return [...ordered, ...rest]
}

function calcRiskDistribution(samples: SamplePayload[]) {
  return toDistribution(countBy(samples, (sample) => sample.risk_level, '未知风险'), riskOrder)
}

function calcMicpDistribution(samples: SamplePayload[]) {
  return toDistribution(countBy(samples, (sample) => sample.micp_suitability, '未知适宜性'))
}

function calcStrategyDistribution(samples: SamplePayload[]) {
  return toDistribution(countBy(samples, (sample) => sample.recommended_strategy ?? sample.recommended_method, '未推荐策略'))
}

function ChartBox({ title, option }: { title: string; option: echarts.EChartsOption }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    chart.setOption(option)
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [option])

  return (
    <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="rounded-3xl border border-slate-100 bg-white/72 p-4 shadow-sm dark:border-white/12 dark:bg-white/8">
      <h3 className="mb-3 text-sm font-black text-slate-700 dark:text-white/78">{title}</h3>
      <div ref={ref} className="h-[260px] w-full" />
    </motion.div>
  )
}

export function ChartsPanel({ samples }: ChartsPanelProps) {
  const riskData = calcRiskDistribution(samples)
  const micpData = calcMicpDistribution(samples)
  const strategyData = calcStrategyDistribution(samples)
  const textStyle = { color: '#475569', fontWeight: 700 }
  const splitLineStyle = { color: 'rgba(148,163,184,.22)' }

  return (
    <AnimatedCard variant="solid" magnetic>
      <CardContent className="relative z-10 p-6">
        <SectionTitle
          eyebrow="Analytics"
          title="风险、MICP与策略分布"
          description="ECharts 动态渲染三张统计图，辅助解释样本结构和处治策略集中度。"
          action={<Badge className="h-8 rounded-full bg-sky-50 px-4 font-black text-sky-700 dark:bg-white/10 dark:text-sky-100">ECharts × 3</Badge>}
        />
        <div className="grid gap-4 xl:grid-cols-3">
          <ChartBox
            title="风险分布饼图"
            option={{
              animationDuration: 800,
              backgroundColor: 'transparent',
              tooltip: { trigger: 'item' },
              legend: { bottom: 0, textStyle },
              series: [
                {
                  type: 'pie',
                  radius: ['42%', '70%'],
                  data: riskData,
                  label: { color: '#334155', fontWeight: 800 },
                },
              ],
              color: ['#ef4444', '#f97316', '#eab308', '#10b981', '#38bdf8'],
            }}
          />
          <ChartBox
            title="MICP适宜性柱状图"
            option={{
              animationDuration: 800,
              backgroundColor: 'transparent',
              tooltip: { trigger: 'axis' },
              grid: { top: 24, right: 12, bottom: 48, left: 40 },
              xAxis: { type: 'category', data: micpData.map((item) => item.name), axisLabel: textStyle },
              yAxis: { type: 'value', axisLabel: textStyle, splitLine: { lineStyle: splitLineStyle } },
              series: [{ type: 'bar', data: micpData.map((item) => item.value), itemStyle: { borderRadius: [10, 10, 0, 0], color: '#34d399' } }],
            }}
          />
          <ChartBox
            title="策略分布图"
            option={{
              animationDuration: 800,
              backgroundColor: 'transparent',
              tooltip: { trigger: 'axis' },
              grid: { top: 24, right: 12, bottom: 64, left: 40 },
              xAxis: { type: 'category', data: strategyData.map((item) => item.name), axisLabel: { ...textStyle, rotate: 28 } },
              yAxis: { type: 'value', axisLabel: textStyle, splitLine: { lineStyle: splitLineStyle } },
              series: [{ type: 'bar', data: strategyData.map((item) => item.value), itemStyle: { borderRadius: [10, 10, 0, 0], color: '#38bdf8' } }],
            }}
          />
        </div>
      </CardContent>
    </AnimatedCard>
  )
}
