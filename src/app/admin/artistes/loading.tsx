export default function AdminArtistesLoading() {
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
            <div className="w-96 h-3.5 rounded bg-white/[0.03]" />
          </div>

          {/* Creation Form Skeleton */}
          <div className="premium-card p-6 sm:p-8 space-y-4">
            <div className="w-56 h-5 rounded bg-white/[0.06]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-10 rounded-lg bg-white/[0.03]" />
              <div className="h-10 rounded-lg bg-white/[0.03]" />
              <div className="h-10 rounded-lg bg-white/[0.03]" />
            </div>
            <div className="w-48 h-10 rounded-xl bg-gold/20" />
          </div>

          {/* Artists List Skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="premium-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.06]" />
                  <div className="space-y-1.5">
                    <div className="w-36 h-4 rounded bg-white/[0.06]" />
                    <div className="w-28 h-3 rounded bg-white/[0.03]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-20 h-8 rounded-lg bg-white/[0.04]" />
                  <div className="w-20 h-8 rounded-lg bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
