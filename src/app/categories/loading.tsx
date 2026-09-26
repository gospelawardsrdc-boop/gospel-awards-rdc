export default function CategoriesLoading() {
  return (
    <div className="min-h-screen bg-[#060912]">
      {/* Header placeholder */}
      <div className="fixed top-0 left-0 right-0 h-16 lg:h-20 bg-[#060912]/90 border-b border-white/[0.04] z-50 flex items-center px-4 sm:px-8 justify-between">
        <div className="w-36 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
        <div className="hidden lg:flex items-center gap-4">
          <div className="w-20 h-4 rounded bg-white/[0.04] animate-pulse" />
          <div className="w-24 h-4 rounded bg-white/[0.04] animate-pulse" />
          <div className="w-24 h-4 rounded bg-white/[0.04] animate-pulse" />
        </div>
        <div className="w-28 h-9 rounded-full bg-gold/[0.1] animate-pulse" />
      </div>

      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Title Skeleton */}
          <div className="text-center mb-16 space-y-4">
            <div className="w-28 h-4 rounded-full bg-gold/20 mx-auto animate-pulse" />
            <div className="w-72 sm:w-96 h-10 rounded-xl bg-white/[0.06] mx-auto animate-pulse" />
            <div className="w-64 h-4 rounded bg-white/[0.03] mx-auto animate-pulse" />
          </div>

          {/* Categories Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="premium-card overflow-hidden animate-pulse">
                <div className="h-32 bg-white/[0.03]" />
                <div className="p-5 space-y-3">
                  <div className="w-3/4 h-5 rounded bg-white/[0.06]" />
                  <div className="w-full h-3.5 rounded bg-white/[0.03]" />
                  <div className="w-2/3 h-3.5 rounded bg-white/[0.03]" />
                  <div className="pt-4 border-t border-white/[0.04] flex items-center gap-4">
                    <div className="w-24 h-3 rounded bg-gold/15" />
                    <div className="w-20 h-3 rounded bg-white/[0.04]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
