import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Newspaper, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  Clock, 
  Sparkles,
  Layers,
  Flame,
  ChevronDown,
  ChevronUp,
  Radio,
  Zap,
  Globe2,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Actualites() {
  const [articles, setArticles] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // État du Briefing IA Gemini
  const [briefing, setBriefing] = useState(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(true);

  const SOURCE_COLORS = {
    lemonde: {
      border: 'hover:border-sky-500/50',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      heroTag: 'from-sky-600 to-indigo-600'
    },
    liberation: {
      border: 'hover:border-red-500/50',
      badge: 'bg-red-500/20 text-red-300 border-red-500/30',
      heroTag: 'from-red-600 to-rose-600'
    },
    franceinfo: {
      border: 'hover:border-amber-500/50',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      heroTag: 'from-amber-600 to-yellow-600'
    },
    courrier: {
      border: 'hover:border-pink-500/50',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      heroTag: 'from-pink-600 to-fuchsia-600'
    },
    mediapart: {
      border: 'hover:border-rose-500/50',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      heroTag: 'from-rose-600 to-red-600'
    }
  };

  const fetchNews = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('Erreur HTTP ' + res.status);
      const data = await res.json();
      setArticles(data.articles || []);
      setSources(data.sources || []);
      if (showToast) {
        toast.success(`Flux actualisés (${data.articles?.length || 0} articles reçus)`);
      }
    } catch (err) {
      console.error('Erreur chargement news:', err);
      toast.error('Impossible de charger les actualités');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchBriefing = async (force = false) => {
    setIsGeneratingBriefing(true);
    const toastId = force ? toast.loading("Génération du briefing IA par Gemini...") : null;
    try {
      const res = await fetch(`/api/news/briefing?force=${force}`);
      const data = await res.json();
      if (data.success && data.briefing) {
        setBriefing(data);
        if (toastId) toast.success("Briefing de l'actualité généré !", { id: toastId });
      } else {
        if (toastId) toast.error(data.error || "Erreur lors de la génération", { id: toastId });
      }
    } catch (err) {
      console.error('Erreur briefing:', err);
      if (toastId) toast.error("Échec de la communication avec l'IA", { id: toastId });
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchBriefing(false);
  }, []);

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Récemment';
    const now = Date.now() / 1000;
    const diff = Math.max(0, now - timestamp);
    
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `Il y a ${hours}h`;
    }
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Hier';
    return `Il y a ${days}j`;
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSource = selectedSource === 'all' || article.source_id === selectedSource;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        article.title.toLowerCase().includes(q) || 
        article.description.toLowerCase().includes(q) ||
        article.source_name.toLowerCase().includes(q);
      return matchesSource && matchesSearch;
    });
  }, [articles, selectedSource, searchQuery]);

  const heroArticle = useMemo(() => {
    if (filteredArticles.length === 0) return null;
    return filteredArticles.find(a => !!a.image) || filteredArticles[0];
  }, [filteredArticles]);

  const gridArticles = useMemo(() => {
    if (!heroArticle) return filteredArticles;
    return filteredArticles.filter(a => a.id !== heroArticle.id);
  }, [filteredArticles, heroArticle]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
              Kiosque d'Actualités
            </h1>
            <p className="text-sm text-zinc-400">
              Le direct des 5 grands médias filtré et synthétisé par Gemini 2.5 Flash
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => fetchBriefing(true)}
            disabled={isGeneratingBriefing}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs font-semibold text-indigo-300 transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 text-indigo-400 ${isGeneratingBriefing ? 'animate-spin' : 'animate-pulse'}`} />
            <span>{isGeneratingBriefing ? 'Analyse IA en cours...' : 'Régénérer le Briefing IA'}</span>
          </button>

          <button
            onClick={() => fetchNews(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser le fil</span>
          </button>
        </div>
      </div>

      {/* BLOC BRIEFING IA GEMINI : L'essentiel de la journée */}
      {briefing?.briefing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-purple-950/40 border border-indigo-500/30 shadow-2xl overflow-hidden"
        >
          {/* Header du briefing */}
          <div className="p-6 sm:p-7 border-b border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/40">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Le Briefing de l'Actu IA
                </span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Tri d'importance par Gemini 2.5 Flash
                </span>
                <span className="text-xs text-zinc-500">
                  {formatRelativeTime(briefing.generated_at)}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 mt-1">
                L'essentiel de l'information aujourd'hui
              </h2>
            </div>

            <button
              onClick={() => setIsBriefingOpen(!isBriefingOpen)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 transition-colors self-start sm:self-auto"
            >
              <span>{isBriefingOpen ? 'Réduire' : 'Afficher le résumé'}</span>
              {isBriefingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {isBriefingOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 sm:p-7 space-y-6"
              >
                {/* 1. Grand Takeaway / Tendance majeure */}
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0 mt-0.5">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                      Ce qu'il faut retenir en priorité
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-zinc-100 mt-0.5 leading-snug">
                      « {briefing.briefing.global_takeaway} »
                    </p>
                  </div>
                </div>

                {/* 2. Top Stories majeures (Triage sérieux) */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Les faits marquants à la Une
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(briefing.briefing.top_stories || []).map((story, idx) => (
                      <div 
                        key={idx} 
                        className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-indigo-500/30 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300">
                              {story.category || 'Majeur'}
                            </span>
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              {story.importance || 'Cruciale'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-zinc-100 leading-snug">
                            {story.headline}
                          </h4>

                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {story.summary}
                          </p>
                        </div>

                        {story.sources && (
                          <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60 flex items-center gap-1.5">
                            <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Couvert par : <strong className="text-zinc-300">{story.sources}</strong></span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. En Bref (Points courts) */}
                {briefing.briefing.in_brief && briefing.briefing.in_brief.length > 0 && (
                  <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      En Bref
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {briefing.briefing.in_brief.map((point, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2 text-xs text-zinc-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Barre d'outils : Filtres par Source & Recherche */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/80 backdrop-blur-sm">
        {/* Filtres par média */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedSource('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedSource === 'all'
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/60'
            }`}
          >
            Tous les flux ({articles.length})
          </button>
          {sources.map(src => {
            const count = articles.filter(a => a.source_id === src.id).length;
            const isSelected = selectedSource === src.id;
            return (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/60'
                }`}
              >
                {src.name} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Barre de recherche */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-950/80 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] text-zinc-400 gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Agrégation des flux RSS des 5 médias...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800/60 space-y-3">
          <Layers className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-lg font-bold text-zinc-300">Aucun article trouvé</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Aucun article ne correspond à vos critères de recherche ou pour ce média.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Article "À la Une" (Hero Banner) */}
          {heroArticle && !searchQuery && selectedSource === 'all' && (
            <motion.a
              href={heroArticle.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative block overflow-hidden rounded-3xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/5"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Image */}
                <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-96 overflow-hidden bg-zinc-950">
                  {heroArticle.image ? (
                    <img
                      src={heroArticle.image}
                      alt={heroArticle.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-950/50 via-zinc-900 to-zinc-950 flex items-center justify-center">
                      <Newspaper className="w-16 h-16 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent lg:hidden" />
                </div>

                {/* Contenu */}
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        SOURCE_COLORS[heroArticle.source_id]?.badge || 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {heroArticle.source_name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {formatRelativeTime(heroArticle.timestamp)}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 ml-auto">
                        <Sparkles className="w-3 h-3" /> Flash Récent
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors leading-tight">
                      {heroArticle.title}
                    </h2>

                    <p className="text-sm text-zinc-400 line-clamp-3 sm:line-clamp-4 leading-relaxed">
                      {heroArticle.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 pt-2 border-t border-zinc-800/80">
                    <span>Lire sur {heroArticle.source_name}</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.a>
          )}

          {/* Grille des articles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {gridArticles.map((article, idx) => {
              const srcColors = SOURCE_COLORS[article.source_id] || {
                border: 'hover:border-zinc-700',
                badge: 'bg-zinc-800 text-zinc-300'
              };

              return (
                <motion.a
                  key={article.id || idx}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className={`group flex flex-col justify-between bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 ${srcColors.border} rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5`}
                >
                  <div>
                    {/* Miniature */}
                    {article.image ? (
                      <div className="relative h-44 w-full overflow-hidden bg-zinc-950">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md ${srcColors.badge}`}>
                            {article.source_name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 pb-0 flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${srcColors.badge}`}>
                          {article.source_name}
                        </span>
                      </div>
                    )}

                    {/* Titre & Description */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(article.timestamp)}</span>
                      </div>

                      <h3 className="text-base font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                        {article.title}
                      </h3>

                      <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                        {article.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer carte */}
                  <div className="px-5 py-3.5 bg-zinc-950/30 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    <span className="font-medium">{article.source_name}</span>
                    <div className="flex items-center gap-1 text-indigo-400 font-semibold text-[11px]">
                      <span>Consulter</span>
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
