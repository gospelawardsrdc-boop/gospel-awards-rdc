import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { formatPoints, getRankEmoji } from '@/lib/utils'

export default async function ClassementsPage() {
  const session = await auth()
  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null

  const [categories, allVotes] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        artists: {
          where: { artist: { isActive: true, isApproved: true } },
          include: { artist: true },
        },
      },
    }),
    prisma.vote.findMany({
      select: {
        categoryId: true,
        artistId: true,
        points: true,
      },
    }),
  ])

  // Aggregate points and votes in-memory: (categoryId:artistId) => { totalPoints, totalVotes }
  const voteAggMap = new Map<string, { totalPoints: number; totalVotes: number }>()
  for (const v of allVotes) {
    const key = `${v.categoryId}:${v.artistId}`
    const current = voteAggMap.get(key) || { totalPoints: 0, totalVotes: 0 }
    current.totalPoints += v.points
    current.totalVotes += 1
    voteAggMap.set(key, current)
  }

  const rankings = categories.map((category) => {
    const ranked = category.artists
      .map((ac) => {
        const key = `${category.id}:${ac.artist.id}`
        const stat = voteAggMap.get(key)
        return {
          artist: ac.artist,
          totalPoints: stat?.totalPoints || 0,
          totalVotes: stat?.totalVotes || 0,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }))

    return { category, rankings: ranked }
  })

  return (
    <div className="min-h-screen bg-[#060912]">
      <Header user={user} />
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-3 block">En temps réel</span>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">
              🏆 Classements <span className="gold-text">Gospel RDC</span>
            </h1>
            <p className="text-gray-500 max-w-md mx-auto text-sm">
              Classement en temps réel de tous les artistes par catégorie
            </p>
          </div>

          {/* Rankings by category */}
          <div className="space-y-8">
            {rankings.map(({ category, rankings: ranked }) => (
              <div key={category.id} className="premium-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{category.icon || '🏆'}</span>
                    <span>{category.name}</span>
                  </h2>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-xs text-gold/70 hover:text-gold transition-colors font-medium"
                  >
                    Voir tout →
                  </Link>
                </div>

                {ranked.length === 0 ? (
                  <p className="text-gray-600 text-sm py-4">Aucun candidat dans cette catégorie.</p>
                ) : (
                  <div className="space-y-2">
                    {ranked.map((item: any) => (
                      <div
                        key={item.artist.id}
                        className={`flex items-center gap-3 sm:gap-4 p-3 rounded-xl transition-all ${
                          item.rank <= 3
                            ? 'bg-gold/[0.03] border border-gold/[0.08]'
                            : 'bg-white/[0.01] hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className={`text-xl sm:text-2xl font-black min-w-[2.5rem] text-center ${
                          item.rank === 1 ? 'rank-1' : item.rank === 2 ? 'rank-2' : item.rank === 3 ? 'rank-3' : 'text-gray-600'
                        }`}>
                          {getRankEmoji(item.rank)}
                        </span>

                        <div className="w-10 h-10 rounded-lg bg-surface-light border border-white/[0.06] overflow-hidden flex-shrink-0">
                          {item.artist.profileImage ? (
                            <img src={item.artist.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg bg-surface">🎤</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/artistes/${item.artist.slug}`}
                            className="font-semibold text-sm text-white hover:text-gold transition-colors"
                          >
                            {item.artist.stageName}
                          </Link>
                        </div>

                        <div className="text-right">
                          <div className="text-gold font-bold text-sm">{formatPoints(item.totalPoints)} pts</div>
                          <div className="text-[10px] text-gray-500">{item.totalVotes} vote{item.totalVotes !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
