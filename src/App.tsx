import './App.css'

import type { MouseEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useScroll } from 'framer-motion'
import { BarChart3, FileText, Leaf, Map, Menu, Moon, Route, ShieldCheck, Sparkles, Sun, Table2, Trees, X } from 'lucide-react'

import { BoundaryPanel } from '@/components/dashboard/BoundaryPanel'
import { CarbonPanel } from '@/components/dashboard/CarbonPanel'
import { ChartsPanel } from '@/components/dashboard/ChartsPanel'
import { DiagnosisPanel } from '@/components/dashboard/DiagnosisPanel'
import { HeroSection } from '@/components/dashboard/HeroSection'
import { KPICards } from '@/components/dashboard/KPICards'
import { PredictPanel } from '@/components/dashboard/PredictPanel'
import { ReportPanel } from '@/components/dashboard/ReportPanel'
import { RiskMap2D, type RiskMap2DHandle } from '@/components/dashboard/RiskMap2D'
import { RiskSandbox3D } from '@/components/dashboard/RiskSandbox3D'
import { SHAPPanel } from '@/components/dashboard/SHAPPanel'
import { TopKTable } from '@/components/dashboard/TopKTable'
import { loadCarbonSchemes, loadSamples, loadShapTopFeatures, loadSummary, type CarbonScheme, type SamplePayload, type ShapFeature, type SummaryPayload } from '@/lib/api'
import { fadeIn, premiumSpring } from '@/lib/animations'
import { sortedByRisk } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: typeof Sparkles
}

const navItems: NavItem[] = [
  { id: 'overview', label: '总览驾驶舱', icon: Sparkles },
  { id: 'sandbox-3d-section', label: '3D沙盘', icon: ShieldCheck },
  { id: 'kpi', label: '核心指标', icon: BarChart3 },
  { id: 'screening', label: '快速筛查', icon: Route },
  { id: 'map-section', label: '风险地图', icon: Map },
  { id: 'topk', label: 'Top-K巡查', icon: Table2 },
  { id: 'diagnosis', label: '单路段研判', icon: ShieldCheck },
  { id: 'analytics', label: '统计图谱', icon: BarChart3 },
  { id: 'carbon', label: '低碳比选', icon: Trees },
  { id: 'shap', label: '模型解释', icon: Leaf },
  { id: 'evidence', label: '证据链边界', icon: ShieldCheck },
  { id: 'report', label: '辅助报告', icon: FileText },
]

const brandName = 'GeoMICP-AI'
const brandSubtitle = '水毁风险 · MICP处治 · 低碳决策'

