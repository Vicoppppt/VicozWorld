import { MEDIA_TYPES, MEDIA_STATUS } from "../data/mockData";
import { Search, Plus, Clock, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FilterBar({ activeType, setActiveType, activeStatus, setActiveStatus, searchQuery, setSearchQuery, onAddClick, watchTime }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <div className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 sticky top-14 md:top-0 z-30 shadow-xl shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 md:py-4">
        
        {/* MOBILE VIEW (Ultra Compact) */}
        <div className="md:hidden space-y-2">
          {/* Row 1: Search + WatchTime + Add button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-600 shadow-inner min-h-[40px]"
              />
            </div>
            
            {watchTime && activeType !== "Manga" && (
              <div className="flex items-center gap-1 px-2.5 py-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs text-indigo-400 font-bold shrink-0 min-h-[40px]" title="Temps de visionnage">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px]">{watchTime}</span>
              </div>
            )}

            {onAddClick && (
              <button
                onClick={onAddClick}
                className="flex items-center gap-1.5 bg-indigo-600 active:bg-indigo-500 text-white px-3 py-2 rounded-xl font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 shrink-0 min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            )}
          </div>

          {/* Row 2: Category & Status Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 -mx-4 px-4">
            {MEDIA_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeType === type
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800/80 active:bg-zinc-800"
                }`}
              >
                {type}
              </button>
            ))}
            <div className="w-px h-4 bg-zinc-800 shrink-0 mx-1" />
            {MEDIA_STATUS.map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeStatus === status
                    ? "bg-zinc-200 text-zinc-950 shadow-sm"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800/80 active:bg-zinc-800"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* DESKTOP VIEW */}
        <div className="hidden md:flex items-center justify-between gap-4 xl:gap-6" ref={menuRef}>
          <div className="flex items-center gap-3">
            {/* Dropdown Type */}
            <div className="relative z-50">
              <button
                onClick={() => toggleDropdown("type")}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-zinc-950/50 border border-zinc-800/80 hover:bg-zinc-900 rounded-xl text-sm font-semibold text-zinc-100 transition-colors min-w-[120px]"
              >
                <span>{activeType}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${openDropdown === 'type' ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openDropdown === "type" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-40 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden divide-y divide-zinc-800"
                  >
                    {MEDIA_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => { setActiveType(type); setOpenDropdown(null); }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${activeType === type ? 'bg-indigo-600/20 text-indigo-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dropdown Status */}
            <div className="relative z-50">
              <button
                onClick={() => toggleDropdown("status")}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-zinc-950/50 border border-zinc-800/80 hover:bg-zinc-900 rounded-xl text-sm font-semibold text-zinc-100 transition-colors min-w-[120px]"
              >
                <span>{activeStatus}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${openDropdown === 'status' ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openDropdown === "status" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-40 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden divide-y divide-zinc-800"
                  >
                    {MEDIA_STATUS.map(status => (
                      <button
                        key={status}
                        onClick={() => { setActiveStatus(status); setOpenDropdown(null); }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${activeStatus === status ? 'bg-indigo-600/20 text-indigo-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="flex-1 max-w-md relative shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {watchTime && activeType !== "Manga" && (
              <div className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-zinc-950/50 border border-zinc-800/80 rounded-xl">
                <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="hidden lg:inline text-sm text-zinc-400">Visionnage:</span>
                <span className="text-sm font-bold text-indigo-400">{watchTime}</span>
              </div>
            )}
            {onAddClick && (
              <button
                onClick={onAddClick}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
