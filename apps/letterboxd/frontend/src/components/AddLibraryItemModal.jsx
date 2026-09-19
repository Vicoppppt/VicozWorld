import { useState, useEffect } from "react";
import { X, Search, Loader2, BookOpen, Disc3, Film, Sparkles, Check, ChevronRight, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchLibraryUniversal } from "../api/librarySearch";
import { StarRating } from "./StarRating";
import { toast } from "react-hot-toast";

const CATEGORIES = [
  { id: "Livre", label: "Livre", icon: "📚", color: "from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30" },
  { id: "Manga", label: "Manga", icon: "📖", color: "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30" },
  { id: "CD", label: "CD", icon: "💿", color: "from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30" },
  { id: "Vinyle", label: "Vinyle", icon: "🎵", color: "from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/30" },
  { id: "Blu-ray / 4K", label: "Film (Blu-ray / 4K / DVD)", icon: "📀", color: "from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-500/30" },
  { id: "Magazine", label: "Magazine", icon: "📰", color: "from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/30" },
  { id: "Autre", label: "Autre / Objet", icon: "📦", color: "from-zinc-500/20 to-zinc-600/20 text-zinc-300 border-zinc-500/30" },
];

const FORMAT_SUGGESTIONS = {
  "Livre": ["Broché", "Poche", "Relié grand format", "E-book", "Beau livre"],
  "Manga": ["Tome simple", "Édition Deluxe / Perfect", "Double / Triple", "Coffret"],
  "CD": ["Boîtier standard (Jewel)", "Digipack", "Édition Deluxe", "Double CD"],
  "Vinyle": ["Vinyle 33T (LP)", "Vinyle 45T (Single/EP)", "Double LP Gatefold", "Vinyle de couleur / Picture Disc", "180g"],
  "Blu-ray / 4K": ["Blu-ray 4K Ultra HD", "Boîtier Steelbook", "Édition Collector / Coffret", "Blu-ray standard", "DVD"],
  "Magazine": ["Mensuel", "Hebdomadaire", "Hors-série", "Revue trimestrielle"],
  "Autre": ["Objet de collection", "Artbook", "Jeu", "Figurine"]
};

