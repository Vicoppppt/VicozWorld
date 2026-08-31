/**
 * Moteur de disposition hiérarchique et calcul des liens pour l'Arbre Généalogique
 * Optimisé pour les grands arbres (regroupement par sous-arbres familiaux & mode focus lignée)
 */

export const NODE_WIDTH = 204;
export const NODE_HEIGHT = 74;
export const HORIZONTAL_GAP = 32;
export const SIBLING_GAP = 24;
export const SPOUSE_GAP = 16;
export const FAMILY_BRANCH_GAP = 80;
export const VERTICAL_GAP = 90;

/**
 * Extrait tous les identifiants de la lignée directe d'un membre (Ancêtres, Descendants, Conjoints, Fratrie)
 */
export function extractLineageIds(members, focusId) {
  const memberMap = new Map(members.map(m => [String(m.id), m]));
  const focus = memberMap.get(String(focusId));

  if (!focus) {
    return {
      focusId: null,
      ancestorIds: new Set(),
      descendantIds: new Set(),
      spouseIds: new Set(),
      siblingIds: new Set(),
      allLineageIds: new Set(),
    };
  }

  const ancestorIds = new Set();
  const descendantIds = new Set();
  const spouseIds = new Set((focus.spouseIds || []).map(String));
  const siblingIds = new Set();

  // 1. Remonter les ancêtres récursivement
  function collectAncestors(id, visited = new Set()) {
    if (visited.has(id)) return;
    visited.add(id);

    const m = memberMap.get(String(id));
    if (!m) return;

    (m.parentIds || []).forEach(pId => {
      const sPId = String(pId);
      ancestorIds.add(sPId);
      collectAncestors(sPId, visited);
    });
  }
  collectAncestors(String(focusId));

  // 2. Descendre les descendants récursivement
  function collectDescendants(id, visited = new Set()) {
    if (visited.has(id)) return;
    visited.add(id);

    const m = memberMap.get(String(id));
    if (!m) return;

    (m.childrenIds || []).forEach(cId => {
      const sCId = String(cId);
      descendantIds.add(sCId);
      collectDescendants(sCId, visited);
    });
  }
  collectDescendants(String(focusId));

  // 3. Trouver les frères et sœurs
  (focus.parentIds || []).forEach(pId => {
    const parent = memberMap.get(String(pId));
    if (parent) {
      (parent.childrenIds || []).forEach(cId => {
        const sCId = String(cId);
        if (sCId !== String(focusId)) {
          siblingIds.add(sCId);
        }
      });
    }
  });

  const allLineageIds = new Set([
    String(focusId),
    ...ancestorIds,
    ...descendantIds,
    ...spouseIds,
    ...siblingIds,
  ]);

  return {
    focusId: String(focusId),
    ancestorIds,
    descendantIds,
    spouseIds,
    siblingIds,
    allLineageIds,
  };
}

/**
 * Calcule la génération relative (profondeur) de chaque membre
 */
export function calculateGenerations(members) {
  const memberMap = new Map(members.map(m => [String(m.id), m]));
  const generations = new Map();

  function getDepth(id, visited = new Set()) {
    if (visited.has(id)) return 0;
    visited.add(id);

    const m = memberMap.get(id);
    if (!m || !m.parentIds || m.parentIds.length === 0) return 0;

    const validParentIds = m.parentIds.filter(pId => memberMap.has(String(pId)));
    if (validParentIds.length === 0) return 0;

    let maxParentDepth = 0;
    for (const pId of validParentIds) {
      maxParentDepth = Math.max(maxParentDepth, getDepth(String(pId), new Set(visited)));
    }
    return maxParentDepth + 1;
  }

  members.forEach(m => {
    generations.set(String(m.id), getDepth(String(m.id)));
  });

  // Harmoniser conjoints
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 5) {
    changed = false;
    iterations++;
    members.forEach(m => {
      const myGen = generations.get(String(m.id));
      (m.spouseIds || []).forEach(sId => {
        const spouseGen = generations.get(String(sId));
        if (spouseGen !== undefined && spouseGen !== myGen) {
          const maxGen = Math.max(myGen, spouseGen);
          generations.set(String(m.id), maxGen);
          generations.set(String(sId), maxGen);
          changed = true;
        }
      });
    });
  }

  return generations;
}

/**
 * ALGORITHME 1 : Disposition Hiérarchique Complète par Sous-Arbres Familiaux
 * (Parents centrés au-dessus de leurs enfants, branches séparées pour éviter les câbles croisés)
 */
