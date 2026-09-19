import { useState, useEffect } from "react";
import { X, Check, Image as ImageIcon } from "lucide-react";
import { StarRating } from "./StarRating";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const CATEGORIES = [
  { id: "Livre", label: "Livre", icon: "📚" },
  { id: "Manga", label: "Manga", icon: "📖" },
  { id: "CD", label: "CD", icon: "💿" },
  { id: "Vinyle", label: "Vinyle", icon: "🎵" },
  { id: "Blu-ray / 4K", label: "Film (Blu-ray / 4K / DVD)", icon: "📀" },
  { id: "Magazine", label: "Magazine", icon: "📰" },
  { id: "Autre", label: "Autre / Objet", icon: "📦" },
];

export function EditLibraryItemModal({ item, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    creator: "",
    year: "",
    category: "Livre",
    format: "",
    cover: "",
    status: "Possédé",
    condition: "Très bon état",
    rating: 0,
    lentTo: "",
    location: "",
    notes: "",
    description: ""
  });

  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        title: item.title || "",
        creator: item.creator || "",
        year: item.year || "",
        category: item.category || "Livre",
        format: item.format || "",
        cover: item.cover || "",
        status: item.status || "Possédé",
        condition: item.condition || "Très bon état",
        rating: item.rating || 0,
        lentTo: item.lentTo || "",
        location: item.location || "",
        notes: item.notes || "",
        description: item.description || ""
      });
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Le titre ne peut pas être vide.");
      return;
    }

    onSave({
      ...item,
      ...formData,
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

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
            <span className="text-base font-bold text-white">Modifier l'exemplaire</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
              {formData.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="flex flex-col sm:flex-row gap-5 p-4 rounded-3xl bg-zinc-950/80 border border-zinc-800">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              {formData.cover ? (
                <img
                  src={formData.cover}
                  alt={formData.title}
                  className={`w-28 h-36 object-cover rounded-2xl shadow-xl border border-zinc-700 ${
                    formData.category === "CD" || formData.category === "Vinyle" ? "h-28 aspect-square" : ""
                  }`}
                />
              ) : (
                <div className="w-28 h-36 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-zinc-600 gap-1">
                  <ImageIcon className="w-7 h-7" />
                  <span className="text-[10px]">Sans image</span>
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Titre</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Auteur / Artiste</label>
                  <input
                    type="text"
                    value={formData.creator}
                    onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Année</label>
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400">URL Image / Pochette</label>
                <input
                  type="url"
                  value={formData.cover}
                  onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400">Format / Édition</label>
              <input
                type="text"
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400">État</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Neuf">✨ Neuf sous blister</option>
                <option value="Comme neuf">💎 Comme neuf</option>
                <option value="Très bon état">👍 Très bon état</option>
                <option value="Bon état">👌 Bon état</option>
                <option value="État d'usage">⚠️ État d'usage / Usé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Possédé">🏠 Dans ma collection</option>
                <option value="Prêté">🤝 Prêté à quelqu'un</option>
                <option value="Souhaité">🎁 Liste d'envies</option>
                <option value="Vendu / Donné">📦 Vendu ou donné</option>
              </select>
            </div>

            {formData.status === "Prêté" ? (
              <div>
                <label className="text-xs font-semibold text-amber-400">Prêté à</label>
                <input
                  type="text"
                  value={formData.lentTo}
                  onChange={(e) => setFormData({ ...formData, lentTo: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-amber-500/40 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-zinc-400">Emplacement</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-zinc-400">Note</label>
              <div className="mt-2">
                <StarRating
                  rating={formData.rating}
                  onChange={(r) => setFormData({ ...formData, rating: r })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400">Commentaire personnel</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full mt-1 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
