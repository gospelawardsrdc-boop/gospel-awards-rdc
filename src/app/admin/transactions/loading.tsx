export default function AdminTransactionsLoading() {
  return (
    <div className="min-h-screen bg-[#060912] flex">
      {/* Sidebar Placeholder */}
      <div className="hidden lg:block w-64 bg-[#0A0E1A] border-r border-white/[0.06] p-6 space-y-6">
        <div className="space-y-2">
          <div className="w-20 h-3 rounded bg-gold/20 animate-pulse" />
          <div className="w-32 h-5 rounded bg-white/[0.06] animate-pulse" />
        </div>
        <div className="space-y-3 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-full h-9 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>

      <main className="flex-1 pt-8 pb-20 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="pb-6 border-b border-white/[0.06] space-y-2">
            <div className="w-32 h-4 rounded bg-gold/20" />
            <div className="w-64 h-8 rounded-lg bg-white/[0.06]" />
            <div className="w-80 h-3.5 rounded bg-white/[0.03]" />
          </div>

          {/* Metric Cards Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="premium-card p-4 space-y-2">
                <div className="w-20 h-3 rounded bg-white/[0.04]" />
                <div className="w-28 h-6 rounded bg-white/[0.08]" />
              </div>
            ))}
          </div>

          {/* Filter Skeleton */}
          <div className="premium-card p-4 flex gap-3">
            <div className="flex-1 h-10 rounded-lg bg-white/[0.03]" />
            <div className="w-48 h-10 rounded-lg bg-white/[0.03]" />
          </div>

          {/* Transactions Table Skeleton */}
          <div className="premium-card p-6 space-y-4">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-white/[0.02]" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
