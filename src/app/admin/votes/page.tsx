import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export default async function AdminVotesPage() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/connexion')

  const [votes, totalVotesCount] = await Promise.all([
    prisma.vote.findMany({
      select: {
        id: true,
        points: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        artist: { select: { stageName: true } },
        category: { select: { name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.vote.count(),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
            Contrôle des Scrutins
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Journal des <span className="gold-text">Votes</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            {totalVotesCount} vote(s) enregistrés au total (50 plus récents affichés).
          </p>
        </div>
      </div>

      <div className="premium-card p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                <th className="pb-3 font-semibold">Votant</th>
                <th className="pb-3 font-semibold">Artiste</th>
                <th className="pb-3 font-semibold">Catégorie</th>
                <th className="pb-3 font-semibold text-right">Points</th>
                <th className="pb-3 font-semibold text-right">Date & Heure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {votes.map((vote) => (
                <tr key={vote.id} className="hover:bg-white/[0.01]">
                  <td className="py-3">
                    <div className="font-bold text-white">{vote.user.name}</div>
                    <div className="text-[10px] text-gray-500">{vote.user.email}</div>
                  </td>
                  <td className="py-3 font-bold text-gold">{vote.artist.stageName}</td>
                  <td className="py-3 text-gray-300">
                    {vote.category.icon} {vote.category.name}
                  </td>
                  <td className="py-3 text-right font-black text-gold">+{vote.points} pts</td>
                  <td className="py-3 text-right text-gray-500">{formatDate(vote.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

