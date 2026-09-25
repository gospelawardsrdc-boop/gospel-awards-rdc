'use server'

import { prisma } from '@/lib/prisma'
import { auth, signIn } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/utils'
import { AuthError } from 'next-auth'

/**
 * 1. Création d'un artiste et génération d'une invitation unique par l'ADMIN
 * L'administrateur NE DÉFINIT PAS et NE VOIT JAMAIS le mot de passe personnel de l'artiste.
 */
export async function createArtistInvitationAction(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: 'Accès non autorisé. Seul un administrateur peut inviter un artiste.' }
  }

  const stageName = (formData.get('stageName') as string)?.trim()
  const realName = (formData.get('realName') as string)?.trim() || stageName
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const biography = (formData.get('biography') as string)?.trim() || null
  const profileImage = (formData.get('profileImage') as string)?.trim() || null
  const coverImage = (formData.get('coverImage') as string)?.trim() || null
  const categoryIds = formData.getAll('categoryIds') as string[]

  if (!stageName || !email) {
    return { error: 'Le nom de scène et l\'email sont obligatoires.' }
  }

  // Vérifier si un artiste existe déjà avec cet email
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { artist: true },
  })

  if (existingUser?.artist) {
    return { error: 'Un profil d\'artiste existe déjà avec cette adresse email.' }
  }

  // Générer slug unique pour le profil public
  let baseSlug = slugify(stageName)
  let slug = baseSlug
  let counter = 1
  while (await prisma.artist.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Générer token unique et code d'activation sécurisé (format: GA-XXXXXX)
  const token = crypto.randomBytes(32).toString('hex')
  const activationCode = `GA-${Math.floor(100000 + Math.random() * 900000)}`
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // Valide 7 jours

  let userId: string
  if (!existingUser) {
    // Création du compte utilisateur avec mot de passe null (défini par l'artiste lors de l'activation)
    const createdUser = await prisma.user.create({
      data: {
        name: realName,
        email,
        hashedPassword: null,
        role: 'ARTIST',
      },
    })
    userId = createdUser.id
  } else {
    // Mise à niveau du rôle en ARTIST
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: 'ARTIST' },
    })
    userId = updatedUser.id
  }

  // Création de l'artiste et de son invitation unique
  const artist = await prisma.artist.create({
    data: {
      userId,
      stageName,
      slug,
      biography,
      profileImage,
      coverImage,
      isApproved: true,
      isActive: true,
      categories: {
        create: categoryIds.map((cId) => ({
          categoryId: cId,
        })),
      },
      invitation: {
        create: {
          email,
          token,
          activationCode,
          expiresAt,
          isUsed: false,
        },
      },
    },
    include: {
      invitation: true,
    },
  })

  revalidatePath('/admin/artistes')
  revalidatePath('/categories')
  revalidatePath('/classements')

  return {
    success: true,
    artistId: artist.id,
    stageName: artist.stageName,
    email,
    activationCode,
    activationToken: token,
    activationLink: `/activer-compte?token=${token}`,
    expiresAt: expiresAt.toISOString(),
  }
}

/**
 * 2. Régénération d'un code et lien d'invitation pour un artiste non encore activé
 */
export async function regenerateArtistInvitationAction(artistId: string) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: 'Accès non autorisé.' }
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: { user: true, invitation: true },
  })

  if (!artist) {
    return { error: 'Artiste introuvable.' }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const activationCode = `GA-${Math.floor(100000 + Math.random() * 900000)}`
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  if (artist.invitation) {
    await prisma.artistInvitation.update({
      where: { id: artist.invitation.id },
      data: {
        token,
        activationCode,
        expiresAt,
        isUsed: false,
        usedAt: null,
      },
    })
  } else {
    await prisma.artistInvitation.create({
      data: {
        artistId: artist.id,
        email: artist.user.email,
        token,
        activationCode,
        expiresAt,
        isUsed: false,
      },
    })
  }

  revalidatePath('/admin/artistes')

  return {
    success: true,
    activationCode,
    activationToken: token,
    activationLink: `/activer-compte?token=${token}`,
    expiresAt: expiresAt.toISOString(),
  }
}

