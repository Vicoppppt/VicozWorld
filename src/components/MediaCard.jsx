import { StarRating } from "./StarRating";
import { motion } from "framer-motion";

export function MediaCard({ media, onClick }) {
  const isMultiSeason = media.type === "Série" || media.type === "Animé";

  let displayProgress = null;
  if (media && (media.status === "En cours" || media.status === "En pause")) {
    if (media.type === "Manga" && media.currentProgress) {
      displayProgress = `Ch. ${media.currentProgress}`;
    } else if (isMultiSeason && media.seasons?.length > 0) {
      for (let i = media.seasons.length - 1; i >= 0; i--) {
        const s = media.seasons[i];
        if (s.watchedEpisodes > 0) {
          if (s.watched) {
            displayProgress = `S${s.seasonNumber} ✓`;
          } else {
            displayProgress = `S${s.seasonNumber} E${s.watchedEpisodes}`;
          }
          break;
        }
      }
    }
    if (!displayProgress && media.currentProgress && typeof media.currentProgress === "string") {
      displayProgress = media.currentProgress;
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer flex flex-col h-full"
    >
      {/* Image container */}
      <div className="aspect-[2/3] relative bg-zinc-950 overflow-hidden">
        <img
          src={media.cover}
          alt={media.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80" />
        
        {/* Type Badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-wider text-zinc-300 border border-white/10">
          {media.type}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent">
          <h3 className="font-bold text-zinc-100 text-lg leading-tight line-clamp-2">{media.title}</h3>
          
          <div className="flex items-center gap-2 mt-1.5 mb-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300">
              {media.releaseDate?.substring(0, 4)}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              media.status === "Terminé" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" :
              media.status === "À voir" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20" :
              media.status === "En pause" ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" :
              "bg-blue-500/20 text-blue-400 border border-blue-500/20"
            }`}>
              {media.status}
            </span>
            {displayProgress && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700 truncate max-w-[100px]" title={displayProgress}>
                {displayProgress}
              </span>
            )}
          </div>

          {(media.type === "Film" || media.type === "Manga") && media.review && (
            <div className="mt-2 text-xs text-zinc-400 line-clamp-2 italic border-l-2 border-indigo-500/50 pl-2">
              "{media.review}"
            </div>
          )}

          {/* Calcul de la note globale */}
          {(() => {
            let displayRating = 0;
            if (media.type === "Film" || media.type === "Manga") {
              displayRating = Number(media.rating);
            } else if ((media.type === "Série" || media.type === "Animé") && media.seasons && media.seasons.length > 0) {
              const watchedSeasons = media.seasons.filter(s => s && s.watched === true && Number(s.rating) > 0);
              if (watchedSeasons.length > 0) {
                const totalRating = watchedSeasons.reduce((acc, s) => acc + Number(s.rating), 0);
                displayRating = Math.round(totalRating / watchedSeasons.length);
              }
            }

            return displayRating > 0 ? (
              <div className="flex gap-0.5 justify-end mt-2">
                <StarRating rating={displayRating} readonly size="w-3.5 h-3.5" />
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </motion.div>
  );
}
