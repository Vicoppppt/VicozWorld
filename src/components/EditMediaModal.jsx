import { useState, useEffect } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { StarRating } from "./StarRating";
import { motion, AnimatePresence } from "framer-motion";
import { getMediaDetails, getImageUrl } from "../api/tmdb";

export function EditMediaModal({ isOpen, onClose, media, onSave }) {
  const [formData, setFormData] = useState({
    status: "",
    rating: 0,
    review: "",
    seasons: {},
    currentProgress: 0
  });
  
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);

  const isMultiSeason = media?.type === "Série" || media?.type === "Animé";

  useEffect(() => {
    if (media && isOpen) {
      setFormData({
        status: media.status || "",
        rating: media.rating || 0,
        review: media.review || "",
        seasons: {},
        currentProgress: media.currentProgress || 0
      });

      if (isMultiSeason && media.tmdbId) {
        setIsLoadingSeasons(true);
        // On récupère toutes les saisons depuis TMDB pour autoriser l'ajout de nouvelles saisons
        getMediaDetails(media.tmdbId, "tv").then(details => {
          if (details && details.seasons) {
            const validSeasons = details.seasons.filter(s => s.season_number > 0);
            setAvailableSeasons(validSeasons);
            
            // Map the user's existing saved seasons
            const initialSeasonsState = {};
            validSeasons.forEach(s => {
              const existingSeason = (media.seasons || []).find(ms => ms.seasonNumber === s.season_number);
              if (existingSeason) {
                initialSeasonsState[s.season_number] = { 
                  watched: existingSeason.watched, 
                  rating: existingSeason.rating, 
                  review: existingSeason.review,
                  watchedEpisodes: existingSeason.watchedEpisodes || (existingSeason.watched ? s.episode_count : 0)
                };
              } else {
                initialSeasonsState[s.season_number] = { watched: false, rating: 0, review: "", watchedEpisodes: 0 };
              }
            });
            setFormData(prev => ({ ...prev, seasons: initialSeasonsState }));
          }
          setIsLoadingSeasons(false);
        });
      }
    }
  }, [media, isOpen, isMultiSeason]);

  if (!isOpen || !media) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleSeasonWatched = (seasonNumber, maxEpisodes) => {
    setFormData(prev => {
      const isWatched = !prev.seasons[seasonNumber]?.watched;
      return {
        ...prev,
        seasons: {
          ...prev.seasons,
          [seasonNumber]: {
            ...prev.seasons[seasonNumber],
            watched: isWatched,
            watchedEpisodes: isWatched ? (maxEpisodes || 0) : 0,
            rating: isWatched ? (prev.seasons[seasonNumber]?.rating || 0) : 0,
            review: isWatched ? (prev.seasons[seasonNumber]?.review || "") : ""
          }
        }
      }
    });
  };

  const handleEpisodeClick = (seasonNumber, epNum, maxEpisodes) => {
    setFormData(prev => {
      const isWatched = epNum === maxEpisodes;
      return {
        ...prev,
        seasons: {
          ...prev.seasons,
          [seasonNumber]: {
            ...prev.seasons[seasonNumber],
            watchedEpisodes: epNum,
            watched: isWatched,
            rating: isWatched ? (prev.seasons[seasonNumber]?.rating || 0) : 0,
            review: isWatched ? (prev.seasons[seasonNumber]?.review || "") : ""
          }
        }
      }
    });
  };

  const updateSeasonData = (seasonNumber, field, value) => {
    setFormData(prev => ({
      ...prev,
      seasons: {
        ...prev.seasons,
        [seasonNumber]: {
          ...prev.seasons[seasonNumber],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isMultiSeason && formData.status !== "À voir" && formData.rating === 0) {
      alert("Une note est obligatoire si vous l'avez vu ou êtes en train de le lire/voir.");
      return;
    }
    
    let updatedSeasons = media.seasons || [];
    
    if (isMultiSeason && availableSeasons.length > 0) {
      updatedSeasons = availableSeasons.map(s => {
        const userData = formData.seasons[s.season_number];
        return {
          seasonNumber: s.season_number,
          name: s.name,
          posterPath: s.poster_path ? getImageUrl(s.poster_path, "w342") : null,
          episodeCount: s.episode_count || null,
          watched: userData?.watched || false,
          watchedEpisodes: userData?.watchedEpisodes || (userData?.watched ? s.episode_count : 0),
          rating: userData?.watched ? userData.rating : 0,
          review: userData?.watched ? userData.review : ""
        };
      });
    }

    onSave({
      ...media,
      status: formData.status,
      rating: (!isMultiSeason && formData.status !== "À voir") ? Number(formData.rating) : 0,
      review: (!isMultiSeason && formData.status !== "À voir") ? formData.review : "",
      seasons: updatedSeasons,
      currentProgress: (formData.status === "En cours" || formData.status === "En pause") ? formData.currentProgress : ""
    });
    onClose();
  };

  const statusOptions = media?.type === "Film"
    ? ["Terminé", "À voir"]
    : ["Terminé", "En cours", "À voir", "En pause"];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[90vh]"
          >
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <h2 className="text-xl font-bold text-zinc-100">Éditer l'avis</h2>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="edit-media-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <div className="space-y-6">
                
                <div className="flex items-center gap-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                  <div className="w-12 h-16 bg-zinc-800 rounded overflow-hidden shrink-0">
                    {media.cover ? (
                      <img src={media.cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-100">{media.title}</h4>
                    <span className="text-xs text-zinc-500 uppercase font-semibold">{media.type}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Statut</label>
                    <select 
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                    >
                      {statusOptions.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!isMultiSeason ? (
                  <>
                    {formData.status !== "À voir" && (
                      <>
                        {media.type === "Manga" && (formData.status === "En cours" || formData.status === "En pause") && (
                          <div className="mb-4 bg-zinc-950 p-4 rounded-xl border border-indigo-500/30">
                            <label className="block text-sm font-medium text-indigo-300 mb-3 text-center">
                              Chapitres lus
                            </label>
                            <div className="flex items-center justify-center gap-4">
                              <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, currentProgress: Math.max(0, (p.currentProgress || 0) - 1) }))}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xl transition-colors"
                              >
                                -
                              </button>
                              <div className="flex flex-col items-center min-w-[80px]">
                                <span className="text-2xl font-bold text-white">{formData.currentProgress || 0}</span>
                                {media.chapterCount && (
                                  <span className="text-xs text-zinc-500">/ {media.chapterCount}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setFormData(p => ({ 
                                  ...p, 
                                  currentProgress: media.chapterCount 
                                    ? Math.min(media.chapterCount, (p.currentProgress || 0) + 1)
                                    : (p.currentProgress || 0) + 1 
                                }))}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xl transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-3">
                            Votre Note <span className="text-red-400">*</span>
                          </label>
                          <div className="flex justify-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                            <StarRating 
                              rating={formData.rating} 
                              onChange={(val) => setFormData(p => ({ ...p, rating: val }))} 
                              size="w-10 h-10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Avis personnel <span className="text-zinc-600 text-xs font-normal">(Optionnel)</span>
                          </label>
                          <textarea 
                            name="review"
                            value={formData.review}
                            onChange={handleChange}
                            rows="4"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                            placeholder="Qu'en avez-vous pensé ?"
                          />
                        </div>
                      </>
                    )}
                    {formData.status === "À voir" && (
                      <div className="text-center p-6 text-zinc-500 italic border border-zinc-800/50 rounded-xl bg-zinc-950/30">
                        L'œuvre est dans votre liste d'envies.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {formData.status === "À voir" ? (
                      <div className="text-center p-6 text-zinc-500 italic border border-zinc-800/50 rounded-xl bg-zinc-950/30">
                        La série est dans votre liste d'envies.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-zinc-100 border-b border-zinc-800 pb-2">Saisons et Épisodes</h3>
                        
                        {isLoadingSeasons ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                          </div>
                        ) : availableSeasons.length > 0 ? (
                          <div className="space-y-3">
                            {availableSeasons.map(season => {
                              const seasonData = formData.seasons[season.season_number];
                              return (
                                <div key={season.season_number} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden transition-all">
                                  <div 
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/50"
                                    onClick={() => toggleSeasonWatched(season.season_number, season.episode_count)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${seasonData?.watched ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 bg-zinc-900'}`}>
                                        {seasonData?.watched && <Check className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <span className="font-semibold text-zinc-200">{season.name}</span>
                                    </div>
                                    {seasonData?.watched && (
                                      <StarRating rating={seasonData.rating} readonly size="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                  
                                  {/* Grille d'épisodes (uniquement si En cours/pause et pas encore vu en entier) */}
                                  <AnimatePresence>
                                    {season.episode_count > 0 && (formData.status === "En cours" || formData.status === "En pause") && !seasonData?.watched && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden border-t border-zinc-800/50 bg-zinc-950/50"
                                      >
                                        <div className="p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <label className="text-xs font-medium text-zinc-400">Épisodes vus</label>
                                            <span className="text-xs font-bold text-indigo-400">{seasonData?.watchedEpisodes || 0} / {season.episode_count}</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {Array.from({ length: season.episode_count }).map((_, i) => {
                                              const epNum = i + 1;
                                              const isWatched = epNum <= (seasonData?.watchedEpisodes || 0);
                                              return (
                                                <button
                                                  key={epNum}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEpisodeClick(season.season_number, epNum, season.episode_count);
                                                  }}
                                                  className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-bold transition-all ${
                                                    isWatched 
                                                      ? 'bg-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]' 
                                                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                                                  }`}
                                                >
                                                  {epNum}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                  
                                  <AnimatePresence>
                                    {seasonData?.watched && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden border-t border-zinc-800/50 bg-zinc-900/20"
                                      >
                                        <div className="p-4 space-y-4">
                                          <div>
                                            <label className="block text-xs font-medium text-zinc-400 mb-2">Note pour la {season.name}</label>
                                            <StarRating 
                                              rating={seasonData.rating} 
                                              onChange={(val) => updateSeasonData(season.season_number, 'rating', val)} 
                                              size="w-6 h-6"
                                            />
                                          </div>
                                          <div>
                                            <textarea 
                                              value={seasonData.review}
                                              onChange={(e) => updateSeasonData(season.season_number, 'review', e.target.value)}
                                              rows="2"
                                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                                              placeholder="Un avis rapide sur cette saison ? (Optionnel)"
                                            />
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-zinc-500 text-sm">Aucune information de saison disponible.</p>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>
            </form>

            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="edit-media-form"
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-500/20"
              >
                <Check className="w-5 h-5" />
                Enregistrer
              </button>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