function inferTrainSampleCount(summary: SummaryPayload | null) {
  const explicit = summary?.model_metrics?.train_sample_count
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return explicit

  const modelName = summary?.model_metrics?.model
  if (typeof modelName !== 'string') return undefined

  const match = modelName.match(/train(\d+)/i)
  return match ? Number(match[1]) : undefined
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function DashboardSection({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement | null>(null)
  const isInView = useInView(ref, { once: true, amount: 0.14 })

  return (
    <motion.section
      id={id}
      ref={ref}
      className={cn('scroll-mt-6', className)}
      initial={{ opacity: 0, y: 34, filter: 'blur(10px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 34, filter: 'blur(10px)' }}
      transition={premiumSpring}
    >
      {children}
    </motion.section>
  )
}

function App() {
  const mainRef = useRef<HTMLElement | null>(null)
  const riskMapRef = useRef<RiskMap2DHandle | null>(null)
  const { scrollYProgress } = useScroll({ container: mainRef })
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [samples, setSamples] = useState<SamplePayload[]>([])
  const [selectedSample, setSelectedSample] = useState<SamplePayload | undefined>()
  const [carbonSchemes, setCarbonSchemes] = useState<CarbonScheme[]>([])
  const [shapFeatures, setShapFeatures] = useState<ShapFeature[]>([])
  const [dataError, setDataError] = useState<string | null>(null)

  const selectedId = selectedSample?.sample_id
  const dataUpdatedAt = useMemo(() => new Date().toLocaleString('zh-CN', { hour12: false }), [])
  const displayedSampleCount = summary?.sample_count ?? samples.length
  const trainSampleCount = inferTrainSampleCount(summary)
  const sidebarStatus = trainSampleCount && trainSampleCount !== displayedSampleCount
    ? `训练集${trainSampleCount} / 展示${displayedSampleCount || '--'}样本：地图、3D沙盘、统计图谱与报告已接入。`
    : `${displayedSampleCount || '--'}样本：地图、3D沙盘、统计图谱与报告已接入。`

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    if (selectedSample) riskMapRef.current?.flyTo(selectedSample)
  }, [selectedSample])

  useEffect(() => {
    let ignore = false

    async function loadDashboardData() {
      const [summaryResult, sampleResult, carbonResult, shapResult] = await Promise.allSettled([
        loadSummary(),
        loadSamples(),
        loadCarbonSchemes(),
        loadShapTopFeatures(),
      ])

      if (ignore) return

      setSummaryLoading(false)
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value)
      if (sampleResult.status === 'fulfilled') {
        setSamples(sampleResult.value)
        setSelectedSample(sortedByRisk(sampleResult.value)[0])
      }
      if (carbonResult.status === 'fulfilled') setCarbonSchemes(carbonResult.value)
      if (shapResult.status === 'fulfilled') setShapFeatures(shapResult.value)

      const rejected = [summaryResult, sampleResult, carbonResult, shapResult].find((result) => result.status === 'rejected')
      if (rejected?.status === 'rejected') setDataError(rejected.reason instanceof Error ? rejected.reason.message : 'API 数据加载失败')
    }

    loadDashboardData()

    return () => {
      ignore = true
    }
  }, [])

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault()
    setActiveSection(id)
    scrollToSection(id)
  }

  function jumpTo(id: string) {
    setActiveSection(id)
    scrollToSection(id)
  }

  function selectSample(sample: SamplePayload) {
    setSelectedSample(sample)
  }

  function handlePredicted(sample: SamplePayload) {
    setSamples((current) => {
      const withoutDuplicate = current.filter((item) => item.sample_id !== sample.sample_id)
      return [sample, ...withoutDuplicate]
    })
    setSelectedSample(sample)
    jumpTo('diagnosis')
  }

  return (
    <div className="min-h-screen text-slate-800 antialiased dark:text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_5%,rgba(52,211,153,.18),transparent_28%),radial-gradient(circle_at_88%_86%,rgba(125,211,252,.18),transparent_30%)] dark:bg-[radial-gradient(circle_at_12%_8%,rgba(56,189,248,.20),transparent_28%),radial-gradient(circle_at_88%_0%,rgba(16,185,129,.16),transparent_28%)]" />
      <motion.button
        aria-label={sidebarOpen ? '收起导航' : '展开导航'}
        className="fixed left-4 top-4 z-40 grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-xl shadow-slate-200/70 backdrop-blur-2xl dark:border-white/15 dark:bg-slate-950/62 dark:text-white dark:shadow-2xl"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </motion.button>

      <motion.button
        aria-label="切换深浅色模式"
        className="fixed right-4 top-4 z-40 grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-xl shadow-slate-200/70 backdrop-blur-2xl dark:border-white/15 dark:bg-slate-950/62 dark:text-white dark:shadow-2xl"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setDarkMode((value) => !value)}
      >
        {darkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </motion.button>

      <AnimatePresence>
        {sidebarOpen ? (
          <motion.aside
            className="fixed left-0 top-0 z-30 flex h-screen w-[280px] flex-col border-r border-slate-200 bg-white/90 px-4 py-20 text-slate-700 shadow-[18px_0_60px_rgba(148,163,184,.22)] backdrop-blur-3xl dark:border-white/10 dark:bg-slate-950/72 dark:text-white dark:shadow-[18px_0_60px_rgba(2,6,23,.36)]"
            initial={{ opacity: 0, x: -280 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -280 }}
            transition={premiumSpring}
          >
            <motion.div className="mb-7 flex items-center gap-4" variants={fadeIn} initial="hidden" animate="visible">
              <motion.div
                className="grid size-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-green),var(--color-cyan))] text-lg font-black text-[#06111f] shadow-[0_0_36px_rgba(46,229,157,.38)]"
                whileHover={{ rotate: -4, scale: 1.06 }}
                transition={premiumSpring}
              >
                M
              </motion.div>
              <div>
                <strong className="block text-lg font-black tracking-wide text-slate-900 dark:text-white">{brandName}</strong>
                <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{brandSubtitle}</span>
              </div>
            </motion.div>

            <nav className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pb-2 pr-1" aria-label="主导航">
              {navItems.map((item) => {
                const active = activeSection === item.id
                const Icon = item.icon

                return (
                  <motion.a
                    key={item.id}
                    href={'#' + item.id}
                    onClick={(event) => handleNavClick(event, item.id)}
                    whileHover={{ x: 4, backgroundColor: darkMode ? 'rgba(255,255,255,.10)' : 'rgba(16,185,129,.06)', scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={premiumSpring}
                    className={cn(
                      'relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-sm font-extrabold no-underline transition',
                      active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-sky-300/28 dark:bg-white/12 dark:text-white dark:shadow-lg'
                        : 'border-transparent text-slate-500 hover:border-emerald-100 hover:text-slate-900 dark:text-slate-400 dark:hover:border-white/15 dark:hover:text-white'
                    )}
                  >
                    {active ? <span className="absolute left-0 top-2 h-[calc(100%-16px)] w-1 rounded-full bg-[var(--color-green)] shadow-[0_0_18px_rgba(16,185,129,.9)]" /> : null}
                    <Icon className="relative size-4" />
                    <span className="relative">{item.label}</span>
                  </motion.a>
                )
              })}
            </nav>

            <div className="mt-4 shrink-0">
              <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs font-bold leading-5 text-slate-600 dark:border-emerald-300/18 dark:bg-emerald-300/8 dark:text-slate-300">
                <span className="mr-2 inline-block size-2 rounded-full bg-[var(--color-green)] shadow-[0_0_0_8px_rgba(46,229,157,.12)]" />
                {sidebarStatus}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <motion.div className="h-full origin-left rounded-full bg-[linear-gradient(90deg,#34d399,#38bdf8)]" style={{ scaleX: scrollYProgress }} />
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <main ref={mainRef} className={cn('h-screen overflow-y-auto px-4 py-20 transition-[padding] duration-300 lg:p-7', sidebarOpen ? 'lg:pl-[308px]' : 'lg:pl-7')}>
        <div className="mx-auto grid max-w-[1680px] gap-7">
          <DashboardSection id="overview" className="grid gap-6">
            <HeroSection
              summary={summary}
              loading={summaryLoading}
              onStartDemo={() => jumpTo('screening')}
              onOpenSandbox={() => jumpTo('sandbox-3d-section')}
              onFocusHighRisk={() => jumpTo('topk')}
              onReset={() => jumpTo('overview')}
            />
          </DashboardSection>

          <DashboardSection id="sandbox-3d-section">
            <RiskSandbox3D samples={samples} selectedId={selectedId} onSelect={selectSample} />
          </DashboardSection>

          <DashboardSection id="kpi">
            <KPICards />
          </DashboardSection>

          {dataError ? (
            <motion.div variants={fadeIn} initial="hidden" animate="visible" className="glass-card rounded-3xl p-4 text-sm font-bold text-rose-600 dark:text-rose-100">
              API 数据提示：{dataError}
            </motion.div>
          ) : null}

          <DashboardSection id="screening">
            <PredictPanel onPredicted={handlePredicted} />
          </DashboardSection>

          <DashboardSection id="map-section">
            <RiskMap2D ref={riskMapRef} samples={samples} selectedId={selectedId} onSelect={selectSample} />
          </DashboardSection>

          <DashboardSection id="topk">
            <TopKTable samples={samples} selectedId={selectedId} onSelect={selectSample} />
          </DashboardSection>

          <DashboardSection id="diagnosis">
            <DiagnosisPanel sample={selectedSample} />
          </DashboardSection>

          <DashboardSection id="analytics">
            <ChartsPanel samples={samples} />
          </DashboardSection>

          <DashboardSection id="carbon">
            <CarbonPanel schemes={carbonSchemes} sample={selectedSample} />
          </DashboardSection>

          <DashboardSection id="shap">
            <SHAPPanel features={shapFeatures} />
          </DashboardSection>

          <DashboardSection id="evidence">
            <BoundaryPanel />
          </DashboardSection>

          <DashboardSection id="report">
            <ReportPanel sample={selectedSample} />
          </DashboardSection>

          <footer className="pb-8 text-center text-xs font-bold leading-6 text-slate-400 dark:text-white/56">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/72 px-4 py-2 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-none">
              <span className="relative inline-flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,.9)]" />
              </span>
              数据在线 · 页面刷新时间：{dataUpdatedAt}
            </div>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-white/34">
              {brandName} · 面向道路边坡风险筛查、MICP绿色处治与低碳决策的智能建造原型平台
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
