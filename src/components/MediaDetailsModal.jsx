import { useState, useEffect } from "react";
import { X, Calendar, User, Users, Trash2, Edit3, ChevronDown, ChevronUp, Loader2, BookOpen, Clock } from "lucide-react";
import { StarRating } from "./StarRating";
import { motion, AnimatePresence } from "framer-motion";
import { getTvSeasonDetails, getImageUrl } from "../api/tmdb";

export function MediaDetailsModal({ media, isOpen, onClose, onEditClick, onDeleteClick, onDirectorClick, onActorClick }) {
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [seasonDetailsCache, setSeasonDetailsCache] = useState({});
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);

  // Reset when media changes or closed
  useEffect(() => {
    if (!isOpen) {
      setExpandedSeason(null);
      setSeasonDetailsCache({});
    }
  }, [isOpen, media?.id]);

  if (!isOpen || !media) return null;

  const handleToggleSeason = async (seasonNumber) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
      return;
    }
    
    setExpandedSeason(seasonNumber);

    if (!seasonDetailsCache[seasonNumber] && media.tmdbId) {
      setIsLoadingSeason(true);
      const data = await getTvSeasonDetails(media.tmdbId, seasonNumber);
      if (data) {
        setSeasonDetailsCache(prev => ({ ...prev, [seasonNumber]: data }));
      }
      setIsLoadingSeason(false);
    }
  };

  const isMultiSeason = media.type === "Série" || media.type === "Animé";

  let displayProgress = null;
  if (media && (media.status === "En cours" || media.status === "En pause")) {
    if (media.type === "Manga" && media.currentProgress) {
      displayProgress = `Chapitre ${media.currentProgress}${media.chapterCount ? ` / ${media.chapterCount}` : ""}`;
    } else if (isMultiSeason && media.seasons?.length > 0) {
      for (let i = media.seasons.length - 1; i >= 0; i--) {
        const s = media.seasons[i];
        if (s.watchedEpisodes > 0) {
          if (s.watched) {
            displayProgress = `Saison ${s.seasonNumber} terminée`;
          } else {
            displayProgress = `S${s.seasonNumber} • Ép ${s.watchedEpisodes}/${s.episodeCount || '?'}`;
          }
          break;
        }
      }
    }
    // Fallback for old string values if any
    if (!displayProgress && media.currentProgress && typeof media.currentProgress === "string") {
      displayProgress = media.currentProgress;
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6">
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
            className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-none sm:rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col md:flex-row h-[100dvh] sm:h-auto sm:max-h-[90vh]"
          >
            
            {/* Actions Button Top Right */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-full border border-zinc-700/50">
              {onEditClick && (
                <button 
                  onClick={onEditClick}
                  className="flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                  title="Éditer l'avis"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:block">Éditer</span>
                </button>
              )}
              {onDeleteClick && (
                <div className="w-px h-5 bg-zinc-700 mx-1"></div>
              )}
              {onDeleteClick && (
                <button 
                  onClick={onDeleteClick}
                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-full transition-colors"
                  title="Supprimer l'œuvre"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <div className="w-px h-5 bg-zinc-700 mx-1"></div>
              <button 
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Poster */}
            <div className="w-full md:w-1/3 xl:w-1/4 h-44 sm:h-60 md:h-auto shrink-0 relative bg-zinc-950 overflow-hidden">
              {media.cover && (
                <img 
                  src={media.cover} 
                  alt={media.title} 
                  className="absolute inset-0 w-full h-full object-cover object-top md:object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-black/50 md:hidden" />
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                 <span className="px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-200 w-fit">
                  {media.type}
                </span>
                 <span className={`px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider w-fit ${
                    media.status === "Terminé" ? "text-emerald-400" :
                    media.status === "À voir" ? "text-indigo-400" :
                    media.status === "En pause" ? "text-amber-400" :
                    "text-blue-400"
                 }`}>
                  {media.status}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              
              <div className="mb-6 pt-2 md:pt-0">
                <h2 className="text-3xl font-bold text-zinc-100 pr-12">{media.title}</h2>
              </div>

              {!isMultiSeason && media.status === "Terminé" && (
                <div className="flex items-center gap-1 mb-8">
                  <StarRating rating={media.rating} readonly size="w-6 h-6" />
                </div>
              )}

              {displayProgress && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg mb-8 font-medium">
                  {media.status === "En cours" && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                    </span>
                  )}
                  {media.status === "En pause" && (
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80"></span>
                  )}
                  <span className="text-sm">Progression : <strong className="text-white ml-1">{displayProgress}</strong></span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {media.tmdbRating && (
                  <div className="flex items-center gap-3 text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold border-2 ${
                      media.tmdbRating >= 7 ? 'border-emerald-500 text-emerald-500' :
                      media.tmdbRating >= 5 ? 'border-amber-500 text-amber-500' :
                      'border-red-500 text-red-500'
                    }`}>
                      {(media.tmdbRating * 10).toFixed(0)}<span className="text-[10px]">%</span>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Score TMDB</p>
                      <p className="font-medium text-sm">Spectateurs</p>
                    </div>
                  </div>
                )}

                {media.releaseDate && (
                  <div className="flex items-center gap-3 text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Date de sortie</p>
                      <p className="font-medium">{new Date(media.releaseDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                
                {!isMultiSeason && media.director && (
                  <div className="flex items-center gap-3 text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                    <User className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Réalisateur/Créateur</p>
                      {onDirectorClick ? (
                        <button 
                          onClick={() => onDirectorClick(media.director)}
                          className="mt-0.5 inline-flex items-center font-semibold text-sm text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 px-2.5 py-1 rounded-md transition-all"
                        >
                          {media.director}
                        </button>
                      ) : (
                        <p className="font-medium">{media.director}</p>
                      )}
                    </div>
                  </div>
                )}

                {media.type === "Manga" && media.chapterCount && (
                  <div className="flex items-center gap-3 text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Tomes & Chapitres</p>
                      <p className="font-medium">{media.volumeCount || '?'} Tomes, {media.chapterCount} Chapitres</p>
                    </div>
                  </div>
                )}

                {media.type === "Film" && media.duration > 0 && (
                  <div className="flex items-center gap-3 text-zinc-300 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Durée</p>
                      <p className="font-medium">{Math.floor(media.duration / 60)}h {(media.duration % 60).toString().padStart(2, '0')}m</p>
                    </div>
                  </div>
                )}

              </div>

              <div className="space-y-6">
                
                {/* Formulaire pour Film ou Manga (Ancien comportement) */}
                {!isMultiSeason && (
                  <>
                    {media.review && (
                      <div className="bg-zinc-950/50 p-5 rounded-xl border border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Mon avis</h3>
                        <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{media.review}</p>
                      </div>
                    )}

                    {media.cast && media.cast.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Users className="w-4 h-4" /> Casting
                        </h3>
                        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                          {media.cast.map((actor, index) => (
                            <div 
                              key={index} 
                              className={`flex-none w-24 sm:w-28 text-center group ${onActorClick ? 'cursor-pointer' : ''}`}
                              onClick={() => onActorClick && onActorClick(actor.name)}
                            >
                              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-zinc-800 mx-auto mb-3 border-2 border-zinc-800 group-hover:border-indigo-500 transition-colors">
                                {actor.profilePath ? (
                                  <img 
                                    src={actor.profilePath} 
                                    alt={actor.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-8 h-8 text-zinc-600" />
                                  </div>
                                )}
                              </div>
                              <p className="font-medium text-zinc-200 text-sm line-clamp-1">{actor.name}</p>
                              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{actor.character}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Affichage des saisons pour Série et Animé */}
                {isMultiSeason && media.seasons && media.seasons.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">
                      Saisons
                    </h3>
                    <div className="space-y-4">
                      {media.seasons.map((season) => {
                        const isExpanded = expandedSeason === season.seasonNumber;
                        const sDetails = seasonDetailsCache[season.seasonNumber];

                        return (
                          <div key={season.seasonNumber} className={`bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-hidden ${!season.watched ? 'opacity-80' : ''}`}>
                            {/* Accordion Header */}
                            <div 
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50 transition-colors"
                              onClick={() => handleToggleSeason(season.seasonNumber)}
                            >
                              <div className="flex items-center gap-4">
                                {season.posterPath ? (
                                  <img src={season.posterPath} alt={season.name} className={`w-12 h-16 object-cover rounded ${!season.watched ? 'grayscale opacity-60' : ''}`} />
                                ) : (
                                  <div className="w-12 h-16 bg-zinc-800 rounded flex items-center justify-center">
                                    <Calendar className={`w-5 h-5 text-zinc-600 ${!season.watched ? 'opacity-60' : ''}`} />
                                  </div>
                                )}
                                <div>
                                  <h4 className={`font-bold ${season.watched ? 'text-zinc-100' : 'text-zinc-500'}`}>{season.name}</h4>
                                  <div className="flex items-center gap-2 mt-1 border-t-transparent">
                                    {season.episodeCount ? (
                                      <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded mr-1">
                                        {season.episodeCount} épisodes
                                      </span>
                                    ) : null}
                                    {season.episodeCount && (season.episodesRuntimes?.length > 0 || media.episodeDuration) ? (
                                      <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded mr-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {(() => {
                                          const totalMins = season.episodesRuntimes?.length > 0
                                            ? season.episodesRuntimes.reduce((a, b) => a + (b || media.episodeDuration || 24), 0)
                                            : season.episodeCount * (media.episodeDuration || 24);
                                          return `${Math.floor(totalMins / 60)}h ${(totalMins % 60).toString().padStart(2, '0')}m`;
                                        })()}
                                      </span>
                                    ) : null}
                                    
                                    {season.watched ? (
                                      <StarRating rating={season.rating} readonly size="w-3.5 h-3.5" />
                                    ) : season.watchedEpisodes > 0 ? (
                                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                                        En cours ({season.watchedEpisodes}/{season.episodeCount || '?'})
                                      </span>
                                    ) : (
                                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                                        À voir
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-zinc-500">
                                {isLoadingSeason && expandedSeason === season.seasonNumber ? (
                                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                ) : isExpanded ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </div>
                            </div>

                            {/* Accordion Body */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-t border-zinc-800/50 bg-zinc-900/30"
                                >
                                  <div className="p-4 space-y-6">
                                    {/* Avis sur la saison */}
                                    {season.review && (
                                      <div>
                                        <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Mon avis</h5>
                                        <p className="text-sm text-zinc-300 italic border-l-2 border-indigo-500/50 pl-3 py-1">"{season.review}"</p>
                                      </div>
                                    )}

                                    {/* Réalisateurs (Crew TMDB) */}
                                    {sDetails && sDetails.crew && (
                                      <div>
                                        <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Équipe Technique</h5>
                                        <div className="flex flex-wrap gap-2">
                                          {sDetails.crew.slice(0, 5).map(c => (
                                            <span key={c.id + c.job} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                                              <span className="font-semibold text-zinc-400">{c.job}:</span> {c.name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Casting (Cast TMDB) */}
                                    {sDetails && sDetails.cast && sDetails.cast.length > 0 && (
                                      <div>
                                        <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Casting</h5>
                                        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                                          {sDetails.cast.map((actor, index) => (
                                            <div 
                                              key={index} 
                                              className={`flex-none w-20 text-center group ${onActorClick ? 'cursor-pointer' : ''}`}
                                              onClick={() => onActorClick && onActorClick(actor.name)}
                                            >
                                              <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 mx-auto mb-2 border border-zinc-700 group-hover:border-indigo-500 transition-colors">
                                                {actor.profile_path ? (
                                                  <img 
                                                    src={getImageUrl(actor.profile_path, "w185")} 
                                                    alt={actor.name}
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="w-full h-full flex items-center justify-center">
                                                    <User className="w-6 h-6 text-zinc-600" />
                                                  </div>
                                                )}
                                              </div>
                                              <p className="font-medium text-zinc-200 text-[10px] leading-tight line-clamp-2">{actor.name}</p>
                                              <p className="text-[9px] text-zinc-500 mt-0.5 line-clamp-1">{actor.character}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                      {media.seasons.length === 0 && (
                        <p className="text-zinc-500 italic text-sm">Aucune saison disponible.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
