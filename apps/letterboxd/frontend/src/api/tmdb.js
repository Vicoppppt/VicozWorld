const DEFAULT_KEY = "1b56c06b2e0416b656713300ca07fc81";
let cachedApiKey = import.meta.env.VITE_TMDB_API_KEY || "";
let fetchPromise = null;

export async function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch('/api/config/tmdb');
      if (res.ok) {
        const data = await res.json();
        if (data?.api_key) {
          cachedApiKey = data.api_key;
          return cachedApiKey;
        }
      }
    } catch (e) {
      console.warn("Impossible de récupérer la clé TMDB depuis le serveur:", e);
    }
    cachedApiKey = DEFAULT_KEY;
    return cachedApiKey;
  })();

  return fetchPromise;
}

const BASE_URL = "https://api.themoviedb.org/3";

const options = {
  method: 'GET',
  headers: {
    accept: 'application/json'
  }
};

/**
 * Helper : vérifie que la réponse HTTP est OK avant de parser le JSON
 */
async function fetchJson(url) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  return res.json();
}

/**
 * Recherche ciblée (Film ou Série)
 */
export async function searchMedia(query, type = "movie") {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error("Clé API TMDB manquante ! Ajoutez VITE_TMDB_API_KEY dans le fichier .env");
    return [];
  }
  
  if (type === "manga") {
    // TMDB ne gère pas les mangas, on retourne vide. Le modal gérera l'ajout manuel.
    return [];
  }
  
  try {
    const data = await fetchJson(`${BASE_URL}/search/${type}?query=${encodeURIComponent(query)}&api_key=${apiKey}&language=fr-FR&page=1`);
    // On ajoute explicitement le media_type car l'endpoint spécifique ne le renvoie pas toujours
    return (data.results || []).map(item => ({ ...item, media_type: type }));
  } catch (error) {
    console.error("Erreur lors de la recherche TMDB :", error);
    return [];
  }
}

/**
 * Récupère les recommandations (Tendances du jour)
 */
export async function getTrendingMedia(type = "movie") {
  const apiKey = await getApiKey();
  if (!apiKey || type === "manga") return [];

  try {
    const data = await fetchJson(`${BASE_URL}/trending/${type}/day?api_key=${apiKey}&language=fr-FR`);
    return (data.results || []).slice(0, 6).map(item => ({ ...item, media_type: type }));
  } catch (error) {
    console.error("Erreur lors de la récupération des tendances :", error);
    return [];
  }
}

/**
 * Récupère le casting et l'équipe technique (réalisateur/créateur)
 */
export async function getMediaCredits(mediaId, mediaType) {
  const apiKey = await getApiKey();
  if (!apiKey || mediaType === "manga") return { cast: [], crew: [] };
  
  try {
    return await fetchJson(`${BASE_URL}/${mediaType}/${mediaId}/credits?api_key=${apiKey}`);
  } catch (error) {
    console.error("Erreur lors de la récupération des crédits :", error);
    return { cast: [], crew: [] };
  }
}

/**
 * Récupère les détails d'un média (pour avoir le nombre de saisons des séries par exemple)
 */
export async function getMediaDetails(mediaId, mediaType) {
  const apiKey = await getApiKey();
  if (!apiKey || mediaType === "manga") return null;
  
  try {
    return await fetchJson(`${BASE_URL}/${mediaType}/${mediaId}?api_key=${apiKey}&language=fr-FR`);
  } catch (error) {
    console.error("Erreur lors de la récupération des détails :", error);
    return null;
  }
}

/**
 * Recherche des personnes (acteurs, réalisateurs) par nom.
 * @param {string} name
 * @param {{ single?: boolean }} options - si single=true, retourne uniquement le 1er résultat
 */
export async function searchPersons(name, { single = false } = {}) {
  const apiKey = await getApiKey();
  if (!apiKey || !name) return single ? null : [];
  try {
    const data = await fetchJson(
      `${BASE_URL}/search/person?query=${encodeURIComponent(name)}&api_key=${apiKey}&language=fr-FR`
    );
    const results = data.results || [];
    return single ? (results[0] ?? null) : results;
  } catch (error) {
    console.error('Erreur lors de la recherche de personne :', error);
    return single ? null : [];
  }
}

/**
 * @deprecated Utiliser searchPersons(name, { single: true }) à la place.
 * Conservé pour rétrocompatibilité.
 */
export const searchPerson = (name) => searchPersons(name, { single: true });

/**
 * Récupère les films réalisés par une personne
 */
export async function getDirectorFilmography(personId) {
  const apiKey = await getApiKey();
  if (!apiKey) return [];
  try {
    const data = await fetchJson(`${BASE_URL}/person/${personId}/movie_credits?api_key=${apiKey}&language=fr-FR`);
    // On garde uniquement les films où le job est "Director"
    const directedMovies = (data.crew || []).filter(c => c.job === "Director");
    // On retire les doublons potentiels (même ID)
    const uniqueMovies = Array.from(new Map(directedMovies.map(item => [item.id, item])).values());
    
    // On trie par date de sortie la plus récente
    return uniqueMovies
      .map(item => ({ ...item, media_type: "movie" }))
      .sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
  } catch (error) {
    console.error("Erreur lors de la récupération de la filmographie :", error);
    return [];
  }
}

/**
 * Récupère les films joués par un acteur
 */
export async function getActorFilmography(personId) {
  const apiKey = await getApiKey();
  if (!apiKey) return [];
  try {
    const data = await fetchJson(`${BASE_URL}/person/${personId}/movie_credits?api_key=${apiKey}&language=fr-FR`);
    // On garde uniquement les films où l'acteur a joué (cast)
    const actedMovies = data.cast || [];
    // On retire les doublons potentiels (même ID)
    const uniqueMovies = Array.from(new Map(actedMovies.map(item => [item.id, item])).values());
    
    // On trie par date de sortie la plus récente
    return uniqueMovies
      .map(item => ({ ...item, media_type: "movie" }))
      .sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
  } catch (error) {
    console.error("Erreur lors de la récupération de la filmographie acteur :", error);
    return [];
  }
}

/**
 * Récupère les détails d'une saison spécifique (casting, équipe technique)
 */
export async function getTvSeasonDetails(tvId, seasonNumber) {
  const apiKey = await getApiKey();
  if (!apiKey) return null;
  try {
    return await fetchJson(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}/credits?api_key=${apiKey}`);
  } catch (error) {
    console.error(`Erreur lors de la récupération de la saison ${seasonNumber} :`, error);
    return null;
  }
}

/**
 * Récupère les détails complets d'une saison (épisodes, durées, etc)
 */
export async function getTvSeason(tvId, seasonNumber) {
  const apiKey = await getApiKey();
  if (!apiKey) return null;
  try {
    return await fetchJson(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=fr-FR`);
  } catch (error) {
    console.error(`Erreur lors de la récupération de la saison ${seasonNumber} :`, error);
    return null;
  }
}

/**
 * Construit l'URL complète d'une image TMDB
 */
export function getImageUrl(path, size = "w500") {
  if (!path) return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=500"; // Fallback image
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