export function calculateAutoLayout(members) {
  if (!members || members.length === 0) return [];

  const memberMap = new Map(members.map(m => [String(m.id), m]));
  const generations = calculateGenerations(members);

  // Identifier les racines de chaque composante connexe
  const isChildOfSomeone = new Set();
  members.forEach(m => {
    (m.childrenIds || []).forEach(cId => isChildOfSomeone.add(String(cId)));
  });

  // Regrouper par familles nucléaires
  // Chaque unité familiale = { id, parents: [m1, m2], children: [c1, c2...] }
  const visitedMembers = new Set();
  const positionedMap = new Map(); // id -> { x, y, gen }

  // Trier les membres par génération croissante
  const sortedMembers = [...members].sort((a, b) => {
    const genA = generations.get(String(a.id)) || 0;
    const genB = generations.get(String(b.id)) || 0;
    return genA - genB;
  });

  // Construire un sous-arbre descendant récursif
  function layoutSubtree(rootMember, startX, startY) {
    const rootId = String(rootMember.id);
    if (visitedMembers.has(rootId)) return { width: 0, endX: startX };

    visitedMembers.add(rootId);
    const gen = generations.get(rootId) || 0;
    const y = gen * (NODE_HEIGHT + VERTICAL_GAP);

    // Trouver son conjoint principal non encore positionné
    const spouses = (rootMember.spouseIds || [])
      .map(sId => memberMap.get(String(sId)))
      .filter(s => s && !visitedMembers.has(String(s.id)));

    spouses.forEach(s => visitedMembers.add(String(s.id)));

    // Trouver tous les enfants du couple / de cette personne
    const allChildIds = new Set(rootMember.childrenIds || []);
    spouses.forEach(s => {
      (s.childrenIds || []).forEach(cId => allChildIds.add(cId));
    });

    const children = Array.from(allChildIds)
      .map(cId => memberMap.get(String(cId)))
      .filter(Boolean);

    // Si pas d'enfants : largeur = couple ou individu
    const parentsCount = 1 + spouses.length;
    const parentsWidth = parentsCount * NODE_WIDTH + (parentsCount - 1) * SPOUSE_GAP;

    if (children.length === 0) {
      let curX = startX;
      positionedMap.set(rootId, { ...rootMember, x: curX, y, generation: gen });
      spouses.forEach(s => {
        curX += NODE_WIDTH + SPOUSE_GAP;
        positionedMap.set(String(s.id), { ...s, x: curX, y, generation: gen });
      });

      return {
        width: parentsWidth,
        endX: startX + parentsWidth,
      };
    }

    // Si des enfants existent : positionner récursivement chaque sous-arbre d'enfant
    let childrenStartX = startX;
    const childrenLayouts = [];

    children.forEach((child, idx) => {
      const childLayout = layoutSubtree(child, childrenStartX, y + NODE_HEIGHT + VERTICAL_GAP);
      childrenLayouts.push(childLayout);
      childrenStartX = childLayout.endX + SIBLING_GAP;
    });

    const totalChildrenWidth = Math.max(0, childrenStartX - startX - SIBLING_GAP);
    const familyWidth = Math.max(parentsWidth, totalChildrenWidth);

    // Centrer les parents au-dessus de leurs enfants
    const childrenMidX = startX + totalChildrenWidth / 2;
    let parentsStartX = childrenMidX - parentsWidth / 2;

    if (parentsStartX < startX) {
      parentsStartX = startX;
    }

    let curParentX = parentsStartX;
    positionedMap.set(rootId, { ...rootMember, x: curParentX, y, generation: gen });
    spouses.forEach(s => {
      curParentX += NODE_WIDTH + SPOUSE_GAP;
      positionedMap.set(String(s.id), { ...s, x: curParentX, y, generation: gen });
    });

    return {
      width: familyWidth,
      endX: startX + familyWidth,
    };
  }

  // Traiter toutes les racines principales (ancêtres les plus anciens)
  let currentTreeX = 0;
  sortedMembers.forEach(m => {
    if (!visitedMembers.has(String(m.id))) {
      // Si c'est une racine ou pas encore visité
      const result = layoutSubtree(m, currentTreeX, 0);
      currentTreeX = result.endX + FAMILY_BRANCH_GAP;
    }
  });

  // Centrer l'arbre global autour de X=0
  const allX = Array.from(positionedMap.values()).map(m => m.x);
  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 0;
  const globalMidX = (minX + maxX) / 2;

  return members.map(m => {
    const pos = positionedMap.get(String(m.id));
    if (pos) {
      return {
        ...pos,
        x: Math.round(pos.x - globalMidX),
        y: Math.round(pos.y),
      };
    }
    return { ...m, x: 0, y: 0, generation: 0 };
  });
}

