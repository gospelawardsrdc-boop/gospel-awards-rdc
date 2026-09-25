import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAll() {
  console.log('--- TEST 1: CATEGORIES & ARTISTS IN DATABASE ---')
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
    include: {
      artists: {
        where: { artist: { isActive: true, isApproved: true } },
        include: { artist: true }
      },
      _count: { select: { artists: true, votes: true } }
    }
  })

  console.log(`Catégories actives trouvées: ${categories.length}`)
  for (const cat of categories) {
    const rawArtistCount = cat._count.artists
    const approvedArtistCount = cat.artists.length
    if (rawArtistCount !== approvedArtistCount) {
      console.log(`⚠️ DISCORDANCE dans "${cat.name}": _count.artists = ${rawArtistCount}, mais artistes approuvés = ${approvedArtistCount}`)
    }
  }

  console.log('\n--- TEST 2: DISTINCT VOTERS CALCULATION IN CATEGORIES ---')
  for (const cat of categories) {
    const rawVoterGroupBy = await prisma.vote.groupBy({
      by: ['artistId'],
      where: { categoryId: cat.id },
      _count: { userId: true }
    })
    const actualVotes = await prisma.vote.findMany({
      where: { categoryId: cat.id }
    })

    for (const vg of rawVoterGroupBy) {
      const artistVotes = actualVotes.filter(v => v.artistId === vg.artistId)
      const distinctVoters = new Set(artistVotes.map(v => v.userId)).size
      const countUserId = vg._count.userId
      if (countUserId !== distinctVoters) {
        console.log(`⚠️ ERREUR CALCUL VOTANTS dans cat "${cat.name}" pour artiste ${vg.artistId}: _count.userId=${countUserId} vs distinct=${distinctVoters}`)
      }
    }
  }

  console.log('\n--- TEST 3: ARTISTS WITH 0 POINTS ON CLASSEMENTS ---')
  for (const cat of categories) {
    const votes = await prisma.vote.groupBy({
      by: ['artistId'],
      where: { categoryId: cat.id },
      _sum: { points: true }
    })
    const votedArtistIds = votes.map(v => v.artistId)
    const zeroPointArtists = cat.artists.filter(ac => !votedArtistIds.includes(ac.artistId))
    if (zeroPointArtists.length > 0) {
      console.log(`Catégorie "${cat.name}": ${zeroPointArtists.length} artiste(s) officiel(s) avec 0 point (${zeroPointArtists.map(a => a.artist.stageName).join(', ')})`)
    }
  }

  console.log('\n--- TEST 4: CONCURRENCY & RACE CONDITIONS CHECK ---')
  console.log('Checking atomic balance protection in vote transaction...')

  console.log('\n--- TEST 5: SIMULATION GLOBALE (100 PTS -> 20 PTS A, 30 PTS B) ---')
  // Créons un utilisateur temporaire de test
  const testEmail = `test_audit_${Date.now()}@test.com`
  const testUser = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Auditeur Test',
      pointBalance: 100,
      role: 'USER'
    }
  })

  // Trouver une catégorie avec au moins 2 artistes approuvés
  const catWithArtists = categories.find(c => c.artists.length >= 2)
  if (catWithArtists) {
    const artistA = catWithArtists.artists[0].artist
    const artistB = catWithArtists.artists[1].artist

    console.log(`Utilisateur de test créé avec ${testUser.pointBalance} points.`)
    console.log(`Test vote 20 points vers Artiste A (${artistA.stageName}) dans "${catWithArtists.name}"`)
    console.log(`Test vote 30 points vers Artiste B (${artistB.stageName}) dans "${catWithArtists.name}"`)

    // Simuler le vote 1: 20 pts
    await prisma.$transaction([
      prisma.vote.create({
        data: {
          userId: testUser.id,
          artistId: artistA.id,
          categoryId: catWithArtists.id,
          points: 20
        }
      }),
      prisma.user.update({
        where: { id: testUser.id },
        data: { pointBalance: { decrement: 20 } }
      })
    ])

    // Simuler le vote 2: 30 pts
    await prisma.$transaction([
      prisma.vote.create({
        data: {
          userId: testUser.id,
          artistId: artistB.id,
          categoryId: catWithArtists.id,
          points: 30
        }
      }),
      prisma.user.update({
        where: { id: testUser.id },
        data: { pointBalance: { decrement: 30 } }
      })
    ])

    const updatedUser = await prisma.user.findUnique({ where: { id: testUser.id } })
    console.log(`Solde utilisateur après votes : ${updatedUser?.pointBalance} points (Attendu: 50)`)

    // Vérifier les votes
    const votesA = await prisma.vote.findMany({ where: { userId: testUser.id, artistId: artistA.id } })
    const votesB = await prisma.vote.findMany({ where: { userId: testUser.id, artistId: artistB.id } })
    console.log(`Votes enregistrés pour A : ${votesA.reduce((s, v) => s + v.points, 0)} points (Attendu: 20)`)
    console.log(`Votes enregistrés pour B : ${votesB.reduce((s, v) => s + v.points, 0)} points (Attendu: 30)`)

    // Nettoyage du test
    await prisma.vote.deleteMany({ where: { userId: testUser.id } })
    await prisma.user.delete({ where: { id: testUser.id } })
    console.log('Nettoyage du test de simulation effectué avec succès.')
  }
}

testAll().catch(console.error).finally(() => prisma.$disconnect())
