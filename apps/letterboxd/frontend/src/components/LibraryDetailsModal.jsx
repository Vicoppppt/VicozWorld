import { X, Calendar, User, Trash2, Edit3, Image as ImageIcon, MapPin, Tag, Share2, Star } from "lucide-react";
import { StarRating } from "./StarRating";
import { motion } from "framer-motion";

export function LibraryDetailsModal({ item, isOpen, onClose, onEditClick, onDeleteClick, isGuest }) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">Détails de l'exemplaire</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold">
              {item.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Pochette / Couverture */}
            <div className="relative shrink-0 mx-auto sm:mx-0">
              {item.cover ? (
                <img
                  src={item.cover}
                  alt={item.title}
                  className={`w-36 h-48 object-cover rounded-2xl shadow-xl border border-zinc-700 ${
                    item.category === "CD" || item.category === "Vinyle" ? "h-36 aspect-square" : ""
                  }`}
                />
              ) : (
                <div className="w-36 h-48 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">Pas d'image</span>
                </div>
              )}
            </div>

            {/* Infos clés */}
            <div className="space-y-3 flex-1">
              <div>
                <h3 className="text-xl font-extrabold text-white leading-snug">{item.title}</h3>
                {item.creator && (
                  <p className="text-sm font-semibold text-indigo-400 mt-1 flex items-center gap-1.5">
                    <User className="w-4 h-4" /> {item.creator}
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {item.year && (
                  <span className="px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {item.year}
                  </span>
                )}

                {item.format && (
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    {item.format}
                  </span>
                )}

                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                  item.status === "Possédé" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" :
                  item.status === "En cours" ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" :
                  item.status === "Prêté" ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
                  item.status === "Souhaité" ? "bg-purple-500/10 text-purple-300 border-purple-500/30" :
                  "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}>
                  ● {item.status}
                </span>
              </div>

              {/* Note */}
              {Number(item.rating) > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-zinc-400">Note :</span>
                  <StarRating rating={item.rating} readonly size="w-4 h-4" />
                </div>
              )}

              {/* Prêt / Emplacement */}
              {item.status === "Prêté" && item.lentTo && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Prêté actuellement à : <strong>{item.lentTo}</strong></span>
                </div>
              )}

              {item.location && (
                <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Emplacement : <strong className="text-zinc-200">{item.location}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Commentaire personnel */}
          {item.notes && (
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Commentaire personnel</h4>
              <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed italic">
                « {item.notes} »
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          {!isGuest ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onDeleteClick(item.id);
                }}
                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Supprimer de ma bibliothèque"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-zinc-500 italic">Lecture seule (Mode Invité)</span>
          )}

          <div className="flex items-center gap-2">
            {!isGuest && (
              <button
                onClick={() => {
                  onClose();
                  onEditClick(item);
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Modifier</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
            >
              Fermer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
