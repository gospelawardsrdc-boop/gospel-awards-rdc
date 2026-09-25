'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/**
 * Vérification stricte du rôle ADMIN
 */
async function checkAdminSession() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return null
  }
  return session
}

/**
 * 1. Modifier les informations éditoriales d'un artiste existant
 */
export async function updateArtistAdminAction(formData: FormData) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const artistId = (formData.get('artistId') as string)?.trim()
  const stageName = (formData.get('stageName') as string)?.trim()
  const biography = (formData.get('biography') as string)?.trim() || null
  const profileImage = (formData.get('profileImage') as string)?.trim() || null
  const coverImage = (formData.get('coverImage') as string)?.trim() || null

  if (!artistId || !stageName) {
    return { error: 'L\'identifiant et le nom de scène de l\'artiste sont obligatoires.' }
  }

  const existing = await prisma.artist.findUnique({
    where: { id: artistId },
  })

  if (!existing) {
    return { error: 'Artiste introuvable.' }
  }

  const updated = await prisma.artist.update({
    where: { id: artistId },
    data: {
      stageName,
      biography,
      profileImage,
      coverImage,
    },
  })

  revalidatePath('/admin/artistes')
  revalidatePath(`/artistes/${updated.slug}`)
  revalidatePath('/categories')
  revalidatePath('/classements')

  return { success: true, artist: updated }
}

/**
 * 2. Activer / Désactiver un artiste (isActive)
 */
export async function toggleArtistStatusAction(artistId: string) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
  })

  if (!artist) {
    return { error: 'Artiste introuvable.' }
  }

  const updated = await prisma.artist.update({
    where: { id: artistId },
    data: { isActive: !artist.isActive },
  })

  revalidatePath('/admin/artistes')
  revalidatePath(`/artistes/${artist.slug}`)
  revalidatePath('/categories')
  revalidatePath('/classements')

  return { success: true, isActive: updated.isActive }
}

/**
 * 3. Approuver / Désapprouver une candidature (isApproved)
 */
export async function toggleArtistApprovalAction(artistId: string) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
  })

  if (!artist) {
    return { error: 'Artiste introuvable.' }
  }

  const updated = await prisma.artist.update({
    where: { id: artistId },
    data: { isApproved: !artist.isApproved },
  })

  revalidatePath('/admin/artistes')
  revalidatePath(`/artistes/${artist.slug}`)
  revalidatePath('/categories')
  revalidatePath('/classements')

  return { success: true, isApproved: updated.isApproved }
}

/**
 * 4. Ajouter une catégorie officielle à un artiste (Anti-doublon strict)
 */
export async function addCategoryToArtistAction(artistId: string, categoryId: string) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const [artist, category] = await Promise.all([
    prisma.artist.findUnique({ where: { id: artistId } }),
    prisma.category.findUnique({ where: { id: categoryId } }),
  ])

  if (!artist || !category) {
    return { error: 'Artiste ou catégorie introuvable.' }
  }

  // Vérifier doublon
  const existingRelation = await prisma.artistCategory.findUnique({
    where: {
      artistId_categoryId: {
        artistId,
        categoryId,
      },
    },
  })

  if (existingRelation) {
    return { error: 'Cet artiste participe déjà à cette catégorie.', isDuplicate: true }
  }

  await prisma.artistCategory.create({
    data: {
      artistId,
      categoryId,
    },
  })

  revalidatePath('/admin/artistes')
  revalidatePath(`/categories/${category.slug}`)
  revalidatePath('/categories')
  revalidatePath('/classements')

  return { success: true }
}

/**
 * 5. Retirer une catégorie à un artiste
 */
export async function removeCategoryFromArtistAction(artistId: string, categoryId: string) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const relation = await prisma.artistCategory.findUnique({
    where: {
      artistId_categoryId: {
        artistId,
        categoryId,
      },
    },
    include: { category: true },
  })

  if (!relation) {
    return { error: 'L\'artiste ne participe pas à cette catégorie.' }
  }

  await prisma.artistCategory.delete({
    where: {
      artistId_categoryId: {
        artistId,
        categoryId,
      },
    },
  })

  revalidatePath('/admin/artistes')
  revalidatePath(`/categories/${relation.category.slug}`)
  revalidatePath('/categories')
  revalidatePath('/classements')

  return { success: true }
}
