'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { uploadToSupabaseStorage } from '@/lib/supabase/storage'

const VALID_EDITION_STATUSES = ['DRAFT', 'UPCOMING', 'ACTIVE', 'CLOSED', 'GALA'] as const
type EditionStatus = typeof VALID_EDITION_STATUSES[number]

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo

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
 * 1. Récupération de l'édition actuelle pour l'administration
 */
export async function getAdminEditionAction() {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  try {
    // Récupérer la compétition active en priorité, ou la plus récente
    let competition = await prisma.competition.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { votes: true },
        },
      },
    })

    if (!competition) {
      competition = await prisma.competition.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { votes: true },
          },
        },
      })
    }

    return {
      success: true,
      competition: competition
        ? {
            ...competition,
            startDate: competition.startDate.toISOString(),
            endDate: competition.endDate.toISOString(),
            createdAt: competition.createdAt.toISOString(),
            updatedAt: competition.updatedAt.toISOString(),
          }
        : null,
    }
  } catch (error: any) {
    console.error('Erreur getAdminEditionAction:', error)
    return { error: 'Erreur lors de la récupération de l\'édition.' }
  }
}

/**
 * 2. Création ou mise à jour de l'édition (Compétition)
 */
export async function saveEditionAction(formData: FormData) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const id = (formData.get('id') as string)?.trim() || null
  const name = (formData.get('name') as string)?.trim()
  const yearRaw = (formData.get('year') as string)?.trim()
  const theme = (formData.get('theme') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const status = (formData.get('status') as string)?.trim() || 'ACTIVE'
  const startDateRaw = (formData.get('startDate') as string)?.trim()
  const endDateRaw = (formData.get('endDate') as string)?.trim()
  const bannerImage = (formData.get('bannerImage') as string)?.trim() || null
  const isActive = formData.get('isActive') === 'true' || formData.get('isActive') === 'on' || formData.get('isActive') === '1'

  // Validations obligatoires
  if (!name || name.length < 3) {
    return { error: 'Le nom de l\'édition est obligatoire (au moins 3 caractères).' }
  }

  let year: number | null = null
  if (yearRaw) {
    const parsedYear = parseInt(yearRaw, 10)
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return { error: 'L\'année indiquée est invalide (doit être entre 2000 et 2100).' }
    }
    year = parsedYear
  }

  if (!VALID_EDITION_STATUSES.includes(status as EditionStatus)) {
    return { error: `Statut invalide. Valeurs autorisées : ${VALID_EDITION_STATUSES.join(', ')}` }
  }

  if (!startDateRaw || !endDateRaw) {
    return { error: 'Les dates de début et de fin sont obligatoires.' }
  }

  const startDate = new Date(startDateRaw)
  const endDate = new Date(endDateRaw)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: 'Format de date invalide.' }
  }

  if (startDate > endDate) {
    return { error: 'La date de début doit être antérieure ou égale à la date de fin.' }
  }

  try {
    let savedCompetition

    if (id) {
      // Mise à jour de l'édition existante
      const existing = await prisma.competition.findUnique({ where: { id } })
      if (!existing) {
        return { error: 'Édition introuvable avec cet identifiant.' }
      }

      // Si cette édition devient active, désactiver les autres
      if (isActive) {
        await prisma.competition.updateMany({
          where: { id: { not: id }, isActive: true },
          data: { isActive: false },
        })
      }

      savedCompetition = await prisma.competition.update({
        where: { id },
        data: {
          name,
          year,
          theme,
          description,
          status,
          startDate,
          endDate,
          bannerImage,
          isActive,
        },
      })
    } else {
      // Vérifier s'il existe déjà une compétition si aucun ID n'est passé
      const existingFirst = await prisma.competition.findFirst({
        orderBy: { createdAt: 'desc' },
      })

      if (existingFirst) {
        if (isActive) {
          await prisma.competition.updateMany({
            where: { id: { not: existingFirst.id }, isActive: true },
            data: { isActive: false },
          })
        }

        savedCompetition = await prisma.competition.update({
          where: { id: existingFirst.id },
          data: {
            name,
            year,
            theme,
            description,
            status,
            startDate,
            endDate,
            bannerImage,
            isActive,
          },
        })
      } else {
        // Création d'une première compétition
        savedCompetition = await prisma.competition.create({
          data: {
            name,
            year: year || new Date().getFullYear(),
            theme,
            description,
            status,
            startDate,
            endDate,
            bannerImage,
            isActive,
          },
        })
      }
    }

    // Revalidation des caches
    revalidatePath('/admin/edition')
    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath('/edition')
    try {
      revalidateTag('edition', 'max')
      revalidateTag('competition', 'max')
    } catch {
      // Ignorer si le tag n'est pas encore enregistré
    }

    return {
      success: true,
      competition: {
        ...savedCompetition,
        startDate: savedCompetition.startDate.toISOString(),
        endDate: savedCompetition.endDate.toISOString(),
        createdAt: savedCompetition.createdAt.toISOString(),
        updatedAt: savedCompetition.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    console.error('Erreur saveEditionAction:', error)
    return { error: error.message || 'Erreur lors de l\'enregistrement de l\'édition.' }
  }
}

/**
 * 3. Upload d'une bannière officielle d'édition vers Supabase Storage
 */
export async function uploadEditionBannerAction(formData: FormData) {
  const session = await checkAdminSession()
  if (!session) {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const file = formData.get('file') as File | null
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'Aucun fichier sélectionné.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'Le fichier dépasse la taille maximale autorisée de 5 Mo.' }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return { error: 'Format non supporté. Formats acceptés : JPG, PNG, WebP.' }
  }

  const originalName = file.name || 'banner.jpg'
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { error: 'Extension de fichier non autorisée.' }
  }

  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const storagePath = `editions/banner_${timestamp}_${randomStr}.${extension}`

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadRes = await uploadToSupabaseStorage(storagePath, buffer, file.type)
    if (!uploadRes.success || !uploadRes.url) {
      return { error: uploadRes.error || 'Erreur lors de l\'enregistrement sur Supabase Storage.' }
    }

    return {
      success: true,
      url: uploadRes.url,
    }
  } catch (error: any) {
    console.error('Erreur uploadEditionBannerAction:', error)
    return { error: error.message || 'Erreur réseau lors de l\'upload de la bannière.' }
  }
}