/**
 * ALGORITHME 2 : Vue Focus / Lignée (Sablier)
 * Affiche uniquement la famille directe autour d'une personne centrale :
 * - Ses ancêtres en haut (arborescence montante vers les grands-parents)
 * - La personne centrale + conjoint(s) et frères/sœurs au centre
 * - Ses descendants en bas (arborescence descendante vers les enfants)
 */
export function calculateFocusLayout(members, focusId) {
  if (!members || members.length === 0) return [];
  const memberMap = new Map(members.map(m => [String(m.id), m]));
  const focus = memberMap.get(String(focusId)) || members[0];
  if (!focus) return calculateAutoLayout(members);

  const lineage = extractLineageIds(members, focus.id);
  const positionedMap = new Map();

  // 1. POSITION DU CENTRE : Le membre focus et son conjoint à Y = 0
  const spouseList = (focus.spouseIds || []).map(sId => memberMap.get(String(sId))).filter(Boolean);
  const centerCoupleWidth = (1 + spouseList.length) * NODE_WIDTH + spouseList.length * SPOUSE_GAP;
  let centerStartX = -centerCoupleWidth / 2;

  positionedMap.set(String(focus.id), {
    ...focus,
    x: centerStartX,
    y: 0,
    generation: 0,
    role: 'focus',
  });

  spouseList.forEach((spouse, idx) => {
    const sX = centerStartX + (idx + 1) * (NODE_WIDTH + SPOUSE_GAP);
    positionedMap.set(String(spouse.id), {
      ...spouse,
      x: sX,
      y: 0,
      generation: 0,
      role: 'spouse',
    });
  });

  // 2. FRÈRES ET SŒURS : Placés à gauche et à droite du centre
  const siblings = Array.from(lineage.siblingIds).map(id => memberMap.get(id)).filter(Boolean);
  let sibLeftX = centerStartX - (NODE_WIDTH + SIBLING_GAP);
  let sibRightX = centerStartX + centerCoupleWidth + SIBLING_GAP;

  siblings.forEach((sib, i) => {
    if (i % 2 === 0) {
      positionedMap.set(String(sib.id), { ...sib, x: sibLeftX, y: 0, generation: 0, role: 'sibling' });
      sibLeftX -= (NODE_WIDTH + SIBLING_GAP);
    } else {
      positionedMap.set(String(sib.id), { ...sib, x: sibRightX, y: 0, generation: 0, role: 'sibling' });
      sibRightX += (NODE_WIDTH + SIBLING_GAP);
    }
  });

  // 3. ASCENDANTS (Parents et Grands-parents vers le haut Y < 0)
  function layoutAncestorsUp(currentId, currentX, currentY, level) {
    const current = memberMap.get(String(currentId));
    if (!current || !current.parentIds || current.parentIds.length === 0) return;

    const parents = current.parentIds.map(pId => memberMap.get(String(pId))).filter(Boolean);
    if (parents.length === 0) return;

    const parentY = currentY - (NODE_HEIGHT + VERTICAL_GAP);
    const spanWidth = parents.length === 2 ? (NODE_WIDTH * 2 + SPOUSE_GAP) * Math.max(1, 2.5 / level) : NODE_WIDTH;

    if (parents.length === 2) {
      const p1X = currentX - spanWidth / 4 - NODE_WIDTH / 2;
      const p2X = currentX + spanWidth / 4 - NODE_WIDTH / 2;

      positionedMap.set(String(parents[0].id), {
        ...parents[0],
        x: Math.round(p1X),
        y: Math.round(parentY),
        generation: -level,
        role: 'ancestor',
      });
      positionedMap.set(String(parents[1].id), {
        ...parents[1],
        x: Math.round(p2X),
        y: Math.round(parentY),
        generation: -level,
        role: 'ancestor',
      });

      layoutAncestorsUp(parents[0].id, p1X + NODE_WIDTH / 2, parentY, level + 1);
      layoutAncestorsUp(parents[1].id, p2X + NODE_WIDTH / 2, parentY, level + 1);
    } else if (parents.length === 1) {
      positionedMap.set(String(parents[0].id), {
        ...parents[0],
        x: Math.round(currentX - NODE_WIDTH / 2),
        y: Math.round(parentY),
        generation: -level,
        role: 'ancestor',
      });
      layoutAncestorsUp(parents[0].id, currentX, parentY, level + 1);
    }
  }

  layoutAncestorsUp(focus.id, 0, 0, 1);

  // 4. DESCENDANTS (Enfants et Petits-enfants vers le bas Y > 0)
  function layoutDescendantsDown(parentIds, parentCenterX, parentY, level) {
    const allChildIds = new Set();
    parentIds.forEach(pId => {
      const p = memberMap.get(String(pId));
      if (p) (p.childrenIds || []).forEach(cId => allChildIds.add(String(cId)));
    });

    const children = Array.from(allChildIds).map(cId => memberMap.get(cId)).filter(Boolean);
    if (children.length === 0) return;

    const childY = parentY + (NODE_HEIGHT + VERTICAL_GAP);
    const totalChildWidth = children.length * NODE_WIDTH + (children.length - 1) * SIBLING_GAP;
    let startX = parentCenterX - totalChildWidth / 2;

    children.forEach(child => {
      positionedMap.set(String(child.id), {
        ...child,
        x: Math.round(startX),
        y: Math.round(childY),
        generation: level,
        role: 'descendant',
      });

      // Descendre aux petits-enfants
      layoutDescendantsDown([child.id, ...(child.spouseIds || [])], startX + NODE_WIDTH / 2, childY, level + 1);
      startX += NODE_WIDTH + SIBLING_GAP;
    });
  }

  layoutDescendantsDown([focus.id, ...spouseList.map(s => s.id)], 0, 0, 1);

  // Retourner uniquement les membres de la lignée positionnés
  const result = [];
  positionedMap.forEach(pos => result.push(pos));
  return result;
}

