import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { motion } from 'framer-motion'

import type { ShapFeature } from '@/lib/api'
import { fadeIn } from '@/lib/animations'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { CardContent } from '@/components/ui/card'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface SHAPPanelProps {
  features: ShapFeature[]
}

export function SHAPPanel({ features }: SHAPPanelProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const topFeatures = [...features].sort((a, b) => b.mean_abs_shap - a.mean_abs_shap).slice(0, 12).reverse()

  useEffect(() => {
    if (!ref.current) return

    const chart = echarts.init(ref.current)
    chart.setOption({
      animationDuration: 800,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 18, right: 24, bottom: 24, left: 138 },
      xAxis: { type: 'value', axisLabel: { color: '#475569' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.22)' } } },
      yAxis: { type: 'category', data: topFeatures.map((item) => item.feature), axisLabel: { color: '#475569', fontWeight: 700 } },
      series: [
        {
          type: 'bar',
          data: topFeatures.map((item) => item.mean_abs_shap),
          itemStyle: { color: '#a78bfa', borderRadius: [0, 10, 10, 0] },
          label: { show: true, position: 'right', color: '#475569', formatter: ({ value }: { value: number }) => value.toFixed(3) },
        },
      ],
    })
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [topFeatures])

  return (
    <AnimatedCard variant="solid" magnetic>
      <CardContent className="relative z-10 p-6">
        <SectionTitle
          eyebrow="Model Explainability"
          title="SHAP特征重要性"
          description="横向条形图展示模型关键驱动因素，辅助说明风险排序依据。"
          action={<Badge className="h-8 rounded-full bg-violet-50 px-4 font-black text-violet-700 dark:bg-violet-400/15 dark:text-violet-100">Top {topFeatures.length}</Badge>}
        />
        <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="rounded-3xl border border-slate-100 bg-white/72 p-4 shadow-sm dark:border-white/12 dark:bg-white/8">
          <div ref={ref} className="h-[360px] w-full" />
        </motion.div>
      </CardContent>
    </AnimatedCard>
  )
}
