import { motion } from 'framer-motion'

import type { SamplePayload } from '@/lib/api'
import { pct, percent, riskColor, sortedByRisk } from '@/lib/dashboard-utils'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionTitle } from '@/components/dashboard/SectionTitle'

interface TopKTableProps {
  samples: SamplePayload[]
  selectedId?: string
  onSelect: (sample: SamplePayload) => void
}

export function TopKTable({ samples, selectedId, onSelect }: TopKTableProps) {
  const topSamples = sortedByRisk(samples).slice(0, 20)

  return (
    <AnimatedCard variant="solid" magnetic>
      <CardContent className="p-6">
        <SectionTitle
          eyebrow="Top-K Inspection"
          title="Top-K优先巡查清单"
          description="按模型风险评分自动排序，点击任一路段可联动地图、3D沙盘、单路段研判、MICP建议和报告。"
          action={<Badge className="h-8 rounded-full bg-sky-50 px-4 font-black text-sky-700 dark:bg-sky-300/12 dark:text-sky-100">Top 20</Badge>}
        />
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="overflow-hidden rounded-[18px] border border-slate-200 bg-white/88 shadow-sm dark:border-white/12 dark:bg-white/6">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-white/8 dark:hover:bg-white/8">
                <TableHead className="px-4 font-black text-slate-800 dark:text-white/82">排名</TableHead>
                <TableHead className="px-4 font-black text-slate-800 dark:text-white/82">路段编号</TableHead>
                <TableHead className="px-4 font-black text-slate-800 dark:text-white/82">风险等级</TableHead>
                <TableHead className="px-4 font-black text-slate-800 dark:text-white/82">风险评分</TableHead>
                <TableHead className="px-4 font-black text-slate-800 dark:text-white/82">MICP适宜性</TableHead>
                <TableHead className="px-4 font-black text-slate-800 dark:text-white/82">节碳率</TableHead>
                <TableHead className="px-4 font-black text-slate-800 dark:text-white/82">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSamples.map((sample, index) => {
                const active = selectedId === sample.sample_id
                return (
                  <motion.tr
                    key={sample.sample_id}
                    variants={staggerItem}
                    className={active ? 'border-b border-l-4 border-l-emerald-400 bg-emerald-50' : 'border-b transition-colors hover:bg-emerald-50/50 dark:hover:bg-white/8'}
                  >
                    <TableCell className="px-4 font-black text-slate-700 dark:text-white/76">#{index + 1}</TableCell>
                    <TableCell className="px-4 font-black text-slate-900 dark:text-white">{sample.sample_id}</TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: riskColor(sample.risk_level) + '22', color: riskColor(sample.risk_level) }}>
                        <span className="size-2 rounded-full" style={{ backgroundColor: riskColor(sample.risk_level) }} />
                        {sample.risk_level ?? '--'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 font-black text-slate-900 dark:text-white">{percent(sample.risk_probability)}</TableCell>
                    <TableCell className="px-4 font-bold text-slate-600 dark:text-white/66">{sample.micp_suitability ?? '--'} / {sample.micp_suitability_score ?? '--'}</TableCell>
                    <TableCell className="px-4 font-bold text-emerald-700 dark:text-emerald-200">{pct(sample.carbon_saving_vs_shotcrete_pct)}</TableCell>
                    <TableCell className="px-4">
                      <Button className="rounded-full font-black text-sky-700 hover:bg-sky-50 dark:text-sky-100 dark:hover:bg-white/10" variant="ghost" onClick={() => onSelect(sample)}>
                        联动查看
                      </Button>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
        </motion.div>
      </CardContent>
    </AnimatedCard>
  )
}