/**
 * Calcule tous les liens SVG optimisés (sans croisements sauvages)
 */
export function calculateLinks(membersWithCoords) {
  const memberMap = new Map(membersWithCoords.map(m => [String(m.id), m]));
  const marriageLinks = [];
  const parentChildLinks = [];

  const processedCouples = new Set();
  const processedFamilies = new Set();

  membersWithCoords.forEach(m => {
    // 1. Liens de couples
    (m.spouseIds || []).forEach(sId => {
      const coupleKey = [String(m.id), String(sId)].sort().join('_');
      if (!processedCouples.has(coupleKey)) {
        processedCouples.add(coupleKey);
        const spouse = memberMap.get(String(sId));
        if (spouse) {
          const isLeft = m.x < spouse.x;
          const leftNode = isLeft ? m : spouse;
          const rightNode = isLeft ? spouse : m;

          const startX = leftNode.x + NODE_WIDTH;
          const startY = leftNode.y + NODE_HEIGHT / 2;
          const endX = rightNode.x;
          const endY = rightNode.y + NODE_HEIGHT / 2;

          marriageLinks.push({
            id: `marr_${coupleKey}`,
            startX,
            startY,
            endX,
            endY,
            midX: (startX + endX) / 2,
            midY: (startY + endY) / 2,
            partner1Id: m.id,
            partner2Id: sId,
          });
        }
      }
    });

    // 2. Liens Parents -> Enfants
    const parentKey = (m.parentIds || [])
      .map(p => String(p))
      .filter(pId => memberMap.has(pId))
      .sort()
      .join('_');

    if (parentKey && !processedFamilies.has(`${parentKey}->${m.id}`)) {
      processedFamilies.add(`${parentKey}->${m.id}`);

      const parents = (m.parentIds || [])
        .map(pId => memberMap.get(String(pId)))
        .filter(Boolean);

      if (parents.length >= 2) {
        const [p1, p2] = parents;
        const coupleMidX = (p1.x + NODE_WIDTH / 2 + p2.x + NODE_WIDTH / 2) / 2;
        const coupleBottomY = Math.max(p1.y, p2.y) + NODE_HEIGHT;

        const childTopX = m.x + NODE_WIDTH / 2;
        const childTopY = m.y;
        const dropY = (coupleBottomY + childTopY) / 2;

        parentChildLinks.push({
          id: `child_${parentKey}_${m.id}`,
          path: `M ${coupleMidX} ${coupleBottomY} L ${coupleMidX} ${dropY} L ${childTopX} ${dropY} L ${childTopX} ${childTopY}`,
          childId: m.id,
          parentIds: parents.map(p => p.id),
        });
      } else if (parents.length === 1) {
        const p = parents[0];
        const parentBottomX = p.x + NODE_WIDTH / 2;
        const parentBottomY = p.y + NODE_HEIGHT;

        const childTopX = m.x + NODE_WIDTH / 2;
        const childTopY = m.y;
        const dropY = (parentBottomY + childTopY) / 2;

        parentChildLinks.push({
          id: `child_${p.id}_${m.id}`,
          path: `M ${parentBottomX} ${parentBottomY} L ${parentBottomX} ${dropY} L ${childTopX} ${dropY} L ${childTopX} ${childTopY}`,
          childId: m.id,
          parentIds: [p.id],
        });
      }
    }
  });

  return {
    marriageLinks,
    parentChildLinks,
  };
}
