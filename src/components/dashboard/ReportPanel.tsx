import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardCheck, Copy } from 'lucide-react'

import type { SamplePayload } from '@/lib/api'
import { loadReport } from '@/lib/api'
import { fadeIn, premiumSpring } from '@/lib/animations'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface ReportPanelProps {
  sample?: SamplePayload
}

function markdownToBlocks(markdown: string) {
  return markdown
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function ReportPanel({ sample }: ReportPanelProps) {
  const [loadedReport, setLoadedReport] = useState<{ sampleId: string; markdown: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const markdown = sample?.report_markdown ?? (loadedReport && loadedReport.sampleId === sample?.sample_id ? loadedReport.markdown : '')
  const blocks = useMemo(() => markdownToBlocks(markdown), [markdown])

  useEffect(() => {
    let ignore = false

    if (!sample || sample.report_markdown) return

    loadReport(sample.sample_id)
      .then((payload) => {
        if (!ignore) setLoadedReport({ sampleId: sample.sample_id, markdown: payload.markdown })
      })
      .catch(() => {
        if (!ignore) setLoadedReport({ sampleId: sample.sample_id, markdown: '# 辅助报告\n\n当前样本报告暂未返回，请确认后端 /api/report 接口。' })
      })

    return () => {
      ignore = true
    }
  }, [sample])

  async function copyReport() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <AnimatedCard variant="solid" magnetic>
      <CardContent className="relative z-10 p-6">
        <SectionTitle
          eyebrow="Assistant Report"
          title="单样本辅助报告"
          description="渲染 Markdown 研判报告；公开版使用 demo 报告，可一键复制用于流程展示。"
          action={
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button className="h-9 rounded-full bg-slate-900 px-4 font-black text-white hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15" onClick={copyReport} disabled={!markdown}>
                <Copy />
                复制报告
              </Button>
            </motion.div>
          }
        />
        <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="max-h-[420px] overflow-auto rounded-3xl border border-slate-100 bg-white/72 p-5 shadow-sm dark:border-white/12 dark:bg-slate-950/38">
          {blocks.map((line, index) => {
            if (line.startsWith('# ')) {
              return <h3 key={index} className="mb-3 text-2xl font-black text-slate-900 dark:text-white">{line.replace(/^#\s+/, '')}</h3>
            }
            if (line.startsWith('## ')) {
              return <h4 key={index} className="mb-2 mt-5 text-lg font-black text-sky-700 dark:text-sky-100">{line.replace(/^##\s+/, '')}</h4>
            }
            if (line.startsWith('- ')) {
              return <p key={index} className="pl-4 text-sm font-semibold leading-7 text-slate-600 before:mr-2 before:text-emerald-500 before:content-['•'] dark:text-white/72 dark:before:text-emerald-300">{line.replace(/^-\s+/, '')}</p>
            }
            return <p key={index} className="text-sm font-semibold leading-7 text-slate-600 dark:text-white/68">{line}</p>
          })}
        </motion.div>
        <AnimatePresence>
          {copied ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={premiumSpring}
              className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-2xl"
            >
              <ClipboardCheck className="size-4" />
              报告已复制
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </AnimatedCard>
  )
}

