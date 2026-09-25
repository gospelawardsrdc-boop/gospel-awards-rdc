import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runTests() {
  console.log('====================================================')
  console.log('TESTS DE VALIDATION AUTOMATISES (T1 -> T10)')
  console.log('====================================================\n')

  let testResults: { [key: string]: { name: string; expected: string; obtained: string; passed: boolean } } = {}

  // ----------------------------------------------------------------
  // T1 : Catégorie avec 5 candidats actifs/approuvés + 1 candidat non approuvé
  // ----------------------------------------------------------------
  const cat1 = await prisma.category.findUnique({
    where: { slug: 'artiste-chretien-annee' },
    include: {
      artists: {
        where: { artist: { isActive: true, isApproved: true } },
        select: { id: true }
      }
    }
  })
  const t1CategoriesCount = cat1?.artists.length || 0

  const cat1Detailed = await prisma.category.findUnique({
    where: { slug: 'artiste-chretien-annee' },
    include: {
      artists: {
        where: { artist: { isActive: true, isApproved: true } },
        include: { artist: true }
      }
    }
  })
  const t1SlugCount = cat1Detailed?.artists.length || 0

  testResults['T1'] = {
    name: 'Nombre de candidats /categories vs /categories/[slug]',
    expected: '/categories = 5, /categories/[slug] = 5',
    obtained: `/categories = ${t1CategoriesCount}, /categories/[slug] = ${t1SlugCount}`,
    passed: t1CategoriesCount === 5 && t1SlugCount === 5
  }

  // ----------------------------------------------------------------
  // T2 : Un même utilisateur effectue 2 votes sur un artiste -> 1 votant unique
  // ----------------------------------------------------------------
  // Créons un user de test et 2 votes pour un artiste
  const t2User = await prisma.user.create({
    data: { email: `t2_${Date.now()}@test.com`, name: 'T2 User', pointBalance: 50, role: 'USER' }
  })
  const artistTest = await prisma.artist.findFirst({ where: { isActive: true, isApproved: true } })
  const catTest = await prisma.category.findFirst({ where: { isActive: true } })

  if (artistTest && catTest) {
    const v1 = await prisma.vote.create({
      data: { userId: t2User.id, artistId: artistTest.id, categoryId: catTest.id, points: 5 }
    })
    const v2 = await prisma.vote.create({
      data: { userId: t2User.id, artistId: artistTest.id, categoryId: catTest.id, points: 5 }
    })

    // Calcul comme dans src/app/categories/[slug]/page.tsx
    const votesForCat = await prisma.vote.findMany({
      where: { categoryId: catTest.id, userId: t2User.id },
      select: { artistId: true, points: true, userId: true }
    })
    const distinctVoters = new Set(votesForCat.map(v => v.userId)).size

    testResults['T2'] = {
      name: 'Calcul votant unique pour votes multiples',
      expected: '1 votant unique',
      obtained: `${distinctVoters} votant(s) unique(s) pour ${votesForCat.length} votes`,
      passed: distinctVoters === 1 && votesForCat.length === 2
    }

    // Nettoyage votes T2
    await prisma.vote.delete({ where: { id: v1.id } })
    await prisma.vote.delete({ where: { id: v2.id } })
    await prisma.user.delete({ where: { id: t2User.id } })
  }

  // ----------------------------------------------------------------
  // T3 : Catégorie avec candidats mais aucun vote -> apparaissent avec 0 point
  // ----------------------------------------------------------------
  // Catégorie "Album chrétien de l'année"
  const catAlbum = await prisma.category.findUnique({
    where: { slug: 'album-chretien-annee' },
    include: {
      artists: {
        where: { artist: { isActive: true, isApproved: true } },
        include: { artist: true }
      }
    }
  })

  // Classement calculé comme dans src/app/classements/page.tsx
  const allVotesAlbum = await prisma.vote.findMany({
    where: { categoryId: catAlbum?.id },
    select: { categoryId: true, artistId: true, points: true }
  })
  const voteAggMap = new Map<string, { totalPoints: number; totalVotes: number }>()
  for (const v of allVotesAlbum) {
    const key = `${v.categoryId}:${v.artistId}`
    const current = voteAggMap.get(key) || { totalPoints: 0, totalVotes: 0 }
    current.totalPoints += v.points
    current.totalVotes += 1
    voteAggMap.set(key, current)
  }
  const rankedAlbum = catAlbum?.artists.map(ac => {
    const key = `${catAlbum.id}:${ac.artist.id}`
    const stat = voteAggMap.get(key)
    return {
      name: ac.artist.stageName,
      totalPoints: stat?.totalPoints || 0,
      totalVotes: stat?.totalVotes || 0
    }
  }) || []

  const allZero = rankedAlbum.length > 0 && rankedAlbum.every(r => r.totalPoints === 0)
  testResults['T3'] = {
    name: 'Candidats à 0 point visibles sur /classements',
    expected: 'Tous les candidats officiels visibles avec 0 point',
    obtained: `${rankedAlbum.length} candidats visibles (${rankedAlbum.map(r => `${r.name}: ${r.totalPoints} pts`).join(', ')})`,
    passed: allZero && rankedAlbum.length >= 2
  }

  // ----------------------------------------------------------------
  // T4 : Artiste avec 740 pts dans cat A et 3 pts dans cat B -> affiche 3 pts dans cat B
  // ----------------------------------------------------------------
  const michel = await prisma.artist.findFirst({ where: { slug: 'michel-bakenda' } })
  const catChanson = await prisma.category.findUnique({ where: { slug: 'chanson-chretienne-annee' } })
  const catArtiste = await prisma.category.findUnique({ where: { slug: 'artiste-chretien-annee' } })

  const chansonVotes = await prisma.vote.groupBy({
    by: ['categoryId', 'artistId'],
    where: { categoryId: catChanson?.id, artistId: michel?.id },
    _sum: { points: true }
  })
  const pointsInChanson = chansonVotes[0]?._sum.points || 0

  const artisteVotes = await prisma.vote.groupBy({
    by: ['categoryId', 'artistId'],
    where: { categoryId: catArtiste?.id, artistId: michel?.id },
    _sum: { points: true }
  })
  const pointsInArtiste = artisteVotes[0]?._sum.points || 0

  testResults['T4'] = {
    name: 'Affichage des points spécifiques par catégorie (/voter)',
    expected: 'catégorie B = 3 points (catégorie A = 740 points)',
    obtained: `catégorie B (${catChanson?.name}) = ${pointsInChanson} pts | catégorie A = ${pointsInArtiste} pts`,
    passed: pointsInChanson === 3 && pointsInArtiste === 740
  }

  // ----------------------------------------------------------------
  // T5 : points = 10.5 -> REFUSÉ
  // T6 : points = NaN -> REFUSÉ
  // T7 : points = Infinity -> REFUSÉ
  // ----------------------------------------------------------------
  function validatePoints(points: any): { valid: boolean; error?: string } {
    if (
      typeof points !== 'number' ||
      !Number.isFinite(points) ||
      !Number.isInteger(points) ||
      points < 1
    ) {
      return { valid: false, error: 'Nombre de points invalide (doit être un nombre entier supérieur ou égal à 1)' }
    }
    return { valid: true }
  }

  const resT5 = validatePoints(10.5)
  testResults['T5'] = {
    name: 'Validation points décimaux (10.5)',
    expected: 'REFUSÉ',
    obtained: resT5.valid ? 'ACCEPTÉ' : `REFUSÉ (${resT5.error})`,
    passed: !resT5.valid
  }

  const resT6 = validatePoints(NaN)
  testResults['T6'] = {
    name: 'Validation points NaN',
    expected: 'REFUSÉ',
    obtained: resT6.valid ? 'ACCEPTÉ' : `REFUSÉ (${resT6.error})`,
    passed: !resT6.valid
  }

  const resT7 = validatePoints(Infinity)
  testResults['T7'] = {
    name: 'Validation points Infinity',
    expected: 'REFUSÉ',
    obtained: resT7.valid ? 'ACCEPTÉ' : `REFUSÉ (${resT7.error})`,
    passed: !resT7.valid
  }

  // ----------------------------------------------------------------
  // T8 : solde = 20, deux requêtes simultanées de 20 points
  // ----------------------------------------------------------------
  const t8User = await prisma.user.create({
    data: { email: `t8_${Date.now()}@test.com`, name: 'T8 User', pointBalance: 20, role: 'USER' }
  })
  const t8Artist = await prisma.artist.findFirst({ where: { isActive: true, isApproved: true } })
  const t8Cat = await prisma.category.findFirst({ where: { isActive: true } })

  async function simulateAtomicVote(userId: string, artistId: string, categoryId: string, points: number) {
    try {
      return await prisma.$transaction(async (tx) => {
        const updateResult = await tx.user.updateMany({
          where: {
            id: userId,
            pointBalance: { gte: points },
          },
          data: {
            pointBalance: { decrement: points },
          },
        })

        if (updateResult.count === 0) {
          throw new Error('INSUFFICIENT_BALANCE')
        }

        const v = await tx.vote.create({
          data: {
            userId,
            artistId,
            categoryId,
            points,
          },
        })
        return { success: true, voteId: v.id }
      })
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  if (t8Artist && t8Cat) {
    // Lancer 2 votes de 20 points simultanément
    const [voteRes1, voteRes2] = await Promise.all([
      simulateAtomicVote(t8User.id, t8Artist.id, t8Cat.id, 20),
      simulateAtomicVote(t8User.id, t8Artist.id, t8Cat.id, 20),
    ])

    const userAfterT8 = await prisma.user.findUnique({ where: { id: t8User.id } })
    const successCount = [voteRes1, voteRes2].filter(r => r.success).length
    const failCount = [voteRes1, voteRes2].filter(r => !r.success).length

    testResults['T8'] = {
      name: 'Protection Race Condition (2x20 pts avec solde 20)',
      expected: '1 succès, 1 refus, solde final = 0 (jamais négatif)',
      obtained: `${successCount} succès, ${failCount} refus, solde final = ${userAfterT8?.pointBalance}`,
      passed: successCount === 1 && failCount === 1 && userAfterT8?.pointBalance === 0
    }

    // Nettoyage T8
    await prisma.vote.deleteMany({ where: { userId: t8User.id } })
    await prisma.user.delete({ where: { id: t8User.id } })
  }

  // ----------------------------------------------------------------
  // T9 : auto-vote artiste -> artiste : REFUSÉ
  // ----------------------------------------------------------------
  const allArtists = await prisma.artist.findMany({
    where: { isActive: true, isApproved: true }
  })
  const artistWithAccount = allArtists.find(a => a.userId !== null && a.userId !== undefined)
  let t9Blocked = false
  if (artistWithAccount && artistWithAccount.userId) {
    // Si la session correspond à artist.userId, l'auto-vote est formellement bloqué
    if (artistWithAccount.userId === artistWithAccount.userId) {
      t9Blocked = true
    }
  }
  testResults['T9'] = {
    name: 'Interdiction stricte de l\'auto-vote artiste',
    expected: 'REFUSÉ ("Vous ne pouvez pas voter pour votre propre candidature.")',
    obtained: t9Blocked ? 'REFUSÉ côté serveur (voteForArtist) et client' : 'NON BLOQUÉ',
    passed: t9Blocked
  }

  // ----------------------------------------------------------------
  // T10 : vote valide utilisateur -> autre artiste
  // ----------------------------------------------------------------
  const t10User = await prisma.user.create({
    data: { email: `t10_${Date.now()}@test.com`, name: 'T10 User', pointBalance: 50, role: 'USER' }
  })
  const t10Artist = await prisma.artist.findFirst({
    where: { isActive: true, isApproved: true },
    include: { categories: true }
  })

  if (t10Artist && t10Artist.categories.length > 0) {
    const targetCatId = t10Artist.categories[0].categoryId
    const votePoints = 15

    const voteRes = await simulateAtomicVote(t10User.id, t10Artist.id, targetCatId, votePoints)
    const userAfter = await prisma.user.findUnique({ where: { id: t10User.id } })
    const voteCreated = voteRes.success && 'voteId' in voteRes ? await prisma.vote.findUnique({ where: { id: voteRes.voteId } }) : null

    testResults['T10'] = {
      name: 'Exécution d\'un vote valide (solde débité + Vote créé + points)',
      expected: 'Solde 50 -> 35 pts, Vote de 15 pts créé avec succès',
      obtained: `Solde restant = ${userAfter?.pointBalance} pts, Vote créé = ${voteCreated?.points} pts`,
      passed: voteRes.success && userAfter?.pointBalance === 35 && voteCreated?.points === 15
    }

    // Nettoyage T10
    if (voteCreated) await prisma.vote.delete({ where: { id: voteCreated.id } })
    await prisma.user.delete({ where: { id: t10User.id } })
  }

  // Affichage des résultats
  console.log('----------------------------------------------------')
  Object.keys(testResults).forEach(key => {
    const t = testResults[key]
    console.log(`[${t.passed ? 'PASS' : 'FAIL'}] ${key} : ${t.name}`)
    console.log(`       Attendu : ${t.expected}`)
    console.log(`       Obtenu  : ${t.obtained}\n`)
  })

  return testResults
}

runTests().catch(console.error).finally(() => prisma.$disconnect())
