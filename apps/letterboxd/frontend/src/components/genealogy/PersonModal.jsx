import React, { useState, useEffect } from "react";
import { X, User, Heart, Baby, Users, Trash2, Calendar, MapPin, Briefcase, FileText } from "lucide-react";

export function PersonModal({
  isOpen,
  onClose,
  member,
  allMembers,
  onSave,
  onDelete,
}) {
  const isEdit = Boolean(member && member.id);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    maidenName: "",
    gender: "M",
    birthDate: "",
    birthPlace: "",
    isDeceased: false,
    deathDate: "",
    deathPlace: "",
    occupation: "",
    notes: "",
    avatarUrl: "",
    parentIds: [],
    spouseIds: [],
    childrenIds: [],
  });

  const [activeTab, setActiveTab] = useState("identity"); // 'identity', 'events', 'relations', 'notes'

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        maidenName: member.maidenName || "",
        gender: member.gender || "M",
        birthDate: member.birthDate || "",
        birthPlace: member.birthPlace || "",
        isDeceased: member.isDeceased || Boolean(member.deathDate || member.deathPlace),
        deathDate: member.deathDate || "",
        deathPlace: member.deathPlace || "",
        occupation: member.occupation || "",
        notes: member.notes || "",
        avatarUrl: member.avatarUrl || "",
        parentIds: member.parentIds ? [...member.parentIds] : [],
        spouseIds: member.spouseIds ? [...member.spouseIds] : [],
        childrenIds: member.childrenIds ? [...member.childrenIds] : [],
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        maidenName: "",
        gender: "M",
        birthDate: "",
        birthPlace: "",
        isDeceased: false,
        deathDate: "",
        deathPlace: "",
        occupation: "",
        notes: "",
        avatarUrl: "",
        parentIds: [],
        spouseIds: [],
        childrenIds: [],
      });
    }
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() && !formData.lastName.trim()) {
      alert("Veuillez indiquer au moins un prénom ou un nom.");
      return;
    }

    onSave({
      ...formData,
      id: member?.id || `indi_${Date.now()}`,
      x: member?.x !== undefined ? member.x : 0,
      y: member?.y !== undefined ? member.y : 0,
    });
  };

  // Liste des candidats pour les relations (exclut soi-même)
  const candidateMembers = allMembers.filter(m => !member || String(m.id) !== String(member.id));

  const toggleRelation = (type, targetId) => {
    setFormData(prev => {
      const list = prev[type] || [];
      const exists = list.includes(targetId);
      return {
        ...prev,
        [type]: exists ? list.filter(id => id !== targetId) : [...list, targetId],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* En-tête du Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                formData.gender === "M"
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : formData.gender === "F"
                  ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {isEdit ? `${formData.firstName} ${formData.lastName}` || "Modifier la fiche" : "Ajouter un membre"}
              </h2>
              <p className="text-xs text-zinc-400">
                {isEdit ? "Fiche individuelle & liens familiaux" : "Créer un nouvel individu dans l'arbre"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Onglets de navigation dans le modal */}
        <div className="flex items-center border-b border-zinc-800 px-6 bg-zinc-950/30 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "identity"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Identité
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "events"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Dates & Lieux
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("relations")}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "relations"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Relations ({formData.parentIds.length + formData.spouseIds.length + formData.childrenIds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "notes"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Biographie & Notes
          </button>
        </div>

        {/* Corps du Formulaire */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: IDENTITÉ */}
          {activeTab === "identity" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ex: Jean-Luc"
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ex: DUPONT"
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nom de jeune fille / naissance
                  </label>
                  <input
                    type="text"
                    value={formData.maidenName}
                    onChange={(e) => setFormData({ ...formData, maidenName: e.target.value })}
                    placeholder="Ex: MARTIN"
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Genre / Sexe
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: "M", label: "Homme", color: "sky" },
                      { val: "F", label: "Femme", color: "pink" },
                      { val: "O", label: "Autre", color: "zinc" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: item.val })}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          formData.gender === item.val
                            ? "bg-zinc-700 border-indigo-500 text-white shadow-sm"
                            : "bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Profession / Métier
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="Ex: Instituteur, Architecte, Vigneron..."
                    className="w-full pl-10 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  URL de la photo ou portrait
                </label>
                <input
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: ÉVÉNEMENTS (NAISSANCE / DÉCÈS) */}
          {activeTab === "events" && (
            <div className="space-y-5">
              {/* Naissance */}
              <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <Calendar className="w-4 h-4" />
                  <span>Naissance</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Date de naissance
                    </label>
                    <input
                      type="text"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      placeholder="Ex: 14/07/1920 ou 1920"
                      className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Lieu de naissance
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.birthPlace}
                        onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                        placeholder="Ex: Bordeaux, Gironde"
                        className="w-full pl-8 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Décès */}
              <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                    <span>Décès</span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 font-medium">
                    <input
                      type="checkbox"
                      checked={formData.isDeceased}
                      onChange={(e) => setFormData({ ...formData, isDeceased: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-500 bg-zinc-800 border-zinc-700 focus:ring-indigo-500"
                    />
                    Personne décédée
                  </label>
                </div>

                {formData.isDeceased && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Date de décès
                      </label>
                      <input
                        type="text"
                        value={formData.deathDate}
                        onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                        placeholder="Ex: 23/11/1995"
                        className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Lieu de décès / Sépulture
                      </label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.deathPlace}
                          onChange={(e) => setFormData({ ...formData, deathPlace: e.target.value })}
                          placeholder="Ex: Paris, France"
                          className="w-full pl-8 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RELATIONS */}
          {activeTab === "relations" && (
            <div className="space-y-4">
              {/* Parents */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 mb-2">
                  <User className="w-4 h-4 text-sky-400" />
                  <span>Parents (Ascendants)</span>
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-zinc-800 rounded-xl p-2 bg-zinc-950/40">
                  {candidateMembers.length === 0 ? (
                    <p className="text-xs text-zinc-500 p-2">Aucun autre membre dans l'arbre pour le moment.</p>
                  ) : (
                    candidateMembers.map(m => (
                      <label
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/60 cursor-pointer text-xs"
                      >
                        <span className="text-zinc-200 font-medium">
                          {m.firstName} {m.lastName} {m.birthDate ? `(${m.birthDate})` : ""}
                        </span>
                        <input
                          type="checkbox"
                          checked={formData.parentIds.includes(m.id)}
                          onChange={() => toggleRelation("parentIds", m.id)}
                          className="w-4 h-4 rounded text-indigo-500 bg-zinc-800 border-zinc-700"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Conjoints */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 mb-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span>Conjoints / Partenaires</span>
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-zinc-800 rounded-xl p-2 bg-zinc-950/40">
                  {candidateMembers.length === 0 ? (
                    <p className="text-xs text-zinc-500 p-2">Aucun autre membre.</p>
                  ) : (
                    candidateMembers.map(m => (
                      <label
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/60 cursor-pointer text-xs"
                      >
                        <span className="text-zinc-200 font-medium">
                          {m.firstName} {m.lastName} {m.birthDate ? `(${m.birthDate})` : ""}
                        </span>
                        <input
                          type="checkbox"
                          checked={formData.spouseIds.includes(m.id)}
                          onChange={() => toggleRelation("spouseIds", m.id)}
                          className="w-4 h-4 rounded text-pink-500 bg-zinc-800 border-zinc-700"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Enfants */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 mb-2">
                  <Baby className="w-4 h-4 text-emerald-400" />
                  <span>Enfants (Descendants)</span>
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-zinc-800 rounded-xl p-2 bg-zinc-950/40">
                  {candidateMembers.length === 0 ? (
                    <p className="text-xs text-zinc-500 p-2">Aucun autre membre.</p>
                  ) : (
                    candidateMembers.map(m => (
                      <label
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/60 cursor-pointer text-xs"
                      >
                        <span className="text-zinc-200 font-medium">
                          {m.firstName} {m.lastName} {m.birthDate ? `(${m.birthDate})` : ""}
                        </span>
                        <input
                          type="checkbox"
                          checked={formData.childrenIds.includes(m.id)}
                          onChange={() => toggleRelation("childrenIds", m.id)}
                          className="w-4 h-4 rounded text-emerald-500 bg-zinc-800 border-zinc-700"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BIOGRAPHIE & NOTES */}
          {activeTab === "notes" && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Notes, anecdotes ou parcours de vie</span>
              </label>
              <textarea
                rows={7}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Racontez ici l'histoire, les faits marquants, anecdotes familiales ou distinctions..."
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Boutons d'action en bas */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            {isEdit ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement ${formData.firstName} ${formData.lastName} de l'arbre ?`)) {
                    onDelete(member.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
              >
                {isEdit ? "Enregistrer les modifications" : "Créer le membre"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
