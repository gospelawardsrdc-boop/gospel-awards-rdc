export default function CategoryDetailLoading() {
  return (
    <div className="min-h-screen bg-[#060912]">
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Category Header Skeleton */}
          <div className="text-center mb-14 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] mx-auto animate-pulse" />
            <div className="w-64 sm:w-80 h-9 rounded-xl bg-white/[0.06] mx-auto animate-pulse" />
            <div className="w-72 h-4 rounded bg-white/[0.03] mx-auto animate-pulse" />
          </div>

          {/* Artists List Skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="premium-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-pulse"
              >
                <div className="w-12 h-8 rounded bg-white/[0.04]" />
                <div className="w-14 h-14 rounded-xl bg-white/[0.06] flex-shrink-0" />
                <div className="flex-1 space-y-2 w-full sm:w-auto">
                  <div className="w-40 h-5 rounded bg-white/[0.06]" />
                  <div className="w-56 h-3.5 rounded bg-white/[0.03]" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="w-24 h-9 rounded-lg bg-white/[0.04]" />
                  <div className="w-24 h-9 rounded-lg bg-gold/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
