export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#060912]">
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Welcome Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06] animate-pulse">
            <div className="space-y-2">
              <div className="w-24 h-4 rounded bg-gold/20" />
              <div className="w-48 sm:w-64 h-8 rounded-lg bg-white/[0.06]" />
              <div className="w-36 h-3 rounded bg-white/[0.03]" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-36 h-10 rounded-xl bg-gold/20" />
              <div className="w-28 h-10 rounded-xl bg-white/[0.04]" />
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="premium-card p-6 animate-pulse space-y-3">
                <div className="w-24 h-3.5 rounded bg-white/[0.04]" />
                <div className="w-32 h-8 rounded-lg bg-white/[0.08]" />
                <div className="w-28 h-3 rounded bg-white/[0.03] pt-2" />
              </div>
            ))}
          </div>

          {/* Quick shortcuts skeleton */}
          <div className="flex gap-3">
            <div className="w-44 h-10 rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="w-52 h-10 rounded-xl bg-white/[0.04] animate-pulse" />
          </div>

          {/* Recent Votes Skeleton */}
          <div className="premium-card p-6 sm:p-8 animate-pulse space-y-4">
            <div className="w-48 h-6 rounded bg-white/[0.06]" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.02]">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="w-36 h-4 rounded bg-white/[0.06]" />
                    <div className="w-24 h-3 rounded bg-white/[0.03]" />
                  </div>
                  <div className="w-16 h-5 rounded bg-gold/15" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
