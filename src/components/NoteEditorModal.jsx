import { useState, useEffect } from "react";
import { X, Check, Eye, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const COLORS = [
  { name: "Défaut", value: "" },
  { name: "Rouge", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Ambre", value: "#f59e0b" },
  { name: "Émeraude", value: "#10b981" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Rose", value: "#ec4899" },
];

export function NoteEditorModal({ isOpen, onClose, note, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    color: "",
    tags: []
  });
  
  const [activeTab, setActiveTab] = useState("edit"); // "edit" ou "preview"

  useEffect(() => {
    if (isOpen) {
      if (note) {
        setFormData({
          title: note.title || "",
          content: note.content || "",
          color: note.color || "",
          tags: note.tags || []
        });
      } else {
        setFormData({
          title: "",
          content: "",
          color: "",
          tags: []
        });
      }
      setActiveTab("edit");
    }
  }, [isOpen, note]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...note,
      title: formData.title.trim(),
      content: formData.content,
      color: formData.color,
      tags: formData.tags
    });
  };

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
            className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-none sm:rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col h-[100dvh] sm:h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                <input
                  type="text"
                  placeholder="Titre de la note"
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="bg-transparent text-xl font-bold text-zinc-100 placeholder:text-zinc-600 focus:outline-none flex-1"
                  autoFocus
                />
                
                <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "edit" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Edit2 className="w-4 h-4" /> Éditer
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Eye className="w-4 h-4" /> Aperçu
                  </button>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="ml-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950">
              {activeTab === "edit" ? (
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                  placeholder="Écrivez votre note en Markdown ici...&#10;&#10;# Titre&#10;## Sous-titre&#10;- Liste&#10;**Gras**"
                  className="flex-1 w-full p-6 bg-transparent text-zinc-300 resize-none focus:outline-none scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent font-mono text-sm leading-relaxed"
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  <div className="prose prose-invert prose-amber max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {formData.content || "*Aucun contenu*"}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 md:px-6 md:py-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden sm:block">Couleur</span>
                <div className="flex gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, color: c.value }))}
                      title={c.name}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        formData.color === c.value ? "border-white scale-110" : "border-transparent hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.value || "#27272a" }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-lg shadow-amber-600/20"
                >
                  <Check className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
