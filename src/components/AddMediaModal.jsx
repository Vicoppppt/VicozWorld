import { useState, useEffect } from "react";
import { X, Search, Loader2, Image as ImageIcon, ChevronLeft, Check, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchMedia, getTrendingMedia, getMediaCredits, getImageUrl, getMediaDetails, getTvSeasonDetails, getTvSeason } from "../api/tmdb";
import { searchKitsuManga, getKitsuTrendingManga } from "../api/kitsu";
import { StarRating } from "./StarRating";
import { toast } from "react-hot-toast";

export function AddMediaModal({ isOpen, onClose, onAdd }) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1: Search state
  const [query, setQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("movie"); // movie, tv, anime, manga
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    status: "",
    rating: 0,
    review: "",
    seasons: {}, // { [seasonNumber]: { rating: 4, review: "...", watched: true, watchedEpisodes: 8 } }
    currentProgress: 0
  });

  // Load trending on category change
  useEffect(() => {
    if (!query) {
      if (searchCategory === "manga") {
        getKitsuTrendingManga().then(setTrending);
      } else {
        // Pour les animés, on utilise les tendances séries TMDB pour l'instant
        const type = searchCategory === "anime" ? "tv" : searchCategory;
        getTrendingMedia(type).then(data => {
          if (searchCategory === "anime") {
            setTrending(data.map(item => ({ ...item, media_type: "anime" })));
          } else {
            setTrending(data);
          }
        });
      }
    }
  }, [searchCategory, query]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDirection(1);
      setQuery("");
      setResults([]);
      setSelectedItem(null);
      setFormData({
        status: "",
        rating: 0,
        review: "",
        seasons: {},
        currentProgress: 0
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const goToStep = (newStep) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    let data = [];
    if (searchCategory === "manga") {
      data = await searchKitsuManga(query);
    } else {
      const type = searchCategory === "anime" ? "tv" : searchCategory;
      data = await searchMedia(query, type);
      if (searchCategory === "anime") {
        data = data.map(item => ({ ...item, media_type: "anime" }));
      }
    }
    setResults(data || []);
    setIsSearching(false);
  };

  const handleSelectMedia = async (item) => {
    setSelectedItem(item);
    
    setIsSearching(true);
    let details = null;
    
    if (item.media_type === "tv" || item.media_type === "anime") {
      details = await getMediaDetails(item.id, "tv");
      if (details) {
        // Filtrer la saison 0 (Specials)
        const validSeasons = (details.seasons || []).filter(s => s.season_number > 0);
        setSelectedItem(prev => ({ ...prev, details: { ...details, seasons: validSeasons } }));
        
        // Initialiser le state des saisons
        const initialSeasons = {};
        
        // Fetch episode runtimes for each season in parallel
        const seasonsData = await Promise.all(validSeasons.map(s => getTvSeason(item.id, s.season_number)));
        
        validSeasons.forEach((s, idx) => {
          s.episodesRuntimes = seasonsData[idx]?.episodes?.map(ep => ep.runtime || 0) || [];
          initialSeasons[s.season_number] = { watched: false, rating: 0, review: "", watchedEpisodes: 0 };
        });
        setFormData(prev => ({ ...prev, seasons: initialSeasons }));
      }
    } else if (item.media_type === "movie") {
      details = await getMediaDetails(item.id, "movie");
      if (details) {
        setSelectedItem(prev => ({ ...prev, details }));
      }
    }
    
    setIsSearching(false);
    
    goToStep(2);
  };

  const handleSelectStatus = (status) => {
    setFormData(prev => ({ ...prev, status }));
    goToStep(3);
  };

  const toggleSeasonWatched = (seasonNumber, maxEpisodes) => {
    setFormData(prev => {
      const isWatched = !prev.seasons[seasonNumber].watched;
      return {
        ...prev,
        seasons: {
          ...prev.seasons,
          [seasonNumber]: {
            ...prev.seasons[seasonNumber],
            watched: isWatched,
            watchedEpisodes: isWatched ? (maxEpisodes || 0) : 0,
            rating: 0,
            review: ""
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
            rating: isWatched ? prev.seasons[seasonNumber].rating : 0,
            review: isWatched ? prev.seasons[seasonNumber].review : ""
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

  const handleSubmit = async () => {
    const isMultiSeason = selectedItem.media_type === "tv" || selectedItem.media_type === "anime";

    if (!isMultiSeason) {
      if (formData.status !== "À voir" && (!formData.rating || formData.rating === 0)) {
        toast.error("Une note est obligatoire si vous l'avez vu ou êtes en train de le lire/voir.");
        return;
      }
    }

    let director = "";
    let cast = [];

    // Pour les films, on récupère le cast global
    if (selectedItem.media_type === "movie") {
      const credits = await getMediaCredits(selectedItem.id, "movie");
      director = credits.crew?.find(c => c.job === "Director")?.name || "";
      cast = credits.cast?.slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profilePath: getImageUrl(c.profile_path, "w185")
      })) || [];
    }
    // Pour les mangas, pas d'API de casting pour l'instant via Kitsu facilement sans cascades, on laisse vide.
    
    const typeMap = { movie: "Film", tv: "Série", anime: "Animé", manga: "Manga" };

    // Formatage des saisons sauvegardées
    let savedSeasons = [];
    if (isMultiSeason && selectedItem.details?.seasons) {
      savedSeasons = selectedItem.details.seasons.map(s => {
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

    const newMedia = {
      title: selectedItem.title || selectedItem.name,
      type: typeMap[selectedItem.media_type] || "Film",
      cover: selectedItem.media_type === "manga"
        ? (selectedItem.poster_path || "")
        : (selectedItem.poster_path ? getImageUrl(selectedItem.poster_path, "w500") : ""),
      releaseDate: selectedItem.release_date || selectedItem.first_air_date || null,
      director: director || null, // Seulement pour les films
      cast: cast || null, // Seulement pour les films
      rating: (!isMultiSeason && formData.status !== "À voir") ? Number(formData.rating) : 0,
      tmdbRating: selectedItem.vote_average,
      tmdbId: selectedItem.id,
      status: formData.status,
      review: (!isMultiSeason && formData.status !== "À voir") ? formData.review : "",
      seasons: savedSeasons.map(s => ({
        ...s,
        episodesRuntimes: selectedItem.details.seasons.find(ds => ds.season_number === s.seasonNumber)?.episodesRuntimes || []
      })),
      currentProgress: (formData.status === "En cours" || formData.status === "En pause") ? formData.currentProgress : "",
      chapterCount: selectedItem.details?.chapterCount || null,
      volumeCount: selectedItem.details?.volumeCount || null,
      duration: selectedItem.media_type === "movie" ? (selectedItem.details?.runtime || 0) : 0,
      episodeDuration: (selectedItem.media_type === "tv" || selectedItem.media_type === "anime") 
        ? (selectedItem.details?.episode_run_time?.[0] || selectedItem.details?.last_episode_to_air?.runtime || 24) 
        : 0
    };

    onAdd(newMedia);
    onClose();
  };

  // Animation variants
  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 100 : -100, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (dir) => ({ zIndex: 0, x: dir < 0 ? 100 : -100, opacity: 0 })
  };

  const currentDisplayList = query ? results : trending;

  const statusList = searchCategory === "movie"
    ? ["Terminé", "À voir"] 
    : ["Terminé", "En cours", "À voir", "En pause"];

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0 z-10">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button 
                  onClick={() => goToStep(step - 1)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-xl font-bold text-zinc-100">
                {step === 1 && "Quelle œuvre ajouter ?"}
                {step === 2 && "Où en êtes-vous ?"}
                {step === 3 && "Détails & Avis"}
              </h2>
            </div>
            
            <div className="hidden sm:flex items-center gap-2">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? "w-8 bg-indigo-500" : i < step ? "w-4 bg-indigo-900" : "w-4 bg-zinc-800"
                  }`}
                />
              ))}
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form body */}
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "anticipate" }}
                className="absolute inset-0 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
              >
                
                {/* STEP 1: SEARCH */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl w-full overflow-x-auto scrollbar-hide">
                      {[
                        { id: "movie", label: "Film" },
                        { id: "tv", label: "Série" },
                        { id: "anime", label: "Animé" },
                        { id: "manga", label: "Manga" }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSearchCategory(cat.id);
                            setResults([]);
                            setQuery("");
                          }}
                          className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap ${
                            searchCategory === cat.id
                              ? "bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
                              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSearch} className="relative">
                      <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchCategory === "movie" ? "Ex: Inception, Avatar..." : searchCategory === "tv" ? "Ex: Breaking Bad..." : searchCategory === "anime" ? "Ex: Naruto, Attack on Titan..." : "Ex: Berserk, One Piece..."}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-lg shadow-inner"
                        autoFocus
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500" />
                      <button type="submit" className="hidden">Chercher</button>
                    </form>

                    <div className="mt-4">
                      {!query && trending.length > 0 && (
                        <h3 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">Tendances du moment</h3>
                      )}
                      
                      {isSearching ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {currentDisplayList.map(item => (
                            <div 
                              key={item.id} 
                              onClick={() => handleSelectMedia(item)}
                              className="group cursor-pointer bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                            >
                              <div className="aspect-[2/3] relative bg-zinc-900">
                                {item.poster_path ? (
                                  <img 
                                    src={(item.media_type === "manga") ? item.poster_path : getImageUrl(item.poster_path, "w342")} 
                                    alt={item.title || item.name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2 p-4 text-center">
                                    <ImageIcon className="w-8 h-8" />
                                    <span className="text-xs">Pas d'image</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-3 flex-1 flex flex-col justify-between">
                                <h4 className="font-semibold text-sm text-zinc-200 line-clamp-2">{item.title || item.name}</h4>
                                <p className="text-xs text-zinc-500 mt-1">
                                  {(item.release_date || item.first_air_date)?.substring(0, 4)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: SELECT STATUS */}
                {step === 2 && (
                  <div className="h-full flex flex-col justify-center space-y-4 max-w-lg mx-auto">
                    <p className="text-center text-zinc-400 mb-4">Dans quelle catégorie souhaitez-vous classer cette œuvre ?</p>
                    
                    {statusList.map(status => (
                      <button
                        key={status}
                        onClick={() => handleSelectStatus(status)}
                        className={`w-full p-4 rounded-xl border text-lg font-semibold transition-all duration-300 flex items-center justify-between group ${
                          formData.status === status
                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                            : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
                        }`}
                      >
                        {status}
                        <ChevronRight className={`w-5 h-5 transition-transform ${formData.status === status ? "text-indigo-400 translate-x-1" : "text-zinc-600 group-hover:translate-x-1"}`} />
                      </button>
                    ))}
                  </div>
                )}

                {/* STEP 3: DETAILS */}
                {step === 3 && (
                  <div className="space-y-8 max-w-lg mx-auto pb-8">
                    <div className="flex items-center gap-4 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                      <div className="w-12 h-16 bg-zinc-800 rounded overflow-hidden shrink-0">
                        {selectedItem?.poster_path ? (
                          <img src={(selectedItem.media_type === "manga") ? selectedItem.poster_path : getImageUrl(selectedItem.poster_path, "w154")} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-full h-full p-2 text-zinc-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-100">{selectedItem?.title || selectedItem?.name}</h4>
                        <span className="px-2 py-0.5 text-xs rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {formData.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      
                      {/* Formulaire classique pour Film / Manga */}
                      {(selectedItem?.media_type === "movie" || selectedItem?.media_type === "manga") ? (
                        <>
                          {formData.status !== "À voir" && (
                            <>
                              {selectedItem?.media_type === "manga" && (formData.status === "En cours" || formData.status === "En pause") && (
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
                                      {selectedItem.details?.chapterCount && (
                                        <span className="text-xs text-zinc-500">/ {selectedItem.details.chapterCount}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setFormData(p => ({ 
                                        ...p, 
                                        currentProgress: selectedItem.details?.chapterCount 
                                          ? Math.min(selectedItem.details.chapterCount, (p.currentProgress || 0) + 1)
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
                                  value={formData.review}
                                  onChange={(e) => setFormData(p => ({...p, review: e.target.value}))}
                                  rows="4"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                                  placeholder="Qu'en avez-vous pensé ?"
                                />
                              </div>
                            </>
                          )}
                          {formData.status === "À voir" && (
                            <div className="text-center p-6 text-zinc-500 italic border border-zinc-800/50 rounded-xl bg-zinc-950/30">
                              L'œuvre sera ajoutée à votre liste d'envies.
                            </div>
                          )}
                        </>
                      ) : (
                        /* Formulaire par saisons pour Séries / Animés */
                        <>
                          {formData.status === "À voir" ? (
                            <div className="text-center p-6 text-zinc-500 italic border border-zinc-800/50 rounded-xl bg-zinc-950/30">
                              La série sera ajoutée à votre liste d'envies.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-zinc-100 border-b border-zinc-800 pb-2">Saisons et Épisodes</h3>
                              
                              {selectedItem?.details?.seasons?.length > 0 ? (
                                <div className="space-y-3">
                                  {selectedItem.details.seasons.map(season => {
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
                                        
                                        {/* Champs de notation si coché */}
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
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {step === 3 && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0 z-10"
            >
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="px-5 py-2.5 rounded-lg font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Retour
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-500/20"
              >
                <Check className="w-5 h-5" />
                Valider l'ajout
              </button>
            </motion.div>
          )}
          
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
