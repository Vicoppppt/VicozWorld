import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const API_BASE = '/api';

const LOCAL_MEDIAS_KEY = 'vicoz_medias';
const LOCAL_NOTES_KEY = 'vicoz_notes';
const LOCAL_GENEALOGY_KEY = 'vicoz_genealogy_members';

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

  try {
    const snapshot = await getDocs(collection(db, "medias"));
    if (!snapshot.empty) {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
      return data;
    }
  } catch (e) {
    console.warn("Firebase fetch failed", e);
  }
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
  } catch {
    try {
      await setDoc(doc(db, "medias", String(media.id)), media);
    } catch (e) {
      console.warn("Firebase save failed", e);
    }
    const local = localStorage.getItem(LOCAL_MEDIAS_KEY);
    let medias = local ? JSON.parse(local) : [];
    const idx = medias.findIndex(m => String(m.id) === String(media.id));
    if (idx >= 0) medias[idx] = media;
    else medias.push(media);
    localStorage.setItem(LOCAL_MEDIAS_KEY, JSON.stringify(medias));
  }
  return { success: true, id: media.id };
}

export async function deleteMedia(id) {
  try {
    const res = await fetch(`${API_BASE}/medias/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {
    try {
      await deleteDoc(doc(db, "medias", String(id)));
    } catch (e) {}
    const local = localStorage.getItem(LOCAL_MEDIAS_KEY);
    if (local) {
      let medias = JSON.parse(local).filter(m => String(m.id) !== String(id));
      localStorage.setItem(LOCAL_MEDIAS_KEY, JSON.stringify(medias));
    }
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

  try {
    const snapshot = await getDocs(collection(db, "notes"));
    if (!snapshot.empty) {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return data;
    }
  } catch (e) {
    console.warn("Firebase fetch failed", e);
  }
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
  } catch {
    try {
      await setDoc(doc(db, "notes", String(note.id)), note);
    } catch (e) {}
    const local = localStorage.getItem(LOCAL_NOTES_KEY);
    let notes = local ? JSON.parse(local) : [];
    const idx = notes.findIndex(n => String(n.id) === String(note.id));
    if (idx >= 0) notes[idx] = note;
    else notes.push(note);
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
  }
  return { success: true, id: note.id };
}

export async function deleteNote(id) {
  try {
    const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {
    try {
      await deleteDoc(doc(db, "notes", String(id)));
    } catch (e) {}
    const local = localStorage.getItem(LOCAL_NOTES_KEY);
    if (local) {
      let notes = JSON.parse(local).filter(n => String(n.id) !== String(id));
      localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
    }
  }
  return { success: true, id };
}

// --- GÉNÉALOGIE ---
export async function fetchFamilyMembers() {
  try {
    const res = await fetch(`${API_BASE}/genealogy`);
    if (!res.ok) throw new Error("API non disponible");
    const data = await res.json();
    localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(data));
    return data;
  } catch {
    try {
      const snapshot = await getDocs(collection(db, "genealogy"));
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      }
    } catch (e) {}
    const local = localStorage.getItem(LOCAL_GENEALOGY_KEY);
    return local ? JSON.parse(local) : [];
  }
}

export async function saveFamilyMember(member) {
  try {
    const res = await fetch(`${API_BASE}/genealogy/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    if (res.ok) return await res.json();
  } catch {
    try {
      await setDoc(doc(db, "genealogy", String(member.id)), member);
    } catch (e) {}
    const local = localStorage.getItem(LOCAL_GENEALOGY_KEY);
    let members = local ? JSON.parse(local) : [];
    const idx = members.findIndex(m => String(m.id) === String(member.id));
    if (idx >= 0) members[idx] = member;
    else members.push(member);
    localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(members));
  }
  return { success: true, id: member.id };
}

export async function deleteFamilyMember(id) {
  try {
    const res = await fetch(`${API_BASE}/genealogy/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {
    try {
      await deleteDoc(doc(db, "genealogy", String(id)));
    } catch (e) {}
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
  }
  return { success: true, id };
}

export async function bulkSaveFamilyMembers(members, replace = false) {
  try {
    const res = await fetch(`${API_BASE}/genealogy/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members, replace }),
    });
    if (res.ok) return await res.json();
  } catch {
    try {
      if (replace) {
        const snapshot = await getDocs(collection(db, "genealogy"));
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, "genealogy", docSnap.id));
        }
      }
      for (const member of members) {
        await setDoc(doc(db, "genealogy", String(member.id)), member);
      }
    } catch (e) {}
    localStorage.setItem(LOCAL_GENEALOGY_KEY, JSON.stringify(members));
  }
  return { success: true, count: members.length };
}

export async function clearFamilyTree() {
  try {
    const res = await fetch(`${API_BASE}/genealogy`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch {
    try {
      const snapshot = await getDocs(collection(db, "genealogy"));
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, "genealogy", docSnap.id));
      }
    } catch (e) {}
    localStorage.removeItem(LOCAL_GENEALOGY_KEY);
  }
  return { success: true };
}
