import { MEDIA_TYPES, MEDIA_STATUS } from "../data/mockData";
import { Search, Plus } from "lucide-react";

export function FilterBar({ activeType, setActiveType, activeStatus, setActiveStatus, searchQuery, setSearchQuery, count, onAddClick }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-30 shadow-xl shadow-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
            {/* Filter by Type */}
            <div className="flex p-1.5 bg-zinc-950/80 border border-zinc-800/50 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
              {MEDIA_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                    activeType === type
                      ? "bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            
            {/* Filter by Status */}
            <div className="flex p-1.5 bg-zinc-950/80 border border-zinc-800/50 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
              {MEDIA_STATUS.map(status => (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                    activeStatus === status
                      ? "bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          
          {/* Barre de recherche */}
          <div className="w-full md:w-64 relative shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un film, une série..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800/80 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline-block px-4 py-2 bg-zinc-950 border border-zinc-800/80 rounded-xl text-zinc-400 text-sm font-semibold shadow-inner">
              <span className="text-zinc-100">{count}</span> {count > 1 ? "œuvres" : "œuvre"}
            </span>
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
