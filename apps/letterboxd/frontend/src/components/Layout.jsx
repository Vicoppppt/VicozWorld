import { Link, useLocation } from "react-router-dom";
import { Globe, Film, Briefcase, FileText, Gamepad2, Landmark, Network, Zap, Newspaper, CloudSun } from "lucide-react";
import { Toaster } from "react-hot-toast";

export function Layout({ children }) {
  const location = useLocation();

  const navItems = [
    { name: "Accueil", shortName: "Accueil", path: "/", icon: Globe, active: location.pathname === "/" },
    { name: "Météo IA", shortName: "Météo", path: "/meteo", icon: CloudSun, active: location.pathname === "/meteo" },
    { name: "Actualités", shortName: "Actu", path: "/actualites", icon: Newspaper, active: location.pathname === "/actualites" },
    { name: "Cinémathèque", shortName: "Ciné", path: "/cinematheque", icon: Film, active: location.pathname === "/cinematheque" },
    { name: "Énergie", shortName: "Énergie", path: "/energie", icon: Zap, active: location.pathname === "/energie" },
    { name: "Banque", shortName: "Banque", path: "/banque", icon: Landmark, active: location.pathname === "/banque" },
    { name: "Généalogie", shortName: "Arbre", path: "/genealogie", icon: Network, active: location.pathname === "/genealogie" },
    { name: "Quiz", shortName: "Quiz", path: "/quiz", icon: Gamepad2, active: location.pathname === "/quiz" },
    { name: "Portfolio", shortName: "Folio", path: "/portfolio", icon: Briefcase, active: location.pathname === "/portfolio" },
    { name: "Notes", shortName: "Notes", path: "/notes", icon: FileText, active: location.pathname === "/notes" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
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
      <nav className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 md:gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                V
              </div>
              <span className="text-lg md:text-xl font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                VicozWorld
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex flex-1 justify-center">
              <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      item.active 
                        ? "bg-zinc-800 text-white shadow-sm" 
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Spacer for mobile to keep logo centered-ish */}
            <div className="w-8 md:hidden" />
          </div>
        </div>
      </nav>

      {/* Page Content with bottom padding for mobile tab bar */}
      <div className="flex-1 flex flex-col pb-[72px] md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800">
        <div className="flex items-stretch justify-around px-1 safe-area-pb">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] py-2 transition-colors ${
                item.active 
                  ? "text-indigo-400" 
                  : "text-zinc-500 active:text-zinc-300"
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]' : ''}`} />
              <span className={`text-[10px] font-semibold leading-tight ${item.active ? 'text-indigo-400' : ''}`}>
                {item.shortName}
              </span>
              {item.active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-500" />
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
