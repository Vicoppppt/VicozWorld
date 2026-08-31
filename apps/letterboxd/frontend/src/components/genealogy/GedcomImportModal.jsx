import React, { useState } from "react";
import { X, UploadCloud, FileText, Users, Heart, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { parseGedcom } from "../../utils/gedcomParser";

export function GedcomImportModal({
  isOpen,
  onClose,
  onImport,
}) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    processFile(droppedFile);
  };

  const processFile = (fileObj) => {
    setError(null);
    setFile(fileObj);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const result = parseGedcom(text);
        if (!result.members || result.members.length === 0) {
          throw new Error("Aucun individu n'a été détecté dans ce fichier GEDCOM.");
        }
        setParsedData(result);
      } catch (err) {
        console.error("Erreur parsing GEDCOM:", err);
        setError(err.message || "Impossible de lire ce fichier GEDCOM.");
        setParsedData(null);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError("Erreur de lecture du fichier.");
      setIsProcessing(false);
    };
    reader.readAsText(fileObj, "UTF-8");
  };

  const handleConfirmImport = () => {
    if (!parsedData) return;
    onImport(parsedData.members, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Importer un arbre (MyHeritage)</h2>
              <p className="text-xs text-zinc-400">Format universel GEDCOM (.ged)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-5">
          {/* Zone de Glisser-Déposer */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-zinc-700 hover:border-indigo-500/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-zinc-950/40 hover:bg-indigo-500/5 transition-all cursor-pointer group"
            onClick={() => document.getElementById("gedcom-input")?.click()}
          >
            <input
              type="file"
              id="gedcom-input"
              accept=".ged,.gedcom"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 text-zinc-400 flex items-center justify-center mb-3 transition-colors">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              ) : (
                <FileText className="w-6 h-6" />
              )}
            </div>
            <p className="text-sm font-semibold text-zinc-200 mb-1">
              {file ? file.name : "Cliquez ou glissez votre fichier .ged ici"}
            </p>
            <p className="text-xs text-zinc-500">
              Exporté depuis MyHeritage, Geneanet, Heredis ou Ancestry
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Résumé de prévisualisation */}
          {parsedData && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Arbre analysé avec succès</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex items-center gap-3">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-lg font-black text-white leading-none">
                      {parsedData.stats.totalIndividuals}
                    </div>
                    <div className="text-[11px] text-zinc-400">Personnes</div>
                  </div>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex items-center gap-3">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <div>
                    <div className="text-lg font-black text-white leading-none">
                      {parsedData.stats.totalFamilies}
                    </div>
                    <div className="text-[11px] text-zinc-400">Familles / Couples</div>
                  </div>
                </div>
              </div>

              {/* Option de remplacement */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 bg-zinc-800 border-zinc-700 focus:ring-indigo-500"
                  />
                  <span>Remplacer l'arbre actuel (recommandé pour un import complet)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800 bg-zinc-950/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!parsedData || isProcessing}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
          >
            Importer dans mon arbre
          </button>
        </div>
      </div>
    </div>
  );
}
