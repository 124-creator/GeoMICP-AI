import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { staggerContainer, staggerItem } from '@/lib/animations'
import { AnimatedCard } from '@/components/ui/animated-card'
import { CardContent } from '@/components/ui/card'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

const boundaries = [
  '平台输出定位为快速筛查、优先巡查排序和辅助决策，不替代现场调查。',
  'risk_probability 是模型风险评分，不等同于经校准的真实发生概率。',
  'MICP建议需结合渗透性、pH、坡度、河流距离和现场小试复核。',
  '低碳比选基于标准边坡面积和简化参数，正式设计需替换为项目清单。',
  '新增路段输入不完整时会触发默认值补全，应降低解释置信度。',
  '高风险或近水体样本必须优先进行工程复核和环境风险审查。',
]

export function BoundaryPanel() {
  return (
    <AnimatedCard variant="solid" magnetic>
      <CardContent className="relative z-10 p-6">
        <SectionTitle
          eyebrow="Evidence Boundary"
          title="证据链与使用边界"
          description="六条边界条款明确平台的可用范围，保证展示效果与工程审慎性同时成立。"
        />
        <motion.div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
          {boundaries.map((item, index) => (
            <motion.div key={item} variants={staggerItem} className="rounded-3xl border border-slate-100 bg-white/72 p-4 shadow-sm dark:border-white/12 dark:bg-white/8">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-200">
                {index < 2 ? <AlertTriangle className="size-4 text-amber-500 dark:text-amber-200" /> : <CheckCircle2 className="size-4" />}
                条款 {index + 1}
              </div>
              <p className="text-sm font-semibold leading-7 text-slate-600 dark:text-white/70">{item}</p>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </AnimatedCard>
  )
}