export function AddLibraryItemModal({ isOpen, onClose, onAdd }) {
  const [step, setStep] = useState(1); // 1 = recherche automatique, 2 = confirmation / ajustement
  const [selectedCategory, setSelectedCategory] = useState("Livre");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  // Données du formulaire
  const [formData, setFormData] = useState({
    title: "",
    creator: "", // Auteur, Réalisateur, Artiste
    year: "",
    category: "Livre",
    format: "Broché",
    cover: "",
    status: "Possédé", // Possédé, En cours, Prêté, Souhaité, Vendu
    rating: 0,
    lentTo: "",
    location: "", // Étagère, Meuble salon, etc.
    notes: "",
    source: ""
  });

  // Réinitialisation à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCategory("Livre");
      setFormData({
        title: "",
        creator: "",
        year: "",
        category: "Livre",
        format: "Broché",
        cover: "",
        status: "Possédé",
        rating: 0,
        lentTo: "",
        location: "",
        notes: "",
        source: ""
      });
    }
  }, [isOpen]);

  // Exécution explicite de la recherche (sur Entrée ou clic sur Rechercher)
  const handlePerformSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!searchQuery || searchQuery.trim().length < 2) {
      toast("Veuillez taper au moins 2 caractères", { icon: "ℹ️" });
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchLibraryUniversal(searchQuery.trim(), selectedCategory);
      setSearchResults(results);
    } catch (err) {
      console.warn("Erreur recherche :", err);
      toast.error("Erreur lors de la recherche");
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  // Clic sur un résultat automatique : Remplit tout et passe à l'étape 2
  const handleSelectResult = (item) => {
    const cat = item.category || selectedCategory;
    const formats = FORMAT_SUGGESTIONS[cat] || ["Standard"];
    setFormData({
      title: item.title || "",
      creator: item.creator || "",
      year: item.year || (item.releaseDate ? item.releaseDate.substring(0, 4) : ""),
      category: cat,
      format: item.format || formats[0],
      cover: item.cover || "",
      status: "Possédé",
      rating: 0,
      lentTo: "",
      location: "",
      notes: "",
      source: item.source || ""
    });
    setStep(2);
  };

  // Passer en saisie manuelle libre si introuvable en ligne
  const handleManualEntry = () => {
    const formats = FORMAT_SUGGESTIONS[selectedCategory] || ["Standard"];
    setFormData(prev => ({
      ...prev,
      title: searchQuery.trim(),
      category: selectedCategory,
      format: formats[0]
    }));
    setStep(2);
  };

  // Validation finale
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Veuillez indiquer un titre.");
      return;
    }

    onAdd({
      ...formData,
      id: Date.now().toString(),
      addedAt: new Date().toISOString(),
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
        className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                title="Retour à la recherche"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  {step === 1 ? "Rechercher une œuvre en ligne" : "Ajouter à ma bibliothèque"}
                </span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {step === 1 ? "Étape 1/2" : "Étape 2/2"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {step === 1
                  ? "Tapez le titre, nous récupérons automatiquement la pochette HD et les infos."
                  : "Vérifiez ou complétez les détails de votre exemplaire physique."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU MODAL */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ÉTAPE 1 : RECHERCHE AUTOMATIQUE */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Choix de la catégorie pour cibler la bonne API */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Type de média recherché :
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSearchResults([]);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        selectedCategory === cat.id
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 scale-[1.02]"
                          : "bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulaire de recherche déclenché sur Entrée ou clic */}
              <form onSubmit={handlePerformSearch} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={`Rechercher un ${selectedCategory.toLowerCase()} (ex: ${
                      selectedCategory === "Livre" ? "1984, Dune, Harry Potter..." :
                      selectedCategory === "CD" || selectedCategory === "Vinyle" ? "Daft Punk Discovery, Pink Floyd, Orelsan..." :
                      selectedCategory === "Manga" ? "One Piece, Berserk, Jujutsu Kaisen..." :
                      selectedCategory === "Blu-ray / 4K" ? "Inception, Oppenheimer, Matrix..." :
                      selectedCategory === "Magazine" ? "Science & Vie, So Foot, Rolling Stone..." : "Titre..."
                    })`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all shrink-0"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recherche...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Rechercher</span>
                    </>
                  )}
                </button>
              </form>

              {/* RÉSULTATS AUTOMATIQUES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                  <span>
                    {searchResults.length > 0 
                      ? `${searchResults.length} résultat${searchResults.length > 1 ? 's' : ''} trouvé${searchResults.length > 1 ? 's' : ''} (Cliquez pour sélectionner)` 
                      : searchQuery.length >= 2 && !isSearching ? "Aucun résultat trouvé en ligne" : "Suggestions en direct"}
                  </span>
                  {searchQuery.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={handleManualEntry}
                      className="text-indigo-400 hover:text-indigo-300 font-medium underline"
                    >
                      Ajouter manuellement sans résultat ➔
                    </button>
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {searchResults.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        onClick={() => handleSelectResult(item)}
                        className="group flex gap-3 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/40 cursor-pointer transition-all hover:scale-[1.01] shadow-sm"
                      >
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.title}
                            className={`w-14 h-20 object-cover rounded-xl bg-zinc-900 border border-zinc-800 shrink-0 ${
                              item.category === "CD" || item.category === "Vinyle" ? "aspect-square h-14" : ""
                            }`}
                          />
                        ) : (
                          <div className="w-14 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                {item.category}
                              </span>
                              {item.year && (
                                <span className="text-[11px] text-zinc-500 font-semibold">{item.year}</span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-2 mt-1">
                              {item.title}
                            </h4>
                            {item.creator && (
                              <p className="text-xs text-zinc-400 truncate mt-0.5">{item.creator}</p>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 flex items-center justify-between pt-1">
                            <span>{item.source || "En ligne"}</span>
                            <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform font-bold">Choisir ➔</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 rounded-3xl bg-zinc-950/30 border border-dashed border-zinc-800/80">
                    <Sparkles className="w-8 h-8 text-indigo-400/60 mx-auto mb-2" />
                    <p className="text-sm font-medium text-zinc-300">
                      Recherche automatique multi-sources
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                      Interroge instantanément Google Books, Apple Music HD, TMDB et Kitsu pour récupérer automatiquement pochettes et métadonnées.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : CONFIRMATION & DÉTAILS DE L'EXEMPLAIRE PHYSIQUE */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Carte Récapitulative Haute Fidélité */}
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
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-md">
                    {formData.category}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400">Titre de l'œuvre *</label>
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
                      <label className="text-[11px] font-semibold text-zinc-400">Auteur / Artiste / Groupe</label>
                      <input
                        type="text"
                        value={formData.creator}
                        onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400">Année de sortie / parution</label>
                      <input
                        type="text"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        placeholder="Ex: 2023"
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400">URL de l'image (Pochette / Couverture)</label>
                    <input
                      type="url"
                      value={formData.cover}
                      onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Propriétés de l'objet physique */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Catégorie */}
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const formats = FORMAT_SUGGESTIONS[newCat] || ["Standard"];
                      setFormData({ ...formData, category: newCat, format: formats[0] });
                    }}
                    className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Format / Édition */}
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Format / Édition</label>
                  <input
                    type="text"
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    placeholder="Ex: Vinyle 180g, Steelbook 4K, Poche..."
                    className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {FORMAT_SUGGESTIONS[formData.category] && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {FORMAT_SUGGESTIONS[formData.category].slice(0, 3).map(fmt => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setFormData({ ...formData, format: fmt })}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 hover:text-white"
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Statut & Emplacement */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Possédé">🏠 Dans ma collection</option>
                    <option value="En cours">📖 En cours (Lecture / Écoute)</option>
                    <option value="Prêté">🤝 Prêté à quelqu'un</option>
                    <option value="Souhaité">🎁 Liste d'envies (Wishlist)</option>
                    <option value="Vendu / Donné">📦 Vendu ou donné</option>
                  </select>
                </div>

                {formData.status === "Prêté" ? (
                  <div>
                    <label className="text-xs font-semibold text-amber-400">Prêté à qui ?</label>
                    <input
                      type="text"
                      value={formData.lentTo}
                      onChange={(e) => setFormData({ ...formData, lentTo: e.target.value })}
                      placeholder="Nom de l'ami(e), date..."
                      className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-amber-500/40 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-zinc-400">Emplacement / Rangement</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ex: Étagère salon, Meuble vinyle..."
                      className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-zinc-400">Ma note personnelle</label>
                  <div className="mt-2">
                    <StarRating
                      rating={formData.rating}
                      onChange={(r) => setFormData({ ...formData, rating: r })}
                    />
                  </div>
                </div>
              </div>

              {/* Notes personnelles & Résumé */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Mes notes & commentaires</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Commentaire personnel, souvenir d'achat, dédicace..."
                    className="w-full mt-1 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Boutons d'actions */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                >
                  ← Changer d'œuvre
                </button>
                <div className="flex gap-2">
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
                    <span>Enregistrer dans ma bibliothèque</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
