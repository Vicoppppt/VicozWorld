import { searchMedia } from './tmdb';
import { searchKitsuManga } from './kitsu';

/**
 * Service de recherche automatique de médias physiques pour "Ma Bibliothèque" :
 * - Livres & Magazines : Google Books API
 * - Musique (CDs & Vinyles) : iTunes Search API (avec conversion pochette HD 1200x1200px)
 * - Films (DVD, Blu-ray, 4K) : TMDB
 * - Mangas : Kitsu + Google Books
 */

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

/**
 * Recherche de Livres ou Magazines via Google Books API
 */
export async function searchBooksAndMagazines(query, type = "Livre") {
  if (!query || !query.trim()) return [];
  try {
    const isMag = type === "Magazine";
    const printType = isMag ? "&printType=magazines" : "&printType=books";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query.trim())}${printType}&maxResults=12&langRestrict=fr`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);
    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) {
      const fallbackUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query.trim())}${printType}&maxResults=12`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) return [];
      const fallbackData = await fallbackRes.json();
      if (!fallbackData.items) return [];
      return parseGoogleBooksItems(fallbackData.items, type);
    }
    return parseGoogleBooksItems(data.items, type);
  } catch (err) {
    console.warn("Erreur recherche Google Books :", err);
    return [];
  }
}

function parseGoogleBooksItems(items, defaultCategory) {
  return items.map(item => {
    const info = item.volumeInfo || {};
    let cover = "";
    if (info.imageLinks) {
      cover = info.imageLinks.extraLarge ||
              info.imageLinks.large ||
              info.imageLinks.medium ||
              info.imageLinks.thumbnail ||
              info.imageLinks.smallThumbnail || "";
      cover = cover.replace(/^http:\/\//i, 'https://');
    }

    const year = info.publishedDate ? info.publishedDate.substring(0, 4) : "";
    const authors = Array.isArray(info.authors) ? info.authors.join(", ") : (info.authors || info.publisher || "");
    const isbnObj = (info.industryIdentifiers || []).find(i => i.type === "ISBN_13" || i.type === "ISBN_10");

    return {
      id: item.id || String(Date.now() + Math.random()),
      title: info.title || "Titre inconnu",
      subtitle: info.subtitle || "",
      creator: authors,
      year: year,
      releaseDate: info.publishedDate || "",
      cover: cover,
      category: defaultCategory,
      format: defaultCategory === "Magazine" ? "Revue / Mensuel" : (info.pageCount ? `${info.pageCount} pages` : "Broché / Relié"),
      publisher: info.publisher || "",
      description: stripHtml(info.description || ""),
      pageCount: info.pageCount || null,
      isbn: isbnObj ? isbnObj.identifier : "",
      source: "Google Books"
    };
  });
}

/**
 * Recherche de Musique (CDs et Vinyles) via iTunes Search API
 */
export async function searchMusicAlbums(query, format = "CD") {
  if (!query || !query.trim()) return [];
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&entity=album&limit=15&country=FR`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map(album => {
      let cover = album.artworkUrl100 || album.artworkUrl60 || "";
      if (cover) {
        cover = cover.replace(/\/\d+x\d+bb\.jpg$/i, '/1200x1200bb.jpg');
      }

      const year = album.releaseDate ? album.releaseDate.substring(0, 4) : "";

      return {
        id: `itunes_${album.collectionId}`,
        title: album.collectionName || album.collectionCensoredName || "Album",
        creator: album.artistName || "Artiste inconnu",
        year: year,
        releaseDate: album.releaseDate ? album.releaseDate.substring(0, 10) : "",
        cover: cover,
        category: format === "Vinyle" ? "Vinyle" : "CD",
        format: format === "Vinyle" ? "Vinyle 33T (LP)" : "CD Audio",
        publisher: album.copyright || "",
        genre: album.primaryGenreName || "",
        trackCount: album.trackCount || null,
        description: `Album ${album.primaryGenreName || ""} de ${album.artistName || ""}, ${album.trackCount || "?"} titres (${year}).`,
        source: "Apple Music / iTunes"
      };
    });
  } catch (err) {
    console.warn("Erreur recherche Musique iTunes :", err);
    return [];
  }
}

/**
 * Recherche de Films physiques (DVD, Blu-ray, 4K Ultra HD) via TMDB
 */
export async function searchMoviesForPhysical(query, defaultFormat = "Blu-ray 4K") {
  if (!query || !query.trim()) return [];
  try {
    const results = await searchMedia(query.trim(), "movie");
    return results.map(item => {
      const year = item.release_date ? item.release_date.substring(0, 4) : "";
      const poster = item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : "";

      return {
        id: `tmdb_${item.id}`,
        title: item.title || item.original_title || "Film",
        creator: "",
        year: year,
        releaseDate: item.release_date || "",
        cover: poster,
        category: "Film",
        format: defaultFormat,
        description: item.overview || "",
        tmdbRating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
        tmdbId: item.id,
        source: "TMDB"
      };
    });
  } catch (err) {
    console.warn("Erreur recherche Film TMDB :", err);
    return [];
  }
}

/**
 * Recherche de Mangas physiques via Kitsu + fallback Google Books
 */
export async function searchMangasForPhysical(query) {
  if (!query || !query.trim()) return [];
  try {
    const kitsuResults = await searchKitsuManga(query.trim());
    if (kitsuResults && kitsuResults.length > 0) {
      return kitsuResults.map(item => {
        const year = item.release_date ? item.release_date.substring(0, 4) : "";
        return {
          id: `kitsu_${item.id}`,
          title: item.title || "Manga",
          creator: "",
          year: year,
          releaseDate: item.release_date || "",
          cover: item.poster_path || "",
          category: "Manga",
          format: item.details?.volumeCount ? `Série (${item.details.volumeCount} tomes)` : "Tome Manga",
          description: "",
          source: "Kitsu"
        };
      });
    }
    return await searchBooksAndMagazines(query, "Manga");
  } catch (err) {
    console.warn("Erreur recherche Mangas :", err);
    return await searchBooksAndMagazines(query, "Manga");
  }
}

/**
 * Fonction universelle de recherche automatique
 */
export async function searchLibraryUniversal(query, category = "Tous") {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  switch (category) {
    case "Livre":
      return await searchBooksAndMagazines(q, "Livre");
    
    case "Magazine":
      return await searchBooksAndMagazines(q, "Magazine");

    case "CD":
      return await searchMusicAlbums(q, "CD");

    case "Vinyle":
      return await searchMusicAlbums(q, "Vinyle");

    case "Film":
    case "Blu-ray / 4K":
      return await searchMoviesForPhysical(q, "Blu-ray 4K");

    case "Manga":
      return await searchMangasForPhysical(q);

    case "Tous":
    default: {
      const [movies, music, books, mangas] = await Promise.all([
        searchMoviesForPhysical(q, "Blu-ray 4K").catch(() => []),
        searchMusicAlbums(q, "CD").catch(() => []),
        searchBooksAndMagazines(q, "Livre").catch(() => []),
        searchMangasForPhysical(q).catch(() => [])
      ]);
      return [...movies.slice(0, 4), ...music.slice(0, 4), ...books.slice(0, 4), ...mangas.slice(0, 3)];
    }
  }
}
