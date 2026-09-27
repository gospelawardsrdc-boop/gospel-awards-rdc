'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { formatDate } from '@/lib/utils'

export async function createPaymentTransaction(packageId: string, paymentMethod: string = 'MOBILE_MONEY') {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Vous devez être connecté' }
  }

  const userId = (session.user as any).id

  const pointPackage = await prisma.pointPackage.findUnique({
    where: { id: packageId },
  })

  if (!pointPackage || !pointPackage.isActive) {
    return { error: 'Pack de points invalide' }
  }

  // Création de la transaction avec statut PENDING strict (aucun point crédité)
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      packageId: pointPackage.id,
      pointsAmount: pointPackage.points,
      amountFc: pointPackage.priceFc,
      status: 'PENDING',
      paymentMethod,
    },
  })

  return {
    success: true,
    transactionId: transaction.id,
    status: transaction.status,
    pointsAmount: transaction.pointsAmount,
    amountFc: transaction.amountFc,
  }
}

export async function confirmPaymentTransaction(transactionId: string) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true, package: true },
  })

  if (!transaction) {
    return { error: 'Transaction introuvable' }
  }

  // Idempotence & Protection contre la double confirmation / rejeu
  if (transaction.status === 'COMPLETED') {
    return { error: 'Transaction déjà confirmée et créditée. Doublon ignoré.', isDuplicate: true }
  }

  // Vérification de statut : rejet si échoué ou annulé
  if (transaction.status === 'FAILED') {
    return { error: 'Paiement échoué. Aucun point ne peut être crédité.' }
  }

  if (transaction.status === 'CANCELLED') {
    return { error: 'Paiement annulé. Aucun point ne peut être crédité.' }
  }

  if (transaction.status !== 'PENDING') {
    return { error: `Statut de transaction invalide : ${transaction.status}` }
  }

  // Validation atomique stricte : passage à COMPLETED conditionné à status = PENDING (anti double-crédit concurrent)
  try {
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.transaction.updateMany({
        where: {
          id: transactionId,
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
        },
      })

      if (updateResult.count === 0) {
        const current = await tx.transaction.findUnique({ where: { id: transactionId } })
        if (current?.status === 'COMPLETED') {
          return { alreadyProcessed: true, pointsCredited: 0 }
        }
        throw new Error(`Transaction non éligible pour confirmation (Statut actuel : ${current?.status})`)
      }

      const updatedUser = await tx.user.update({
        where: { id: transaction.userId },
        data: {
          pointBalance: { increment: transaction.pointsAmount },
        },
      })

      return {
        alreadyProcessed: false,
        pointsCredited: transaction.pointsAmount,
        newBalance: updatedUser.pointBalance,
      }
    }, {
      maxWait: 20000,
      timeout: 30000,
    })

    try {
      revalidatePath('/dashboard')
      revalidatePath('/voter')
      revalidatePath('/admin/transactions')
      revalidatePath('/admin/finances')
    } catch {}

    if (result.alreadyProcessed) {
      return { error: 'Transaction déjà confirmée et créditée. Doublon ignoré.', isDuplicate: true }
    }

    return {
      success: true,
      transactionId,
      pointsCredited: result.pointsCredited,
      newBalance: result.newBalance,
    }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de la confirmation du paiement.' }
  }
}

export async function failPaymentTransaction(transactionId: string) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction) {
    return { error: 'Transaction introuvable' }
  }

  if (transaction.status === 'COMPLETED') {
    return { error: 'Impossible d\'échouer une transaction déjà complétée' }
  }

  await prisma.transaction.updateMany({
    where: { id: transactionId, status: 'PENDING' },
    data: { status: 'FAILED' },
  })

  try {
    revalidatePath('/admin/transactions')
  } catch {}
  return { success: true, status: 'FAILED' }
}

export async function cancelPaymentTransaction(transactionId: string) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction) {
    return { error: 'Transaction introuvable' }
  }

  if (transaction.status === 'COMPLETED') {
    return { error: 'Impossible d\'annuler une transaction déjà complétée' }
  }

  await prisma.transaction.updateMany({
    where: { id: transactionId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })

  try {
    revalidatePath('/admin/transactions')
  } catch {}
  return { success: true, status: 'CANCELLED' }
}



