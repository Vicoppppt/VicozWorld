import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { User, Users } from 'lucide-react';
import { db } from '../api/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { FilterBar } from '../components/FilterBar';
import { MediaGrid } from '../components/MediaGrid';
import { AddMediaModal } from '../components/AddMediaModal';
import { MediaDetailsModal } from '../components/MediaDetailsModal';
import { EditMediaModal } from '../components/EditMediaModal';
import { PersonFilmographyModal } from '../components/PersonFilmographyModal';
import { getMediaDetails, getTvSeason, searchPersons, getImageUrl } from '../api/tmdb';



export function Cinematheque() {
  const [mediaList, setMediaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeType, setActiveType] = useState("Tous");
  const [activeStatus, setActiveStatus] = useState("Terminé");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedPersonRole, setSelectedPersonRole] = useState(null);
  const [personSearchResults, setPersonSearchResults] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "medias"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
      setMediaList(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Erreur Firestore :", error);
      toast.error("Erreur de connexion à la base de données");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Recherche de personnes
  useEffect(() => {
    if (activeType !== "Tous" || searchQuery.length < 3) {
      setPersonSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      const results = await searchPersons(searchQuery);
      setPersonSearchResults(results);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeType]);

  // Background migration for missing duration fields
  useEffect(() => {
    if (mediaList.length === 0) return;

    const fixMissingDurations = async () => {
      const missingMedias = mediaList.filter(m => {
        if (m.type === "Film" && typeof m.duration !== "number") return true;
        if (m.type === "Série" || m.type === "Animé") {
          if (m.seasons && m.seasons.length > 0) {
            return m.seasons.some(s => !s.episodesRuntimes);
          }
        }
        return false;
      });

      if (missingMedias.length === 0) return;

      for (const media of missingMedias) {
        if (media.tmdbId) {
          try {
            const details = await getMediaDetails(media.tmdbId, media.type === "Film" ? "movie" : "tv");
            if (details) {
              const updatedMedia = { ...media };
              if (media.type === "Film") {
                updatedMedia.duration = details.runtime || 0;
              } else {
                updatedMedia.episodeDuration = details.episode_run_time?.[0] || details.last_episode_to_air?.runtime || 24;
                if (updatedMedia.seasons && updatedMedia.seasons.length > 0) {
                  const seasonsData = await Promise.all(updatedMedia.seasons.map(s => getTvSeason(media.tmdbId, s.seasonNumber)));
                  updatedMedia.seasons = updatedMedia.seasons.map((s, idx) => ({
                    ...s,
                    episodesRuntimes: seasonsData[idx]?.episodes?.map(ep => ep.runtime || 0) || []
                  }));
                }
              }
              await setDoc(doc(db, "medias", updatedMedia.id), updatedMedia);
            }
          } catch (e) {
            console.error("Error migrating media", media.title, e);
          }
        }
        await new Promise(r => setTimeout(r, 500)); // Rate limit protection
      }
    };
    fixMissingDurations();
  }, [mediaList.length]); // Only re-run if length changes, no need to run on every update

  useEffect(() => {
    const saved = localStorage.getItem("mon-letterboxd-data");
    if (saved && !isLoading && mediaList.length === 0) {
      try {
        const localData = JSON.parse(saved);
        if (localData.length > 0) {
          toast.loading("Migration de vos données vers le Cloud...", { id: "migration" });
          Promise.all(
            localData.map((media) => setDoc(doc(db, "medias", media.id), media))
          )
            .then(() => {
              toast.success("Migration terminée avec succès !", { id: "migration" });
              localStorage.removeItem("mon-letterboxd-data");
            })
            .catch((e) => {
              console.error("Erreur de migration", e);
              toast.error("Erreur lors de la migration.", { id: "migration" });
            });
        }
      } catch (e) {
        console.error("Erreur de migration", e);
      }
    }
  }, [isLoading, mediaList.length]);

  const filteredMedia = useMemo(() => {
    return mediaList.filter((media) => {
      const typeMatch = activeType === "Tous" || media.type === activeType;
      const statusMatch = activeStatus === "Tous" || media.status === activeStatus;
      const searchMatch = (media.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && statusMatch && searchMatch;
    });
  }, [mediaList, activeType, activeStatus, searchQuery]);

  const watchTime = useMemo(() => {
    let totalMinutes = 0;
    
    filteredMedia.forEach(media => {
      if (media.type === "Manga") return;
      
      if (media.type === "Film") {
        if (media.status === "Terminé" && media.duration) {
          totalMinutes += media.duration;
        }
      } else if (media.type === "Série" || media.type === "Animé") {
        const epDuration = media.episodeDuration || 24; // fallback to 24m
        if (media.seasons) {
          media.seasons.forEach(season => {
            if (season.watchedEpisodes) {
              if (season.episodesRuntimes && season.episodesRuntimes.length > 0) {
                totalMinutes += season.episodesRuntimes.slice(0, season.watchedEpisodes).reduce((a, b) => a + (b || epDuration), 0);
              } else {
                totalMinutes += season.watchedEpisodes * epDuration;
              }
            }
          });
        }
      }
    });

    if (totalMinutes === 0) return null;
    
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = totalMinutes % 60;
    
    if (days > 0) {
      return `${days}j ${hours}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }, [filteredMedia]);

  const handleAddMedia = async (newMedia) => {
    const exists = mediaList.some(m => 
      (newMedia.tmdbId && m.tmdbId === newMedia.tmdbId) || 
      (!newMedia.tmdbId && m.title.toLowerCase() === newMedia.title.toLowerCase() && m.type === newMedia.type)
    );
    
    if (exists) {
      toast.error("Cette œuvre est déjà présente dans votre journal !");
      return;
    }

    const id = Date.now().toString();
    const mediaWithId = {
      ...newMedia,
      id,
      loggedAt: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, "medias", id), mediaWithId);
      toast.success(`"${newMedia.title}" ajouté avec succès !`);
    } catch (e) {
      toast.error("Erreur lors de l'ajout.");
      console.error(e);
    }
  };

  const handleQuickAddWatchlist = async (tmdbMedia) => {
    const exists = mediaList.some(m => m.tmdbId === tmdbMedia.id);
    if (exists) {
      toast.error("Déjà dans votre journal !");
      return;
    }
    
    const id = Date.now().toString();
    const newMedia = {
      id,
      loggedAt: new Date().toISOString(),
      title: tmdbMedia.title || tmdbMedia.name,
      type: tmdbMedia.media_type === "tv" ? "Série" : "Film",
      cover: tmdbMedia.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMedia.poster_path}` : "",
      releaseDate: tmdbMedia.release_date || tmdbMedia.first_air_date || null,
      director: tmdbMedia.director || null,
      cast: [],
      rating: 0,
      tmdbRating: tmdbMedia.vote_average,
      tmdbId: tmdbMedia.id,
      status: "À voir",
      currentProgress: "",
      review: "",
      duration: tmdbMedia.media_type === "movie" ? (tmdbMedia.details?.runtime || 0) : 0,
      episodeDuration: (tmdbMedia.media_type === "tv" || tmdbMedia.media_type === "anime")
        ? (tmdbMedia.details?.episode_run_time?.[0] || tmdbMedia.details?.last_episode_to_air?.runtime || 24)
        : 0
    };
    
    try {
      await setDoc(doc(db, "medias", id), newMedia);
      toast.success(`"${newMedia.title}" ajouté à votre Watchlist !`);
    } catch (e) {
      toast.error("Erreur lors de l'ajout.");
    }
  };

  const handleEditMedia = async (updatedMedia) => {
    try {
      await setDoc(doc(db, "medias", updatedMedia.id), updatedMedia);
      setSelectedMedia(updatedMedia);
      toast.success("Modifications enregistrées !");
    } catch (e) {
      toast.error("Erreur lors de la modification.");
    }
  };

  const handleDeleteMedia = async (id) => {
    try {
      await deleteDoc(doc(db, "medias", id));
      setSelectedMedia(null);
      toast.success("Œuvre supprimée de votre journal.");
    } catch (e) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="flex-1 flex flex-col relative w-full h-full">
      <main className="flex-1 flex flex-col">
        <FilterBar 
          activeType={activeType} 
          setActiveType={setActiveType}
          activeStatus={activeStatus}
          setActiveStatus={setActiveStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          count={filteredMedia.length}
          watchTime={watchTime}
          onAddClick={() => setIsModalOpen(true)}
        />
        
        {personSearchResults.length > 0 && (
          <div className="px-4 py-3 md:px-6 md:py-4 bg-zinc-900/50 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Personnes
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {personSearchResults.map((person) => (
                <div 
                  key={person.id} 
                  className="flex-none w-24 text-center group cursor-pointer"
                  onClick={() => {
                    setSelectedPerson(person.name);
                    setSelectedPersonRole(person.known_for_department === "Directing" ? "director" : "actor");
                  }}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 mx-auto mb-3 border-2 border-zinc-800 group-hover:border-indigo-500 transition-colors">
                    {person.profile_path ? (
                      <img 
                        src={getImageUrl(person.profile_path, "w185")} 
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-zinc-200 text-[11px] leading-tight line-clamp-2">{person.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{person.known_for_department === "Directing" ? "Réalisateur" : "Acteur"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <MediaGrid mediaList={filteredMedia} onMediaClick={setSelectedMedia} />
      </main>

      <AddMediaModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddMedia}
      />

      <MediaDetailsModal
        media={selectedMedia}
        isOpen={!!selectedMedia && !isEditModalOpen}
        onClose={() => setSelectedMedia(null)}
        onEditClick={() => setIsEditModalOpen(true)}
        onDirectorClick={(directorName) => {
          setSelectedMedia(null);
          setSelectedPerson(directorName);
          setSelectedPersonRole("director");
        }}
        onActorClick={(actorName) => {
          setSelectedMedia(null);
          setSelectedPerson(actorName);
          setSelectedPersonRole("actor");
        }}
        onDeleteClick={() => {
          if(window.confirm("Voulez-vous vraiment supprimer cette œuvre de votre journal ?")) {
            handleDeleteMedia(selectedMedia.id);
          }
        }}
      />

      <EditMediaModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        media={selectedMedia}
        onSave={handleEditMedia}
      />

      <PersonFilmographyModal
        isOpen={!!selectedPerson}
        personName={selectedPerson}
        personRole={selectedPersonRole}
        onClose={() => {
          setSelectedPerson(null);
          setSelectedPersonRole(null);
        }}
        mediaList={mediaList}
        onQuickAddWatchlist={handleQuickAddWatchlist}
      />
    </div>
  );
}
