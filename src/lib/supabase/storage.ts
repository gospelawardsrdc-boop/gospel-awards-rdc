/**
 * Utilitaire serveur pour l'interaction directe avec Supabase Storage
 * Conçu pour fonctionner sans dépendances externes supplémentaires via l'API REST officielle Supabase Storage.
 * Utilise SUPABASE_SERVICE_ROLE_KEY strictement côté serveur pour les uploads administratifs/artistes authentifiés.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'artists-media'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface DeleteResult {
  success: boolean
  error?: string
}

/**
 * Upload d'un fichier binaire dans le bucket Supabase Storage via REST API
 */
export async function uploadToSupabaseStorage(
  filePath: string,
  fileBuffer: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      success: false,
      error: 'Configuration Supabase Storage manquante côté serveur (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).',
    }
  }

  const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/${BUCKET_NAME}/${filePath.replace(/^\/+/, '')}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: fileBuffer as any,
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Supabase Storage Upload Error:', response.status, errText)
      return {
        success: false,
        error: `Erreur Supabase Storage (${response.status}): ${errText || response.statusText}`,
      }
    }

    // Construction de l'URL publique de l'image
    const publicUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET_NAME}/${filePath.replace(/^\/+/, '')}`

    return {
      success: true,
      url: publicUrl,
    }
  } catch (error: any) {
    console.error('Supabase Storage Network Exception:', error)
    return {
      success: false,
      error: error.message || 'Erreur réseau lors de la communication avec Supabase Storage.',
    }
  }
}

/**
 * Suppression d'un fichier du bucket Supabase Storage
 */
export async function deleteFromSupabaseStorage(filePath: string): Promise<DeleteResult> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      success: false,
      error: 'Configuration Supabase Storage manquante côté serveur.',
    }
  }

  // Si l'argument est une URL complète, extraire le chemin relatif dans le bucket
  let relativePath = filePath
  const publicPrefix = `/storage/v1/object/public/${BUCKET_NAME}/`
  if (filePath.includes(publicPrefix)) {
    relativePath = filePath.split(publicPrefix)[1]
  }

  if (!relativePath) {
    return { success: true }
  }

  const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/${BUCKET_NAME}`

  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefixes: [relativePath],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.warn('Supabase Storage Delete Warning:', response.status, errText)
      return {
        success: false,
        error: `Erreur de suppression Storage (${response.status}): ${errText}`,
      }
    }

    return { success: true }
  } catch (error: any) {
    console.warn('Supabase Storage Delete Exception:', error)
    return {
      success: false,
      error: error.message || 'Erreur réseau lors de la suppression sur Supabase Storage.',
    }
  }
}
