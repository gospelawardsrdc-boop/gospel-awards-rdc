import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ClassementsClient from './ClassementsClient'

export default async function ClassementsPage() {
  const session = await auth()
  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null
  const userId = session?.user ? (session.user as any).id : null

  const artistProfile = userId
    ? await prisma.artist.findUnique({
        where: { userId },
        select: { id: true },
      })
    : null
  const currentArtistId = artistProfile?.id || null

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

  const sanitizedRankings = categories.map((category) => {
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

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header user={user} />
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4 flex-1">
        <div className="max-w-6xl mx-auto">
          <ClassementsClient
            rankings={sanitizedRankings}
            currentArtistId={currentArtistId}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
