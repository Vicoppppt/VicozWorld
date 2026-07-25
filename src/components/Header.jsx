import { PlusCircle, Film } from "lucide-react";

export function Header({ onAddClick }) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            VicozWorld
          </h1>
        </div>
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors text-sm shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Ajouter
        </button>
      </div>
    </header>
  );
}
