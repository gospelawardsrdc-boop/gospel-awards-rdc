'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { normalizeCategoryName } from '@/lib/utils'

/**
 * Vérification stricte de la session et du rôle ADMIN
 */
async function checkAdminSession() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return null
  }
  return session
}

/**
 * Server Action : Modifier le libellé d'une catégorie existante
 * - Vérifie l'authentification et le rôle ADMIN
 * - Valide la présence et la longueur du nom
 * - Empêche les doublons en normalisant la casse et les accents
 * - Préserve l'ID, le slug et les votes/artistes associés
 * - Révalide les caches
 */
export async function updateCategoryNameAction(formData: FormData) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const categoryId = (formData.get('categoryId') as string)?.trim()
  const rawName = (formData.get('name') as string)?.trim()

  if (!categoryId) {
    return { error: 'Identifiant de la catégorie manquant ou invalide.' }
  }

  if (!rawName) {
    return { error: 'Le nom de la catégorie ne peut pas être vide.' }
  }

  if (rawName.length < 3) {
    return { error: 'Le nom de la catégorie doit comporter au moins 3 caractères.' }
  }

  if (rawName.length > 100) {
    return { error: 'Le nom de la catégorie ne peut pas dépasser 100 caractères.' }
  }

  try {
    // 1. Vérifier l'existence de la catégorie
    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!existing) {
      return { error: 'Catégorie introuvable.' }
    }

    // Si le nom est exactement identique au nom existant, aucune modification requise
    if (existing.name === rawName) {
      return { success: true, category: existing, unchanged: true }
    }

    // 2. Vérification des doublons avec normalisation stricte
    const normalizedTarget = normalizeCategoryName(rawName)
    const otherCategories = await prisma.category.findMany({
      where: {
        id: { not: categoryId },
      },
      select: {
        id: true,
        name: true,
      },
    })

    const duplicate = otherCategories.find(
      (cat) => normalizeCategoryName(cat.name) === normalizedTarget
    )

    if (duplicate) {
      return {
        error: `Une catégorie portant un nom similaire existe déjà : "${duplicate.name}".`,
      }
    }

    // 3. Mise à jour du nom en préservant l'ID, le slug et toutes les relations
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: rawName,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        isActive: true,
      },
    })

    // 4. Invalidation ciblée des caches
    try {
      revalidateTag('categories', 'max')
      revalidateTag('rankings', 'max')
      revalidateTag('home-data', 'max')
    } catch {
      // Tolérance si appelé hors contexte de requête Next.js
    }

    revalidatePath('/admin/categories')
    revalidatePath('/categories')
    revalidatePath(`/categories/${existing.slug}`)
    revalidatePath('/classements')
    revalidatePath('/voter')
    revalidatePath('/')

    return {
      success: true,
      category: updated,
    }
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de la catégorie :', error)
    return {
      error: 'Une erreur interne est survenue lors de l\'enregistrement de la catégorie.',
    }
  }
}

/**
 * Server Action : Activer ou Désactiver une catégorie
 */
export async function toggleCategoryStatusAction(categoryId: string) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const cleanId = categoryId?.trim()
  if (!cleanId) {
    return { error: 'Identifiant de la catégorie invalide.' }
  }

  try {
    const existing = await prisma.category.findUnique({
      where: { id: cleanId },
    })

    if (!existing) {
      return { error: 'Catégorie introuvable.' }
    }

    const updated = await prisma.category.update({
      where: { id: cleanId },
      data: {
        isActive: !existing.isActive,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    })

    try {
      revalidateTag('categories', 'max')
      revalidateTag('rankings', 'max')
      revalidateTag('home-data', 'max')
    } catch {
      // Tolérance si hors contexte
    }

    revalidatePath('/admin/categories')
    revalidatePath('/categories')
    revalidatePath(`/categories/${existing.slug}`)
    revalidatePath('/classements')
    revalidatePath('/voter')
    revalidatePath('/')

    return {
      success: true,
      category: updated,
    }
  } catch (error: any) {
    console.error('Erreur lors du basculement de statut de la catégorie :', error)
    return {
      error: 'Une erreur interne est survenue lors de la modification du statut.',
    }
  }
}
