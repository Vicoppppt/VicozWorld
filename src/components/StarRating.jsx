import { useState } from "react";
import { Star } from "lucide-react";

export function StarRating({ rating, onChange, readonly = false, size = "w-8 h-8", className = "" }) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating > 0 ? hoverRating : rating;

  return (
    <div 
      className={`flex items-center gap-1 ${className}`} 
      onMouseLeave={() => setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((starValue) => {
        const isFull = displayRating >= starValue;
        const isHalf = displayRating === starValue - 0.5;
        
        return (
          <div key={starValue} className={`relative ${readonly ? "" : "cursor-pointer"} ${size} transition-transform hover:scale-110 duration-200`}>
            {/* Base Star (Empty) */}
            <Star className={`absolute inset-0 ${size} text-zinc-700/50 fill-zinc-800/50`} />
            
            {/* Filled Star Overlay */}
            <div 
              className="absolute inset-0 overflow-hidden text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              style={{ width: isFull ? "100%" : isHalf ? "50%" : "0%", transition: "width 0.15s ease-in-out" }}
            >
              <Star className={`${size} fill-current`} />
            </div>

            {/* Click/Hover Targets */}
            {!readonly && (
              <div className="absolute inset-0 flex z-10">
                <div 
                  className="flex-1 h-full"
                  onMouseEnter={() => setHoverRating(starValue - 0.5)}
                  onClick={() => onChange(starValue - 0.5)}
                />
                <div 
                  className="flex-1 h-full"
                  onMouseEnter={() => setHoverRating(starValue)}
                  onClick={() => onChange(starValue)}
                />
              </div>
            )}
          </div>
        );
      })}
      {!readonly && (
        <span className="ml-2 sm:ml-3 text-base sm:text-lg font-bold text-indigo-400 min-w-[28px] text-center animate-in fade-in duration-200">
          {displayRating > 0 ? displayRating : "-"}
        </span>
      )}
    </div>
  );
}
