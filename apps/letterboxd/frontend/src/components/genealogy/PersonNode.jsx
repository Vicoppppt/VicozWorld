import React, { memo } from "react";
import { User, Heart, Plus, Edit3, Target, Sparkles } from "lucide-react";
import { NODE_WIDTH, NODE_HEIGHT } from "../../utils/treeLayout";

export const PersonNode = memo(function PersonNode({
  member,
  isSelected,
  isHighlighted,
  isDimmed,
  lineageRole, // 'focus', 'ancestor', 'descendant', 'spouse', 'sibling'
  onSelect,
  onEdit,
  onAddRelative,
  onSetFocus,
  onDragStart,
}) {
  // Calculer l'année ou âge concis
  const getDatesDisplay = () => {
    const extractYear = (str) => {
      if (!str) return null;
      const match = str.match(/\b(17|18|19|20)\d{2}\b/);
      return match ? match[0] : str;
    };

    const bYear = extractYear(member.birthDate) || "?";
    const dYear = extractYear(member.deathDate);

    if (member.isDeceased || dYear) {
      return `${bYear} - ${dYear || "†"}`;
    }
    return `${bYear} - Présent`;
  };

  const calculateAge = () => {
    if (!member.birthDate) return null;
    const bMatch = member.birthDate.match(/\b(17|18|19|20)\d{2}\b/);
    if (!bMatch) return null;
    const bYear = parseInt(bMatch[0], 10);

    const dMatch = (member.deathDate || "").match(/\b(17|18|19|20)\d{2}\b/);
    if (dMatch) {
      return `${parseInt(dMatch[0], 10) - bYear} ans`;
    } else if (!member.isDeceased) {
      const curYear = new Date().getFullYear();
      if (curYear - bYear <= 120) {
        return `${curYear - bYear} ans`;
      }
    }
    return null;
  };

  const datesText = getDatesDisplay();
  const ageText = calculateAge();

  const isMale = member.gender === "M";
  const isFemale = member.gender === "F";

  // Style de bordure et surbrillance selon le rôle généalogique
  let borderClass = "border-zinc-800 hover:border-zinc-600 bg-zinc-900/95";
  let roleBadge = null;

  if (lineageRole === "focus" || isSelected) {
    borderClass = "border-indigo-500 shadow-xl shadow-indigo-500/25 ring-2 ring-indigo-500/60 bg-zinc-900";
    roleBadge = (
      <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-wider border border-indigo-500/30">
        Centre
      </span>
    );
  } else if (lineageRole === "ancestor") {
    borderClass = "border-amber-500/60 shadow-md shadow-amber-500/15 bg-zinc-900/95 ring-1 ring-amber-500/30";
    roleBadge = (
      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold tracking-wider">
        Ancêtre
      </span>
    );
  } else if (lineageRole === "descendant") {
    borderClass = "border-emerald-500/60 shadow-md shadow-emerald-500/15 bg-zinc-900/95 ring-1 ring-emerald-500/30";
    roleBadge = (
      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold tracking-wider">
        Enfant
      </span>
    );
  } else if (lineageRole === "spouse") {
    borderClass = "border-pink-500/60 shadow-md shadow-pink-500/15 bg-zinc-900/95 ring-1 ring-pink-500/30";
    roleBadge = (
      <span className="px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 text-[9px] font-bold tracking-wider">
        Conjoint
      </span>
    );
  } else if (isHighlighted) {
    borderClass = "border-sky-400 ring-2 ring-sky-400/40 shadow-lg bg-zinc-900";
  } else if (isMale) {
    borderClass = "border-sky-500/30 hover:border-sky-400/70 bg-zinc-900/90";
  } else if (isFemale) {
    borderClass = "border-pink-500/30 hover:border-pink-400/70 bg-zinc-900/90";
  }

  const avatarBg = isMale
    ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
    : isFemale
    ? "bg-pink-500/15 text-pink-400 border-pink-500/30"
    : "bg-zinc-800 text-zinc-400 border-zinc-700";

  const initials = `${(member.firstName || "?")[0] || ""}${(member.lastName || "")[0] || ""}`.toUpperCase();

  const handleMouseDown = (e) => {
    if (e.target.closest("button")) return;
    onDragStart?.(e, member.id);
  };

  return (
    <div
      style={{
        width: `${NODE_WIDTH}px`,
        height: `${NODE_HEIGHT}px`,
        transform: `translate(${member.x}px, ${member.y}px)`,
        opacity: isDimmed ? 0.35 : 1,
      }}
      className={`absolute top-0 left-0 select-none cursor-move transition-all rounded-xl border ${borderClass} p-2.5 flex flex-col justify-between group backdrop-blur-md`}
      onMouseDown={handleMouseDown}
      onClick={() => onSelect(member)}
    >
      {/* Ligne 1 : Avatar + Noms + Badge Rôle */}
      <div className="flex items-center gap-2 min-w-0">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.firstName}
            className="w-8 h-8 rounded-full object-cover border border-zinc-700 shadow-inner flex-shrink-0"
          />
        ) : (
          <div
            className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-[11px] shadow-inner flex-shrink-0 ${avatarBg}`}
          >
            {initials || <User className="w-4 h-4" />}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-zinc-100 text-xs truncate leading-tight">
              {member.firstName}
            </span>
            {roleBadge}
          </div>

          <div className="flex items-center gap-1 leading-tight">
            <span className="font-black text-zinc-300 text-xs uppercase truncate">
              {member.lastName || "-"}
            </span>
            {member.maidenName && (
              <span className="text-[10px] text-zinc-400 italic truncate">
                ({member.maidenName})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ligne 2 : Dates & Boutons rapides au survol */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 mt-1">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate">
          <span className="truncate">{datesText}</span>
          {ageText && (
            <span className="px-1 py-0.2 rounded bg-zinc-800 text-[9px] font-semibold text-zinc-300 flex-shrink-0">
              {ageText}
            </span>
          )}
        </div>

        {/* Boutons d'action rapides au survol */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSetFocus && (
            <button
              title="Centrer l'arbre sur cette personne"
              onClick={(e) => {
                e.stopPropagation();
                onSetFocus(member);
              }}
              className="p-1 rounded bg-zinc-800 hover:bg-indigo-500/30 hover:text-indigo-300 text-zinc-300 transition-colors"
            >
              <Target className="w-3 h-3 text-indigo-400" />
            </button>
          )}

          <button
            title="Ajouter un parent"
            onClick={(e) => {
              e.stopPropagation();
              onAddRelative(member, "parent");
            }}
            className="p-1 rounded bg-zinc-800 hover:bg-sky-500/20 hover:text-sky-300 text-zinc-400 transition-colors"
          >
            <Plus className="w-3 h-3 text-sky-400" />
          </button>

          <button
            title="Ajouter un conjoint"
            onClick={(e) => {
              e.stopPropagation();
              onAddRelative(member, "spouse");
            }}
            className="p-1 rounded bg-zinc-800 hover:bg-pink-500/20 hover:text-pink-300 text-zinc-400 transition-colors"
          >
            <Heart className="w-3 h-3 text-pink-400" />
          </button>

          <button
            title="Ajouter un enfant"
            onClick={(e) => {
              e.stopPropagation();
              onAddRelative(member, "child");
            }}
            className="p-1 rounded bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-400 transition-colors"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
          </button>

          <button
            title="Modifier la fiche"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(member);
            }}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
});
