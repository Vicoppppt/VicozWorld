import React from "react";
import { X, BarChart3, Users, Heart, Award, Sparkles, TrendingUp } from "lucide-react";
import { calculateGenerations } from "../../utils/treeLayout";

export function GenealogyStatsModal({
  isOpen,
  onClose,
  members,
}) {
  if (!isOpen) return null;

  // Calculs statistiques
  const total = members.length;
  const menCount = members.filter(m => m.gender === "M").length;
  const womenCount = members.filter(m => m.gender === "F").length;
  const deceasedCount = members.filter(m => m.isDeceased || Boolean(m.deathDate)).length;
  const livingCount = total - deceasedCount;

  // Calcul des générations
  const generationsMap = calculateGenerations(members);
  const maxGen = Math.max(0, ...Array.from(generationsMap.values()));
  const totalGenerations = total > 0 ? maxGen + 1 : 0;

  // Top patronymes
  const surnameCounts = {};
  members.forEach(m => {
    const surname = (m.lastName || "").trim().toUpperCase();
    if (surname) {
      surnameCounts[surname] = (surnameCounts[surname] || 0) + 1;
    }
  });

  const topSurnames = Object.entries(surnameCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Plus anciens ancêtres (année de naissance la plus ancienne)
  const ancestorsWithYear = members
    .map(m => {
      const match = (m.birthDate || "").match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
      return {
        member: m,
        year: match ? parseInt(match[0], 10) : null,
      };
    })
    .filter(x => x.year !== null)
    .sort((a, b) => a.year - b.year);

  const oldestAncestor = ancestorsWithYear[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Statistiques de l'Arbre</h2>
              <p className="text-xs text-zinc-400">Vue d'ensemble de votre généalogie</p>
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
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Cartes clés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-2xl text-center">
              <div className="text-2xl font-black text-white">{total}</div>
              <div className="text-[11px] text-zinc-400 font-medium">Membres</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-2xl text-center">
              <div className="text-2xl font-black text-indigo-400">{totalGenerations}</div>
              <div className="text-[11px] text-zinc-400 font-medium">Générations</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-2xl text-center">
              <div className="text-2xl font-black text-sky-400">{menCount}</div>
              <div className="text-[11px] text-zinc-400 font-medium">Hommes</div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-2xl text-center">
              <div className="text-2xl font-black text-pink-400">{womenCount}</div>
              <div className="text-[11px] text-zinc-400 font-medium">Femmes</div>
            </div>
          </div>

          {/* Plus ancien ancêtre répertorié */}
          {oldestAncestor && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-amber-400/80 font-bold uppercase tracking-wider">
                  Plus ancien ancêtre daté
                </div>
                <div className="text-sm font-bold text-zinc-100 truncate">
                  {oldestAncestor.member.firstName} {oldestAncestor.member.lastName}
                </div>
                <div className="text-xs text-zinc-400">
                  Né(e) vers {oldestAncestor.year} {oldestAncestor.member.birthPlace ? `à ${oldestAncestor.member.birthPlace}` : ""}
                </div>
              </div>
            </div>
          )}

          {/* Patronymes les plus fréquents */}
          {topSurnames.length > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Noms de famille les plus fréquents</span>
              </div>

              <div className="space-y-2">
                {topSurnames.map(([surname, count], idx) => {
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={surname} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-zinc-200">
                          {idx + 1}. {surname}
                        </span>
                        <span className="text-zinc-400">
                          {count} personne{count > 1 ? "s" : ""} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Répartition Vivants / Décédés */}
          <div className="flex items-center justify-around p-3 rounded-2xl bg-zinc-950/40 border border-zinc-800 text-xs">
            <div className="text-zinc-400">
              Vivant(e)s : <span className="font-bold text-emerald-400">{livingCount}</span>
            </div>
            <div className="w-[1px] h-4 bg-zinc-800" />
            <div className="text-zinc-400">
              Mémoire & Ancêtres : <span className="font-bold text-zinc-300">{deceasedCount}</span>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-800 bg-zinc-950/30">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
