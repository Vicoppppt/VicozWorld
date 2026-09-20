import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../context/ProfileContext';
import { Sparkles, Shield, User, X } from 'lucide-react';

export function ProfileModal() {
  const { showProfileSelector, setShowProfileSelector, selectProfile, activeProfile } = useProfile();

  if (!showProfileSelector) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-xl">
        {/* Bouton de fermeture si un profil est déjà actif */}
        {activeProfile && (
          <button
            onClick={() => setShowProfileSelector(false)}
            className="absolute top-6 right-6 p-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="max-w-2xl w-full text-center space-y-8"
        >
          <div className="space-y-3 flex flex-col items-center">
            <img 
              src="/logo.png" 
              alt="VicozWorld" 
              className="h-12 sm:h-14 object-contain drop-shadow-[0_4px_16px_rgba(139,92,246,0.3)]" 
            />
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Qui utilise le Hub ?
            </h1>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Choisissez votre espace pour charger vos outils et votre environnement personnalisé.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl mx-auto">
            {/* Profil Victor */}
            <motion.button
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectProfile('victor')}
              className="p-5 rounded-3xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all text-left flex flex-col items-center sm:items-start group shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/30 border border-indigo-500/40 flex items-center justify-center p-2 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform mb-3">
                <img src="/logo-icon.png" alt="Victor" className="w-full h-full object-contain" />
              </div>
              <div className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Victor
              </div>
              <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                Accès Total (IA, Docker, Banques, Sécurité, Ciné)
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Administrateur</span>
              </div>
            </motion.button>

            {/* Profil Claire (Maman) */}
            <motion.button
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectProfile('claire')}
              className="p-5 rounded-3xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 transition-all text-left flex flex-col items-center sm:items-start group shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-3xl shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform mb-3">
                👩‍🏫
              </div>
              <div className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                Maman (Claire)
              </div>
              <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                Boîte à outils collège, correcteur copies, PDF & Excel
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-pink-400">
                <User className="w-3.5 h-3.5" />
                <span>Outils Collège</span>
              </div>
            </motion.button>

            {/* Profil Invité */}
            <motion.button
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectProfile('invite')}
              className="p-5 rounded-3xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all text-left flex flex-col items-center sm:items-start group shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform mb-3">
                🎉
              </div>
              <div className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Invité
              </div>
              <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                Accès restreint : Cinémathèque, Quiz & Infos météo
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                <span>🍿 Espace Médias & Météo</span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
