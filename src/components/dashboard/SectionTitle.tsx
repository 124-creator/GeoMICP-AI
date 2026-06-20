import type { ReactNode } from 'react'

interface SectionTitleProps {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}

export function SectionTitle({ eyebrow, title, description, action }: SectionTitleProps) {
  return (
    <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="mb-1.5 text-[11px] font-black uppercase tracking-[.13em] text-emerald-600 dark:text-emerald-200">{eyebrow}</p>
        <h2 className="text-[22px] font-black tracking-[-0.015em] text-slate-900 before:mr-2 before:inline-block before:h-[22px] before:w-1.5 before:rounded-full before:bg-[linear-gradient(180deg,var(--color-green),var(--color-cyan))] before:align-[-4px] before:content-[''] dark:text-white">
          {title}
        </h2>
        {description ? <p className="mt-2 hidden max-w-4xl text-[14px] font-semibold leading-6 text-slate-600 sm:block dark:text-white/68">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
