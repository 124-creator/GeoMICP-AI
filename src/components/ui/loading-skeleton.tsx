import { Skeleton } from '@/components/ui/skeleton'

export function KpiSkeletonGrid() {
  return (
    <section aria-label="核心指标加载中" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={'kpi-skeleton-' + index}
          className="rounded-xl border border-[rgba(207,222,239,.85)] bg-[rgba(255,255,255,.72)] p-5 shadow-[0_16px_48px_rgba(42,80,130,.10)] backdrop-blur-[18px]"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 bg-[rgba(95,112,135,.18)]" />
              <Skeleton className="h-9 w-16 bg-[rgba(14,165,233,.18)]" />
              <Skeleton className="h-3 w-28 bg-[rgba(95,112,135,.14)]" />
            </div>
            <Skeleton className="size-10 rounded-full bg-[rgba(16,185,129,.13)]" />
          </div>
        </div>
      ))}
    </section>
  )
}

export function ModelInfoSkeleton() {
  return (
    <div className="space-y-4 rounded-[22px] border border-[rgba(16,185,129,.24)] bg-[rgba(255,255,255,.72)] p-6">
      <Skeleton className="h-4 w-28 bg-[rgba(95,112,135,.18)]" />
      <Skeleton className="h-10 w-44 bg-[rgba(16,185,129,.18)]" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full bg-[rgba(95,112,135,.14)]" />
        <Skeleton className="h-3 w-4/5 bg-[rgba(95,112,135,.14)]" />
      </div>
      <Skeleton className="h-px w-full bg-[rgba(16,185,129,.18)]" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full bg-[rgba(95,112,135,.14)]" />
        <Skeleton className="h-3 w-3/4 bg-[rgba(95,112,135,.14)]" />
      </div>
    </div>
  )
}