function cleanTokenOrCode(raw: string): { token?: string; code?: string } {
  let cleaned = raw.trim()

  // 1. Remove wrapping quotes if present
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim()

  // 2. If it's a full URL or relative path with query parameters
  if (cleaned.includes('?') || cleaned.startsWith('/') || cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned, 'http://localhost')
      const tokenParam = url.searchParams.get('token')
      const codeParam = url.searchParams.get('code')
      if (tokenParam) return { token: tokenParam.trim() }
      if (codeParam) return { code: codeParam.trim().toUpperCase() }
    } catch {
      const tokenMatch = cleaned.match(/[?&]token=([^&#\s]+)/i)
      if (tokenMatch && tokenMatch[1]) return { token: decodeURIComponent(tokenMatch[1]).trim() }
      const codeMatch = cleaned.match(/[?&]code=([^&#\s]+)/i)
      if (codeMatch && codeMatch[1]) return { code: decodeURIComponent(codeMatch[1]).trim().toUpperCase() }
    }
  }

  // 3. If prefixed with "token=" or "code="
  const prefixToken = cleaned.match(/^token=([^&#\s]+)/i)
  if (prefixToken && prefixToken[1]) return { token: decodeURIComponent(prefixToken[1]).trim() }

  const prefixCode = cleaned.match(/^code=([^&#\s]+)/i)
  if (prefixCode && prefixCode[1]) return { code: decodeURIComponent(prefixCode[1]).trim().toUpperCase() }

  // 4. Check if it matches GA-XXXXXX format
  if (cleaned.toUpperCase().startsWith('GA-')) {
    return { code: cleaned.toUpperCase() }
  }

  // 5. Default: treat as both potential token and potential uppercase code
  return { token: cleaned, code: cleaned.toUpperCase() }
}

/**
 * 3. Activation du compte artiste par l'artiste lui-même
 * L'artiste définit son propre mot de passe personnel de manière sécurisée.
 */
export async function activateArtistAccountAction(_prevState: any, formData: FormData) {
  const rawTokenOrCode = (formData.get('tokenOrCode') as string)?.trim() || ''
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!rawTokenOrCode) {
    return { error: 'Veuillez renseigner votre code ou lien d\'activation.' }
  }

  if (!password || password.length < 8) {
    return { error: 'Le mot de passe doit comporter au moins 8 caractères.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas.' }
  }

  const { token, code } = cleanTokenOrCode(rawTokenOrCode)
  const whereConditions: any[] = []
  if (token) whereConditions.push({ token })
  if (code) whereConditions.push({ activationCode: code })
  if (rawTokenOrCode) {
    whereConditions.push({ token: rawTokenOrCode })
    whereConditions.push({ activationCode: rawTokenOrCode.toUpperCase() })
  }

  // Recherche de l'invitation par token ou par code
  const invitation = await prisma.artistInvitation.findFirst({
    where: {
      OR: whereConditions,
    },
    include: {
      artist: {
        include: { user: true },
      },
    },
  })

  if (!invitation) {
    return { error: 'Code ou lien d\'activation invalide.' }
  }

  if (invitation.isUsed) {
    return { error: 'Cette invitation a déjà été utilisée. Vous pouvez vous connecter directement.' }
  }

  if (new Date() > invitation.expiresAt) {
    return { error: 'Ce code d\'activation a expiré. Veuillez contacter l\'administration pour recevoir un nouveau code.' }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  // Activation atomique du compte conditionnée à isUsed = false (anti-rejeu / anti-concurrence)
  try {
    await prisma.$transaction(async (tx) => {
      const updateInvitation = await tx.artistInvitation.updateMany({
        where: {
          id: invitation.id,
          isUsed: false,
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      })

      if (updateInvitation.count === 0) {
        throw new Error('ALREADY_USED')
      }

      await tx.user.update({
        where: { id: invitation.artist.userId },
        data: {
          hashedPassword,
          emailVerified: new Date(),
          role: 'ARTIST',
        },
      })

      await tx.artist.update({
        where: { id: invitation.artistId },
        data: {
          isApproved: true,
          isActive: true,
        },
      })
    }, {
      maxWait: 20000,
      timeout: 30000,
    })
  } catch (err: any) {
    if (err.message === 'ALREADY_USED') {
      return { error: 'Cette invitation a déjà été utilisée. Vous pouvez vous connecter directement.' }
    }
    return { error: 'Erreur lors de l\'activation du compte. Veuillez réessayer.' }
  }

  // Connexion automatique sécurisée en session ARTIST et redirection vers /artiste
  try {
    await signIn('credentials', {
      email: invitation.email,
      password,
      redirectTo: '/artiste',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Compte activé, mais erreur lors de la connexion automatique. Veuillez vous connecter.' }
    }
    throw error
  }
}
