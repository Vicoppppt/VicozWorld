import { MapPin, Mail, Phone, GraduationCap, Code2, Briefcase, Languages, Image as ImageIcon, X } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export function Portfolio() {
  const [selectedImage, setSelectedImage] = useState(null);

  const experiences = [
    {
      period: "Juillet 2025 - Septembre 2025",
      role: "Tâches Polyvalentes",
      company: "Himmelbjerggarden - Nordisk",
      location: "Danemark",
      description: [
        "Service et restauration en salle et en tant que barista",
        "Entretiens des espaces verts et jardinage",
        "Gestion et exécution des tâches de ménages"
      ],
      color: "from-emerald-500 to-teal-400"
    },
    {
      period: "Juin 2024 - Juillet 2024",
      role: "Service Informatique (Stage)",
      company: "RDV Transports",
      location: "Marck",
      description: [
        "Approfondissement des connaissances en NodeJS et Angular",
        "Mise en service d'une plateforme de réservation",
        "Optimisation des processus de réceptions de marchandises",
        "Refonte partielle du site web d'RDV Transports"
      ],
      color: "from-indigo-500 to-blue-400"
    },
    {
      period: "Août 2023",
      role: "Service d'entretien",
      company: "Ville de Coquelles",
      location: "Service Espaces verts",
      description: [
        "Développement de l'autonomie dans la gestion quotidienne des tâches d'entretien",
        "Exécution minutieuse de l'entretien des espaces verts (taille, désherbage, plantation)",
        "Contribution à la valorisation visuelle des espaces verts communaux"
      ],
      color: "from-amber-500 to-orange-400"
    },
    {
      period: "Juillet 2022",
      role: "Documentaliste et développeur",
      company: "Médiathèque de la Ville de Coquelles",
      location: "Coquelles",
      description: [
        "Optimisation du site de gestion des adhérents",
        "Installation et configuration de postes de bureautique en libre-service",
        "Réorganisation de la médiathèque avec ajout de nouvelles catégories",
        "Organisation d'événements culturels (foire aux livres, salons de thé littéraires)"
      ],
      color: "from-rose-500 to-pink-400"
    },
    {
      period: "Juin 2021",
      role: "Assistant Production (Stage)",
      company: "Media Valley",
      location: "Paris",
      description: [
        "Découverte des étapes du processus de production audiovisuelle",
        "Assistance à la conception d'un personnage en 3D, de l'idée initiale aux premières itérations",
        "Réalisation d'une courte séquence d'animation en 2D"
      ],
      color: "from-purple-500 to-fuchsia-400"
    }
  ];

  const skills = ["Aisance à l'oral", "Travailler en équipe", "Curieux", "Adaptabilité", "Autonome", "Ponctuel"];
  const diplomas = ["Baccalauréat Général", "First Certificate of Cambridge", "Permis B"];
  const languages = [
    { name: "Français", level: "Langue maternelle" },
    { name: "Anglais", level: "Niveau B2" }
  ];

  const gallery = [
    { id: 1, url: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=80&w=800", title: "Photographie 1" },
    { id: 2, url: "https://images.unsplash.com/photo-1516802273409-68526ee1bdd6?auto=format&fit=crop&q=80&w=800", title: "Poster Design" },
    { id: 3, url: "https://images.unsplash.com/photo-1551334787-21e6bd3ab135?auto=format&fit=crop&q=80&w=800", title: "Photographie 2" },
    { id: 4, url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800", title: "Design Graphique" },
    { id: 5, url: "https://images.unsplash.com/photo-1534337623306-e13f1674fd6e?auto=format&fit=crop&q=80&w=800", title: "Photographie 3" },
    { id: 6, url: "https://images.unsplash.com/photo-1627398514808-724bbba320e8?auto=format&fit=crop&q=80&w=800", title: "Poster Film" }
  ];

  return (
    <div className="flex-1 w-full bg-zinc-950 text-zinc-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
        
        <div className="flex flex-col lg:flex-row gap-8 md:gap-12">
          
          {/* Colonne Gauche : Profil & Infos */}
          <div className="w-full lg:w-1/3 xl:w-1/4 shrink-0 space-y-8">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 md:p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full blur-3xl"></div>
              
              <h1 className="text-3xl font-black text-white leading-tight mb-2 relative z-10">
                Victor<br />
                <span className="text-indigo-400">Kuchejda--Petit</span>
              </h1>
              
              <div className="h-1 w-12 bg-indigo-500 rounded-full my-6"></div>
              
              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Téléphone</span>
                  <a href="tel:+33782131392" className="flex items-center gap-2 text-zinc-300 hover:text-indigo-400 transition-colors font-medium">
                    <Phone className="w-4 h-4 text-indigo-500" /> +33 7 82 13 13 92
                  </a>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Email</span>
                  <a href="mailto:kuchpet.vic@gmail.com" className="flex items-center gap-2 text-zinc-300 hover:text-indigo-400 transition-colors font-medium break-all">
                    <Mail className="w-4 h-4 text-indigo-500 shrink-0" /> kuchpet.vic@gmail.com
                  </a>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Adresse</span>
                  <span className="flex items-start gap-2 text-zinc-300 font-medium leading-snug">
                    <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    7B rue de la Digue,<br />59800 Lille
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Compétences */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 md:p-8"
            >
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <Code2 className="w-5 h-5 text-emerald-400" />
                Compétences
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <span key={skill} className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Diplômes */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 md:p-8"
            >
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                Diplômes
              </h2>
              <ul className="space-y-3">
                {diplomas.map(diploma => (
                  <li key={diploma} className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                    {diploma}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Langues */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 md:p-8"
            >
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <Languages className="w-5 h-5 text-rose-400" />
                Langues
              </h2>
              <div className="space-y-4">
                {languages.map(lang => (
                  <div key={lang.name}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-zinc-200">{lang.name}</span>
                      <span className="text-xs text-zinc-500 font-medium">{lang.level}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                      <div className={`h-full bg-rose-500 rounded-full ${lang.name === 'Français' ? 'w-full' : 'w-2/3'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>

          {/* Colonne Droite : Expériences */}
          <div className="w-full lg:flex-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-12"
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
                Étudiant en <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">ingénierie informatique</span>
              </h1>
              <p className="text-lg text-zinc-400 font-medium flex items-center gap-2">
                Actuellement en 1ère année de cycle ingénieur à JUNIA ISEN
              </p>
            </motion.div>

            <div className="mb-8 flex items-center gap-3">
              <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                <Briefcase className="w-6 h-6 text-zinc-300" />
              </div>
              <h2 className="text-2xl font-bold text-white">Expériences Professionnelles</h2>
            </div>

            {/* Timeline */}
            <div className="relative border-l-2 border-zinc-800/80 ml-3 sm:ml-4 md:ml-8 space-y-12 pb-12">
              {experiences.map((exp, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-6 sm:pl-8 md:pl-12"
                >
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 border-zinc-950 bg-gradient-to-br ${exp.color} shadow-lg`}></div>
                  
                  <div className="bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 sm:p-6 md:p-8 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{exp.role}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          <span className="text-indigo-300">{exp.company}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {exp.location}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-950 border border-zinc-800 text-zinc-400">
                        {exp.period}
                      </span>
                    </div>

                    <ul className="space-y-3">
                      {exp.description.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-zinc-300">
                          <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-gradient-to-br ${exp.color}`}></div>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
        
        {/* Section Galerie */}
        <div className="mt-20 pt-16 border-t border-zinc-800/80">
          <div className="mb-8 flex items-center gap-3">
            <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
              <ImageIcon className="w-6 h-6 text-zinc-300" />
            </div>
            <h2 className="text-2xl font-bold text-white">Galerie & Créations</h2>
          </div>
          <p className="text-zinc-400 mb-8 max-w-2xl">
            Un aperçu de mes photographies, designs de posters et créations graphiques. 
            (Les images actuelles sont des exemples, elles seront remplacées via CasaOS très bientôt).
          </p>
          
          {/* Grille Masonry simplifiée en CSS */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {gallery.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative group overflow-hidden rounded-2xl cursor-pointer break-inside-avoid"
                onClick={() => setSelectedImage(img)}
              >
                <img 
                  src={img.url} 
                  alt={img.title} 
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-bold">{img.title}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <button 
            className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage.url} 
            alt={selectedImage.title} 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
