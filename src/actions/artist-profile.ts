'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { uploadToSupabaseStorage, deleteFromSupabaseStorage } from '@/lib/supabase/storage'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo

/**
 * Upload sécurisé côté serveur d'une image artiste (profile ou cover)
 */
export async function uploadArtistImageAction(formData: FormData) {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Vous devez être connecté pour effectuer cette opération.' }
  }

  const userId = (session.user as any).id
  const role = (session.user as any).role

  if (role !== 'ARTIST' && role !== 'ADMIN') {
    return { error: 'Accès réservé aux artistes et administrateurs.' }
  }

  const type = formData.get('type') as 'profile' | 'cover'
  if (type !== 'profile' && type !== 'cover') {
    return { error: 'Type d\'image invalide (doit être "profile" ou "cover").' }
  }

  const file = formData.get('file') as File | null
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'Aucun fichier sélectionné.' }
  }

  // Validation taille
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'Le fichier dépasse la taille maximale autorisée de 5 Mo.' }
  }

  // Validation MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return { error: 'Format de fichier non supporté. Formats acceptés : JPG, PNG, WebP.' }
  }

  // Validation extension
  const originalName = file.name || 'image.jpg'
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { error: 'Extension de fichier non autorisée.' }
  }

  // Récupération de l'artiste lié
  let artist = null
  const requestedArtistId = (formData.get('artistId') as string)?.trim()

  if (role === 'ADMIN' && requestedArtistId) {
    artist = await prisma.artist.findUnique({ where: { id: requestedArtistId } })
  } else {
    artist = await prisma.artist.findUnique({ where: { userId } })
  }

  if (!artist) {
    return { error: 'Profil artiste introuvable.' }
  }

  // Chemin structuré et sécurisé : {artistId}/{type}/{timestamp}_{random}.{extension}
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 9)
  const storagePath = `${artist.id}/${type}/${timestamp}_${randomStr}.${extension}`

  const previousImageUrl = type === 'profile' ? artist.profileImage : artist.coverImage

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Upload vers Supabase Storage
    const uploadRes = await uploadToSupabaseStorage(storagePath, buffer, file.type)
    if (!uploadRes.success || !uploadRes.url) {
      return { error: uploadRes.error || 'Erreur lors de l\'enregistrement dans Supabase Storage.' }
    }

    const newPublicUrl = uploadRes.url

    // 2. Mise à jour transactionnelle du profil artiste en base de données
    await prisma.artist.update({
      where: { id: artist.id },
      data: {
        [type === 'profile' ? 'profileImage' : 'coverImage']: newPublicUrl,
      },
    })

    // 3. Suppression de l'ancienne image si elle était stockée sur Supabase Storage
    if (previousImageUrl && previousImageUrl.includes('artists-media')) {
      // Nettoyage asynchrone non-bloquant
      deleteFromSupabaseStorage(previousImageUrl).catch((err) => {
        console.warn('Erreur lors du nettoyage de l\'ancienne image Storage:', err)
      })
    }

    // Revalidation Next.js
    try {
      revalidatePath('/artiste')
      revalidatePath(`/artistes/${artist.slug}`)
      revalidatePath('/')
      revalidatePath('/classements')
      revalidatePath('/categories')
    } catch {}

    return {
      success: true,
      url: newPublicUrl,
      message: `${type === 'profile' ? 'Photo de profil' : 'Image de couverture'} mise à jour avec succès !`,
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'upload d\'image artiste:', error)
    return { error: error.message || 'Une erreur inattendue est survenue lors de l\'upload.' }
  }
}

/**
 * Suppression sécurisée côté serveur d'une image artiste (profile ou cover)
 */
