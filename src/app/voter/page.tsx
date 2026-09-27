import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import VoterForm from './VoterForm'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

interface Props {
  searchParams: Promise<{ artist?: string; artiste?: string; category?: string; [key: string]: string | undefined }>
}

const getPublicVoterData = unstable_cache(
  async () => {
    const [categories, categoryVotes, pointPackages] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
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
      prisma.vote.groupBy({
        by: ['categoryId', 'artistId'],
        _sum: { points: true },
      }),
      prisma.pointPackage.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      }),
    ])

    const categoryVoteMap = new Map<string, number>()
    for (const v of categoryVotes) {
      categoryVoteMap.set(`${v.categoryId}:${v.artistId}`, v._sum.points || 0)
    }

    const formattedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      artists: cat.artists.map((ac) => ({
        artist: {
          id: ac.artist.id,
          stageName: ac.artist.stageName,
          slug: ac.artist.slug,
          profileImage: ac.artist.profileImage,
          totalPoints: categoryVoteMap.get(`${cat.id}:${ac.artist.id}`) || 0,
        },
      })),
    }))

    return { formattedCategories, pointPackages }
  },
  ['public-voter-structure-v1'],
  { revalidate: 30, tags: ['categories', 'artists', 'votes'] }
)

export default async function VoterPage({ searchParams }: Props) {
  const sp = await searchParams
  const session = await auth()

  if (!session?.user) {
    const queryParams = new URLSearchParams()
    for (const [key, value] of Object.entries(sp || {})) {
      if (typeof value === 'string' && value) {
        queryParams.set(key, value)
      } else if (Array.isArray(value) && value.length > 0) {
        queryParams.set(key, value[0])
      }
    }
    const qs = queryParams.toString()
    const targetUrl = qs ? `/voter?${qs}` : '/voter'
    redirect(`/connexion?callbackUrl=${encodeURIComponent(targetUrl)}`)
  }

  const userId = (session.user as any).id

  const preselectedArtist = (typeof sp?.artist === 'string' ? sp.artist : undefined) || (typeof sp?.artiste === 'string' ? sp.artiste : undefined)
  const preselectedCategory = typeof sp?.category === 'string' ? sp.category : undefined

  const [{ formattedCategories, pointPackages }, user, artistProfile] =
    await Promise.all([
      getPublicVoterData(),
      prisma.user.findUnique({
        where: { id: userId },
        select: { pointBalance: true, name: true },
      }),
      prisma.artist.findUnique({
        where: { userId },
        select: { id: true },
      }),
    ])

  const currentArtistId = artistProfile?.id || null

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header user={{ name: session.user.name || '', role: (session.user as any).role }} />
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4 flex-1">
        <VoterForm
          categories={formattedCategories}
          pointPackages={pointPackages}
          userBalance={user?.pointBalance || 0}
          preselectedArtist={preselectedArtist}
          preselectedCategory={preselectedCategory}
          currentArtistId={currentArtistId}
        />
      </main>
      <Footer />
    </div>
  )
}

