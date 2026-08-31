import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { PersonNode } from "./PersonNode";
import { calculateLinks, extractLineageIds, NODE_WIDTH, NODE_HEIGHT } from "../../utils/treeLayout";
import { ZoomIn, ZoomOut, Maximize2, Sparkles, Target, Layers } from "lucide-react";

export function GenealogyCanvas({
  members,
  selectedMemberId,
  focusMemberId,
  highlightedIds = [],
  viewMode = "tree", // 'focus' | 'tree'
  onSelectMember,
  onEditMember,
  onAddRelative,
  onDeleteMember,
  onSetFocus,
  onUpdateMemberPosition,
  onAutoLayout,
  canvasRef,
}) {
  const containerRef = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.9 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // État pour le drag & drop individuel de nœuds
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Calcul de la lignée pour le membre sélectionné ou focalisé
  const activeLineage = useMemo(() => {
    const targetId = selectedMemberId || focusMemberId;
    if (!targetId) return null;
    return extractLineageIds(members, targetId);
  }, [members, selectedMemberId, focusMemberId]);

  // Centrer l'arbre dans la vue
  const centerTree = useCallback(() => {
    if (!members || members.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    members.forEach(m => {
      minX = Math.min(minX, m.x);
      maxX = Math.max(maxX, m.x + NODE_WIDTH);
      minY = Math.min(minY, m.y);
      maxY = Math.max(maxY, m.y + NODE_HEIGHT);
    });

    if (minX === Infinity) return;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;
    const centerX = minX + treeWidth / 2;
    const centerY = minY + treeHeight / 2;

    const zoom = Math.min(
      Math.max(0.25, Math.min(rect.width / (treeWidth + 120), rect.height / (treeHeight + 120))),
      1.1
    );

    setViewport({
      x: rect.width / 2 - centerX * zoom,
      y: rect.height / 2 - centerY * zoom,
      zoom: zoom,
    });
  }, [members]);

  // Centrer sur un membre spécifique
  const centerOnMember = useCallback((memberId) => {
    const member = members.find(m => String(m.id) === String(memberId));
    if (!member || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    setViewport(prev => ({
      ...prev,
      x: rect.width / 2 - (member.x + NODE_WIDTH / 2) * prev.zoom,
      y: rect.height / 2 - (member.y + NODE_HEIGHT / 2) * prev.zoom,
    }));
  }, [members]);

  // Exposer les méthodes de centrage via canvasRef
  useEffect(() => {
    if (canvasRef) {
      canvasRef.current = {
        centerTree,
        centerOnMember,
      };
    }
  }, [canvasRef, centerTree, centerOnMember]);

  // Initialisation du centrage au premier chargement ou changement de mode
  useEffect(() => {
    if (members.length > 0) {
      centerTree();
    }
  }, [viewMode, members.length === 0]);

  // Gestion du Pan
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.tagName === 'svg' || e.target.classList.contains('canvas-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    } else if (draggingNodeId) {
      const draggedMember = members.find(m => String(m.id) === String(draggingNodeId));
      if (!draggedMember || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - viewport.x) / viewport.zoom - dragOffsetRef.current.x;
      const newY = (e.clientY - rect.top - viewport.y) / viewport.zoom - dragOffsetRef.current.y;

      onUpdateMemberPosition?.(draggingNodeId, Math.round(newX), Math.round(newY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newZoom = Math.min(Math.max(0.15, viewport.zoom * zoomFactor), 2.2);

    const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
    const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);

    setViewport({
      x: newX,
      y: newY,
      zoom: newZoom,
    });
  };

  const handleNodeDragStart = (e, memberId) => {
    const member = members.find(m => String(m.id) === String(memberId));
    if (!member || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickXOnCanvas = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const clickYOnCanvas = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    dragOffsetRef.current = {
      x: clickXOnCanvas - member.x,
      y: clickYOnCanvas - member.y,
    };

    setDraggingNodeId(memberId);
  };

  // Liens SVG
  const { marriageLinks, parentChildLinks } = useMemo(() => {
    return calculateLinks(members);
  }, [members]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full flex-1 overflow-hidden bg-zinc-950 select-none cursor-grab active:cursor-grabbing canvas-background"
      style={{
        backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
        backgroundSize: `${28 * viewport.zoom}px ${28 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
    >
      {/* Canvas World */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Liens SVG */}
        <svg
          className="absolute overflow-visible top-0 left-0 w-full h-full pointer-events-none"
          style={{ width: '1px', height: '1px' }}
        >
          {/* Liens Couples */}
          {marriageLinks.map((link) => {
            const isHighlighted = activeLineage && (
              activeLineage.allLineageIds.has(String(link.partner1Id)) &&
              activeLineage.allLineageIds.has(String(link.partner2Id))
            );

            return (
              <g key={link.id}>
                <line
                  x1={link.startX}
                  y1={link.startY}
                  x2={link.endX}
                  y2={link.endY}
                  stroke={isHighlighted ? "#fb7185" : "#be123c"}
                  strokeWidth={isHighlighted ? "2.5" : "1.8"}
                  strokeDasharray={isHighlighted ? "none" : "3 2"}
                  opacity={activeLineage && !isHighlighted ? 0.2 : 0.9}
                />
                <circle
                  cx={link.midX}
                  cy={link.midY}
                  r="5"
                  fill="#881337"
                  stroke="#fb7185"
                  strokeWidth="1.2"
                  opacity={activeLineage && !isHighlighted ? 0.3 : 1}
                />
              </g>
            );
          })}

          {/* Liens Filiation Parents -> Enfants */}
          {parentChildLinks.map((link) => {
            const isChildInLineage = activeLineage?.allLineageIds.has(String(link.childId));
            const isParentInLineage = link.parentIds.some(pId => activeLineage?.allLineageIds.has(String(pId)));
            const isHighlighted = isChildInLineage && isParentInLineage;

            let strokeColor = "#4f46e5";
            if (activeLineage) {
              if (activeLineage.ancestorIds.has(String(link.childId))) {
                strokeColor = "#f59e0b"; // Ancêtres en or
              } else if (activeLineage.descendantIds.has(String(link.childId))) {
                strokeColor = "#10b981"; // Descendants en émeraude
              } else if (isHighlighted) {
                strokeColor = "#818cf8"; // Lignée directe
              }
            }

            return (
              <path
                key={link.id}
                d={link.path}
                fill="none"
                stroke={isHighlighted ? strokeColor : "#3730a3"}
                strokeWidth={isHighlighted ? "2.5" : "1.5"}
                strokeOpacity={activeLineage && !isHighlighted ? "0.15" : "0.75"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>

        {/* Nœuds Individus */}
        <div className="absolute top-0 left-0 pointer-events-auto">
          {members.map((member) => {
            const mId = String(member.id);
            let lineageRole = null;
            let isDimmed = false;

            if (activeLineage) {
              if (mId === activeLineage.focusId) {
                lineageRole = "focus";
              } else if (activeLineage.ancestorIds.has(mId)) {
                lineageRole = "ancestor";
              } else if (activeLineage.descendantIds.has(mId)) {
                lineageRole = "descendant";
              } else if (activeLineage.spouseIds.has(mId)) {
                lineageRole = "spouse";
              } else if (activeLineage.siblingIds.has(mId)) {
                lineageRole = "sibling";
              } else {
                isDimmed = true;
              }
            }

            return (
              <PersonNode
                key={member.id}
                member={member}
                isSelected={String(selectedMemberId) === mId}
                isHighlighted={highlightedIds.includes(mId)}
                isDimmed={isDimmed}
                lineageRole={lineageRole}
                onSelect={onSelectMember}
                onEdit={onEditMember}
                onAddRelative={onAddRelative}
                onSetFocus={onSetFocus}
                onDelete={onDeleteMember}
                onDragStart={handleNodeDragStart}
              />
            );
          })}
        </div>
      </div>

      {/* Barre d'outils flottante en bas à droite */}
      <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-2xl z-20">
        <button
          onClick={() => setViewport(v => ({ ...v, zoom: Math.min(2.2, v.zoom * 1.2) }))}
          title="Zoom avant"
          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewport(v => ({ ...v, zoom: Math.max(0.15, v.zoom * 0.8) }))}
          title="Zoom arrière"
          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={centerTree}
          title="Recentrer tout l'arbre"
          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-5 bg-zinc-800 mx-0.5" />
        <button
          onClick={onAutoLayout}
          title="Réorganiser automatiquement l'arbre sans chevauchement"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Auto-Layout</span>
        </button>
      </div>

      {/* Indicateur de mode et aide en bas à gauche */}
      <div className="hidden sm:flex items-center gap-2 absolute bottom-6 left-6 px-3 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-xs text-zinc-400 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>
          {viewMode === "focus"
            ? "Mode Lignée Active : Cliquez sur un membre ou l'icône 🎯 pour pivoter l'arbre"
            : "Mode Arbre Complet Hiérarchisé : Parents centrés au-dessus de leurs enfants"}
        </span>
      </div>
    </div>
  );
}
