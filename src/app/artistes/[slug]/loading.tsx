export default function ArtistPublicProfileLoading() {
  return (
    <div className="min-h-screen bg-[#060912]">
      {/* Cover Skeleton */}
      <div className="h-64 sm:h-80 lg:h-96 bg-white/[0.02] animate-pulse relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#060912] via-transparent to-transparent" />
      </div>

      <main className="max-w-5xl mx-auto px-4 -mt-28 relative pb-24 lg:pb-20">
        {/* Profile Header Skeleton */}
        <div className="flex flex-col lg:flex-row items-start gap-6 mb-10 animate-pulse">
          <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-2xl bg-surface border-2 border-white/[0.08] flex-shrink-0" />
          <div className="flex-1 pt-2 space-y-3">
            <div className="w-48 sm:w-64 h-8 rounded-lg bg-white/[0.08]" />
            <div className="flex gap-2">
              <div className="w-28 h-6 rounded-full bg-gold/15" />
              <div className="w-28 h-6 rounded-full bg-gold/15" />
            </div>
          </div>
          <div className="w-full lg:w-64 h-12 rounded-xl bg-gold/20" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="premium-card p-5 text-center animate-pulse space-y-2">
              <div className="w-20 h-7 rounded bg-white/[0.08] mx-auto" />
              <div className="w-16 h-3 rounded bg-white/[0.03] mx-auto" />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="premium-card p-6 mb-6 animate-pulse space-y-4">
          <div className="w-44 h-5 rounded bg-white/[0.06]" />
          <div className="h-44 rounded-xl bg-white/[0.02]" />
        </div>
      </main>
    </div>
  )
}
