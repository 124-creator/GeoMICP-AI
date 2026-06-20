import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'h-10 w-full rounded-xl border border-slate-200 bg-white/82 px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300/70 focus:ring-4 focus:ring-sky-400/15 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/38',
        className
      )}
      {...props}
    />
  )
}

export { Input }
