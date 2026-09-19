const API_BASE = '/api';


const LOCAL_MEDIAS_KEY = 'vicoz_medias';
const LOCAL_NOTES_KEY = 'vicoz_notes';
const LOCAL_GENEALOGY_KEY = 'vicoz_genealogy_members';
const LOCAL_LIBRARY_KEY = 'vicoz_library_items';

// --- BIBLIOTHÈQUE MULTI-MÉDIAS (Livres, Mangas, CDs, Vinyles, Bluray/4K, Magazines) ---
export async function fetchLibraryItems() {
  try {
    const res = await fetch(`${API_BASE}/library`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {}
  const local = localStorage.getItem(LOCAL_LIBRARY_KEY);
  return local ? JSON.parse(local) : [];
}

export async function saveLibraryItem(item) {
  try {
    const res = await fetch(`${API_BASE}/library/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) return await res.json();
  } catch {}
  const local = localStorage.getItem(LOCAL_LIBRARY_KEY);
  let items = local ? JSON.parse(local) : [];
  const idx = items.findIndex(m => String(m.id) === String(item.id));
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(items));
  return { success: true, id: item.id };
}

export async function deleteLibraryItem(id) {
  try {
    const res = await fetch(`${API_BASE}/library/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {}
  const local = localStorage.getItem(LOCAL_LIBRARY_KEY);
  if (local) {
    let items = JSON.parse(local).filter(m => String(m.id) !== String(id));
    localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(items));
  }
  return { success: true, id };
}

// --- MÉDIAS ---
export async function fetchMedias() {
  try {
    const res = await fetch(`${API_BASE}/medias`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(LOCAL_MEDIAS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {}
  const local = localStorage.getItem(LOCAL_MEDIAS_KEY);
  return local ? JSON.parse(local) : [];
}

export async function saveMedia(media) {
  try {
    const res = await fetch(`${API_BASE}/medias/${media.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(media),
    });
    if (res.ok) return await res.json();
  } catch {}
  const local = localStorage.getItem(LOCAL_MEDIAS_KEY);
  let medias = local ? JSON.parse(local) : [];
  const idx = medias.findIndex(m => String(m.id) === String(media.id));
  if (idx >= 0) medias[idx] = media;
  else medias.push(media);
  localStorage.setItem(LOCAL_MEDIAS_KEY, JSON.stringify(medias));
  return { success: true, id: media.id };
}

export async function deleteMedia(id) {
  try {
    const res = await fetch(`${API_BASE}/medias/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {}
  const local = localStorage.getItem(LOCAL_MEDIAS_KEY);
  if (local) {
    let medias = JSON.parse(local).filter(m => String(m.id) !== String(id));
    localStorage.setItem(LOCAL_MEDIAS_KEY, JSON.stringify(medias));
  }
  return { success: true, id };
}


// --- NOTES ---
export async function fetchNotes() {
  try {
    const res = await fetch(`${API_BASE}/notes`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {}
  const local = localStorage.getItem(LOCAL_NOTES_KEY);
  return local ? JSON.parse(local) : [];
}

export async function saveNote(note) {
  try {
    const res = await fetch(`${API_BASE}/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (res.ok) return await res.json();
  } catch {}
  const local = localStorage.getItem(LOCAL_NOTES_KEY);
  let notes = local ? JSON.parse(local) : [];
  const idx = notes.findIndex(n => String(n.id) === String(note.id));
  if (idx >= 0) notes[idx] = note;
  else notes.push(note);
  localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
  return { success: true, id: note.id };
}

export async function deleteNote(id) {
  try {
    const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {}
  const local = localStorage.getItem(LOCAL_NOTES_KEY);
  if (local) {
    let notes = JSON.parse(local).filter(n => String(n.id) !== String(id));
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
  }
  return { success: true, id };
}

// --- GÉNÉALOGIE ---
export async function fetchFamilyMembers() {
  try {
    const res = await fetch(`${API_BASE}/genealogy`);
    if (!res.ok) throw new Error("API non disponible");
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(data));
      return data;
    }
    // Si l'API retourne une liste vide, vérifier si le localStorage contient des données
    const local = localStorage.getItem(LOCAL_GENEALOGY_KEY);
    const localMembers = local ? JSON.parse(local) : [];
    if (localMembers.length > 0) {
      // Synchroniser les données locales vers le backend SQLite pour ne rien perdre
      try {
        await bulkSaveFamilyMembers(localMembers, true);
      } catch (e) {
        console.warn("Échec auto-sync local vers SQLite:", e);
      }
      return localMembers;
    }
    return [];
  } catch {
    const local = localStorage.getItem(LOCAL_GENEALOGY_KEY);
    return local ? JSON.parse(local) : [];
  }
}

export async function saveFamilyMember(member) {
  // Maintenir le cache local synchronisé immédiatement
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
    let members = JSON.parse(local);
    members = members
      .filter(m => String(m.id) !== String(id))
      .map(m => ({
        ...m,
        parentIds: (m.parentIds || []).filter(pId => String(pId) !== String(id)),
        spouseIds: (m.spouseIds || []).filter(sId => String(sId) !== String(id)),
        childrenIds: (m.childrenIds || []).filter(cId => String(cId) !== String(id)),
      }));
    localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(members));
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

