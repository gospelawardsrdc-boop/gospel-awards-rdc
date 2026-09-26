import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import VoterForm from './VoterForm'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

interface Props {
  searchParams: Promise<{ artist?: string; category?: string }>
}

export default async function VoterPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const { artist: preselectedArtist, category: preselectedCategory } = await searchParams
  const userId = (session.user as any).id

  const [user, artistProfile, categories, categoryVotes, pointPackages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { pointBalance: true, name: true },
    }),
    prisma.artist.findUnique({
      where: { userId },
      select: { id: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        artists: {
          where: { artist: { isActive: true, isApproved: true } },
          include: {
            artist: true,
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

  const currentArtistId = artistProfile?.id || null

  const categoryVoteMap = new Map<string, number>()
  for (const v of categoryVotes) {
    categoryVoteMap.set(`${v.categoryId}:${v.artistId}`, v._sum.points || 0)
  }

  // Format categories with category-specific artist point totals
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
