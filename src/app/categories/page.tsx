import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CategoriesClient from './CategoriesClient'

export default async function CategoriesPage() {
  const session = await auth()
  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null

  const [categories, approvedArtists, allVotes] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        artists: {
          where: { artist: { isActive: true, isApproved: true } },
          include: {
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
    prisma.artist.findMany({
      where: { isActive: true, isApproved: true },
      select: { id: true },
    }),
    prisma.vote.findMany({
      select: {
        categoryId: true,
        artistId: true,
        points: true,
      },
    }),
  ])

  // Map categoryId:artistId => totalPoints
  const catArtistPointsMap = new Map<string, number>()
  const catTotalPointsMap = new Map<string, number>()
  const catTotalVotesMap = new Map<string, number>()

  for (const v of allVotes) {
    const key = `${v.categoryId}:${v.artistId}`
    catArtistPointsMap.set(key, (catArtistPointsMap.get(key) || 0) + v.points)
    catTotalPointsMap.set(v.categoryId, (catTotalPointsMap.get(v.categoryId) || 0) + v.points)
    catTotalVotesMap.set(v.categoryId, (catTotalVotesMap.get(v.categoryId) || 0) + 1)
  }

  const formattedCategories = categories.map((cat, idx) => {
    // Determine leader among approved artists in this category
    const artistListWithScores = cat.artists
      .map((ca) => ({
        artist: ca.artist,
        points: catArtistPointsMap.get(`${cat.id}:${ca.artist.id}`) || 0,
      }))
      .sort((a, b) => b.points - a.points)

    const leader = artistListWithScores[0] || null

    return {
      id: cat.id,
      number: idx + 1,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      description: cat.description,
      artistCount: cat.artists.length,
      totalPoints: catTotalPointsMap.get(cat.id) || 0,
      totalVotes: catTotalVotesMap.get(cat.id) || 0,
      leader: leader
        ? {
            stageName: leader.artist.stageName,
            points: leader.points,
            profileImage: leader.artist.profileImage,
            slug: leader.artist.slug,
          }
        : null,
    }
  })

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header user={user} />
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4 flex-1">
        <div className="max-w-7xl mx-auto">
          <CategoriesClient
            categories={formattedCategories}
            totalArtistsCount={approvedArtists.length}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
