import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/connexion',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = (auth?.user as any)?.role

      const pathname = nextUrl.pathname

      const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')
      const isArtistPath = pathname === '/artiste' || pathname.startsWith('/artiste/') || pathname === '/artist' || pathname.startsWith('/artist/')
      const isProtectedPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/')

      if (isAdminPath) {
        if (role !== 'ADMIN') return Response.redirect(new URL('/connexion', nextUrl))
        return true
      }
      if (isArtistPath) {
        if (role !== 'ARTIST' && role !== 'ADMIN') return Response.redirect(new URL('/connexion', nextUrl))
        return true
      }
      if (isProtectedPath) {
        if (!isLoggedIn) return Response.redirect(new URL('/connexion', nextUrl))
        return true
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role as string
        ;(session.user as any).id = token.id as string
      }
      return session
    },
    redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  providers: [],
} satisfies NextAuthConfig
