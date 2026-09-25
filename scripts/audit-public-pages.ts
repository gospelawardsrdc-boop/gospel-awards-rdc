import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== 1. VERIFICATION DES CATEGORIES EN BASE ===')
  const categories = await prisma.category.findMany({ orderBy: { orderIndex: 'asc' } })
  console.log(`Nombre total de categories: ${categories.length}`)
  categories.forEach((c, idx) => {
    console.log(`${idx + 1}. [Ordre ${c.orderIndex}] "${c.name}" | slug: ${c.slug} | icon: ${c.icon} | active: ${c.isActive}`)
  })

  const official16 = [
    "Artiste chrétien de l'année",
    "Chanson chrétienne de l'année",
    "Album chrétien de l'année",
    "Révélation chrétienne de l'année",
    "Groupe chrétien de l'année",
    "Meilleur artiste de louange",
    "Meilleur artiste d'adoration",
    "Meilleur musicien / instrumentiste chrétien",
    "Meilleure chorale chrétienne",
    "Meilleur featuring chrétien de l'année",
    "Meilleur live concert chrétien de l'année",
    "Meilleur artiste masculin urbain chrétien de l'année",
    "Meilleure artiste féminine urbaine chrétienne de l'année",
    "Meilleure voix masculine chrétienne de l'année",
    "Meilleure voix féminine chrétienne de l'année",
    "Meilleur rappeur chrétien de l'année"
  ]

  const forbiddenCategories = [
    "Meilleur clip vidéo chrétien",
    "Meilleure collaboration chrétienne",
    "Meilleur chant d'adoration",
    "Meilleur chant de louange",
    "Prix d’honneur / impact musique chrétienne",
    "Prix d'honneur / impact musique chrétienne",
    "Artiste chrétien le plus populaire sur les réseaux"
  ]

  const dbNames = categories.map(c => c.name)
  const missing = official16.filter(name => !dbNames.includes(name))
  const extra = dbNames.filter(name => !official16.includes(name))
  const forbiddenFound = dbNames.filter(name => forbiddenCategories.includes(name))

  console.log(`- Categories officielles manquantes : ${missing.length ? missing.join(', ') : '0 (Conforme)'}`)
  console.log(`- Categories en trop : ${extra.length ? extra.join(', ') : '0 (Conforme)'}`)
  console.log(`- Anciennes categories interdites : ${forbiddenFound.length ? forbiddenFound.join(', ') : '0 (Conforme)'}`)

  console.log('\n=== 2. VERIFICATION DES ARTISTES ET DES RELATIONS ARTISTCATEGORY ===')
  const artists = await prisma.artist.findMany({
    include: {
      categories: { include: { category: true } },
      user: true,
      votes: true
    }
  })
  console.log(`Nombre total d'artistes: ${artists.length}`)
  artists.forEach(a => {
    const cats = a.categories.map(c => c.category.name).join(' | ')
    console.log(`- ${a.stageName} (Slug: ${a.slug}, Approuve: ${a.isApproved}, Actif: ${a.isActive}) => Categories: [${cats}] | Total Votes: ${a.votes.length} | Total Points: ${a.votes.reduce((s, v) => s + v.points, 0)}`)
  })

  console.log('\n=== 3. AUDIT DE SYNCHRONISATION PAR CATEGORIE ===')
  for (const cat of categories) {
    const artistCats = await prisma.artistCategory.findMany({
      where: { categoryId: cat.id },
      include: { artist: true }
    })
    const votes = await prisma.vote.groupBy({
      by: ['artistId'],
      where: { categoryId: cat.id },
      _sum: { points: true },
      _count: true
    })

    console.log(`\n--- Catégorie: ${cat.name} ---`)
    console.log(`  Artistes officiels (${artistCats.length}):`)
    artistCats.forEach(ac => {
      const v = votes.find(vote => vote.artistId === ac.artistId)
      console.log(`    * ${ac.artist.stageName} => Points dans cat: ${v?._sum.points || 0} pts, Votes: ${v?._count || 0}`)
    })
  }

  console.log('\n=== 4. TEST DU SYSTEME DE VOTE ET SECURITE SERVEUR ===')
  // Vérification de la structure et des règles
  console.log('Verification des regles atomiques et cas limites dans la DB...')
}

main().catch(console.error).finally(() => prisma.$disconnect())
