import { useState, useMemo, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { db } from './api/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { MediaGrid } from './components/MediaGrid';
import { AddMediaModal } from './components/AddMediaModal';
import { MediaDetailsModal } from './components/MediaDetailsModal';
import { EditMediaModal } from './components/EditMediaModal';
import { DirectorFilmographyModal } from './components/DirectorFilmographyModal';
import { Loader2 } from "lucide-react";

const STORAGE_KEY = "mon-letterboxd-data";

function App() {
  const [mediaList, setMediaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeType, setActiveType] = useState("Tous");
  const [activeStatus, setActiveStatus] = useState("Terminé");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedDirector, setSelectedDirector] = useState(null);

  // Sync avec Firestore en temps réel
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "medias"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Tri par date d'ajout décroissante
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

  // Migration des données locales vers Firestore
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && !isLoading && mediaList.length === 0) {
      try {
        const localData = JSON.parse(saved);
        if (localData.length > 0) {
          toast.loading("Migration de vos données vers le Cloud...", { id: "migration" });
          localData.forEach(async (media) => {
            await setDoc(doc(db, "medias", media.id), media);
          });
          toast.success("Migration terminée avec succès !", { id: "migration" });
          localStorage.removeItem(STORAGE_KEY);
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
      return typeMatch && statusMatch;
    });
  }, [mediaList, activeType, activeStatus]);

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
      releaseDate: tmdbMedia.release_date || tmdbMedia.first_air_date,
      director: tmdbMedia.director,
      cast: [],
      rating: 0,
      tmdbRating: tmdbMedia.vote_average,
      tmdbId: tmdbMedia.id,
      status: "À voir",
      currentProgress: "",
      review: ""
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
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
          },
        }}
      />
      <Header onAddClick={() => setIsModalOpen(true)} />
      
      <main className="flex-1 flex flex-col">
        <FilterBar 
          activeType={activeType} 
          setActiveType={setActiveType}
          activeStatus={activeStatus}
          setActiveStatus={setActiveStatus}
          count={filteredMedia.length}
        />
        
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
          setSelectedDirector(directorName);
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

      <DirectorFilmographyModal
        isOpen={!!selectedDirector}
        directorName={selectedDirector}
        onClose={() => setSelectedDirector(null)}
        mediaList={mediaList}
        onQuickAddWatchlist={handleQuickAddWatchlist}
      />
    </div>
  );
}

export default App;
