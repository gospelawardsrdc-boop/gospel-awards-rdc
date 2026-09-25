export type UserRole = 'ADMIN' | 'ARTIST' | 'USER'

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  image?: string
}

export interface ArtistWithStats {
  id: string
  stageName: string
  slug: string
  biography: string | null
  profileImage: string | null
  coverImage: string | null
  isActive: boolean
  isApproved: boolean
  totalPoints: number
  totalVotes: number
  totalVoters: number
  rank: number
  categories: {
    id: string
    name: string
    slug: string
  }[]
}

export interface CategoryWithArtists {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  artists: ArtistWithStats[]
}

export interface PointPackageInfo {
  id: string
  name: string
  points: number
  priceFc: number
}

export interface VoteHistory {
  id: string
  points: number
  createdAt: Date
  artist: {
    stageName: string
    slug: string
    profileImage: string | null
  }
  category: {
    name: string
    slug: string
  }
}
