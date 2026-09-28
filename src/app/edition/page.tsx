import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import EditionClient from './EditionClient'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const competition = await prisma.competition.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      year: true,
      theme: true,
      description: true,
      bannerImage: true,
    },
  })

  if (!competition) {
    return {
      title: 'Édition Officielle | Gospel Awards RDC',
      description: 'Découvrez la prestigieuse compétition Gospel Awards RDC célébrant l\'excellence de la musique chrétienne en République Démocratique du Congo.',
    }
  }

  const title = `${competition.name} (${competition.year || new Date().getFullYear()}) | Gospel Awards RDC`
  const description =
    competition.description ||
    competition.theme ||
    'La célébration officielle de la musique gospel en République Démocratique du Congo.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: competition.bannerImage ? [{ url: competition.bannerImage }] : [],
    },
  }
}

const getEditionData = unstable_cache(
  async () => {
    // 1. Récupération optimisée de l'édition active (ou la plus récente)
    const selectCompetitionFields = {
      id: true,
      name: true,
      year: true,
      theme: true,
      description: true,
      bannerImage: true,
      status: true,
      startDate: true,
      endDate: true,
      isActive: true,
    }

    let competition = await prisma.competition.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: selectCompetitionFields,
    })

    if (!competition) {
      competition = await prisma.competition.findFirst({
        orderBy: { createdAt: 'desc' },
        select: selectCompetitionFields,
      })
    }

    // 2. Récupération parallèle optimisée des catégories, artistes et agrégats de votes
    const [categories, approvedArtists, categoryVotes, totalEditionVotesAgg, uniqueVotersAgg] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          description: true,
          orderIndex: true,
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
                },
              },
            },
          },
        },
      }),
      // Agrégat des points par catégorie et par artiste pour l'édition courante
      competition
        ? prisma.vote.groupBy({
            by: ['categoryId', 'artistId'],
            where: { competitionId: competition.id },
            _sum: { points: true },
          })
        : Promise.resolve([]),
      competition
        ? prisma.vote.aggregate({
            where: { competitionId: competition.id },
            _sum: { points: true },
            _count: { _all: true },
          })
        : Promise.resolve({ _sum: { points: 0 }, _count: { _all: 0 } }),
      competition
        ? prisma.vote.groupBy({
            by: ['userId'],
            where: { competitionId: competition.id },
          })
        : Promise.resolve([]),
    ])

    // Mapper les votes par catégorie et par artiste
    const catArtistPointsMap = new Map<string, number>()
    const artistTotalPointsMap = new Map<string, number>()
    const catTotalPointsMap = new Map<string, number>()

    for (const v of categoryVotes) {
      const pts = v._sum.points || 0
      const key = `${v.categoryId}:${v.artistId}`
      catArtistPointsMap.set(key, pts)
      catTotalPointsMap.set(v.categoryId, (catTotalPointsMap.get(v.categoryId) || 0) + pts)
      artistTotalPointsMap.set(v.artistId, (artistTotalPointsMap.get(v.artistId) || 0) + pts)
    }

    // Préparer les catégories enrichies avec leader
    const formattedCategories = categories.map((cat, idx) => {
      let leader: { stageName: string; points: number; profileImage: string | null; slug: string } | null = null
      let maxPts = -1

      for (const item of cat.artists) {
        const pts = catArtistPointsMap.get(`${cat.id}:${item.artist.id}`) || 0
        if (pts > maxPts) {
          maxPts = pts
          if (pts > 0) {
            leader = {
              stageName: item.artist.stageName,
              points: pts,
              profileImage: item.artist.profileImage,
              slug: item.artist.slug,
            }
          }
        }
      }

      return {
        id: cat.id,
        number: idx + 1,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        artistCount: cat.artists.length,
        totalPoints: catTotalPointsMap.get(cat.id) || 0,
        leader,
      }
    })

    // Préparer les artistes avec points et classement
    const artistsWithPoints = approvedArtists.map((artist) => ({
      id: artist.id,
      stageName: artist.stageName,
      slug: artist.slug,
      profileImage: artist.profileImage,
      coverImage: artist.coverImage,
      categories: artist.categories.map((ac) => ({
        id: ac.category.id,
        name: ac.category.name,
        slug: ac.category.slug,
      })),
      totalPoints: artistTotalPointsMap.get(artist.id) || 0,
    }))

    // Trier les artistes par points décroissants pour le podium / top 3
    const topArtists = [...artistsWithPoints]
      .filter((a) => a.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 3)

    return {
      competition: competition
        ? {
            id: competition.id,
            name: competition.name,
            year: competition.year,
            theme: competition.theme,
            description: competition.description,
            bannerImage: competition.bannerImage,
            status: competition.status,
            startDate: competition.startDate.toISOString(),
            endDate: competition.endDate.toISOString(),
            isActive: competition.isActive,
          }
        : null,
      categories: formattedCategories,
      artists: artistsWithPoints.slice(0, 12),
      topArtists,
      stats: {
        totalCategories: categories.length,
        totalArtists: approvedArtists.length,
        totalPoints: totalEditionVotesAgg._sum?.points || 0,
        totalVotes: totalEditionVotesAgg._count?._all || 0,
        uniqueVoters: uniqueVotersAgg.length,
      },
    }
  },
  ['public-edition-data'],
  {
    revalidate: 60,
    tags: ['edition', 'competition', 'categories'],
  }
)

export default async function EditionPage() {
  const session = await auth()
  const data = await getEditionData()

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header
        user={
          session?.user
            ? {
                name: session.user.name || '',
                role: (session.user as any).role || 'USER',
              }
            : null
        }
      />
      <main className="flex-1">
        <EditionClient
          competition={data.competition}
          categories={data.categories}
          artists={data.artists}
          topArtists={data.topArtists}
          stats={data.stats}
        />
      </main>
      <Footer />
    </div>
  )
}