export async function voteForArtist(
  artistId: string,
  categoryId: string,
  points: number
) {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Vous devez être connecté pour voter' }
  }

  const userId = (session.user as any).id

  // Validation stricte du type et de la valeur des points
  if (
    typeof points !== 'number' ||
    !Number.isFinite(points) ||
    !Number.isInteger(points) ||
    points < 1
  ) {
    return { error: 'Nombre de points invalide (doit être un nombre entier supérieur ou égal à 1)' }
  }

  // Vérifier que l'artiste existe et est approuvé
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
  })

  if (!artist || !artist.isActive || !artist.isApproved) {
    return { error: 'Artiste non disponible' }
  }

  // Règle de sécurité : Un artiste ne peut pas voter pour sa propre candidature
  if (artist.userId === userId) {
    return { error: 'Vous ne pouvez pas voter pour votre propre candidature.' }
  }

  // Vérifier que l'artiste est bien inscrit dans la catégorie sélectionnée
  const categoryRelation = artist.categories.find(c => c.categoryId === categoryId)
  if (!categoryRelation) {
    return { error: 'Cet artiste n\'est pas dans cette catégorie' }
  }

  const categorySlug = categoryRelation.category.slug

  // 1. Récupération de l'édition active configurée
  const competition = await prisma.competition.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  // 2. Garde A : Vérification de l'existence d'une édition active
  if (!competition) {
    return { error: 'Aucune édition n\'est actuellement disponible pour recevoir des votes.' }
  }

  // 3. Garde B : Vérification du statut de l'édition
  if (competition.status === 'UPCOMING') {
    return { error: 'L\'édition officielle n\'a pas encore débuté. Les votes ouvriront prochainement.' }
  }

  if (competition.status === 'DRAFT') {
    return { error: 'Cette édition est en préparation. Les votes ne sont pas ouverts.' }
  }

  if (competition.status === 'CLOSED') {
    return { error: 'Les votes pour cette édition sont officiellement clôturés.' }
  }

  if (competition.status === 'GALA') {
    return { error: 'La période des votes est terminée. Cérémonie de remise des trophées en cours.' }
  }

  if (competition.status !== 'ACTIVE') {
    return { error: 'Les votes ne sont pas ouverts pour cette édition.' }
  }

  // 4. Garde C : Vérification de la fenêtre temporelle [startDate, endDate]
  const now = new Date()

  if (now < competition.startDate) {
    return { error: `La période de vote n'est pas encore ouverte (Ouverture prévue le ${formatDate(competition.startDate)}).` }
  }

  if (now > competition.endDate) {
    return { error: 'La période de vote est terminée pour cette édition. Les votes sont clôturés.' }
  }

  // Transaction atomique : Débit conditionnel avec verrouillage strict du solde (anti-race condition)
  try {
    await prisma.$transaction(async (tx) => {
      // Débit atomique : la mise à jour n'affecte une ligne QUE si pointBalance >= points
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

      await tx.vote.create({
        data: {
          userId,
          artistId,
          categoryId,
          competitionId: competition.id,
          points,
        },
      })
    }, {
      maxWait: 20000,
      timeout: 30000,
    })
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return { error: 'Solde de points insuffisant' }
    }
    console.error('Vote transaction error:', err)
    return { error: 'Une erreur est survenue lors de l\'enregistrement du vote' }
  }

  try {
    revalidateTag('votes', 'max')
    revalidateTag('rankings', 'max')
    revalidateTag('home-data', 'max')
    revalidateTag('artists', 'max')
    revalidateTag('categories', 'max')

    revalidatePath('/')
    revalidatePath('/categories')
    revalidatePath(`/categories/${categorySlug}`)
    revalidatePath('/artistes')
    revalidatePath(`/artistes/${artist.slug}`)
    revalidatePath('/classements')
    revalidatePath('/voter')
    revalidatePath('/dashboard')
    revalidatePath('/artiste')
  } catch {}

  return { success: true, message: `${points} point(s) attribué(s) avec succès !` }
}
