import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export default async function AdminUtilisateursPage() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/connexion')

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        pointBalance: true,
        createdAt: true,
        _count: { select: { votes: true, transactions: true } },
        artist: { select: { stageName: true, isApproved: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.user.count(),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
            Comptes & Permissions
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Gestion des <span className="gold-text">Utilisateurs</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            {totalCount} compte(s) enregistré(s) au total (50 plus récents affichés).
          </p>
        </div>
      </div>

      <div className="premium-card p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                <th className="pb-3 font-semibold">Nom</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Rôle</th>
                <th className="pb-3 font-semibold text-right">Points</th>
                <th className="pb-3 font-semibold text-right">Votes</th>
                <th className="pb-3 font-semibold text-right">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.01]">
                  <td className="py-3">
                    <div className="font-bold text-white">{user.name}</div>
                    {user.artist && (
                      <div className="text-[10px] text-gold mt-0.5">🎤 {user.artist.stageName}</div>
                    )}
                  </td>
                  <td className="py-3 text-gray-400">{user.email}</td>
                  <td className="py-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        user.role === 'ADMIN'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          : user.role === 'ARTIST'
                          ? 'bg-gold/[0.12] text-gold border border-gold/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 text-right font-black text-gold">{user.pointBalance}</td>
                  <td className="py-3 text-right text-gray-300 font-semibold">{user._count.votes}</td>
                  <td className="py-3 text-right text-gray-500">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

