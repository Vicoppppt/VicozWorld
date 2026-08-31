import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Users,
  Plus,
  UploadCloud,
  Download,
  BarChart3,
  Search,
  Sparkles,
  Trash2,
  Loader2,
  FileCode,
  Network,
  Target,
  Layers,
  ChevronDown,
  UserCheck
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  fetchFamilyMembers,
  saveFamilyMember,
  deleteFamilyMember,
  bulkSaveFamilyMembers,
  clearFamilyTree
} from "../api/db";
import { exportToGedcom, exportToJson } from "../utils/gedcomParser";
import { FamilyChartCanvas } from "../components/genealogy/FamilyChartCanvas";
import { PersonModal } from "../components/genealogy/PersonModal";
import { GedcomImportModal } from "../components/genealogy/GedcomImportModal";
import { GenealogyStatsModal } from "../components/genealogy/GenealogyStatsModal";

export function Genealogie() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sélections et modales
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const canvasRef = useRef(null);

  // Charger les données depuis la base locale SQLite ou localStorage
  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchFamilyMembers();
      if (data && data.length > 0) {
        setMembers(data);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Erreur chargement généalogie:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Enregistrer (ajouter ou modifier) un membre
  const handleSaveMember = async (memberData) => {
    try {
      const isNew = !members.some(m => String(m.id) === String(memberData.id));
      let updatedMembers = isNew
        ? [...members, memberData]
        : members.map(m => (String(m.id) === String(memberData.id) ? memberData : m));

      // Synchroniser les relations réciproques
      (memberData.parentIds || []).forEach(pId => {
        updatedMembers = updatedMembers.map(m => {
          if (String(m.id) === String(pId)) {
            const currentChildren = m.childrenIds || [];
            if (!currentChildren.includes(memberData.id)) {
              return { ...m, childrenIds: [...currentChildren, memberData.id] };
            }
          }
          return m;
        });
      });

      (memberData.spouseIds || []).forEach(sId => {
        updatedMembers = updatedMembers.map(m => {
          if (String(m.id) === String(sId)) {
            const currentSpouses = m.spouseIds || [];
            if (!currentSpouses.includes(memberData.id)) {
              return { ...m, spouseIds: [...currentSpouses, memberData.id] };
            }
          }
          return m;
        });
      });

      (memberData.childrenIds || []).forEach(cId => {
        updatedMembers = updatedMembers.map(m => {
          if (String(m.id) === String(cId)) {
            const currentParents = m.parentIds || [];
            if (!currentParents.includes(memberData.id)) {
              return { ...m, parentIds: [...currentParents, memberData.id] };
            }
          }
          return m;
        });
      });

      setMembers(updatedMembers);
      await saveFamilyMember(memberData);
      toast.success(isNew ? "Membre ajouté à l'arbre !" : "Fiche mise à jour !");
      setIsPersonModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      console.error("Erreur enregistrement membre:", error);
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  // Supprimer un membre
  const handleDeleteMember = async (memberId) => {
    try {
      await deleteFamilyMember(memberId);
      const remaining = members.filter(m => String(m.id) !== String(memberId));
      setMembers(remaining);
      if (selectedMemberId === memberId) {
        setSelectedMemberId(null);
      }
      toast.success("Membre retiré de l'arbre.");
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast.error("Erreur lors de la suppression.");
    }
  };

  // Raccourci d'ajout rapide (+ Parent, + Conjoint, + Enfant)
  const handleAddRelative = (targetMember, relationType) => {
    let prefill = {
      firstName: "",
      lastName: relationType === "parent" || relationType === "child" ? targetMember.lastName : "",
      gender: relationType === "parent" ? "M" : targetMember.gender === "M" ? "F" : "M",
      parentIds: relationType === "child" ? [targetMember.id] : [],
      spouseIds: relationType === "spouse" ? [targetMember.id] : [],
      childrenIds: relationType === "parent" ? [targetMember.id] : [],
    };

    setEditingMember(prefill);
    setIsPersonModalOpen(true);
  };

  // Import GEDCOM MyHeritage
  const handleImportGedcom = async (importedMembers, replaceExisting) => {
    try {
      setIsLoading(true);
      const finalList = replaceExisting ? importedMembers : [...members, ...importedMembers];
      setMembers(finalList);

      await bulkSaveFamilyMembers(finalList, replaceExisting);
      toast.success(`${importedMembers.length} personnes importées avec succès !`);
      setTimeout(() => {
        canvasRef.current?.centerTree();
      }, 100);
    } catch (error) {
      console.error("Erreur import:", error);
      toast.error("Erreur lors de l'importation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Réinitialiser l'arbre
  const handleClearTree = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer tous les membres de votre arbre généalogique ?")) {
      await clearFamilyTree();
      setMembers([]);
      setSelectedMemberId(null);
      toast.success("Arbre généalogique réinitialisé.");
    }
  };

  // Export GEDCOM
  const handleExportGedcom = () => {
    const content = exportToGedcom(members);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arbre_genealogique_${new Date().toISOString().slice(0, 10)}.ged`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
    toast.success("Fichier GEDCOM exporté !");
  };

  // Export JSON
  const handleExportJson = () => {
    const content = exportToJson(members);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arbre_genealogique_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
    toast.success("Fichier JSON exporté !");
  };

  // Recherche
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return members
      .filter(m =>
        `${m.firstName || ""} ${m.lastName || ""} ${m.maidenName || ""}`.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [members, searchQuery]);

  const handleSelectSearchResult = (member) => {
    setSelectedMemberId(member.id);
    canvasRef.current?.centerOnMember(member.id);
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Barre d'outils supérieure */}
      <div className="h-16 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2.5 z-30 flex-shrink-0">
        {/* Titre & Compteur */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Network className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-zinc-100 truncate">Généalogie</h1>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] sm:text-[11px] font-bold text-zinc-300">
                {members.length}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium truncate hidden sm:block">
              Moteur interactif sans superposition • Cliquez sur un ancêtre pour naviguer
            </p>
          </div>
        </div>

        {/* Barre de Recherche avec Autocomplétion */}
        <div className="relative flex-1 max-w-xs hidden lg:block">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="Rechercher / Centrer..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Liste déroulante des résultats */}
          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-zinc-800/60">
              {searchResults.map((m) => (
                <button
                  key={m.id}
                  onMouseDown={() => handleSelectSearchResult(m)}
                  className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-zinc-800/80 transition-colors text-xs"
                >
                  <div>
                    <span className="font-bold text-zinc-100">{m.firstName}</span>{" "}
                    <span className="font-bold text-zinc-300 uppercase">{m.lastName}</span>
                    {m.maidenName && <span className="text-zinc-500 italic ml-1">(née {m.maidenName})</span>}
                  </div>
                  <span className="text-[10px] text-zinc-400">{m.birthDate || ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions principales */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nouveau Membre */}
          <button
            onClick={() => {
              setEditingMember(null);
              setIsPersonModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>

          {/* Import MyHeritage / GEDCOM */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            title="Importer un fichier GEDCOM (.ged) de MyHeritage"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span className="hidden xl:inline">Importer MyHeritage</span>
          </button>

          {/* Menu Export */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              title="Exporter l'arbre"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 py-1">
                <button
                  onClick={handleExportGedcom}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span>Exporter en GEDCOM (.ged)</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Exporter en JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Statistiques */}
          <button
            onClick={() => setIsStatsModalOpen(true)}
            title="Statistiques de la famille"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </button>

          {/* Réinitialiser si non vide */}
          {members.length > 0 && (
            <button
              onClick={handleClearTree}
              title="Vider l'arbre"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu : Canvas ou État vide */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-zinc-400 font-medium">Chargement de votre arbre...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 shadow-2xl">
            <Network className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Bienvenue dans votre Arbre</h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Commencez par importer le fichier GEDCOM exporté depuis le compte MyHeritage de votre mère, ou créez le premier membre manuellement.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Importer MyHeritage (.ged)</span>
            </button>
            <button
              onClick={() => {
                setEditingMember(null);
                setIsPersonModalOpen(true);
              }}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un membre</span>
            </button>
          </div>
        </div>
      ) : (
        <FamilyChartCanvas
          members={members}
          selectedMemberId={selectedMemberId}
          onSelectMember={(member) => setSelectedMemberId(member.id)}
          onEditMember={(member) => {
            setEditingMember(member);
            setIsPersonModalOpen(true);
          }}
          onAddRelative={handleAddRelative}
          onDeleteMember={handleDeleteMember}
          canvasRef={canvasRef}
        />
      )}

      {/* Modale d'édition / création de membre */}
      <PersonModal
        isOpen={isPersonModalOpen}
        onClose={() => {
          setIsPersonModalOpen(false);
          setEditingMember(null);
        }}
        member={editingMember}
        allMembers={members}
        onSave={handleSaveMember}
        onDelete={handleDeleteMember}
      />

      {/* Modale d'import GEDCOM */}
      <GedcomImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportGedcom}
      />

      {/* Modale des statistiques */}
      <GenealogyStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        members={members}
      />
    </div>
  );
}
