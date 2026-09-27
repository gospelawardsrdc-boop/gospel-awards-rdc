import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ArtistesClient from './ArtistesClient'

const getPublicArtistsData = unstable_cache(
  async () => {
    const [categories, approvedArtists, allVotes] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
        },
      }),
      prisma.artist.findMany({
        where: { isActive: true, isApproved: true },
        select: {
          id: true,
          stageName: true,
          slug: true,
          profileImage: true,
          coverImage: true,
          categories: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  icon: true,
                },
              },
            },
          },
        },
      }),
      prisma.vote.findMany({
        select: {
          artistId: true,
          points: true,
        },
      }),
    ])

    // Aggregate points and votes in memory
    const artistVotesMap = new Map<string, { totalPoints: number; totalVotes: number }>()
    for (const v of allVotes) {
      const current = artistVotesMap.get(v.artistId) || { totalPoints: 0, totalVotes: 0 }
      current.totalPoints += v.points
      current.totalVotes += 1
      artistVotesMap.set(v.artistId, current)
    }

    // Format and rank artists by total points
    const sanitizedArtists = approvedArtists
      .map((artist) => {
        const stats = artistVotesMap.get(artist.id)
        return {
          id: artist.id,
          stageName: artist.stageName,
          slug: artist.slug,
          profileImage: artist.profileImage,
          coverImage: artist.coverImage,
          categories: artist.categories.map((ac) => ac.category),
          totalPoints: stats?.totalPoints || 0,
          totalVotes: stats?.totalVotes || 0,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((item, index) => ({
        ...item,
        rankOverall: index + 1,
      }))

    return {
      artists: sanitizedArtists,
      categories,
    }
  },
  ['public-artists-catalog-data-v1'],
  { revalidate: 30, tags: ['artists', 'votes'] }
)

export default async function ArtistesPage() {
  const [session, data] = await Promise.all([
    auth(),
    getPublicArtistsData(),
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
        <div className="max-w-7xl mx-auto">
          <ArtistesClient
            artists={data.artists}
            categories={data.categories}
            currentArtistId={currentArtistId}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
