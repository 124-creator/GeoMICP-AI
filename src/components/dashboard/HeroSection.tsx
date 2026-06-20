import { motion } from 'framer-motion'
import { Activity, Box, RotateCcw, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { AnimatedCard } from '@/components/ui/animated-card'
import { ModelInfoSkeleton } from '@/components/ui/loading-skeleton'
import { fadeIn, premiumSpring, staggerContainer } from '@/lib/animations'
import type { SummaryPayload } from '@/lib/api'

interface HeroSectionProps {
  summary: SummaryPayload | null
  loading: boolean
  onStartDemo: () => void
  onOpenSandbox: () => void
  onFocusHighRisk: () => void
  onReset: () => void
}

const title = '山区道路边坡水毁风险筛查与绿色处治决策大屏'

const titleContainer = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      ...premiumSpring,
      staggerChildren: 0.02,
      delayChildren: 0.1,
    },
  },
}

const titleCharacter = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: premiumSpring },
}

const modelCardSlideIn = {
  hidden: { opacity: 0, x: 40, scale: 0.98 },
  visible: { opacity: 1, x: 0, scale: 1, transition: premiumSpring },
}

const heroButtons = [
  { label: '启动演示', icon: Activity, tone: 'primary' as const, action: 'start' as const },
  { label: '3D沙盘', icon: Box, tone: 'secondary' as const, action: 'sandbox' as const },
  { label: '聚焦高风险', icon: ShieldAlert, tone: 'secondary' as const, action: 'risk' as const },
  { label: '恢复全量', icon: RotateCcw, tone: 'secondary' as const, action: 'reset' as const },
]

function metricText(summary: SummaryPayload | null) {
  const metrics = summary?.model_metrics
  if (!metrics) return '等待后端 /api/summary 返回模型复核指标。'

  return (
    'AUC ' +
    (metrics.auc ?? '--') +
    '｜F2 ' +
    (metrics.f2 ?? '--') +
    '｜Recall ' +
    (metrics.recall ?? '--') +
    '｜空间AUC ' +
    (metrics.spatial_auc ?? '--')
  )
}

function modelTitle(summary: SummaryPayload | null) {
  const name = summary?.model_metrics?.model
  return typeof name === 'string' && name.trim() ? name : '工程筛查原型'
}

function inferTrainSampleCount(summary: SummaryPayload | null) {
  const explicit = summary?.model_metrics?.train_sample_count
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return explicit

  const match = modelTitle(summary).match(/train(\d+)/i)
  return match ? Number(match[1]) : undefined
}

function sampleScopeText(summary: SummaryPayload | null) {
  const trainCount = inferTrainSampleCount(summary)
  const displayCount = summary?.sample_count
  const posNeg =
    typeof summary?.model_metrics?.train_positive_count === 'number' && typeof summary?.model_metrics?.train_negative_count === 'number'
      ? `（正${summary.model_metrics.train_positive_count} / 负${summary.model_metrics.train_negative_count}）`
      : ''
  if (trainCount && displayCount && trainCount !== displayCount) return `训练集 ${trainCount} 条${posNeg}｜展示 ${displayCount} 条`
  if (trainCount) return `训练集 ${trainCount} 条${posNeg}`
  if (displayCount) return `样本 ${displayCount} 条`
  return '等待样本统计'
}

export function HeroSection({ summary, loading, onStartDemo, onOpenSandbox, onFocusHighRisk, onReset }: HeroSectionProps) {
  function runHeroAction(action: (typeof heroButtons)[number]['action']) {
    if (action === 'start') onStartDemo()
    if (action === 'sandbox') onOpenSandbox()
    if (action === 'risk') onFocusHighRisk()
    if (action === 'reset') onReset()
  }

  return (
    <AnimatedCard
      variant="solid"
      hover={false}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="gradient-border relative overflow-hidden shadow-2xl shadow-slate-200/70 dark:shadow-[0_28px_90px_rgba(2,6,23,.36)]"
    >
      <span className="hero-glow -right-28 -top-32" aria-hidden="true" />
      <span className="hero-glow -bottom-44 left-8 opacity-60" aria-hidden="true" />
      <CardContent className="relative grid gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center">
        <div>
          <motion.p variants={fadeIn} className="mb-2 text-xs font-black uppercase tracking-[.14em] text-[var(--color-green)]">
            Risk Screening → MICP → Low-carbon
          </motion.p>
          <motion.h1
            className="max-w-4xl text-[42px] font-black leading-[1.18] tracking-[-0.03em] text-slate-900 dark:text-white"
            variants={titleContainer}
            aria-label={title}
          >
            {Array.from(title).map((char, index) => (
              <motion.span
                aria-hidden="true"
                className="inline-block"
                key={char + '-' + index}
                variants={titleCharacter}
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>
          <motion.p variants={fadeIn} className="mt-4 max-w-3xl text-[17px] font-semibold leading-[1.85] text-slate-600 dark:text-white/70">
            系统融合降雨、地形、土壤、植被、水文、土地覆盖和工程规则，先完成风险筛查、优先巡查排序、MICP绿色处治建议与低碳比选的动态驾驶舱闭环。
          </motion.p>
          <motion.div className="mt-6 flex flex-wrap gap-3" variants={staggerContainer}>
            {heroButtons.map(({ label, icon: Icon, tone, action }) => (
              <motion.div key={label} variants={fadeIn}>
                <Button
                  className={
                    tone === 'primary'
                      ? 'h-10 rounded-full bg-[linear-gradient(135deg,var(--color-green),var(--color-cyan))] px-5 font-black text-white shadow-xl shadow-emerald-200/60 hover:opacity-90 dark:shadow-[0_12px_28px_rgba(14,165,233,.22)]'
                      : 'h-10 rounded-full border-slate-200 bg-white px-5 font-black text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/12 dark:bg-white/10 dark:text-white'
                  }
                  variant={tone === 'primary' ? 'default' : 'outline'}
                  onClick={() => runHeroAction(action)}
                >
                  <Icon />
                  {label}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div variants={modelCardSlideIn}>
          {loading ? (
            <ModelInfoSkeleton />
          ) : (
            <div className="rounded-[22px] border border-emerald-100 bg-slate-50/82 p-6 shadow-inner shadow-white/80 dark:border-white/12 dark:bg-white/8 dark:shadow-none">
              <span className="text-sm font-black text-slate-500 dark:text-white/58">当前生产筛查模型</span>
              <strong className="mt-2 block break-words text-2xl font-black leading-tight text-emerald-700 dark:text-emerald-200">{modelTitle(summary)}</strong>
              <span className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-300/12 dark:text-emerald-100">
                {sampleScopeText(summary)}
              </span>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-white/70">{metricText(summary)}</p>
              <p className="mt-3 border-t border-dashed border-emerald-200 pt-3 text-xs font-bold leading-5 text-slate-500 dark:border-emerald-300/24 dark:text-white/56">
                {summary?.model_metrics?.note ?? 'risk_score 是优先巡查排序评分，不是校准后的真实发生率；平台定位为工程辅助筛查，不替代现场巡查和正式设计。'}
              </p>
            </div>
          )}
        </motion.div>
      </CardContent>
    </AnimatedCard>
  )
}
