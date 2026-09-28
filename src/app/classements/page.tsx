import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ClassementsClient from './ClassementsClient'

const getLiveRankings = unstable_cache(
  async () => {
    // 1. Récupération de l'édition active (ou la plus récente si aucune active)
    const activeCompetition = await prisma.competition.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        year: true,
        status: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    })

    // 2. Récupération parallèle des catégories et des votes strictement filtrés sur l'édition active
    const [categories, allVotes] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          description: true,
          artists: {
            where: { artist: { isActive: true, isApproved: true } },
            select: {
              artist: {
                select: {
                  id: true,
                  stageName: true,
                  slug: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      }),
      activeCompetition
        ? prisma.vote.groupBy({
            by: ['categoryId', 'artistId'],
            where: { competitionId: activeCompetition.id },
            _sum: { points: true },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ])

    // Aggregate points and votes in-memory: (categoryId:artistId) => { totalPoints, totalVotes }
    const voteAggMap = new Map<string, { totalPoints: number; totalVotes: number }>()
    for (const v of allVotes) {
      const key = `${v.categoryId}:${v.artistId}`
      voteAggMap.set(key, {
        totalPoints: v._sum.points || 0,
        totalVotes: v._count._all || 0,
      })
    }

    const formattedRankings = categories.map((category) => {
      const ranked = category.artists
        .map((ac) => {
          const key = `${category.id}:${ac.artist.id}`
          const stat = voteAggMap.get(key)
          return {
            artist: {
              id: ac.artist.id,
              stageName: ac.artist.stageName,
              slug: ac.artist.slug,
              profileImage: ac.artist.profileImage,
            },
            totalPoints: stat?.totalPoints || 0,
            totalVotes: stat?.totalVotes || 0,
          }
        })
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((item, index) => ({
          rank: index + 1,
          ...item,
        }))

      return {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          description: category.description,
        },
        rankings: ranked,
      }
    })

    return {
      rankings: formattedRankings,
      competition: activeCompetition
        ? {
            id: activeCompetition.id,
            name: activeCompetition.name,
            year: activeCompetition.year,
            status: activeCompetition.status,
          }
        : null,
    }
  },
  ['live-rankings-data-v2'],
  { revalidate: 15, tags: ['rankings', 'votes', 'edition', 'competition'] }
)

export default async function ClassementsPage() {
  const [session, data] = await Promise.all([
    auth(),
    getLiveRankings(),
  ])

  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null
  const userId = session?.user ? (session.user as any).id : null

  let currentArtistId: string | null = null
  if (userId && (session?.user as any).role === 'ARTIST') {
    const artistProfile = await prisma.artist.findUnique({
      where: { userId },
      select: { id: true },
    })
    currentArtistId = artistProfile?.id || null
  }

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header user={user} />
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4 flex-1">
        <div className="max-w-6xl mx-auto">
          <ClassementsClient
            rankings={data.rankings}
            competition={data.competition}
            currentArtistId={currentArtistId}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
