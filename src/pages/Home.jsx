import { Film, Briefcase, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Home() {
  const sections = [
    {
      title: "Cinémathèque",
      description: "Votre journal de films, séries, animés et mangas.",
      icon: <Film className="w-8 h-8 text-indigo-400" />,
      link: "/cinematheque",
      color: "from-indigo-500/20 to-purple-500/20",
      border: "hover:border-indigo-500/50",
      active: true,
    },
    {
      title: "Portfolio",
      description: "Vos projets, réalisations et parcours professionnel.",
      icon: <Briefcase className="w-8 h-8 text-emerald-400" />,
      link: "/portfolio",
      color: "from-emerald-500/20 to-teal-500/20",
      border: "hover:border-emerald-500/50",
      active: false,
    },
    {
      title: "Notes & Brouillons",
      description: "Vos idées, notes de cours et réflexions en vrac.",
      icon: <FileText className="w-8 h-8 text-amber-400" />,
      link: "/notes",
      color: "from-amber-500/20 to-orange-500/20",
      border: "hover:border-amber-500/50",
      active: true,
    }
  ];

  return (
    <div className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 tracking-tight mb-4">
          Bienvenue dans VicozWorld
        </h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          Votre espace personnel centralisé. Accédez à votre cinémathèque, gérez votre portfolio ou prenez vos notes, le tout depuis une seule et même interface.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((section, index) => (
          section.active ? (
            <Link 
              key={index}
              to={section.link}
              className={`group flex flex-col justify-between p-8 rounded-2xl bg-gradient-to-br ${section.color} bg-zinc-900/50 border border-zinc-800 ${section.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 min-h-[240px]`}
            >
              <div>
                <div className="w-16 h-16 rounded-2xl bg-zinc-950/50 flex items-center justify-center mb-6 border border-zinc-800/50 group-hover:scale-110 transition-transform duration-300">
                  {section.icon}
                </div>
                <h2 className="text-2xl font-bold text-zinc-100 mb-2">{section.title}</h2>
                <p className="text-zinc-400">{section.description}</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mt-6 group-hover:text-white transition-colors">
                Ouvrir <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ) : (
            <div 
              key={index}
              className="flex flex-col justify-between p-8 rounded-2xl bg-zinc-900/20 border border-zinc-800/50 min-h-[240px] opacity-70 cursor-not-allowed relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 px-3 py-1 bg-zinc-800/80 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-wider backdrop-blur-sm">
                Bientôt
              </div>
              <div>
                <div className="w-16 h-16 rounded-2xl bg-zinc-950/30 flex items-center justify-center mb-6 border border-zinc-800/30 grayscale">
                  {section.icon}
                </div>
                <h2 className="text-2xl font-bold text-zinc-500 mb-2">{section.title}</h2>
                <p className="text-zinc-600">{section.description}</p>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
