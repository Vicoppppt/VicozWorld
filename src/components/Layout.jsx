import { Link, useLocation } from "react-router-dom";
import { Globe, Film, Briefcase, FileText, Menu, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function Layout({ children }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Accueil", path: "/", icon: <Globe className="w-5 h-5" />, active: location.pathname === "/" },
    { name: "Cinémathèque", path: "/cinematheque", icon: <Film className="w-5 h-5" />, active: location.pathname === "/cinematheque" },
    { name: "Portfolio", path: "/portfolio", icon: <Briefcase className="w-5 h-5" />, active: location.pathname === "/portfolio", disabled: true },
    { name: "Notes", path: "/notes", icon: <FileText className="w-5 h-5" />, active: location.pathname === "/notes", disabled: true },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
      {/* Global Top Navbar */}
      <nav className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                V
              </div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                VicozWorld
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex flex-1 justify-center">
              <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                {navItems.map((item) => (
                  item.disabled ? (
                    <div 
                      key={item.name}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 cursor-not-allowed opacity-50"
                      title="Bientôt disponible"
                    >
                      {item.icon}
                      {item.name}
                    </div>
                  ) : (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        item.active 
                          ? "bg-zinc-800 text-white shadow-sm" 
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  )
                ))}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b border-zinc-800 bg-zinc-950 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                item.disabled ? (
                  <div 
                    key={item.name}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-zinc-600 opacity-50"
                  >
                    {item.icon}
                    {item.name}
                    <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                      Bientôt
                    </span>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                      item.active 
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      {children}
    </div>
  );
}
