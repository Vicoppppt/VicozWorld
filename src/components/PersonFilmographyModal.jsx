import { useState, useEffect } from "react";
import { X, Loader2, Plus, Check, Search, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchPerson, getDirectorFilmography, getActorFilmography, getImageUrl } from "../api/tmdb";
import { StarRating } from "./StarRating";

export function PersonFilmographyModal({ personName, personRole = "director", isOpen, onClose, mediaList, onQuickAddWatchlist }) {
  const [isLoading, setIsLoading] = useState(false);
  const [personData, setPersonData] = useState(null);
  const [filmography, setFilmography] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen && personName) {
      const fetchData = async () => {
        setIsLoading(true);
        // 1. Trouver la personne
        const person = await searchPerson(personName);
        if (person) {
          setPersonData(person);
          // 2. Récupérer sa filmo
          const films = personRole === "actor" 
            ? await getActorFilmography(person.id)
            : await getDirectorFilmography(person.id);
          setFilmography(films);
        } else {
          setPersonData(null);
          setFilmography([]);
        }
        setIsLoading(false);
      };
      
      fetchData();
    }
  }, [isOpen, personName, personRole]);

  const filteredFilmography = filmography.filter(movie => 
    (movie.title || movie.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 md:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-6xl bg-zinc-900 border border-zinc-800 rounded-none sm:rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col h-[100dvh] sm:h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md shrink-0 z-10 sticky top-0">
            <div className="flex items-center gap-4">
              {personData?.profile_path && (
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500/50">
                  <img 
                    src={getImageUrl(personData.profile_path, "w185")} 
                    alt={personName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-zinc-100 flex items-center gap-3">
                  {personName}
                  {personRole && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
                      {personRole === "director" ? "Réalisateur" : "Acteur"}
                    </span>
                  )}
                </h2>
                <p className="text-xs md:text-sm text-zinc-400 mt-1">
                  Filmographie complète issue de TMDB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Chercher un film..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 md:w-64 bg-zinc-950 border border-zinc-800 rounded-full pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 rounded-full transition-colors border border-zinc-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-28 md:pb-8 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p>Recherche des films de {personName}...</p>
              </div>
            ) : filmography.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <p className="text-lg">Aucun film trouvé pour cette recherche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6 pb-12">
                {filteredFilmography.map(movie => {
                  // Vérifier si le film est dans le journal
                  const inJournal = mediaList.find(m => m.tmdbId === movie.id || (m.title.toLowerCase() === movie.title.toLowerCase() && m.type === "Film"));
                  
                  return (
                    <motion.div 
                      key={movie.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "0px 0px -50px 0px" }}
                      className="group relative"
                    >
                      {inJournal ? (
                        /* FILM DÉJÀ DANS LE JOURNAL */
                        <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden aspect-[2/3] cursor-default opacity-100 flex flex-col justify-end">
                          <img
                            src={getImageUrl(movie.poster_path, "w342")}
                            alt={movie.title}
                            className="absolute inset-0 w-full h-full object-cover brightness-75"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                          <div className="absolute top-2 right-2 p-1 bg-emerald-500/20 backdrop-blur-md rounded-full border border-emerald-500/30 text-emerald-400">
                            <Check className="w-4 h-4" />
                          </div>
                          
                          <div className="relative z-10 p-3">
                            <h3 className="font-bold text-zinc-100 text-sm line-clamp-1">{movie.title}</h3>
                            <div className="flex gap-0.5 mt-1">
                              <StarRating rating={inJournal.rating} readonly size="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* FILM NON VU (GRISÉ + QUICK ADD) */
                        <div 
                          onClick={() => onQuickAddWatchlist({ ...movie, director: personRole === "director" ? personName : null })}
                          className="relative bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden aspect-[2/3] cursor-pointer hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/20 group-hover:-translate-y-1"
                        >
                          <img
                            src={getImageUrl(movie.poster_path, "w342")}
                            alt={movie.title}
                            className="absolute inset-0 w-full h-full object-cover saturate-0 opacity-40 group-hover:saturate-100 group-hover:opacity-80 transition-all duration-500"
                          />
                          <div className="absolute inset-0 bg-zinc-950/20 group-hover:bg-zinc-950/40 transition-colors" />
                          
                          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="p-3 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-500/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                              <Plus className="w-6 h-6" />
                            </div>
                            <span className="mt-3 text-sm font-bold text-white tracking-wide bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                              À voir
                            </span>
                          </div>

                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-zinc-950 to-transparent">
                            <h3 className="font-bold text-zinc-300 text-sm line-clamp-2">{movie.title}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">{movie.release_date?.substring(0, 4)}</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
