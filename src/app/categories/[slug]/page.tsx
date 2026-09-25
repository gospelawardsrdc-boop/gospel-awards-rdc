import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { formatPoints, getRankEmoji } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()
  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      artists: {
        where: { artist: { isActive: true, isApproved: true } },
        include: { artist: true },
      },
    },
  })

  if (!category) notFound()

  const votes = await prisma.vote.findMany({
    where: { categoryId: category.id },
    select: {
      artistId: true,
      points: true,
      userId: true,
    },
  })

  const artistStatsMap = new Map<string, { totalPoints: number; totalVotes: number; voterIds: Set<string> }>()
  for (const v of votes) {
    let stat = artistStatsMap.get(v.artistId)
    if (!stat) {
      stat = { totalPoints: 0, totalVotes: 0, voterIds: new Set<string>() }
      artistStatsMap.set(v.artistId, stat)
    }
    stat.totalPoints += v.points
    stat.totalVotes += 1
    if (v.userId) {
      stat.voterIds.add(v.userId)
    }
  }

  const artistsWithStats = category.artists
    .map((ac) => {
      const stat = artistStatsMap.get(ac.artistId)
      return {
        ...ac.artist,
        totalPoints: stat?.totalPoints || 0,
        totalVotes: stat?.totalVotes || 0,
        totalVoters: stat?.voterIds.size || 0,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((artist, index) => ({ ...artist, rank: index + 1 }))

  return (
    <div className="min-h-screen bg-[#060912]">
      <Header user={user} />
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Category Header */}
          <div className="text-center mb-14">
            <div className="text-5xl mb-4">{category.icon || '🏆'}</div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              <span className="gold-text">{category.name}</span>
            </h1>
            <p className="text-gray-500 max-w-md mx-auto text-sm">{category.description}</p>
          </div>

          {/* Artists List */}
          {artistsWithStats.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4 opacity-30">🎤</div>
              <p className="text-gray-500 text-lg mb-2">Aucun candidat dans cette catégorie</p>
              <p className="text-gray-600 text-sm">Les artistes seront bientôt annoncés.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {artistsWithStats.map((artist) => (
                <div
                  key={artist.id}
                  className={`premium-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                    artist.rank <= 3 ? 'border-gold/15 glow-gold' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className={`text-3xl font-black min-w-[3rem] text-center ${
                    artist.rank === 1 ? 'rank-1' : artist.rank === 2 ? 'rank-2' : artist.rank === 3 ? 'rank-3' : 'text-gray-600'
                  }`}>
                    {getRankEmoji(artist.rank)}
                  </div>

                  {/* Photo */}
                  <div className="w-14 h-14 rounded-xl bg-surface-light border border-white/[0.06] overflow-hidden flex-shrink-0">
                    {artist.profileImage ? (
                      <img src={artist.profileImage} alt={artist.stageName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-surface">🎤</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg">{artist.stageName}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                      <span className="text-gold font-bold">{formatPoints(artist.totalPoints)} pts</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-500">{artist.totalVotes} vote{artist.totalVotes !== 1 ? 's' : ''}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-500">{artist.totalVoters} votant{artist.totalVoters !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link
                      href={`/artistes/${artist.slug}`}
                      className="flex-1 sm:flex-initial text-center text-xs font-semibold border border-white/[0.08] text-gray-300 px-4 py-2.5 rounded-lg hover:border-gold/30 hover:text-gold transition-all"
                    >
                      Voir le profil
                    </Link>
                    {(session?.user as any)?.id !== artist.userId && (
                      <Link
                        href={`/voter?artist=${artist.id}&category=${category.id}`}
                        className="flex-1 sm:flex-initial text-center text-xs font-bold gold-gradient text-[#0A0E1A] px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        ⭐ Voter
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
