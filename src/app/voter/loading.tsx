export default function VoterLoading() {
  return (
    <div className="min-h-screen bg-[#060912]">
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="text-center mb-10 space-y-3">
            <div className="w-24 h-4 rounded-full bg-gold/20 mx-auto animate-pulse" />
            <div className="w-64 sm:w-80 h-9 rounded-xl bg-white/[0.06] mx-auto animate-pulse" />
            <div className="w-56 h-4 rounded bg-white/[0.03] mx-auto animate-pulse" />
          </div>

          {/* Stepper Skeleton */}
          <div className="flex justify-center gap-3">
            <div className="w-28 h-9 rounded-full bg-gold/20 animate-pulse" />
            <div className="w-28 h-9 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="w-28 h-9 rounded-full bg-white/[0.04] animate-pulse" />
          </div>

          {/* Card Selection Skeleton */}
          <div className="premium-card p-6 sm:p-8 animate-pulse space-y-6">
            <div className="w-48 h-6 rounded bg-white/[0.06]" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] mx-auto" />
                  <div className="w-20 h-4 rounded bg-white/[0.04] mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
