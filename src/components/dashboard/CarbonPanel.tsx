import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'
import { motion } from 'framer-motion'

import type { CarbonScheme, SamplePayload } from '@/lib/api'
import { fadeIn } from '@/lib/animations'
import { numberText } from '@/lib/dashboard-utils'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { CardContent } from '@/components/ui/card'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface CarbonPanelProps {
  schemes: CarbonScheme[]
  sample?: SamplePayload
}

export function CarbonPanel({ schemes, sample }: CarbonPanelProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const chartData = useMemo(() => {
    const base = schemes.map((scheme) => ({ name: scheme.scheme, value: scheme.carbon_kgCO2e_per_100m2 }))
    if (sample?.recommended_carbon) {
      return [{ name: '当前推荐方案', value: sample.recommended_carbon }, ...base]
    }
    return base
  }, [sample, schemes])

  useEffect(() => {
    if (!ref.current) return

    const chart = echarts.init(ref.current)
    chart.setOption({
      animationDuration: 800,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 28, right: 18, bottom: 72, left: 58 },
      xAxis: { type: 'category', data: chartData.map((item) => item.name), axisLabel: { color: '#475569', fontWeight: 700, rotate: 24 } },
      yAxis: { type: 'value', name: 'kgCO₂e/100m²', axisLabel: { color: '#475569' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.22)' } } },
      series: [
        {
          type: 'bar',
          data: chartData.map((item, index) => ({
            value: item.value,
            itemStyle: { color: index === 0 && sample?.recommended_carbon ? '#34d399' : '#38bdf8', borderRadius: [12, 12, 0, 0] },
          })),
        },
      ],
    })
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [chartData, sample?.recommended_carbon])

  return (
    <AnimatedCard variant="solid" magnetic>
      <CardContent className="relative z-10 p-6">
        <SectionTitle
          eyebrow="Low-carbon Comparison"
          title="低碳方案比选"
          description="柱状图对比当前推荐处治方案与传统参考方案碳排放。"
          action={<Badge className="h-8 rounded-full bg-emerald-50 px-4 font-black text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100">节碳 {numberText(sample?.carbon_saving_vs_shotcrete_pct, 1)}%</Badge>}
        />
        <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="rounded-3xl border border-slate-100 bg-white/72 p-4 shadow-sm dark:border-white/12 dark:bg-white/8">
          <div ref={ref} className="h-[320px] w-full" />
        </motion.div>
      </CardContent>
    </AnimatedCard>
  )
}
