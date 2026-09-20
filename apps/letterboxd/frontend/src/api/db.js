const API_BASE = '/api';

/**
 * Factory CRUD générique : fetch API + fallback localStorage.
 * @param {string} endpoint - ex: '/api/medias'
 * @param {string} localKey - clé localStorage
 * @param {{ checkLength?: boolean }} options
 */
function createCrudApi(endpoint, localKey, { checkLength = true } = {}) {
  return {
    async fetchAll() {
      try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        if (res.ok) {
          const data = await res.json();
          const shouldStore = Array.isArray(data) && (!checkLength || data.length > 0);
          if (shouldStore) {
            localStorage.setItem(localKey, JSON.stringify(data));
            return data;
          }
        }
      } catch {}
      const local = localStorage.getItem(localKey);
      return local ? JSON.parse(local) : [];
    },

    async save(item) {
      try {
        const res = await fetch(`${API_BASE}${endpoint}/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) return await res.json();
      } catch {}
      const local = localStorage.getItem(localKey);
      let items = local ? JSON.parse(local) : [];
      const idx = items.findIndex(m => String(m.id) === String(item.id));
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      localStorage.setItem(localKey, JSON.stringify(items));
      return { success: true, id: item.id };
    },

    async delete(id) {
      try {
        const res = await fetch(`${API_BASE}${endpoint}/${id}`, { method: 'DELETE' });
        if (res.ok) return await res.json();
      } catch {}
      const local = localStorage.getItem(localKey);
      if (local) {
        localStorage.setItem(localKey, JSON.stringify(JSON.parse(local).filter(m => String(m.id) !== String(id))));
      }
      return { success: true, id };
    },
  };
}

// ─── Instances CRUD ────────────────────────────────────────────────────────────

const _mediaApi    = createCrudApi('/medias',       'vicoz_medias');
const _libraryApi  = createCrudApi('/library',      'vicoz_library_items', { checkLength: false });
const _notesApi    = createCrudApi('/notes',        'vicoz_notes');

// ─── Medias ───────────────────────────────────────────────────────────────────

export const fetchMedias  = () => _mediaApi.fetchAll();
export const saveMedia    = (media) => _mediaApi.save(media);
export const deleteMedia  = (id) => _mediaApi.delete(id);

// ─── Bibliothèque ─────────────────────────────────────────────────────────────

export const fetchLibraryItems  = () => _libraryApi.fetchAll();
export const saveLibraryItem    = (item) => _libraryApi.save(item);
export const deleteLibraryItem  = (id) => _libraryApi.delete(id);

// ─── Notes ───────────────────────────────────────────────────────────────────

export const fetchNotes  = () => _notesApi.fetchAll();
export const saveNote    = (note) => _notesApi.save(note);
export const deleteNote  = (id) => _notesApi.delete(id);

// ─── Généalogie (logique spécifique conservée) ─────────────────────────────────

const LOCAL_GENEALOGY_KEY = 'vicoz_genealogy_members';

export async function fetchFamilyMembers() {
  try {
    const res = await fetch(`${API_BASE}/genealogy`);
    if (!res.ok) throw new Error('API non disponible');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(data));
      return data;
    }
    // Auto-sync local → SQLite si l'API retourne vide
    const local = localStorage.getItem(LOCAL_GENEALOGY_KEY);
    const localMembers = local ? JSON.parse(local) : [];
    if (localMembers.length > 0) {
      try { await bulkSaveFamilyMembers(localMembers, true); } catch {}
      return localMembers;
    }
    return [];
  } catch {
    const local = localStorage.getItem(LOCAL_GENEALOGY_KEY);
    return local ? JSON.parse(local) : [];
  }
}

export async function saveFamilyMember(member) {
  // Mise à jour locale immédiate
  const local = localStorage.getItem(LOCAL_GENEALOGY_KEY);
  let members = local ? JSON.parse(local) : [];
  const idx = members.findIndex(m => String(m.id) === String(member.id));
  if (idx >= 0) members[idx] = member;
  else members.push(member);
  localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(members));
  try {
    const res = await fetch(`${API_BASE}/genealogy/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    if (res.ok) return await res.json();
  } catch {}
  return { success: true, id: member.id };
}

export async function deleteFamilyMember(id) {
  const local = localStorage.getItem(LOCAL_GENEALOGY_KEY);
  if (local) {
    const updated = JSON.parse(local)
      .filter(m => String(m.id) !== String(id))
      .map(m => ({
        ...m,
        parentIds:   (m.parentIds   || []).filter(pId => String(pId) !== String(id)),
        spouseIds:   (m.spouseIds   || []).filter(sId => String(sId) !== String(id)),
        childrenIds: (m.childrenIds || []).filter(cId => String(cId) !== String(id)),
      }));
    localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(updated));
  }
  try {
    const res = await fetch(`${API_BASE}/genealogy/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {}
  return { success: true, id };
}

export async function bulkSaveFamilyMembers(members, replace = false) {
  localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(members));
  try {
    const res = await fetch(`${API_BASE}/genealogy/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members, replace }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return { success: true, count: members.length };
}

export async function clearFamilyTree() {
  try {
    const res = await fetch(`${API_BASE}/genealogy`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {
    localStorage.removeItem(LOCAL_GENEALOGY_KEY);
  }
  return { success: true };
}
