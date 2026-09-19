import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Filter, BookOpen, Disc3, Film, Loader2, Sparkles, User, Calendar, Image as ImageIcon, MapPin, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { fetchLibraryItems, saveLibraryItem, deleteLibraryItem } from "../api/db";
import { AddLibraryItemModal } from "../components/AddLibraryItemModal";
import { LibraryDetailsModal } from "../components/LibraryDetailsModal";
import { EditLibraryItemModal } from "../components/EditLibraryItemModal";
import { StarRating } from "../components/StarRating";
import { useProfile } from "../context/ProfileContext";

const CATEGORIES = [
  { id: "Tous", label: "Tout afficher", icon: "✨" },
  { id: "Livre", label: "Livres", icon: "📚" },
  { id: "Manga", label: "Mangas", icon: "📖" },
  { id: "Musique", label: "Vinyles & CDs", icon: "🎵" },
  { id: "Blu-ray / 4K", label: "Films (Blu-ray / 4K)", icon: "📀" },
  { id: "Magazine", label: "Magazines", icon: "📰" },
  { id: "Autre", label: "Autres", icon: "📦" },
];

const STATUS_FILTERS = ["Tous", "Possédé", "En cours", "Prêté", "Souhaité"];

export function Bibliotheque() {
  const { isGuest } = useProfile();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtres
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [activeStatus, setActiveStatus] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Chargement des éléments
  const loadItems = async () => {
    try {
      const data = await fetchLibraryItems();
      setItems(data);
    } catch (e) {
      console.error("Erreur chargement bibliothèque :", e);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Filtrage des éléments
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCat = activeCategory === "Tous" ||
        item.category === activeCategory ||
        (activeCategory === "Musique" && (item.category === "CD" || item.category === "Vinyle"));
      const matchStatus = activeStatus === "Tous" || item.status === activeStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.creator && item.creator.toLowerCase().includes(q)) ||
        (item.format && item.format.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q));

      return matchCat && matchStatus && matchSearch;
    });
  }, [items, activeCategory, activeStatus, searchQuery]);

  // Statistiques
  const stats = useMemo(() => {
    const total = items.length;
    const books = items.filter(i => i.category === "Livre").length;
    const mangas = items.filter(i => i.category === "Manga").length;
    const music = items.filter(i => i.category === "CD" || i.category === "Vinyle").length;
    const cds = items.filter(i => i.category === "CD").length;
    const vinyls = items.filter(i => i.category === "Vinyle").length;
    const blurays = items.filter(i => i.category === "Blu-ray / 4K" || i.category === "Film").length;
    const mags = items.filter(i => i.category === "Magazine").length;
    const lent = items.filter(i => i.status === "Prêté").length;

    return { total, books, mangas, music, cds, vinyls, blurays, mags, lent };
  }, [items]);

  // Ajouter un élément
  const handleAddItem = async (newItem) => {
    try {
      await saveLibraryItem(newItem);
      setItems(prev => [newItem, ...prev]);
      toast.success(`« ${newItem.title} » ajouté à votre bibliothèque !`);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  // Modifier un élément
  const handleSaveEdit = async (updatedItem) => {
    try {
      await saveLibraryItem(updatedItem);
      setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
      setSelectedItem(updatedItem);
      toast.success("Modifications enregistrées !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la modification.");
    }
  };

  // Supprimer un élément
  const handleDeleteItem = async (id) => {
    if (!window.confirm("Supprimer cet exemplaire de votre bibliothèque ?")) return;
    try {
      await deleteLibraryItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      toast.success("Exemplaire retiré de votre collection.");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* BANNIÈRE HAUTE & EN-TÊTE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-pink-950/30 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Collection Physique
            </span>
            {stats.lent > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🤝 {stats.lent} prêté{stats.lent > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ma Bibliothèque
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
            Tous vos livres, mangas, CDs, vinyles, éditions Blu-ray 4K et magazines avec pochettes haute définition et métadonnées automatiques.
          </p>
        </div>

        {/* Bouton d'ajout */}
        {!isGuest && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="self-start md:self-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter un média</span>
          </button>
        )}
      </div>

      {/* COMPTEURS RAPIDES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div 
          onClick={() => setActiveCategory("Tous")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            activeCategory === "Tous" 
              ? "bg-indigo-600/20 border-indigo-500/50 text-white" 
              : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider">Total</div>
          <div className="text-lg font-black text-white mt-0.5">{stats.total}</div>
        </div>

        <div 
          onClick={() => setActiveCategory("Livre")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            activeCategory === "Livre" 
              ? "bg-amber-500/20 border-amber-500/50 text-white" 
              : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">📚 Livres</div>
          <div className="text-lg font-black text-white mt-0.5">{stats.books}</div>
        </div>

        <div 
          onClick={() => setActiveCategory("Manga")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            activeCategory === "Manga" 
              ? "bg-emerald-500/20 border-emerald-500/50 text-white" 
              : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">📖 Mangas</div>
          <div className="text-lg font-black text-white mt-0.5">{stats.mangas}</div>
        </div>

        <div 
          onClick={() => setActiveCategory("Musique")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            activeCategory === "Musique" 
              ? "bg-purple-500/20 border-purple-500/50 text-white" 
              : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">🎵 Vinyles & CDs</div>
          <div className="text-lg font-black text-white mt-0.5 flex items-baseline gap-1.5">
            <span>{stats.music}</span>
            <span className="text-[10px] font-medium text-zinc-400">({stats.vinyls} vin. · {stats.cds} cd)</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveCategory("Blu-ray / 4K")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            activeCategory === "Blu-ray / 4K" 
              ? "bg-pink-500/20 border-pink-500/50 text-white" 
              : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400">📀 Blu-ray 4K</div>
          <div className="text-lg font-black text-white mt-0.5">{stats.blurays}</div>
        </div>

        <div 
          onClick={() => setActiveCategory("Magazine")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            activeCategory === "Magazine" 
              ? "bg-yellow-500/20 border-yellow-500/50 text-white" 
              : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">📰 Magazines</div>
          <div className="text-lg font-black text-white mt-0.5">{stats.mags}</div>
        </div>
      </div>

      {/* BARRE DE RECHERCHE ET FILTRES */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800/80 shadow-md">
        {/* Recherche instantanée */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher par titre, artiste, auteur, format..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filtres par Catégorie et Statut */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide py-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                activeCategory === cat.id
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}

          <div className="w-px h-5 bg-zinc-800 shrink-0 mx-1" />

          {STATUS_FILTERS.map(st => (
            <button
              key={st}
              onClick={() => setActiveStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeStatus === st
                  ? "bg-zinc-200 text-zinc-950 border-zinc-200 font-bold shadow-sm"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLE DES OBJETS & MÉDIAS */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm">Chargement de votre bibliothèque...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800">
          <div className="w-16 h-16 rounded-full bg-zinc-800/60 flex items-center justify-center text-3xl mb-4">
            📚
          </div>
          <h3 className="text-base font-bold text-zinc-200">Aucun média trouvé</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {searchQuery 
              ? `Aucun élément ne correspond à votre recherche « ${searchQuery} ».` 
              : "Votre bibliothèque est vide dans cette catégorie. Ajoutez vos premiers livres, mangas, CDs, vinyles ou films !"}
          </p>
          {!isGuest && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all"
            >
              + Ajouter un média maintenant
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {filteredItems.map(item => {
            const isSquare = item.category === "CD" || item.category === "Vinyle";
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedItem(item)}
                className="group relative bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {/* Image Pochette */}
                <div className={`${isSquare ? "aspect-square" : "aspect-[2/3]"} relative bg-zinc-950 overflow-hidden`}>
                  {item.cover ? (
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-950">
                      <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-[10px] text-zinc-500">{item.category}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80" />

                  {/* Badge Catégorie */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-zinc-200 border border-white/10">
                    {item.category}
                  </div>

                  {/* Statut si en cours, prêté ou wishlist */}
                  {item.status !== "Possédé" && (
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase shadow-md ${
                      item.status === "En cours" ? "bg-cyan-500 text-black shadow-cyan-500/20" :
                      item.status === "Prêté" ? "bg-amber-500 text-black shadow-amber-500/20" :
                      item.status === "Souhaité" ? "bg-purple-500 text-white shadow-purple-500/20" : "bg-zinc-700 text-white"
                    }`}>
                      {item.status}
                    </div>
                  )}

                  {/* Titre et détails en bas de la carte */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent">
                    <h3 className="font-bold text-zinc-100 text-sm leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </h3>
                    
                    {item.creator && (
                      <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
                        {item.creator}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-800/60 text-[10px] text-zinc-400 font-semibold">
                      <span className="truncate max-w-[90px]">{item.format || item.year || ""}</span>
                      {Number(item.rating) > 0 && (
                        <div className="flex items-center gap-0.5">
                          <StarRating rating={item.rating} readonly size="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL AJOUT */}
      {isAddModalOpen && (
        <AddLibraryItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddItem}
        />
      )}

      {/* MODAL DETAILS */}
      {selectedItem && (
        <LibraryDetailsModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onEditClick={(item) => setItemToEdit(item)}
          onDeleteClick={handleDeleteItem}
          isGuest={isGuest}
        />
      )}

      {/* MODAL EDITION */}
      {itemToEdit && (
        <EditLibraryItemModal
          item={itemToEdit}
          isOpen={!!itemToEdit}
          onClose={() => setItemToEdit(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
