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

const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || "AIzaSyA5tl9yNcVeQdDlHUV0OYtE-dfCoX_OEFo";

/**
 * Recherche de Livres ou Magazines via Apple Books API (Source n°1 Ultra-HD sans quota), avec fallback Google Books et Open Library
 */
export async function searchBooksAndMagazines(query, type = "Livre") {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  // 1. Source n°1 : Apple Books (Rapide, sans quota, couvertures HD magnifiques, descriptions complètes)
  try {
    const appleResults = await searchAppleBooks(q, type);
    if (appleResults && appleResults.length > 0) {
      return appleResults;
    }
  } catch (err) {
    console.warn("Erreur Apple Books :", err);
  }

  // 2. Source n°2 : Google Books (si disponible)
  try {
    const isMag = type === "Magazine";
    const printType = isMag ? "&printType=magazines" : "&printType=books";
    const keyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}${printType}&maxResults=10&langRestrict=fr${keyParam}`;
    
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        return parseGoogleBooksItems(data.items, type);
      }
    }
  } catch (err) {
    console.warn("Google Books indisponible :", err);
  }

  // 3. Source n°3 : Open Library (Fallback libre)
  return await searchOpenLibraryBooks(q, type);
}

/**
 * Recherche sur Apple Books / iTunes Ebooks (Haute résolution, 0 quota)
 */
async function searchAppleBooks(query, defaultCategory) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=ebook&limit=12&country=FR`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) return [];

    return data.results.map(book => {
      let cover = book.artworkUrl100 || book.artworkUrl60 || "";
      if (cover) {
        cover = cover.replace(/\/\d+x\d+bb\.jpg$/i, '/1000x1000bb.jpg');
      }

      const year = book.releaseDate ? book.releaseDate.substring(0, 4) : "";
      const description = stripHtml(book.description || "");

      return {
        id: `apple_${book.trackId}`,
        title: book.trackName || book.trackCensoredName || "Livre",
        creator: book.artistName || "Auteur inconnu",
        year: year,
        releaseDate: book.releaseDate ? book.releaseDate.substring(0, 10) : "",
        cover: cover,
        category: defaultCategory,
        format: defaultCategory === "Magazine" ? "Revue / Mensuel" : "Livre / Broché",
        publisher: "",
        description: description,
        source: "Apple Books"
      };
    });
  } catch (err) {
    console.warn("Erreur Apple Books :", err);
    return [];
  }
}

/**
 * Recherche sur Open Library (sans quota ni clé requise)
 */
async function searchOpenLibraryBooks(query, defaultCategory) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,first_publish_year,cover_i,isbn,publisher,number_of_pages_median`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.docs || !Array.isArray(data.docs)) return [];

    return data.docs.map(doc => {
      let cover = "";
      if (doc.cover_i) {
        cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      } else if (doc.isbn && doc.isbn.length > 0) {
        cover = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
      }

      const authors = Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "");
      const year = doc.first_publish_year ? String(doc.first_publish_year) : "";
      const publisher = Array.isArray(doc.publisher) ? doc.publisher[0] : (doc.publisher || "");

      return {
        id: `ol_${doc.key ? doc.key.replace('/works/', '') : Math.random()}`,
        title: doc.title || "Titre inconnu",
        creator: authors,
        year: year,
        releaseDate: year,
        cover: cover,
        category: defaultCategory,
        format: defaultCategory === "Magazine" ? "Revue / Mensuel" : (doc.number_of_pages_median ? `${doc.number_of_pages_median} pages` : "Livre / Broché"),
        publisher: publisher,
        description: `Ouvrage de ${authors || "auteur inconnu"} publié en ${year || "date inconnue"}${publisher ? ` par ${publisher}` : ""}.`,
        source: "Open Library"
      };
    });
  } catch (err) {
    console.warn("Erreur Open Library :", err);
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
