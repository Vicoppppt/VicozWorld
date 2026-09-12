import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Globe, 
  Film, 
  Briefcase, 
  FileText, 
  Gamepad2, 
  Landmark, 
  Network, 
  Zap, 
  Newspaper, 
  CloudSun,
  ChevronDown,
  LayoutGrid,
  ExternalLink,
  Wrench,
  PenTool,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Mail,
  ShieldCheck
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useProfile } from "../context/ProfileContext";

export function Layout({ children }) {
  const { isMaman, activeProfile, openProfileSelector } = useProfile();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const mediaItems = [
    { name: "Cinémathèque", desc: "Films, séries & watchlist TMDB", path: "/cinematheque", icon: Film },
    { name: "Quiz Cinéma", desc: "Défiez vos connaissances ciné", path: "/quiz", icon: Gamepad2 },
    { name: "Portfolio", desc: "Projets & réalisations", path: "/portfolio", icon: Briefcase },
  ];

  const persoItems = [
    { name: "Banque & Finances", desc: "Soldes & comptes bancaires", path: "/banque", icon: Landmark },
    { name: "Énergie & EDF", desc: "Suivi Tempo & consommation", path: "/energie", icon: Zap },
    { name: "Carnet de Notes", desc: "Notes & pense-bêtes Markdown", path: "/notes", icon: FileText },
    { name: "Généalogie", desc: "Arbre généalogique & GEDCOM", path: "/genealogie", icon: Network },
    { name: "Sécurité & Badges", desc: "Certificats mTLS & appareils", path: "/securite", icon: ShieldCheck },
  ];

  const toolsItems = [
    { name: "Gmail Assistant IA", desc: "Tri de boîte mail & IA Gemini", href: `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8501`, icon: Mail },
    { name: "Correcteur Rédactions", desc: "IA Gemini & Barème Français", href: "/tools/correcteur_redaction.html", icon: PenTool },
    { name: "OCR & Extraction", desc: "PDF & Images vers Texte", href: "/tools/extracteur_texte.html", icon: FileText },
    { name: "Éditeur & Fusion PDF", desc: "Organiser & compresser PDF", href: "/tools/editeur_pdf.html", icon: Layers },
    { name: "PDF ➔ Tableur Excel", desc: "Conversion XLSX Pronote", href: "/tools/convertisseur_excel.html", icon: FileSpreadsheet },
  ];

  const infoItems = [
    { name: "Météo IA", desc: "Prévisions & analyse Gemini", path: "/meteo", icon: CloudSun },
    { name: "Actualités", desc: "Fil info en continu", path: "/actualites", icon: Newspaper },
  ];

  const isMediaActive = mediaItems.some(item => location.pathname === item.path);
  const isPersoActive = persoItems.some(item => location.pathname === item.path);
  const isInfoActive = infoItems.some(item => location.pathname === item.path);
  const isHomeActive = location.pathname === "/";

  // Close menus on route change or click outside
  useEffect(() => {
    setOpenMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (menuName) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const hubUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:8085` : 'http://localhost:8085';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 font-sans">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
          },
        }}
      />

      {/* Global Top Navbar */}
      <nav className="bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16" ref={menuRef}>
            
            {/* Logo VicozWorld (Redirige vers CasaOS pour Victor, et vers l'accueil pour Maman) */}
            <div className="flex items-center gap-3">
              <a
                href={isMaman ? "/" : "https://casa.vicopetit.dedyn.io/#/"}
                target={isMaman ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 group"
                title={isMaman ? "Accueil" : "Ouvrir CasaOS (https://casa.vicopetit.dedyn.io/#/)"}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white font-black shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
                  {isMaman ? "👩‍🏫" : "V"}
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight text-white group-hover:text-pink-300 transition-colors flex items-center gap-1">
                    {isMaman ? "Espace Maman" : "VicozWorld"}
                  </span>
                  {isMaman && (
                    <span className="block text-[10px] font-medium text-pink-400 -mt-1">Boîte à outils collège</span>
                  )}
                </div>
              </a>
            </div>

            {/* Desktop Structured Nav (Affiché UNIQUEMENT pour Victor) */}
            {!isMaman && (
              <div className="hidden md:flex items-center gap-1.5 bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800/60">
                
                {/* Accueil */}
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    isHomeActive
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                  }`}
                >
                  <Globe className="w-4 h-4 text-indigo-400" />
                  Accueil
                </Link>

                {/* 🎬 Cinéma & Médias (Dropdown) */}
                <div className="relative">
                  <button
                    onClick={() => toggleMenu("media")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      isMediaActive
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                    }`}
                  >
                    <Film className="w-4 h-4 text-pink-400" />
                    <span>Cinéma & Médias</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === "media" ? "rotate-180" : ""}`} />
                  </button>

                  {openMenu === "media" && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {mediaItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                            location.pathname === item.path
                              ? "bg-zinc-800/80 text-white"
                              : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                          }`}
                        >
                          <item.icon className="w-4 h-4 text-pink-400 mt-0.5" />
                          <div>
                            <div className="text-xs font-semibold">{item.name}</div>
                            <div className="text-[11px] text-zinc-400">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* 💼 Espace Privé & Perso (Dropdown) */}
                <div className="relative">
                  <button
                    onClick={() => toggleMenu("perso")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      isPersoActive
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <span>Espace Perso</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === "perso" ? "rotate-180" : ""}`} />
                  </button>

                  {openMenu === "perso" && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {persoItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                            location.pathname === item.path
                              ? "bg-zinc-800/80 text-white"
                              : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                          }`}
                        >
                          <item.icon className="w-4 h-4 text-emerald-400 mt-0.5" />
                          <div>
                            <div className="text-xs font-semibold">{item.name}</div>
                            <div className="text-[11px] text-zinc-400">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* 🛠️ Boîte à Outils (Dropdown) */}
                <div className="relative">
                  <button
                    onClick={() => toggleMenu("tools")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      openMenu === "tools"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-cyan-400" />
                    <span>Outils Web</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === "tools" ? "rotate-180" : ""}`} />
                  </button>

                  {openMenu === "tools" && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {toolsItems.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-2.5 rounded-xl text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-all group"
                        >
                          <item.icon className="w-4 h-4 text-cyan-400 mt-0.5 group-hover:scale-110 transition-transform" />
                          <div className="flex-1">
                            <div className="text-xs font-semibold flex items-center justify-between">
                              <span>{item.name}</span>
                              <ExternalLink className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[11px] text-zinc-400">{item.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* 📰 Infos & Météo (Dropdown) */}
                <div className="relative">
                  <button
                    onClick={() => toggleMenu("info")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      isInfoActive
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                    }`}
                  >
                    <CloudSun className="w-4 h-4 text-amber-400" />
                    <span>Infos & Météo</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === "info" ? "rotate-180" : ""}`} />
                  </button>

                  {openMenu === "info" && (
                    <div className="absolute top-full left-0 mt-2 w-60 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {infoItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                            location.pathname === item.path
                              ? "bg-zinc-800/80 text-white"
                              : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                          }`}
                        >
                          <item.icon className="w-4 h-4 text-amber-400 mt-0.5" />
                          <div>
                            <div className="text-xs font-semibold">{item.name}</div>
                            <div className="text-[11px] text-zinc-400">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Profil switcher & Badge */}
            <div className="flex items-center gap-2">
              <button
                onClick={openProfileSelector}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                title="Changer d'utilisateur"
              >
                <span>{isMaman ? "👩‍🏫 Maman" : "🚀 Victor"}</span>
                <span className="text-[10px] text-zinc-500">⇄</span>
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Navigation Bar (Visible uniquement pour Victor) */}
      {!isMaman && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/80">
          <div className="grid grid-cols-4 px-2 py-1 safe-area-pb">
            
            <Link
              to="/"
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                isHomeActive ? "text-indigo-400 font-semibold" : "text-zinc-400"
              }`}
            >
              <Globe className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Accueil</span>
            </Link>

            <Link
              to="/cinematheque"
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                isMediaActive ? "text-pink-400 font-semibold" : "text-zinc-400"
              }`}
            >
              <Film className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Médias</span>
            </Link>

            <Link
              to="/banque"
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                isPersoActive ? "text-emerald-400 font-semibold" : "text-zinc-400"
              }`}
            >
              <Landmark className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Perso</span>
            </Link>

            <Link
              to="/actualites"
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                isInfoActive ? "text-amber-400 font-semibold" : "text-zinc-400"
              }`}
            >
              <Newspaper className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Actualités</span>
            </Link>

          </div>
        </nav>
      )}
    </div>
  );
}

