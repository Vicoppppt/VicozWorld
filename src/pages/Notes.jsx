import { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Loader2 } from "lucide-react";
import { db } from "../api/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NoteEditorModal } from "../components/NoteEditorModal";

export function Notes() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  // Sync avec Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "notes"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      // Tri par date de modification décroissante
      data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setNotes(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Erreur Firestore Notes :", error);
      toast.error("Erreur de connexion à la base de notes");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveNote = async (noteData) => {
    try {
      const isNew = !noteData.id;
      const id = isNew ? Date.now().toString() : noteData.id;
      
      const noteToSave = {
        ...noteData,
        id,
        updatedAt: new Date().toISOString(),
        createdAt: isNew ? new Date().toISOString() : noteData.createdAt
      };

      await setDoc(doc(db, "notes", id), noteToSave);
      toast.success(isNew ? "Note créée !" : "Note modifiée !");
      setIsEditorOpen(false);
      setSelectedNote(null);
    } catch (error) {
      console.error("Erreur save note:", error);
      toast.error("Erreur lors de l'enregistrement de la note.");
    }
  };

  const handleDeleteNote = async (id, e) => {
    e.stopPropagation(); // Évite d'ouvrir la note quand on clique sur supprimer
    if (window.confirm("Voulez-vous vraiment supprimer cette note ?")) {
      try {
        await deleteDoc(doc(db, "notes", id));
        toast.success("Note supprimée.");
      } catch (error) {
        toast.error("Erreur lors de la suppression.");
      }
    }
  };

  const openNewNote = () => {
    setSelectedNote(null);
    setIsEditorOpen(true);
  };

  const openEditNote = (note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Notes & Brouillons</h1>
          <p className="text-zinc-500 mt-1">Vos idées, mémos et brouillons en Markdown.</p>
        </div>
        <button
          onClick={openNewNote}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-amber-600/20 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Nouvelle Note</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-20">
          <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
            <Edit3 className="w-10 h-10 text-zinc-700" />
          </div>
          <p className="text-lg font-medium text-zinc-400">Aucune note pour le moment</p>
          <p className="text-sm mt-1">Cliquez sur "Nouvelle Note" pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => openEditNote(note)}
              className={`group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 overflow-hidden ${note.color || 'bg-zinc-900'}`}
              style={{
                backgroundColor: note.color ? `${note.color}15` : '',
                borderColor: note.color ? `${note.color}40` : ''
              }}
            >
              {/* Actions au survol */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="p-1.5 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-bold text-zinc-100 text-lg mb-2 pr-8 line-clamp-2">
                {note.title || "Sans titre"}
              </h3>
              
              <div className="text-sm text-zinc-400 prose prose-invert prose-sm max-w-none line-clamp-6 mask-bottom">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content || "*Aucun contenu*"}
                </ReactMarkdown>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                {note.tags && note.tags.length > 0 && (
                  <span>{note.tags[0]} {note.tags.length > 1 && `+${note.tags.length - 1}`}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditorOpen && (
        <NoteEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          note={selectedNote}
          onSave={handleSaveNote}
        />
      )}
    </div>
  );
}
