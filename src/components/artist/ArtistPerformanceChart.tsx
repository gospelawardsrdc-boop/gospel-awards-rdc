'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface Props {
  votes: { points: number; createdAt: string }[]
}

export default function ArtistPerformanceChart({ votes }: Props) {
  // Agrégation chronologique des 7 derniers jours basée sur les votes réels
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const now = new Date()

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    const nextD = new Date(d)
    nextD.setDate(nextD.getDate() + 1)

    const dayPoints = votes
      .filter((v) => {
        const vDate = new Date(v.createdAt)
        return vDate >= d && vDate < nextD
      })
      .reduce((sum, v) => sum + v.points, 0)

    const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}`

    return {
      day: dayLabel,
      points: dayPoints,
    }
  })

  return (
    <div className="premium-card p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📈 <span>Performance des Votes</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Évolution hebdomadaire de la dynamique de vote</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-gold" />
          <span className="text-gray-400 font-medium">Points accumulés</span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#C9A84C" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#0A0E1A] border border-gold/30 p-2.5 rounded-xl shadow-xl">
                      <div className="text-[10px] text-gray-400 uppercase font-bold">{label}</div>
                      <div className="text-sm font-black text-gold">
                        +{payload[0].value} points
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="points"
              stroke="#C9A84C"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#goldGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
