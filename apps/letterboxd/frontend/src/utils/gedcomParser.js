/**
 * Parser et exportateur GEDCOM (5.5 / 5.5.1) optimisé pour MyHeritage et Geneanet
 */

export function parseGedcom(gedcomText) {
  if (!gedcomText || typeof gedcomText !== 'string') {
    throw new Error('Fichier GEDCOM vide ou invalide.');
  }

  const lines = gedcomText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  
  const individuals = {}; // id -> raw individual data
  const families = {};    // id -> raw family data
  
  let currentRecord = null;
  let currentContext = []; // stack of tag contexts (e.g. ['BIRT'], ['DEAT'])
  
  const cleanId = (idStr) => {
    if (!idStr) return '';
    return idStr.replace(/@/g, '').trim();
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Pattern GEDCOM : <level> [<pointer>] <tag> [<value>]
    // ou <level> <tag> [<value>]
    const match = rawLine.match(/^(\d+)\s+(@[^@]+@\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const pointer = match[2] ? match[2].trim() : null;
    const tag = match[3].toUpperCase();
    const value = match[4] ? match[4].trim() : '';

    // Record top-level (level 0)
    if (level === 0) {
      currentContext = [];
      const recordType = (tag === 'INDI' || value === 'INDI') ? 'INDI' : (tag === 'FAM' || value === 'FAM') ? 'FAM' : null;
      const recPointer = pointer || (tag.startsWith('@') ? tag : (value.startsWith('@') ? value : null));

      if (recordType === 'INDI' && recPointer) {
        const id = cleanId(recPointer);
        currentRecord = { type: 'INDI', id, raw: {} };
        individuals[id] = currentRecord;
      } else if (recordType === 'FAM' && recPointer) {
        const id = cleanId(recPointer);
        currentRecord = { type: 'FAM', id, raw: { chil: [] } };
        families[id] = currentRecord;
      } else {
        currentRecord = null;
      }
      continue;
    }

    if (!currentRecord) continue;

    // Maintain context stack based on level
    currentContext = currentContext.slice(0, level - 1);
    const parentTag = currentContext[currentContext.length - 1] || '';

    // Handle Individual records
    if (currentRecord.type === 'INDI') {
      const indi = currentRecord.raw;

      if (level === 1) {
        currentContext[0] = tag;

        if (tag === 'NAME') {
          indi.name = value;
          // Extract surname inside slashes: "Jean /DUPONT/" -> firstName="Jean", lastName="DUPONT"
          const slashMatch = value.match(/^(.*?)\s*\/(.*?)\/\s*(.*)$/);
          if (slashMatch) {
            indi.firstName = slashMatch[1].trim();
            indi.lastName = slashMatch[2].trim();
          } else {
            indi.firstName = value.trim();
            indi.lastName = '';
          }
        } else if (tag === 'SEX') {
          indi.gender = value.toUpperCase().startsWith('M') ? 'M' : value.toUpperCase().startsWith('F') ? 'F' : 'O';
        } else if (tag === 'OCCU') {
          indi.occupation = value;
        } else if (tag === 'NOTE') {
          indi.notes = (indi.notes ? indi.notes + '\n' : '') + value;
        } else if (tag === 'FAMS') {
          indi.fams = indi.fams || [];
          indi.fams.push(cleanId(value));
        } else if (tag === 'FAMC') {
          indi.famc = cleanId(value);
        } else if (tag === 'DEAT') {
          indi.isDeceased = true;
        }
      } else if (level === 2) {
        currentContext[1] = tag;

        if (parentTag === 'NAME') {
          if (tag === 'GIVN' && !indi.firstName) indi.firstName = value;
          if (tag === 'SURN' && !indi.lastName) indi.lastName = value;
          if (tag === '_MARNM') indi.maidenName = value;
        } else if (parentTag === 'BIRT') {
          if (tag === 'DATE') indi.birthDate = value;
          if (tag === 'PLAC') indi.birthPlace = value;
        } else if (parentTag === 'DEAT') {
          indi.isDeceased = true;
          if (tag === 'DATE') indi.deathDate = value;
          if (tag === 'PLAC') indi.deathPlace = value;
        } else if (parentTag === 'NOTE' && (tag === 'CONT' || tag === 'CONC')) {
          indi.notes = (indi.notes || '') + (tag === 'CONT' ? '\n' : ' ') + value;
        }
      } else if (level === 3) {
        if (parentTag === 'NOTE' && (tag === 'CONT' || tag === 'CONC')) {
          indi.notes = (indi.notes || '') + (tag === 'CONT' ? '\n' : ' ') + value;
        }
      }
    }

    // Handle Family records
    if (currentRecord.type === 'FAM') {
      const fam = currentRecord.raw;

      if (level === 1) {
        currentContext[0] = tag;
        if (tag === 'HUSB') {
          fam.husb = cleanId(value);
        } else if (tag === 'WIFE') {
          fam.wife = cleanId(value);
        } else if (tag === 'CHIL') {
          fam.chil.push(cleanId(value));
        }
      } else if (level === 2) {
        if (parentTag === 'MARR') {
          if (tag === 'DATE') fam.marrDate = value;
          if (tag === 'PLAC') fam.marrPlace = value;
        }
      }
    }
  }

  // Cross-reference data into a unified member structure
  const members = [];
  const memberMap = new Map();

  // Create base member objects
  Object.keys(individuals).forEach(id => {
    const raw = individuals[id].raw;
    
    // Auto-calculate deceased status if death date/place exists
    const isDeceased = Boolean(raw.isDeceased || raw.deathDate || raw.deathPlace);

    const member = {
      id: id,
      firstName: raw.firstName || 'Inconnu',
      lastName: raw.lastName || '',
      maidenName: raw.maidenName || '',
      gender: raw.gender || 'O',
      birthDate: raw.birthDate || '',
      birthPlace: raw.birthPlace || '',
      deathDate: raw.deathDate || '',
      deathPlace: raw.deathPlace || '',
      isDeceased: isDeceased,
      occupation: raw.occupation || '',
      notes: raw.notes || '',
      avatarUrl: '',
      parentIds: [],
      spouseIds: [],
      childrenIds: [],
      marriageDate: '',
      marriagePlace: '',
      famcId: raw.famc || null,
      famsIds: raw.fams || [],
      x: 0,
      y: 0,
    };

    memberMap.set(id, member);
  });

  // Link family relationships
  Object.values(families).forEach(famRecord => {
    const fam = famRecord.raw;
    const husb = fam.husb ? memberMap.get(fam.husb) : null;
    const wife = fam.wife ? memberMap.get(fam.wife) : null;
    const children = (fam.chil || []).map(cId => memberMap.get(cId)).filter(Boolean);

    // Spouses
    if (husb && wife) {
      if (!husb.spouseIds.includes(wife.id)) husb.spouseIds.push(wife.id);
      if (!wife.spouseIds.includes(husb.id)) wife.spouseIds.push(husb.id);
      if (fam.marrDate) {
        husb.marriageDate = fam.marrDate;
        wife.marriageDate = fam.marrDate;
      }
      if (fam.marrPlace) {
        husb.marriagePlace = fam.marrPlace;
        wife.marriagePlace = fam.marrPlace;
      }
    }

    // Children -> Parents
    children.forEach(child => {
      if (husb && !child.parentIds.includes(husb.id)) child.parentIds.push(husb.id);
      if (wife && !child.parentIds.includes(wife.id)) child.parentIds.push(wife.id);

      if (husb && !husb.childrenIds.includes(child.id)) husb.childrenIds.push(child.id);
      if (wife && !wife.childrenIds.includes(child.id)) wife.childrenIds.push(child.id);
    });
  });

  memberMap.forEach(member => {
    // Clean up temporary internal parsing properties
    delete member.famcId;
    delete member.famsIds;
    members.push(member);
  });

  return {
    members,
    stats: {
      totalIndividuals: members.length,
      totalFamilies: Object.keys(families).length,
    }
  };
}

/**
 * Exporte la liste des membres au format GEDCOM 5.5.1 standard
 */
export function exportToGedcom(members) {
  if (!members || !Array.isArray(members)) return '';

  let lines = [
    '0 HEAD',
    '1 SOUR VICOZWORLD_GENEALOGY',
    '2 VERS 1.0',
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
  ];

  // Map to build family unions
  const familiesMap = new Map(); // key -> { id, husb, wife, chil: [] }
  let famCounter = 1;

  const toIndiPointer = (id) => {
    const clean = String(id).replace(/@/g, '');
    return clean.startsWith('I') ? `@${clean}@` : `@I${clean}@`;
  };

  // Process individuals
  members.forEach(m => {
    const indiId = toIndiPointer(m.id);
    lines.push(`0 ${indiId} INDI`);
    
    const lastNamePart = m.lastName ? `/${m.lastName}/` : '';
    lines.push(`1 NAME ${m.firstName || ''} ${lastNamePart}`.trim());
    if (m.firstName) lines.push(`2 GIVN ${m.firstName}`);
    if (m.lastName) lines.push(`2 SURN ${m.lastName}`);
    if (m.maidenName) lines.push(`2 _MARNM ${m.maidenName}`);
    
    if (m.gender) lines.push(`1 SEX ${m.gender}`);
    
    if (m.birthDate || m.birthPlace) {
      lines.push('1 BIRT');
      if (m.birthDate) lines.push(`2 DATE ${m.birthDate}`);
      if (m.birthPlace) lines.push(`2 PLAC ${m.birthPlace}`);
    }

    if (m.isDeceased || m.deathDate || m.deathPlace) {
      lines.push('1 DEAT');
      if (m.deathDate) lines.push(`2 DATE ${m.deathDate}`);
      if (m.deathPlace) lines.push(`2 PLAC ${m.deathPlace}`);
    }

    if (m.occupation) {
      lines.push(`1 OCCU ${m.occupation}`);
    }

    if (m.notes) {
      const noteLines = m.notes.split('\n');
      lines.push(`1 NOTE ${noteLines[0] || ''}`);
      for (let k = 1; k < noteLines.length; k++) {
        lines.push(`2 CONT ${noteLines[k]}`);
      }
    }
  });

  // Reconstruct Families
  const processedCouples = new Set();

  members.forEach(m => {
    // Spouses
    (m.spouseIds || []).forEach(sId => {
      const coupleKey = [m.id, sId].sort().join('_');
      if (!processedCouples.has(coupleKey)) {
        processedCouples.add(coupleKey);
        const famId = `@F${famCounter++}@`;
        
        const spouse = members.find(x => String(x.id) === String(sId));
        const husb = m.gender === 'M' ? m.id : (spouse?.gender === 'M' ? spouse.id : m.id);
        const wife = m.gender === 'F' ? m.id : (spouse?.gender === 'F' ? spouse.id : sId);

        // Find shared children
        const commonChildren = (m.childrenIds || []).filter(cId => 
          (spouse?.childrenIds || []).includes(cId)
        );

        familiesMap.set(famId, {
          id: famId,
          husb: husb,
          wife: wife,
          chil: commonChildren,
          marrDate: m.marriageDate || spouse?.marriageDate || '',
          marrPlace: m.marriagePlace || spouse?.marriagePlace || '',
        });
      }
    });
  });

  // Families output
  familiesMap.forEach(fam => {
    lines.push(`0 ${fam.id} FAM`);
    if (fam.husb) lines.push(`1 HUSB ${toIndiPointer(fam.husb)}`);
    if (fam.wife) lines.push(`1 WIFE ${toIndiPointer(fam.wife)}`);
    (fam.chil || []).forEach(cId => {
      lines.push(`1 CHIL ${toIndiPointer(cId)}`);
    });
    if (fam.marrDate || fam.marrPlace) {
      lines.push('1 MARR');
      if (fam.marrDate) lines.push(`2 DATE ${fam.marrDate}`);
      if (fam.marrPlace) lines.push(`2 PLAC ${fam.marrPlace}`);
    }
  });

  lines.push('0 TRLR');
  return lines.join('\n');
}

/**
 * Export au format JSON téléchargeable
 */
export function exportToJson(members) {
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    members: members,
  }, null, 2);
}