export async function deleteArtistImageAction(type: 'profile' | 'cover', targetArtistId?: string) {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Vous devez être connecté.' }
  }

  const userId = (session.user as any).id
  const role = (session.user as any).role

  if (role !== 'ARTIST' && role !== 'ADMIN') {
    return { error: 'Accès non autorisé.' }
  }

  let artist = null
  if (role === 'ADMIN' && targetArtistId) {
    artist = await prisma.artist.findUnique({ where: { id: targetArtistId } })
  } else {
    artist = await prisma.artist.findUnique({ where: { userId } })
  }

  if (!artist) {
    return { error: 'Profil artiste introuvable.' }
  }

  const currentImageUrl = type === 'profile' ? artist.profileImage : artist.coverImage
  if (!currentImageUrl) {
    return { success: true, message: 'Aucune image à supprimer.' }
  }

  try {
    // 1. Mise à jour de la base de données
    await prisma.artist.update({
      where: { id: artist.id },
      data: {
        [type === 'profile' ? 'profileImage' : 'coverImage']: null,
      },
    })

    // 2. Suppression dans Supabase Storage si applicable
    if (currentImageUrl.includes('artists-media')) {
      await deleteFromSupabaseStorage(currentImageUrl)
    }

    // Revalidation
    try {
      revalidatePath('/artiste')
      revalidatePath(`/artistes/${artist.slug}`)
      revalidatePath('/')
      revalidatePath('/classements')
      revalidatePath('/categories')
    } catch {}

    return {
      success: true,
      message: `${type === 'profile' ? 'Photo de profil' : 'Image de couverture'} supprimée avec succès.`,
    }
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'image:', error)
    return { error: error.message || 'Erreur lors de la suppression de l\'image.' }
  }
}

/**
 * Mise à jour des informations éditoriales par l'artiste connecté (Bio, Liens)
 */
export async function updateArtistProfileEditorialAction(formData: FormData) {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Vous devez être connecté.' }
  }

  const userId = (session.user as any).id
  const role = (session.user as any).role

  if (role !== 'ARTIST' && role !== 'ADMIN') {
    return { error: 'Accès réservé aux artistes enregistrés.' }
  }

  const artist = await prisma.artist.findUnique({
    where: { userId },
  })

  if (!artist) {
    return { error: 'Profil artiste introuvable.' }
  }

  const biography = (formData.get('biography') as string)?.trim() || null

  // Liens sociaux
  const instagramUrl = (formData.get('instagram') as string)?.trim()
  const facebookUrl = (formData.get('facebook') as string)?.trim()
  const youtubeUrl = (formData.get('youtube') as string)?.trim()
  const tiktokUrl = (formData.get('tiktok') as string)?.trim()

  // Liens musique & streaming
  const spotifyUrl = (formData.get('spotify') as string)?.trim()
  const appleMusicUrl = (formData.get('appleMusic') as string)?.trim()

  await prisma.$transaction(async (tx) => {
    // Mise à jour de la biographie
    await tx.artist.update({
      where: { id: artist.id },
      data: {
        biography,
      },
    })

    // Réactualisation des liens sociaux
    await tx.artistSocialLink.deleteMany({ where: { artistId: artist.id } })
    const socialData = [
      { platform: 'instagram', url: instagramUrl },
      { platform: 'facebook', url: facebookUrl },
      { platform: 'youtube', url: youtubeUrl },
      { platform: 'tiktok', url: tiktokUrl },
    ].filter((s) => Boolean(s.url))

    if (socialData.length > 0) {
      await tx.artistSocialLink.createMany({
        data: socialData.map((s) => ({
          artistId: artist.id,
          platform: s.platform,
          url: s.url!,
        })),
      })
    }

    // Réactualisation des liens musicaux
    await tx.artistMusicLink.deleteMany({ where: { artistId: artist.id } })
    const musicData = [
      { platform: 'Spotify', url: spotifyUrl, title: 'Écouter sur Spotify' },
      { platform: 'Apple Music', url: appleMusicUrl, title: 'Écouter sur Apple Music' },
    ].filter((m) => Boolean(m.url))

    if (musicData.length > 0) {
      await tx.artistMusicLink.createMany({
        data: musicData.map((m) => ({
          artistId: artist.id,
          platform: m.platform,
          url: m.url!,
          title: m.title,
        })),
      })
    }
  })

  try {
    revalidatePath('/artiste')
    revalidatePath(`/artistes/${artist.slug}`)
    revalidatePath('/')
  } catch {}

  return { success: true, message: 'Votre biographie et vos liens ont été mis à jour avec succès !' }
}
