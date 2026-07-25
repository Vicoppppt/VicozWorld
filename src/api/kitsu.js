const BASE_URL = "https://kitsu.io/api/edge";

/**
 * Recherche de Mangas via Kitsu API
 * @param {string} query 
 */
export async function searchKitsuManga(query) {
  try {
    const res = await fetch(`${BASE_URL}/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=10`);
    const data = await res.json();
    
    if (!data.data) return [];

    return data.data.map(item => ({
      id: item.id,
      title: item.attributes.canonicalTitle || item.attributes.titles.en || item.attributes.titles.en_jp,
      poster_path: item.attributes.posterImage?.large || item.attributes.posterImage?.original,
      release_date: item.attributes.startDate,
      vote_average: item.attributes.averageRating ? (parseFloat(item.attributes.averageRating) / 10) : 0, // Kitsu is out of 100, we want out of 10
      media_type: "manga",
      details: {
        status: item.attributes.status,
        chapterCount: item.attributes.chapterCount,
        volumeCount: item.attributes.volumeCount
      }
    }));
  } catch (error) {
    console.error("Erreur lors de la recherche Kitsu (Manga) :", error);
    return [];
  }
}

/**
 * Récupère les recommandations (Tendances du jour)
 */
export async function getKitsuTrendingManga() {
  try {
    const res = await fetch(`${BASE_URL}/trending/manga?limit=6`);
    const data = await res.json();
    
    if (!data.data) return [];

    return data.data.map(item => ({
      id: item.id,
      title: item.attributes.canonicalTitle || item.attributes.titles.en || item.attributes.titles.en_jp,
      poster_path: item.attributes.posterImage?.large || item.attributes.posterImage?.original,
      release_date: item.attributes.startDate,
      vote_average: item.attributes.averageRating ? (parseFloat(item.attributes.averageRating) / 10) : 0,
      media_type: "manga",
      details: {
        status: item.attributes.status,
        chapterCount: item.attributes.chapterCount,
        volumeCount: item.attributes.volumeCount
      }
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des tendances Kitsu (Manga) :", error);
    return [];
  }
}
