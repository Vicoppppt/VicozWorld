// La clé API devra être définie dans un fichier .env à la racine du projet sous le nom VITE_TMDB_API_KEY
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || "";
const BASE_URL = "https://api.themoviedb.org/3";

const options = {
  method: 'GET',
  headers: {
    accept: 'application/json'
  }
};

/**
 * Recherche ciblée (Film ou Série)
 */
export async function searchMedia(query, type = "movie") {
  if (!API_KEY) {
    console.error("Clé API TMDB manquante ! Ajoutez VITE_TMDB_API_KEY dans le fichier .env");
    return [];
  }
  
  if (type === "manga") {
    // TMDB ne gère pas les mangas, on retourne vide. Le modal gérera l'ajout manuel.
    return [];
  }
  
  try {
    const res = await fetch(`${BASE_URL}/search/${type}?query=${encodeURIComponent(query)}&api_key=${API_KEY}&language=fr-FR&page=1`, options);
    const data = await res.json();
    
    // On ajoute explicitement le media_type car l'endpoint spécifique ne le renvoie pas toujours
    return data.results.map(item => ({ ...item, media_type: type }));
  } catch (error) {
    console.error("Erreur lors de la recherche TMDB :", error);
    return [];
  }
}

/**
 * Récupère les recommandations (Tendances du jour)
 */
export async function getTrendingMedia(type = "movie") {
  if (!API_KEY) return [];
  if (type === "manga") return [];

  try {
    const res = await fetch(`${BASE_URL}/trending/${type}/day?api_key=${API_KEY}&language=fr-FR`, options);
    const data = await res.json();
    return data.results.slice(0, 6).map(item => ({ ...item, media_type: type }));
  } catch (error) {
    console.error("Erreur lors de la récupération des tendances :", error);
    return [];
  }
}

/**
 * Récupère le casting et l'équipe technique (réalisateur/créateur)
 */
export async function getMediaCredits(mediaId, mediaType) {
  if (!API_KEY) return { cast: [], crew: [] };
  if (mediaType === "manga") return { cast: [], crew: [] };
  
  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${mediaId}/credits?api_key=${API_KEY}`, options);
    return await res.json();
  } catch (error) {
    console.error("Erreur lors de la récupération des crédits :", error);
    return { cast: [], crew: [] };
  }
}

/**
 * Récupère les détails d'un média (pour avoir le nombre de saisons des séries par exemple)
 */
export async function getMediaDetails(mediaId, mediaType) {
  if (!API_KEY || mediaType === "manga") return null;
  
  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${mediaId}?api_key=${API_KEY}&language=fr-FR`, options);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération des détails :", error);
    return null;
  }
}

/**
 * Recherche une personne (acteur, réalisateur) par son nom
 */
export async function searchPerson(name) {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${BASE_URL}/search/person?query=${encodeURIComponent(name)}&api_key=${API_KEY}&language=fr-FR`, options);
    const data = await res.json();
    return data.results && data.results.length > 0 ? data.results[0] : null;
  } catch (error) {
    console.error("Erreur lors de la recherche de personne :", error);
    return null;
  }
}

/**
 * Récupère les films réalisés par une personne
 */
export async function getDirectorFilmography(personId) {
  if (!API_KEY) return [];
  try {
    const res = await fetch(`${BASE_URL}/person/${personId}/movie_credits?api_key=${API_KEY}&language=fr-FR`, options);
    const data = await res.json();
    // On garde uniquement les films où le job est "Director"
    const directedMovies = data.crew.filter(c => c.job === "Director");
    // On retire les doublons potentiels (même ID)
    const uniqueMovies = Array.from(new Map(directedMovies.map(item => [item.id, item])).values());
    
    // On trie par date de sortie la plus récente
    return uniqueMovies
      .map(item => ({ ...item, media_type: "movie" }))
      .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
  } catch (error) {
    console.error("Erreur lors de la récupération de la filmographie :", error);
    return [];
  }
}

/**
 * Récupère les détails d'une saison spécifique (casting, équipe technique)
 */
export async function getTvSeasonDetails(tvId, seasonNumber) {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}/credits?api_key=${API_KEY}`, options);
    const data = await res.json();
    return data;
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
