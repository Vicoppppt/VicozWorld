export const MEDIA_TYPES = ["Tous", "Film", "Série", "Animé", "Manga"];
export const MEDIA_STATUS = ["Terminé", "En cours", "À voir", "En pause"];

export const initialMediaData = [
  {
    id: "1",
    title: "Dune: Part Two",
    type: "Film",
    cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800",
    rating: 5,
    status: "Terminé",
    currentProgress: "",
    review: "Un chef-d'œuvre visuel et narratif incroyable.",
    loggedAt: "2024-03-01T12:00:00Z",
    releaseDate: "2024-02-28",
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson"]
  },
  {
    id: "2",
    title: "Shingeki no Kyojin",
    type: "Animé",
    cover: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=800",
    rating: 5,
    status: "Terminé",
    currentProgress: "S4 Ep30",
    review: "La meilleure histoire jamais racontée.",
    loggedAt: "2023-11-05T12:00:00Z",
    releaseDate: "2013-04-07",
    director: "Tetsurō Araki",
    cast: ["Yūki Kaji", "Yui Ishikawa", "Marina Inoue"]
  },
  {
    id: "3",
    title: "Breaking Bad",
    type: "Série",
    cover: "https://images.unsplash.com/photo-1573455492815-4615df9f0862?auto=format&fit=crop&q=80&w=800",
    rating: 4,
    status: "Terminé",
    currentProgress: "",
    review: "Une descente aux enfers fascinante.",
    loggedAt: "2022-01-15T12:00:00Z",
    releaseDate: "2008-01-20",
    director: "Vince Gilligan",
    cast: ["Bryan Cranston", "Aaron Paul", "Anna Gunn"]
  },
  {
    id: "4",
    title: "Berserk",
    type: "Manga",
    cover: "https://images.unsplash.com/photo-1560934988-f58c70cb1e6a?auto=format&fit=crop&q=80&w=800",
    rating: 5,
    status: "En cours",
    currentProgress: "Tome 41",
    review: "Sombre, brutal, mais tellement poignant.",
    loggedAt: "2024-01-10T12:00:00Z",
    releaseDate: "1989-08-25",
    director: "Kentaro Miura",
    cast: ["Guts", "Griffith", "Casca"]
  },
  {
    id: "5",
    title: "Oppenheimer",
    type: "Film",
    cover: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    rating: 4,
    status: "Terminé",
    currentProgress: "",
    review: "Dense et magnifiquement réalisé.",
    loggedAt: "2023-07-25T12:00:00Z",
    releaseDate: "2023-07-19",
    director: "Christopher Nolan",
    cast: ["Cillian Murphy", "Emily Blunt", "Robert Downey Jr."]
  },
  {
    id: "6",
    title: "Severance",
    type: "Série",
    cover: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?auto=format&fit=crop&q=80&w=800",
    rating: 5,
    status: "En pause",
    currentProgress: "S1 Ep9",
    review: "Concept brillant et exécution parfaite.",
    loggedAt: "2022-04-10T12:00:00Z",
    releaseDate: "2022-02-18",
    director: "Dan Erickson",
    cast: ["Adam Scott", "Zach Cherry", "Britt Lower"]
  }
];
