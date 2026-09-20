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
  ShieldCheck,
  BookOpen,
  Library,
  Scissors,
  Maximize2
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useProfile } from "../context/ProfileContext";

export function Layout({ children }) {
  const { isMaman, isGuest, isVictor, isStrictGuest, openProfileSelector } = useProfile();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const mediaItems = [
    { name: "Cinémathèque", desc: "Films, séries & watchlist TMDB", path: "/cinematheque", icon: Film },
    { name: "Ma Bibliothèque", desc: "Livres, mangas, CDs, vinyles & bluray", path: "/bibliotheque", icon: Library },
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
    { name: "Détourage Précis IA", desc: "Suppression fond HD (RMBG)", href: "/tools/detourage_ia.html", icon: Scissors },
    { name: "Upscale & 4K IA", desc: "Super-résolution type Upscayl", href: "/tools/upscale_ia.html", icon: Maximize2 },
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

  // Mapping des titres de page pour le journal d'audit
  const PAGE_NAMES = {
    "/": "Accueil",
    "/cinematheque": "Cinémathèque",
    "/bibliotheque": "Ma Bibliothèque",
    "/quiz": "Quiz Cinéma",
    "/portfolio": "Portfolio",
    "/banque": "Banque & Finances",
    "/energie": "Énergie & EDF",
    "/notes": "Carnet de Notes",
    "/genealogie": "Généalogie",
    "/securite": "Sécurité & Badges",
    "/actualites": "Actualités",
    "/meteo": "Météo IA",
  };

  // Close menus on route change and send audit log
  useEffect(() => {
    setOpenMenu(null);
    const pageName = PAGE_NAMES[location.pathname] || location.pathname;
    fetch('/api/audit/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pageName, path: location.pathname })
    }).catch(() => {});
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
            
            {/* Logo VicozWorld (Redirige vers CasaOS pour Victor, vers / pour Invité et Maman) */}
            <div className="flex items-center gap-3">
              <a
                href={isVictor ? "https://casa.vicopetit.dedyn.io/#/" : "/"}
                target={isVictor ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 group"
                title={isVictor ? "Ouvrir CasaOS (https://casa.vicopetit.dedyn.io/#/)" : "Accueil"}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black shadow-md group-hover:scale-105 transition-transform ${
                  isGuest 
                    ? "bg-gradient-to-tr from-amber-600 to-orange-500 shadow-amber-500/20" 
                    : isMaman 
                    ? "bg-gradient-to-tr from-pink-600 to-rose-500 shadow-pink-500/20" 
                    : "bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-indigo-500/20"
                }`}>
                  {isGuest ? "🍿" : isMaman ? "👩‍🏫" : "V"}
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                    {isGuest ? "VicozWorld" : isMaman ? "Espace Maman" : "VicozWorld"}
                  </span>
                  <span className="block text-[10px] font-medium text-zinc-400 -mt-1">
                    {isGuest ? "Espace Médias & Météo" : isMaman ? "Boîte à outils collège" : "Portail Personnel"}
                  </span>
                </div>
              </a>
            </div>

            {/* Desktop Structured Nav pour Invité (Strictement Cinéma & Météo) */}
            {isGuest && (
              <div className="hidden md:flex items-center gap-1.5 bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800/60">
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    isHomeActive
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                  }`}
                >
                  <Globe className="w-4 h-4 text-amber-400" />
                  Accueil
                </Link>

                <Link
                  to="/cinematheque"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === "/cinematheque"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                  }`}
                >
                  <Film className="w-4 h-4 text-pink-400" />
                  Cinémathèque
                </Link>

                <Link
                  to="/bibliotheque"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === "/bibliotheque"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                  }`}
                >
                  <Library className="w-4 h-4 text-indigo-400" />
                  Bibliothèque
                </Link>

                <Link
                  to="/quiz"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === "/quiz"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                  }`}
                >
                  <Gamepad2 className="w-4 h-4 text-purple-400" />
                  Quiz Cinéma
                </Link>

                <Link
                  to="/meteo"
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === "/meteo"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
                  }`}
                >
                  <CloudSun className="w-4 h-4 text-cyan-400" />
                  Météo
                </Link>
              </div>
            )}

            {/* Desktop Structured Nav (Affiché UNIQUEMENT pour Victor) */}
            {isVictor && (
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
                              <ExternalLink className="w-3 3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                onClick={() => {
                  if (isStrictGuest) {
                    toast("Session Invité active (Cinéma & Météo)", { icon: "🔒" });
                    return;
                  }
                  openProfileSelector();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                title={isStrictGuest ? "Mode invité restreint" : "Changer d'utilisateur"}
              >
                <span>{isGuest ? "🎉 Invité" : isMaman ? "👩‍🏫 Maman" : "🚀 Victor"}</span>
                {!isStrictGuest && <span className="text-[10px] text-zinc-500">⇄</span>}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Navigation Bar pour Invité */}
      {isGuest && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/80">
          <div className="grid grid-cols-4 px-2 py-1 safe-area-pb">
            <Link
              to="/"
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                isHomeActive ? "text-amber-400 font-semibold" : "text-zinc-400"
              }`}
            >
              <Globe className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Accueil</span>
            </Link>

            <Link
              to="/cinematheque"
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                location.pathname === "/cinematheque" ? "text-pink-400 font-semibold" : "text-zinc-400"
              }`}
            >
              <Film className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Ciné</span>
            </Link>

            <Link
              to="/quiz"
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                location.pathname === "/quiz" ? "text-purple-400 font-semibold" : "text-zinc-400"
              }`}
            >
              <Gamepad2 className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Quiz</span>
            </Link>

            <Link
              to="/meteo"
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                location.pathname === "/meteo" ? "text-cyan-400 font-semibold" : "text-zinc-400"
              }`}
            >
              <CloudSun className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Météo</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Mobile Bottom Navigation Bar pour Victor */}
      {isVictor && (
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

