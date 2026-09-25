import Link from 'next/link'

export default function DevenirCandidatPage() {
  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-2 group">
          <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center text-[#0A0E1A] font-black text-base shadow-lg shadow-gold/20">
            GA
          </div>
        </Link>
        
        <div>
          <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] block mb-1">
            Sélection Officielle
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Inscription des <span className="gold-text">Artistes</span>
          </h1>
        </div>

        <div className="premium-card p-6 sm:p-8 border-gold/20 glow-gold space-y-4 text-xs leading-relaxed text-gray-300 text-left">
          <div className="flex items-center gap-2 text-gold font-bold text-sm">
            <span>🏛️</span>
            <span>Sur Invitation Exclusive du Comité</span>
          </div>
          <p>
            Pour garantir l&apos;excellence et l&apos;intégrité de la compétition, les artistes et candidats des Gospel Awards RDC sont sélectionnés et invités directement par le comité d&apos;organisation.
          </p>
          <p>
            Aucune candidature publique directe n&apos;est acceptée sur la plateforme.
          </p>
          
          <div className="pt-4 border-t border-white/[0.06] space-y-3 text-center">
            <span className="text-[11px] text-gray-400 block">
              Vous avez reçu une invitation officielle ?
            </span>
            <Link
              href="/activer-compte"
              className="btn-primary w-full !py-3 block text-center text-xs font-bold"
            >
              ⭐ Activer mon Compte Artiste avec mon Code →
            </Link>
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gold transition-colors inline-block pt-2"
            >
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
