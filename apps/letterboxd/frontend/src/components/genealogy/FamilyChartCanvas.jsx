import React, { useEffect, useRef, useCallback } from "react";
import fChart from "family-chart";
import "family-chart/styles/family-chart.css";
import { ZoomIn, ZoomOut, Maximize2, Sparkles, User, Heart, Plus, Edit3, Trash2 } from "lucide-react";

export function FamilyChartCanvas({
  members,
  selectedMemberId,
  onSelectMember,
  onEditMember,
  onAddRelative,
  onDeleteMember,
  canvasRef,
}) {
  const containerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Convertir les membres du projet au format attendu par family-chart
  const formatFamilyChartData = useCallback((membersList) => {
    if (!membersList || membersList.length === 0) return [];

    return membersList.map((m) => {
      const isMale = m.gender === "M";
      const isFemale = m.gender === "F";

      return {
        id: String(m.id),
        data: {
          "first name": m.firstName || "Inconnu",
          "last name": m.lastName || "",
          "maiden_name": m.maidenName || "",
          "birthday": m.birthDate || "",
          "death": m.deathDate || (m.isDeceased ? "†" : ""),
          "birth_place": m.birthPlace || "",
          "gender": isFemale ? "F" : isMale ? "M" : "M",
          "avatar": m.avatarUrl || "",
          "occupation": m.occupation || "",
          "notes": m.notes || "",
          "isDeceased": Boolean(m.isDeceased || m.deathDate),
        },
        rels: {
          parents: (m.parentIds || []).map(String),
          spouses: (m.spouseIds || []).map(String),
          children: (m.childrenIds || []).map(String),
        },
      };
    });
  }, []);

  // Initialiser et monter le graphique D3 family-chart
  useEffect(() => {
    if (!containerRef.current || !members || members.length === 0) return;

    const chartCont = containerRef.current;
    chartCont.innerHTML = ""; // Vider le conteneur précédent

    try {
      const f3Data = formatFamilyChartData(members);
      const defaultFocusId = selectedMemberId ? String(selectedMemberId) : String(members[0].id);

      // Créer l'instance du graphique (attention, createChart vide le conteneur)
      const f3Chart = fChart.createChart(chartCont, f3Data)
        .setTransitionTime(600)
        .setCardXSpacing(250)
        .setCardYSpacing(150)
        .setAncestryDepth(3)
        .setProgenyDepth(3)
        .setShowSiblingsOfMain(true)
        .setSingleParentEmptyCard(false);

      // Préparer le conteneur pour le rendu HTML APRÈS createChart
      const f3Canvas = chartCont.querySelector('#f3Canvas') || chartCont;
      const existingHtmlSvg = f3Canvas.querySelector('#htmlSvg');
      if (!existingHtmlSvg) {
        const htmlDiv = document.createElement("div");
        htmlDiv.id = "htmlSvg";
        htmlDiv.style.position = "absolute";
        htmlDiv.style.width = "100%";
        htmlDiv.style.height = "100%";
        htmlDiv.style.top = "0";
        htmlDiv.style.left = "0";
        htmlDiv.style.pointerEvents = "none";
        f3Canvas.appendChild(htmlDiv);
      }

      // Personnalisation des cartes avec HTML et Tailwind
      const f3Card = f3Chart.setCardHtml()
        .setCardInnerHtmlCreator((d) => {
          const myData = d.data.data || {};
          const isMale = myData.gender === "M" || myData.gender === "male";
          const isFemale = myData.gender === "F" || myData.gender === "female";
          const isMain = d.data.kinship === "self";

          const firstName = myData["first name"] || "";
          const lastName = myData["last name"] || "";
          const maidenName = myData.maiden_name;
          const birthday = myData.birthday || "";
          const death = myData.death || "";
          const dates = death ? `${birthday} - ${death}` : (birthday ? `${birthday} - Présent` : "");
          const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";

          const genderBorder = isMain
            ? "border-indigo-500 ring-2 ring-indigo-500/70 shadow-xl shadow-indigo-500/25 bg-zinc-900"
            : isMale
            ? "border-sky-500/40 hover:border-sky-400 bg-zinc-900/95"
            : isFemale
            ? "border-pink-500/40 hover:border-pink-400 bg-zinc-900/95"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/95";

          const avatarBg = isMale
            ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
            : isFemale
            ? "bg-pink-500/15 text-pink-400 border-pink-500/30"
            : "bg-zinc-800 text-zinc-400 border-zinc-700";

          return `
            <div class="f3-custom-card ${genderBorder}" style="width: 204px; height: 74px; padding: 7px 10px; border-radius: 14px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; backdrop-filter: blur(8px); cursor: pointer; transition: transform 0.15s, border-color 0.15s; border-width: 1.5px; border-style: solid; pointer-events: auto;">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                <div style="width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0; border: 1px solid;" class="${avatarBg}">
                  ${initials}
                </div>
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                    <div style="font-weight: 700; color: #f4f4f5; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">
                      ${firstName}
                    </div>
                    ${isMain ? '<span style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 999px; padding: 1px 5px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Centre</span>' : ''}
                  </div>
                  <div style="font-weight: 900; color: #d4d4d8; font-size: 11px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">
                    ${lastName} ${maidenName ? `<span style="font-size: 9.5px; font-style: italic; color: #a1a1aa; font-weight: normal;">(${maidenName})</span>` : ''}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(39, 39, 42, 0.8); padding-top: 3px; font-size: 10px; color: #a1a1aa;">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dates || "..."}</span>
                <span style="color: #71717a; font-size: 9px;">Cliquez pour pivoter</span>
              </div>
            </div>
          `;
        });

      // Gestion du clic sur une carte (Pivoter l'arbre + Ouvrir le panneau)
      f3Card.onCardClick = (e, d) => {
        const clickedMember = members.find((m) => String(m.id) === String(d.data.id));
        if (clickedMember) {
          onSelectMember(clickedMember);
          // Pivoter l'arbre avec une animation D3 fluide !
          f3Chart.updateMainId(String(d.data.id));
          f3Chart.updateTree({ initial: false });
        }
      };

      // Définir la personne centrale et lancer le rendu final
      f3Chart.updateMainId(defaultFocusId);
      f3Chart.updateTree({ initial: true });
      chartInstanceRef.current = f3Chart;

    } catch (err) {
      console.error("Erreur initialisation family-chart:", err);
    }
  }, [members, formatFamilyChartData, onSelectMember]);

  // Centrer sur un membre ou recentrer
  const centerTree = useCallback(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.updateTree({ initial: false, tree_position: "fit" });
    }
  }, []);

  const centerOnMember = useCallback((memberId) => {
    if (chartInstanceRef.current) {
      const f3Data = formatFamilyChartData(members);
      chartInstanceRef.current.updateMainId(String(memberId));
      chartInstanceRef.current.updateTree({ initial: false });
    }
  }, [members, formatFamilyChartData]);

  // Exposer les méthodes via canvasRef
  useEffect(() => {
    if (canvasRef) {
      canvasRef.current = {
        centerTree,
        centerOnMember,
      };
    }
  }, [canvasRef, centerTree, centerOnMember]);

  // Sélection de la personne active pour le panneau de détails
  const selectedMember = members.find((m) => String(m.id) === String(selectedMemberId));

  return (
    <div className="w-full h-full relative" style={{ minHeight: "calc(100vh - 150px)" }}>
      {/* Conteneur principal pour le canvas family-chart */}
      <div 
        ref={containerRef} 
        className="f3 f3-cont absolute inset-0 w-full h-full flex-1"
        style={{
          backgroundColor: "#09090b",
          backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Panneau contextuel d'actions rapides pour la personne sélectionnée */}
      {selectedMember && (
        <div className="absolute top-4 left-4 z-20 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-3.5 shadow-2xl flex items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xs">
              {`${(selectedMember.firstName || "?")[0]}${(selectedMember.lastName || "")[0]}`.toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 leading-tight">
                {selectedMember.firstName} {selectedMember.lastName}
              </div>
              <div className="text-[10px] text-zinc-400">
                {selectedMember.birthDate || "?"} - {selectedMember.deathDate || (selectedMember.isDeceased ? "†" : "Présent")}
              </div>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-zinc-800 mx-1" />

          {/* Raccourcis d'actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onAddRelative(selectedMember, "parent")}
              title="Ajouter un parent"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Parent</span>
            </button>
            <button
              onClick={() => onAddRelative(selectedMember, "spouse")}
              title="Ajouter un conjoint"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs font-semibold transition-colors"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Conjoint</span>
            </button>
            <button
              onClick={() => onAddRelative(selectedMember, "child")}
              title="Ajouter un enfant"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enfant</span>
            </button>
            <button
              onClick={() => onEditMember(selectedMember)}
              title="Modifier la fiche complète"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Guide d'utilisation en bas à gauche */}
      <div className="hidden sm:flex items-center gap-2 absolute bottom-6 left-6 px-3.5 py-2 rounded-xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-xs text-zinc-400 pointer-events-none shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Cliquez sur n'importe quelle personne pour faire pivoter instantanément l'arbre sur elle !</span>
      </div>
    </div>
  );
}
