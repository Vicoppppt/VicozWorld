import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  CloudSun, 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Snowflake, 
  CloudDrizzle, 
  CloudFog,
  Newspaper, 
  Zap, 
  Film, 
  Home as HomeIcon, 
  Lock, 
  Lightbulb, 
  Thermometer, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  Landmark, 
  Network, 
  FileText, 
  Briefcase, 
  Gamepad2, 
  CheckCircle2, 
  AlertTriangle,
  Star,
  Flame,
  Radio,
  Battery,
  BatteryCharging,
  Wrench,
  PenTool,
  FileSpreadsheet,
  Layers,
  Mail,
  Server,
  ExternalLink,
  User,
  Check,
  SlidersHorizontal,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProfile } from '../context/ProfileContext';

export function Home() {
  const { activeProfile, isMaman, selectProfile, openProfileSelector } = useProfile();
  const [hubData, setHubData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bankBalances, setBankBalances] = useState(null);
  const [battery, setBattery] = useState(null);

  const fetchBankBalances = async () => {
    try {
      const res = await fetch('/api/balances');
      if (res.ok) {
        const data = await res.json();
        setBankBalances(data);
      }
    } catch (e) {
      console.warn('Erreur récupération soldes bancaires:', e);
    }
  };

  const fetchBattery = async () => {
    try {
      const res = await fetch('/api/hub/battery');
      if (res.ok) {
        const data = await res.json();
        setBattery(data);
      }
    } catch (e) {
      console.warn('Erreur récupération batterie:', e);
    }
  };

  const switchProfile = (profile) => {
    selectProfile(profile);
    toast.success(`Profil activé : ${profile === 'claire' ? 'Maman (Claire)' : 'Victor'}`);
  };

  const fetchHubData = async (force = false) => {
    if (force) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/hub/summary?force=${force}`);
      if (!res.ok) throw new Error('Erreur HTTP ' + res.status);
      const data = await res.json();
      setHubData(data);
      if (force) toast.success("Hub d'accueil actualisé par Gemini !");
    } catch (err) {
      console.error('Erreur chargement hub:', err);
      if (force) toast.error("Impossible d'actualiser le hub");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHubData(false);
    fetchBattery();
    if (!isMaman) {
      fetchBankBalances();
    }
    const timer = setInterval(fetchBattery, 30000);
    return () => clearInterval(timer);
  }, [isMaman]);

  const renderWeatherIcon = (iconName, className = "w-6 h-6") => {
    switch (iconName) {
      case 'sun':
        return <Sun className={`${className} text-amber-400`} />;
      case 'cloud-sun':
        return <CloudSun className={`${className} text-amber-300`} />;
      case 'cloud':
        return <Cloud className={`${className} text-zinc-400`} />;
      case 'cloud-drizzle':
        return <CloudDrizzle className={`${className} text-sky-400`} />;
      case 'cloud-rain':
      case 'cloud-heavy-rain':
        return <CloudRain className={`${className} text-blue-400`} />;
      case 'cloud-lightning':
        return <CloudLightning className={`${className} text-yellow-400`} />;
      case 'snowflake':
        return <Snowflake className={`${className} text-cyan-300`} />;
      case 'cloud-fog':
        return <CloudFog className={`${className} text-zinc-400`} />;
      default:
        return <CloudSun className={`${className} text-amber-300`} />;
    }
  };

  // Date du jour formatée en français
  const todayFormatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const formatCurrency = (amount, currency = "EUR") => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const {
    greeting = "Bonjour Victor",
    executive_summary,
    movie_pitch,
    weather,
    news,
    electricity,
    movie_pick,
    domotique
  } = hubData || {};

  const weatherSynthesis = weather?.synthesis || {};
  const newsBriefing = news?.briefing || {};
  const thisMonthElectricity = electricity?.this_month || {};
  const yesterdayElectricity = electricity?.yesterday || {};

  const displayGreeting = isMaman ? "Bonjour Claire 👩‍🏫" : greeting;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header, Profils & Batterie */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <span>{capitalize(todayFormatted)}</span>
            <span>•</span>
            <span className="text-indigo-400">VicozWorld Hub</span>
            {battery && battery.percent !== undefined && (
              <>
                <span>•</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  battery.percent <= 20 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                    : battery.percent <= 40 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {battery.plugged ? <BatteryCharging className="w-3 h-3 animate-pulse" /> : <Battery className="w-3 h-3" />}
                  <span>{battery.percent}% {battery.plugged ? '(Secteur)' : 'Serveur'}</span>
                </span>
              </>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight mt-1">
            {displayGreeting}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {battery && battery.percent !== undefined && (
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-semibold shadow-sm transition-all ${
                battery.percent <= 20
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : battery.percent <= 40
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
              title={`Batterie du serveur : ${battery.percent}% - ${battery.plugged ? 'Branché sur secteur' : 'Sur batterie'}`}
            >
              {battery.plugged ? (
                <BatteryCharging className="w-4 h-4 animate-pulse text-emerald-400" />
              ) : (
                <Battery className={`w-4 h-4 ${battery.percent <= 20 ? 'text-rose-400' : 'text-emerald-400'}`} />
              )}
              <div className="flex flex-col text-left leading-tight">
                <span className="font-bold text-zinc-100">{battery.percent}%</span>
                <span className="text-[9px] text-zinc-400">{battery.plugged ? 'Secteur' : 'Serveur'}</span>
              </div>
            </div>
          )}

          {!isMaman && (
            <button
              onClick={() => fetchHubData(true)}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-2xl text-xs font-semibold text-zinc-200 transition-all shadow-md disabled:opacity-50"
              title="Actualiser le résumé Gemini"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Génération...' : 'Actualiser'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Briefing Exécutif Personnel (Gemini 2.5 Flash) - Visible UNIQUEMENT pour Victor */}
      {!isMaman && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-cyan-950/40 border border-indigo-500/30 shadow-2xl relative overflow-hidden space-y-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Briefing Exécutif du Jour
              </span>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 hidden sm:inline-block">
                Compilé par Gemini 2.5 Flash
              </span>
            </div>
          </div>

          <p className="text-base sm:text-lg text-zinc-100 leading-relaxed font-medium">
            {isLoading ? (
              <span className="text-zinc-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                Génération de votre synthèse personnalisée...
              </span>
            ) : (
              executive_summary || "Passez une excellente journée sur votre espace personnel VicozWorld."
            )}
          </p>
        </motion.div>
      )}

      {/* Grille des Widgets Connectés - Uniquement pour Victor */}
      {!isMaman && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* WIDGET 1 : MÉTÉO EN DIRECT */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                    <CloudSun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Météo & Climat</h3>
                    <span className="text-[11px] text-zinc-500">{weather?.city || 'Paris'} • 3 Modèles</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  {weatherSynthesis.confidence_score ? `${weatherSynthesis.confidence_score}% Confiance` : 'IA Consensus'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-zinc-100 tracking-tight">
                    {weatherSynthesis.consensus_temp ?? 21}°C
                  </span>
                  <span className="text-xs text-zinc-400">
                    {weatherSynthesis.consensus_condition || 'Agréable'}
                  </span>
                </div>
                <div className="p-2.5 bg-zinc-950/80 rounded-2xl border border-zinc-800">
                  {renderWeatherIcon(weather?.sources?.meteofrance?.icon || 'cloud-sun', "w-8 h-8")}
                </div>
              </div>

              {weatherSynthesis.outfit_advice && (
                <p className="text-xs text-zinc-400 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60 leading-relaxed line-clamp-2">
                  👕 <strong className="text-zinc-300">Tenue :</strong> {weatherSynthesis.outfit_advice}
                </p>
              )}
            </div>

            <Link
              to="/meteo"
              className="flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 pt-3 border-t border-zinc-800/80 transition-colors"
            >
              <span>Station météo complète & 7 jours</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* WIDGET 2 : FLASH ACTUALITÉS */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Newspaper className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Kiosque d'Actualités</h3>
                    <span className="text-[11px] text-zinc-500">5 Médias • Trié par Gemini</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Flash Info
                </span>
              </div>

              {newsBriefing.global_takeaway ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-zinc-200 line-clamp-2 leading-snug">
                    « {newsBriefing.global_takeaway} »
                  </p>
                  {newsBriefing.top_stories && newsBriefing.top_stories[0] && (
                    <div className="text-[11px] text-zinc-400 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/60 line-clamp-2">
                      🔥 <strong className="text-zinc-300">{newsBriefing.top_stories[0].headline}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 pt-2">
                  Consultez les dernières dépêches internationales et nationales filtrées.
                </p>
              )}
            </div>

            <Link
              to="/actualites"
              className="flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 pt-3 border-t border-zinc-800/80 transition-colors"
            >
              <span>Accéder au kiosque complet</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* WIDGET 3 : SUIVI ÉNERGIE LINKY */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Énergie & Linky</h3>
                    <span className="text-[11px] text-zinc-500">Compteur Enedis direct</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  thisMonthElectricity.is_over_budget 
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {thisMonthElectricity.is_over_budget ? 'Alerte Dérapage' : 'Budget Maîtrisé'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Hier</span>
                  <div className="text-lg font-black text-zinc-100 mt-0.5">
                    {yesterdayElectricity.kwh ?? 0} <span className="text-xs font-medium text-zinc-400">kWh</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold">{yesterdayElectricity.cost ?? 0} €</span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Ce mois</span>
                  <div className="text-lg font-black text-zinc-100 mt-0.5">
                    {thisMonthElectricity.current_cost ?? 0} <span className="text-xs font-medium text-zinc-400">€</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">sur {thisMonthElectricity.target_budget ?? 60} € cible</span>
                </div>
              </div>
            </div>

            <Link
              to="/energie"
              className="flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300 pt-3 border-t border-zinc-800/80 transition-colors"
            >
              <span>Consommation détaillée & Graphiques</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* WIDGET 4 : SUGGESTION CINÉ DU SOIR */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-5 group md:col-span-2 lg:col-span-2"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Cinémathèque • Suggestion du Soir</h3>
                    <span className="text-[11px] text-zinc-500">Recommandé par Gemini pour ce soir</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  Sélection IA
                </span>
              </div>

              {movie_pick && (
                <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
                  {movie_pick.poster && (
                    <img
                      src={movie_pick.poster}
                      alt={movie_pick.title}
                      className="w-20 h-28 object-cover rounded-xl shadow-lg border border-zinc-700 shrink-0"
                    />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-extrabold text-zinc-100">{movie_pick.title}</h4>
                      <span className="text-xs text-zinc-400 font-medium">({movie_pick.year})</span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {movie_pick.rating}
                      </span>
                    </div>

                    <p className="text-xs text-purple-300/90 font-medium">
                      « {movie_pitch || movie_pick.synopsis} »
                    </p>

                    <p className="text-xs text-zinc-400 line-clamp-2">
                      {movie_pick.synopsis}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/cinematheque"
              className="flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300 pt-3 border-t border-zinc-800/80 transition-colors"
            >
              <span>Ouvrir ma cinémathèque & carnet</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* WIDGET 5 : BANQUE & FINANCES (SOLDE GLOBAL BANCAIRE) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Solde Global Bancaire</h3>
                    <span className="text-[11px] text-zinc-500">
                      {bankBalances?.accounts?.length ? `${bankBalances.accounts.length} compte${bankBalances.accounts.length > 1 ? 's' : ''} connecté${bankBalances.accounts.length > 1 ? 's' : ''}` : 'Synchronisation Woob'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  En direct
                </span>
              </div>

              {/* Solde total avec centimes */}
              <div className="pt-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Patrimoine total</span>
                <div className="text-3xl font-black text-zinc-100 tracking-tight mt-0.5">
                  {bankBalances ? formatCurrency(bankBalances.total) : "—"}
                </div>

                {bankBalances?.accounts && bankBalances.accounts.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {bankBalances.accounts.slice(0, 2).map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
                        <span className="text-zinc-300 font-medium truncate max-w-[150px]">{acc.label}</span>
                        <span className={`font-bold ${acc.balance >= 0 ? 'text-zinc-100' : 'text-rose-400'}`}>
                          {formatCurrency(acc.balance, acc.currency)}
                        </span>
                      </div>
                    ))}
                    {bankBalances.accounts.length > 2 && (
                      <p className="text-[11px] text-zinc-500 text-right pt-0.5">
                        + {bankBalances.accounts.length - 2} autre{bankBalances.accounts.length - 2 > 1 ? 's' : ''} compte{bankBalances.accounts.length - 2 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mt-2">
                    {bankBalances ? "Aucun compte bancaire détecté." : "Récupération des soldes..."}
                  </p>
                )}
              </div>
            </div>

            <Link
              to="/banque"
              className="flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 pt-3 border-t border-zinc-800/80 transition-colors"
            >
              <span>Accéder à mes comptes & simulateur</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

        </div>
      )}

      {/* 🛠️ BOÎTE À OUTILS WEB & IA (Affichée sur la page d'accueil pour Maman) */}
      {isMaman && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Wrench className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                Boîte à Outils & Utilitaires Web
              </h2>
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">100% Locaux & Navigateur</span>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Correcteur de rédactions IA */}
          <a
            href="/tools/correcteur_redaction.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-3xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <PenTool className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Gemini IA
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                Correcteur Rédactions
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Évalue les copies collège selon critères précis, barème, grille et avis pédagogique.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 pt-2 border-t border-zinc-800/80">
              <span>Corriger une copie</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>

          {/* OCR & Extraction de texte */}
          <a
            href="/tools/extracteur_texte.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-3xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  OCR Local
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-purple-300 transition-colors">
                OCR & Extraction Texte
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Extrait le texte des PDF et photos (ou collage Ctrl+V) et nettoie accents et coupures.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-purple-400 pt-2 border-t border-zinc-800/80">
              <span>Extraire du texte</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>

          {/* Éditeur & Compresseur PDF */}
          <a
            href="/tools/editeur_pdf.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-3xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  100% Client
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                Éditeur & Fusion PDF
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Pivotez, réorganisez, supprimez des pages, fusionnez et compressez vos fichiers PDF en toute sécurité.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400 pt-2 border-t border-zinc-800/80">
              <span>Modifier un PDF</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>

          {/* Convertisseur PDF vers Excel */}
          <a
            href="/tools/convertisseur_excel.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-3xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Pronote & Tableaux
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                PDF ➔ Tableur Excel
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Convertit instantanément grilles d'élèves et tableaux PDF en feuilles de calcul Excel (.xlsx).
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 pt-2 border-t border-zinc-800/80">
              <span>Convertir en XLSX</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>
        </div>
      </div>
      )}

      {/* Raccourcis Rapides vers les autres modules (Quick Dock) - Uniquement pour Victor */}
      {!isMaman && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <span>Autres Espaces & Outils</span>
            </h2>
            <span className="text-[11px] text-zinc-500 font-medium">Accès direct</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <Link
              to="/banque"
              className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-emerald-500/30 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">Banque</div>
                <div className="text-[10px] text-zinc-500">Comptes & Épargne</div>
              </div>
            </Link>

            <Link
              to="/genealogie"
              className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-indigo-500/30 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors">Généalogie</div>
                <div className="text-[10px] text-zinc-500">Arbre familial</div>
              </div>
            </Link>

            <Link
              to="/notes"
              className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-amber-500/30 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">Notes</div>
                <div className="text-[10px] text-zinc-500">Carnet & Idées</div>
              </div>
            </Link>

            <a
              href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8501`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-red-500/30 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-red-400 transition-colors flex items-center gap-1">
                  <span>Gmail IA</span>
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                </div>
                <div className="text-[10px] text-zinc-500">Tri de boîte mail</div>
              </div>
            </a>

            <Link
              to="/portfolio"
              className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-sky-500/30 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-sky-400 transition-colors">Portfolio</div>
                <div className="text-[10px] text-zinc-500">Projets & CV</div>
              </div>
            </Link>

            <Link
              to="/quiz"
              className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-pink-500/30 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-pink-400 transition-colors">Quiz</div>
                <div className="text-[10px] text-zinc-500">Défis Cinéma</div>
              </div>
            </Link>

            <a
              href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:80`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-blue-500/30 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 transition-colors flex items-center gap-1">
                  <span>CasaOS</span>
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                </div>
                <div className="text-[10px] text-zinc-500">Serveur & Fichiers</div>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
