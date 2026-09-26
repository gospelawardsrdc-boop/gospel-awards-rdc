export default function ClassementsLoading() {
  return (
    <div className="min-h-screen bg-[#060912]">
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 space-y-4">
            <div className="w-28 h-4 rounded-full bg-gold/20 mx-auto animate-pulse" />
            <div className="w-72 sm:w-96 h-10 rounded-xl bg-white/[0.06] mx-auto animate-pulse" />
            <div className="w-64 h-4 rounded bg-white/[0.03] mx-auto animate-pulse" />
          </div>

          {/* Rankings by category Skeletons */}
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, catIndex) => (
              <div key={catIndex} className="premium-card p-6 animate-pulse space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gold/20" />
                    <div className="w-48 h-5 rounded bg-white/[0.06]" />
                  </div>
                  <div className="w-20 h-4 rounded bg-white/[0.03]" />
                </div>

                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.01]"
                    >
                      <div className="w-8 h-6 rounded bg-white/[0.04]" />
                      <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="w-36 h-4 rounded bg-white/[0.06]" />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="w-16 h-4 rounded bg-gold/20 ml-auto" />
                        <div className="w-12 h-3 rounded bg-white/[0.03] ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
