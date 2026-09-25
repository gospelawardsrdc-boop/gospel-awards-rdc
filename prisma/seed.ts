import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123456', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gospelawards.cd' },
    update: {},
    create: {
      name: 'Administrateur',
      email: 'admin@gospelawards.cd',
      hashedPassword: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Remove old deleted category if present in DB
  const oldCategory = await prisma.category.findUnique({
    where: { slug: 'artiste-populaire-reseaux' },
  })
  if (oldCategory) {
    // Delete associated votes / relations first
    await prisma.vote.deleteMany({ where: { categoryId: oldCategory.id } })
    await prisma.artistCategory.deleteMany({ where: { categoryId: oldCategory.id } })
    await prisma.category.delete({ where: { id: oldCategory.id } })
    console.log('🗑️ Deleted old category: Artiste chrétien le plus populaire sur les réseaux')
  }

  // Exactly 16 categories as requested
  const categories = [
    {
      name: "Artiste chrétien de l'année",
      slug: 'artiste-chretien-annee',
      description: "Récompense l'artiste chrétien ayant le plus marqué l'année par sa musique, son influence et son impact spirituel.",
      icon: '🏆',
      orderIndex: 1,
    },
    {
      name: "Chanson chrétienne de l'année",
      slug: 'chanson-chretienne-annee',
      description: "Célèbre la chanson chrétienne qui a le plus touché les cœurs et marqué les esprits durant l'année.",
      icon: '🎵',
      orderIndex: 2,
    },
    {
      name: "Album chrétien de l'année",
      slug: 'album-chretien-annee',
      description: "Récompense le meilleur album chrétien de l'année, tant par sa qualité musicale que par son message spirituel.",
      icon: '💿',
      orderIndex: 3,
    },
    {
      name: "Révélation chrétienne de l'année",
      slug: 'revelation-chretienne-annee',
      description: "Met en lumière le nouvel artiste chrétien qui s'est distingué par son talent et son potentiel.",
      icon: '⭐',
      orderIndex: 4,
    },
    {
      name: "Groupe chrétien de l'année",
      slug: 'groupe-chretien-annee',
      description: "Récompense le groupe de musique chrétienne le plus performant et apprécié de l'année.",
      icon: '🎸',
      orderIndex: 5,
    },
    {
      name: 'Meilleur artiste de louange',
      slug: 'meilleur-artiste-louange',
      description: "Honore l'artiste qui excelle dans la musique de louange et d'exaltation.",
      icon: '🙌',
      orderIndex: 6,
    },
    {
      name: "Meilleur artiste d'adoration",
      slug: 'meilleur-artiste-adoration',
      description: "Récompense l'artiste dont la musique d'adoration touche profondément les âmes.",
      icon: '🕊️',
      orderIndex: 7,
    },
    {
      name: 'Meilleur musicien / instrumentiste chrétien',
      slug: 'meilleur-musicien-instrumentiste',
      description: "Célèbre l'excellence musicale et la maîtrise instrumentale au service de la musique chrétienne.",
      icon: '🎹',
      orderIndex: 8,
    },
    {
      name: 'Meilleure chorale chrétienne',
      slug: 'meilleure-chorale-chretienne',
      description: "Récompense la chorale chrétienne la plus talentueuse et inspirante de l'année.",
      icon: '🎤',
      orderIndex: 9,
    },
    {
      name: "Meilleur featuring chrétien de l'année",
      slug: 'meilleur-featuring-chretien-annee',
      description: "Célèbre la meilleure collaboration musicale entre artistes chrétiens de la RDC.",
      icon: '🤝',
      orderIndex: 10,
    },
    {
      name: "Meilleur live concert chrétien de l'année",
      slug: 'meilleur-live-concert-chretien-annee',
      description: "Récompense la prestation scénique et le concert live gospel le plus marquant.",
      icon: '🎪',
      orderIndex: 11,
    },
    {
      name: "Meilleur artiste masculin urbain chrétien de l'année",
      slug: 'meilleur-artiste-masculin-urbain-chretien-annee',
      description: "Honore le meilleur chanteur solo de musique urbaine chrétienne (afrobeats, r&b, afro-gospel).",
      icon: '🎙️',
      orderIndex: 12,
    },
    {
      name: "Meilleure artiste féminine urbaine chrétienne de l'année",
      slug: 'meilleure-artiste-feminine-urbaine-chretienne-annee',
      description: "Honore la meilleure chanteuse de musique urbaine chrétienne contemporaine.",
      icon: '👑',
      orderIndex: 13,
    },
    {
      name: "Meilleure voix masculine chrétienne de l'année",
      slug: 'meilleure-voix-masculine-chretienne-annee',
      description: "Récompense la puissance vocale et l'excellence technique masculine.",
      icon: '🦁',
      orderIndex: 14,
    },
    {
      name: "Meilleure voix féminine chrétienne de l'année",
      slug: 'meilleure-voix-feminine-chretienne-annee',
      description: "Récompense la pureté, la grâce et la virtuosité vocale féminine.",
      icon: '✨',
      orderIndex: 15,
    },
    {
      name: "Meilleur rappeur chrétien de l'année",
      slug: 'meilleur-rappeur-chretien-annee',
      description: "Récompense le meilleur artiste de rap et hip-hop gospel de la RDC.",
      icon: '🔥',
      orderIndex: 16,
    },
  ]

  const createdCategories: any[] = []
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        orderIndex: cat.orderIndex,
        isActive: true,
      },
      create: cat,
    })
    createdCategories.push(c)
  }
  console.log(`✅ ${createdCategories.length} categories created/updated`)

  // Create point packages (5 packs now)
  const packages = [
    { name: 'Pack Starter', points: 2, priceFc: 1000, orderIndex: 1 },
    { name: 'Pack Bronze', points: 10, priceFc: 5000, orderIndex: 2 },
    { name: 'Pack Silver', points: 20, priceFc: 10000, orderIndex: 3 },
    { name: 'Pack Gold', points: 100, priceFc: 50000, orderIndex: 4 },
    { name: 'Pack Diamond', points: 200, priceFc: 100000, orderIndex: 5 },
  ]

  for (const pkg of packages) {
    const existing = await prisma.pointPackage.findFirst({ where: { name: pkg.name } })
    if (existing) {
      await prisma.pointPackage.update({
        where: { id: existing.id },
        data: {
          points: pkg.points,
          priceFc: pkg.priceFc,
          orderIndex: pkg.orderIndex,
          isActive: true,
        },
      })
    } else {
      await prisma.pointPackage.create({ data: pkg })
    }
  }
  console.log('✅ 5 Point packages verified (including 100 000 FC = 200 points)')

  // Create active competition
  let competition = await prisma.competition.findFirst({ where: { isActive: true } })
  if (!competition) {
    competition = await prisma.competition.create({
      data: {
        name: 'Gospel Awards RDC 2026',
        description: 'Édition 2026 des Gospel Awards de la République Démocratique du Congo',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
      },
    })
  }

  // Create test voter user
  const userPassword = await bcrypt.hash('voter123456', 10)
  const voter = await prisma.user.upsert({
    where: { email: 'votant@gospelawards.cd' },
    update: { pointBalance: 50 },
    create: {
      name: 'Pasteur Samuel Kalala',
      email: 'votant@gospelawards.cd',
      hashedPassword: userPassword,
      role: 'USER',
      pointBalance: 50,
    },
  })

  // Sample artists to bring the UI to life
  const sampleArtists = [
    {
      stageName: 'Deborah Lukalu',
      slug: 'deborah-lukalu',
      email: 'deborah@gospelawards.cd',
      bio: "Chantre et compositrice renommée de la RDC, Deborah Lukalu est une voix majeure de la louange contemporaine en Afrique et dans le monde.",
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
      catIndexes: [0, 5, 12, 14],
      points: 1250,
    },
    {
      stageName: 'Athoms & Nadège Mbuma',
      slug: 'athoms-nadege-mbuma',
      email: 'athoms@gospelawards.cd',
      bio: "Couple pastoral et musical emblématique du gospel congolais, auteurs d'adorations profondes qui transcendent les générations.",
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
      catIndexes: [0, 4, 6, 9],
      points: 980,
    },
    {
      stageName: 'Michel Bakenda',
      slug: 'michel-bakenda',
      email: 'michel@gospelawards.cd',
      bio: "Artiste et prédicateur au style gospel unique, Michel Bakenda touche des millions de fidèles par ses cantiques de louange et d'adoration.",
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&auto=format&fit=crop&q=80',
      catIndexes: [0, 1, 6, 13],
      points: 740,
    },
    {
      stageName: 'Moise Mbiye',
      slug: 'moise-mbiye',
      email: 'moise@gospelawards.cd',
      bio: "Pasteur responsable de l'église Cité Béthel et compositeur prolifique de gospel en RDC, connu sous le surnom de La Réserve de l'Éternel.",
      profileImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
      catIndexes: [0, 2, 10, 13],
      points: 1420,
    },
  ]

  for (const s of sampleArtists) {
    const aUser = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.stageName,
        email: s.email,
        hashedPassword: userPassword,
        role: 'ARTIST',
      },
    })

    const existingArtist = await prisma.artist.findUnique({ where: { slug: s.slug } })
    if (!existingArtist) {
      const art = await prisma.artist.create({
        data: {
          userId: aUser.id,
          stageName: s.stageName,
          slug: s.slug,
          biography: s.bio,
          profileImage: s.profileImage,
          coverImage: s.coverImage,
          isApproved: true,
          isActive: true,
          categories: {
            create: s.catIndexes.map((idx) => ({
              categoryId: createdCategories[idx].id,
            })),
          },
        },
      })

      // Create vote records for live standings
      await prisma.vote.create({
        data: {
          userId: voter.id,
          artistId: art.id,
          categoryId: createdCategories[s.catIndexes[0]].id,
          competitionId: competition.id,
          points: s.points,
        },
      })

      // Add social & music sample links
      await prisma.artistMusicLink.create({
        data: {
          artistId: art.id,
          platform: 'Spotify',
          title: `Meilleurs titres de ${s.stageName}`,
          url: 'https://spotify.com',
        },
      })
      await prisma.artistVideoLink.create({
        data: {
          artistId: art.id,
          platform: 'YouTube',
          title: `Concert Live & Clips - ${s.stageName}`,
          url: 'https://youtube.com',
        },
      })
      await prisma.artistSocialLink.createMany({
        data: [
          { artistId: art.id, platform: 'instagram', url: 'https://instagram.com' },
          { artistId: art.id, platform: 'facebook', url: 'https://facebook.com' },
          { artistId: art.id, platform: 'youtube', url: 'https://youtube.com' },
        ],
      })
    }
  }

  console.log('✅ Sample artists, links and initial votes populated')
  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
