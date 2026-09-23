import { useState, useEffect, useRef } from 'react';
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
  Scissors,
  Maximize2,
  Server,
  ExternalLink,
  User,
  Check,
  SlidersHorizontal,
  GraduationCap,
  Power,
  PlugZap,
  Fan,
  Cpu,
  Timer,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProfile } from '../context/ProfileContext';

export function Home() {
  const { activeProfile, isMaman, isGuest, isVictor, selectProfile, openProfileSelector } = useProfile();
  const [hubData, setHubData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bankBalances, setBankBalances] = useState(null);
  const [battery, setBattery] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModels, setAiModels] = useState([]);
  const [aiConfig, setAiConfig] = useState({
    meteo: "gemini-1.5-flash",
    news: "gemini-1.5-flash",
    hub_briefing: "gemini-1.5-flash",
    gmail_assistant: "gemini-1.5-flash",
    tools_text: "gemini-1.5-pro"
  });
  const [isLoadingAiModels, setIsLoadingAiModels] = useState(false);
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);

  // Prise Serveur (TP-Link P100 / Home Assistant)
  const [plugData, setPlugData] = useState({
    name: "Prise Serveur",
    is_on: null,
    state: "loading",
    device_model: "TP-Link P100",
    room: "Salon",
    configured: false,
    connected: false,
  });
  const [isTogglingPlug, setIsTogglingPlug] = useState(false);
  const [isPlugModalOpen, setIsPlugModalOpen] = useState(false);
  const [plugConfig, setPlugConfig] = useState({
    hass_url: "",
    entity_id: "switch.prise_serveur",
    name: "Prise Serveur",
    device_model: "TP-Link P100",
    room: "Salon",
    has_token: false,
    token_source: "",
  });
  const [plugAutomation, setPlugAutomation] = useState({
    enabled: false,
    cpu_threshold: 50,
    temperature_threshold: 75,
    duration_minutes: 10,
    current_cpu: null,
    current_temp: null,
    is_auto_cooling: false,
    remaining_seconds: 0,
  });
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);
  const isPlugModalOpenRef = useRef(false);
  useEffect(() => {
    isPlugModalOpenRef.current = isPlugModalOpen;
  }, [isPlugModalOpen]);

  const fetchAiData = async () => {
    setIsLoadingAiModels(true);
    try {
      const [modelsRes, configRes] = await Promise.all([
        fetch('/api/ai/models'),
        fetch('/api/ai/config')
      ]);
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setAiModels(data.models || []);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setAiConfig(data);
      }
    } catch (err) {
      console.error("Erreur chargement modèles IA:", err);
    } finally {
      setIsLoadingAiModels(false);
    }
  };

  const handleSaveAiConfig = async (e) => {
    e.preventDefault();
    setIsSavingAiConfig(true);
    const toastId = toast.loading("Enregistrement des modèles...");
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig)
      });
      if (res.ok) {
        toast.success("Modèles Gemini configurés avec succès !", { id: toastId });
        setIsAiModalOpen(false);
      } else {
        toast.error("Erreur lors de l'enregistrement", { id: toastId });
      }
    } catch (err) {
      toast.error("Erreur réseau", { id: toastId });
    } finally {
      setIsSavingAiConfig(false);
    }
  };

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
    toast.success(`Profil activé : ${profile === 'claire' ? 'Maman (Claire)' : profile === 'invite' ? 'Invité' : 'Victor'}`);
  };

  const fetchHubData = async (force = false) => {
    if (force) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/hub/summary?force=${force}`);
      if (!res.ok) throw new Error('Erreur HTTP ' + res.status);
      const data = await res.json();
      setHubData(data);
      if (force) toast.success("Hub d'accueil actualisé !");
    } catch (err) {
      console.error('Erreur chargement hub:', err);
      if (force) toast.error("Impossible d'actualiser le hub");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchPlugStatus = async () => {
    // Si une bascule manuelle est en cours, ne pas écraser avec une lecture intermédiaire
    if (isTogglingPlug) return;
    try {
      const res = await fetch('/api/hub/plug');
      if (res.ok) {
        const data = await res.json();
        setPlugData(prev => ({
          ...prev,
          ...data,
          // Conserver un booléen strict
          is_on: Boolean(data.is_on),
          state: data.state || (data.is_on ? 'on' : 'off')
        }));
      }
    } catch (e) {
      console.warn("Erreur récupération statut prise:", e);
    }
  };

  const fetchPlugConfig = async () => {
    try {
      const res = await fetch('/api/hub/plug/config');
      if (res.ok) {
        const data = await res.json();
        setPlugConfig(prev => ({
          ...prev,
          ...data,
        }));
      }
    } catch (e) {
      console.warn("Erreur chargement configuration prise:", e);
    }
  };

  const fetchPlugAutomation = async () => {
    try {
      const res = await fetch('/api/hub/plug/automation');
      if (res.ok) {
        const data = await res.json();
        setPlugAutomation(prev => {
          if (isPlugModalOpenRef.current) {
            return {
              ...prev,
              current_cpu: data.current_cpu,
              current_temp: data.current_temp,
              is_auto_cooling: data.is_auto_cooling,
              remaining_seconds: data.remaining_seconds,
            };
          }
          return { ...prev, ...data };
        });
      }
    } catch (e) {
      console.warn("Erreur chargement automatisation prise:", e);
    }
  };

  const handleSavePlugAutomation = async (overrideCfg = null) => {
    const payload = overrideCfg || {
      enabled: plugAutomation.enabled,
      cpu_threshold: Number(plugAutomation.cpu_threshold),
      temperature_threshold: Number(plugAutomation.temperature_threshold),
      duration_minutes: Number(plugAutomation.duration_minutes),
    };
    setIsSavingAutomation(true);
    const toastId = toast.loading("Enregistrement de la régulation...");
    try {
      const res = await fetch('/api/hub/plug/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setPlugAutomation(prev => ({
          ...prev,
          ...data,
        }));
        if (payload.enabled) {
          toast.success(`Régulation active (Seuil ${payload.cpu_threshold}% • ${payload.duration_minutes} min)`, { id: toastId, icon: "❄️" });
        } else {
          toast.success("Régulation automatique désactivée", { id: toastId });
        }
        fetchPlugStatus();
      } else {
        toast.error("Erreur enregistrement régulation", { id: toastId });
      }
    } catch (err) {
      toast.error("Erreur réseau", { id: toastId });
    } finally {
      setIsSavingAutomation(false);
    }
  };

  const handleTogglePlug = async (e) => {
    if (e) e.stopPropagation();
    if (isTogglingPlug) return;
    setIsTogglingPlug(true);

    // Déterminer l'état cible déterministe
    const currentlyOn = Boolean(plugData?.is_on);
    const targetState = currentlyOn ? 'off' : 'on';
    const targetIsOn = !currentlyOn;

    // Mise à jour optimiste immédiate
    setPlugData(prev => ({
      ...prev,
      is_on: targetIsOn,
      state: targetState
    }));

    try {
      // Appel explicite idempotent : commande 'turn_on' ou 'turn_off' garantie
      const res = await fetch('/api/hub/plug/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: targetState })
      });

      if (res.ok) {
        const data = await res.json();
        setPlugData(prev => ({
          ...prev,
          ...data,
          is_on: data.is_on ?? targetIsOn,
          state: data.state ?? targetState
        }));
        if (targetIsOn) {
          toast.success("Ventilateurs activés (Refroidissement ON) ❄️", { icon: "💨" });
        } else {
          toast.success("Ventilateurs éteints (Silence) 🛑", { icon: "💤" });
        }
      } else {
        // Rollback en cas d'échec
        setPlugData(prev => ({ ...prev, is_on: currentlyOn, state: currentlyOn ? 'on' : 'off' }));
        toast.error("Échec de la commande de la prise");
      }
    } catch (err) {
      setPlugData(prev => ({ ...prev, is_on: currentlyOn, state: currentlyOn ? 'on' : 'off' }));
      toast.error("Erreur réseau lors de la bascule de la prise");
    } finally {
      setIsTogglingPlug(false);
    }
  };

  useEffect(() => {
    fetchHubData(false);
    if (isVictor) {
      fetchBattery();
      fetchBankBalances();
      fetchPlugStatus();
      fetchPlugAutomation();
      const timer = setInterval(() => {
        fetchBattery();
        fetchPlugStatus();
        fetchPlugAutomation();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isVictor]);

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

  const displayGreeting = isGuest
    ? "Bienvenue Invité 🍿"
    : isMaman
    ? "Bonjour Claire 👩‍🏫"
    : (greeting && greeting.includes("Victor") ? greeting : `${greeting || (new Date().getHours() >= 18 ? "Bonsoir" : "Bonjour")} Victor`);
  const batteryPercent = battery ? (battery.percentage ?? battery.percent) : null;
  const isBatteryPlugged = battery ? Boolean(battery.plugged_in ?? battery.plugged ?? false) : false;
  const cpuPercent = battery?.cpu_percent;
  const cpuTemp = battery?.cpu_temp;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header, Profils & Batterie */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <span>{capitalize(todayFormatted)}</span>
            <span>•</span>
            <span className={isGuest ? "text-amber-400 font-bold" : isMaman ? "text-pink-400 font-bold" : "text-indigo-400"}>
              {isGuest ? "Espace Médias & Météo" : isMaman ? "Espace Maman" : "VicozWorld Hub"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight mt-1">
            {displayGreeting}
          </h1>
        </div>

        {isVictor && (
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={() => fetchHubData(true)}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-2xl text-xs font-semibold text-zinc-200 transition-all shadow-md disabled:opacity-50"
              title="Actualiser le résumé"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Génération...' : 'Actualiser'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Briefing Exécutif Personnel (Gemini 2.5 Flash) - Visible UNIQUEMENT pour Victor */}
      {isVictor && (
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
      {isVictor && (
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

          {/* WIDGET 2 : MONITORING SYSTEME */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-6 shadow-lg group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Monitoring Serveur</h3>
                  <span className="text-[11px] text-zinc-500">Performances & Matériel</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                En Direct
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Ligne 1 : CPU et Temp (Mini Jauges) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col p-3.5 rounded-2xl bg-zinc-950/50 border border-zinc-800/80">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Cpu className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">CPU</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-100">{cpuPercent !== null ? cpuPercent : '-'}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full mt-2 overflow-hidden border border-zinc-800/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        (cpuPercent || 0) >= 85 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                        (cpuPercent || 0) >= 50 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
                        'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                      }`} 
                      style={{ width: `${Math.min(100, cpuPercent || 0)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-col p-3.5 rounded-2xl bg-zinc-950/50 border border-zinc-800/80">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Thermometer className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Temp</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-100">{cpuTemp !== null ? cpuTemp : '-'}°C</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full mt-2 overflow-hidden border border-zinc-800/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        (cpuTemp || 0) >= 75 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                        (cpuTemp || 0) >= 60 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
                        'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      }`} 
                      style={{ width: `${Math.min(100, cpuTemp || 0)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Ligne 2 : Batterie (Jauge horizontale) */}
              <div className="flex flex-col p-3.5 rounded-2xl bg-zinc-950/50 border border-zinc-800/80">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2.5">
                    {isBatteryPlugged ? (
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <BatteryCharging className="w-4 h-4 animate-pulse" />
                      </div>
                    ) : (
                      <div className={`p-2 rounded-xl border ${batteryPercent <= 20 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        <Battery className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Batterie</span>
                      <span className="text-[10px] text-zinc-500">{isBatteryPlugged ? "Sur secteur" : "Sur batterie"}</span>
                    </div>
                  </div>
                  <span className="text-base font-extrabold text-zinc-100">{batteryPercent !== null ? batteryPercent : '-'}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full mt-1 overflow-hidden border border-zinc-800/50">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      (batteryPercent || 0) <= 20 && !isBatteryPlugged ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                      'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    }`} 
                    style={{ width: `${batteryPercent || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Ligne 3 : Contrôles (Ventilateurs et IA) */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={handleTogglePlug}
                  disabled={isTogglingPlug || plugData?.is_on === null}
                  className={`relative flex flex-col items-start p-3.5 rounded-2xl border transition-all text-left group/btn ${
                    plugData?.is_on === true
                      ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : plugData?.is_on === false
                      ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80'
                      : 'bg-zinc-950/50 text-zinc-500 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <Fan className={`w-4 h-4 ${plugData?.is_on === true ? 'text-cyan-400 animate-spin drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]' : ''}`} style={plugData?.is_on === true ? { animationDuration: '2.5s' } : undefined} />
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      plugData?.is_on === true ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>{plugData?.is_on === true ? 'ON' : 'OFF'}</span>
                  </div>
                  <span className="text-xs font-bold truncate w-full text-zinc-200">{plugData?.name || 'Ventilos'}</span>
                  <span className="text-[9px] text-zinc-500 truncate w-full mt-0.5">{plugAutomation?.enabled ? 'Régulation Auto' : 'Mode Manuel'}</span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlugModalOpen(true);
                      fetchPlugConfig();
                      fetchPlugAutomation();
                    }}
                    className="absolute top-2.5 right-2.5 p-1 rounded-lg opacity-0 group-hover/btn:opacity-100 hover:bg-white/10 transition-all z-10"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-cyan-100" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAiModalOpen(true);
                    fetchAiData();
                  }}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all text-left ${
                    hubData?.has_gemini_key
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <Sparkles className="w-4 h-4" />
                    {hubData?.has_gemini_key ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    )}
                  </div>
                  <span className="text-xs font-bold truncate w-full text-zinc-200">{hubData?.has_gemini_key ? 'Assistants IA' : 'IA Désactivée'}</span>
                  <span className="text-[9px] text-zinc-500 truncate w-full mt-0.5">{hubData?.has_gemini_key ? 'Connectés & Prêts' : 'Clé API requise'}</span>
                </button>
              </div>

            </div>
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
                    <span className="text-[11px] text-zinc-500">Recommandé par l'IA pour ce soir</span>
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

      {/* 🍿 ESPACE INVITÉ : STRICTEMENT CINÉMA, QUIZ & MÉTÉO */}
      {isGuest && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 border border-amber-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Accès Libre Invité
                </span>
                <span className="text-xs text-zinc-400">Cinéma & Météo locale</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Cinémathèque, Recommandations & Météo
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Parcourez les centaines de films et séries catalogués, découvrez le coup de cœur du soir ou consultez les prévisions météo en direct.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Link
                to="/cinematheque"
                className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
              >
                <Film className="w-4 h-4" />
                Cinémathèque
              </Link>
              <Link
                to="/meteo"
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
              >
                <CloudSun className="w-4 h-4" />
                Météo
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* WIDGET 1 : MÉTÉO EN DIRECT */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-5 group shadow-lg"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                      <CloudSun className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">Météo en Direct</h3>
                      <span className="text-[11px] text-zinc-500">{weather?.city || 'Paris'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    Direct
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
                    👕 <strong className="text-zinc-300">Conseil :</strong> {weatherSynthesis.outfit_advice}
                  </p>
                )}
              </div>

              <Link
                to="/meteo"
                className="flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 pt-3 border-t border-zinc-800/80 transition-colors"
              >
                <span>Voir les prévisions complètes sur 7 jours</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* WIDGET 2 : SUGGESTION CINÉ DU SOIR */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-5 group shadow-lg md:col-span-2 lg:col-span-2"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                      <Film className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">Coup de Cœur Cinéma</h3>
                      <span className="text-[11px] text-zinc-500">Sélectionné pour vous ce soir</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    Recommandation
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
                <span>Découvrir la cinémathèque complète</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Détourage Précis IA */}
          <a
            href="/tools/detourage_ia.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-3xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-pink-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 group-hover:scale-105 transition-transform">
                  <Scissors className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400" /> Bria RMBG IA
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-pink-300 transition-colors">
                Détourage Précis IA
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Suppression de fond ultra-précise (cheveux, poils, objets fins) avec studio de remplacement.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-pink-400 pt-2 border-t border-zinc-800/80">
              <span>Détourer une photo</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>

          {/* Upscale & Super-Résolution IA */}
          <a
            href="/tools/upscale_ia.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-3xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Style Upscayl
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                Upscale & Super-Résolution
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Agrandissement neuronal 2x à 8x, restauration des textures et micro-détails en qualité 4K.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 pt-2 border-t border-zinc-800/80">
              <span>Agrandir une image</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>

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
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Assistance IA
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

      {/* Modal Configuration des Modèles Gemini par Service */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100">Moteur d'Intelligence Artificielle</h3>
                    <p className="text-xs text-zinc-400">Personnalisez le modèle IA pour chaque service de VicozWorld</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLoadingAiModels ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs">Interrogation de votre clé Google AI Studio...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveAiConfig} className="space-y-4">
                  {/* Service 1: Météo */}
                  <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <CloudSun className="w-4 h-4 text-cyan-400" />
                        Synthèse Météo multi-modèles
                      </label>
                      <span className="text-[10px] text-zinc-500">Recommandé : Flash</span>
                    </div>
                    <select
                      value={aiConfig.meteo}
                      onChange={(e) => setAiConfig({ ...aiConfig, meteo: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-medium focus:outline-none focus:border-cyan-500"
                    >
                      {aiModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service 2: Actualités */}
                  <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Newspaper className="w-4 h-4 text-sky-400" />
                        Revue de Presse & Analyse de l'Actu
                      </label>
                      <span className="text-[10px] text-zinc-500">Recommandé : Flash / Pro</span>
                    </div>
                    <select
                      value={aiConfig.news}
                      onChange={(e) => setAiConfig({ ...aiConfig, news: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-medium focus:outline-none focus:border-cyan-500"
                    >
                      {aiModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service 3: Briefing Hub */}
                  <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        Briefing Exécutif du Hub d'accueil
                      </label>
                      <span className="text-[10px] text-zinc-500">Recommandé : Flash / Pro</span>
                    </div>
                    <select
                      value={aiConfig.hub_briefing}
                      onChange={(e) => setAiConfig({ ...aiConfig, hub_briefing: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-medium focus:outline-none focus:border-cyan-500"
                    >
                      {aiModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service 4: Gmail Assistant */}
                  <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-rose-400" />
                        Assistant Gmail & Tri des e-mails
                      </label>
                      <span className="text-[10px] text-zinc-500">Recommandé : Flash</span>
                    </div>
                    <select
                      value={aiConfig.gmail_assistant}
                      onChange={(e) => setAiConfig({ ...aiConfig, gmail_assistant: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-medium focus:outline-none focus:border-cyan-500"
                    >
                      {aiModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service 5: Outils Bureautiques & Extraction */}
                  <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        Outils Bureautiques (Pronote, OCR, Correcteur)
                      </label>
                      <span className="text-[10px] text-zinc-500">Recommandé : Pro / Modèle lourd</span>
                    </div>
                    <select
                      value={aiConfig.tools_text}
                      onChange={(e) => setAiConfig({ ...aiConfig, tools_text: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-medium focus:outline-none focus:border-cyan-500"
                    >
                      {aiModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAiConfig}
                      className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                    >
                      {isSavingAiConfig ? 'Enregistrement...' : 'Enregistrer les choix'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Configuration Prise Serveur & Home Assistant */}
      <AnimatePresence>
        {isPlugModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-y-auto max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                    <PlugZap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      <span>Ventilos Serveur</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        TP-Link P100
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Salon • Support ventilé de refroidissement du PC portable
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlugModalOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* État en direct & Test rapide */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    plugData?.is_on 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    <Fan className={`w-5 h-5 ${plugData?.is_on ? 'animate-spin' : ''}`} style={plugData?.is_on ? { animationDuration: '2.5s' } : undefined} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                      <span>Refroidissement :</span>
                      <span className={plugData?.is_on ? 'text-cyan-400 font-extrabold' : 'text-zinc-400'}>
                        {plugData?.is_on ? 'Ventilation active ❄️' : 'Ventilation coupée'}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {plugData?.connected
                        ? '🟢 Connecté à Home Assistant'
                        : plugData?.configured
                        ? '🟠 Home Assistant injoignable'
                        : '⚪ Mode local autonome'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePlug}
                  disabled={isTogglingPlug}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                    plugData?.is_on
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  <Fan className="w-3.5 h-3.5" />
                  <span>{plugData?.is_on ? 'Couper' : 'Allumer'}</span>
                </button>
              </div>

              {/* Régulation Automatique CPU (Stockée en base SQLite) */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <span>Régulation Automatique</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                          plugAutomation.enabled
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {plugAutomation.enabled ? 'ACTIVE' : 'DÉSACTIVÉE'}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Déclenche le ventilateur dès que le processeur surchauffe
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !plugAutomation.enabled;
                      setPlugAutomation(prev => ({ ...prev, enabled: next }));
                      handleSavePlugAutomation({ ...plugAutomation, enabled: next });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      plugAutomation.enabled ? 'bg-cyan-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        plugAutomation.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Statuts CPU et Température */}
                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      Charge CPU :
                    </span>
                    <span className={`font-mono font-bold ${
                      (plugAutomation.current_cpu || 0) >= plugAutomation.cpu_threshold
                        ? 'text-rose-400 font-extrabold'
                        : (plugAutomation.current_cpu || 0) >= 40
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {plugAutomation.current_cpu !== null ? `${plugAutomation.current_cpu}%` : 'Mesure...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                      Température :
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${
                        (plugAutomation.current_temp || 0) >= plugAutomation.temperature_threshold
                          ? 'text-rose-400 font-extrabold'
                          : (plugAutomation.current_temp || 0) >= 65
                          ? 'text-orange-400'
                          : 'text-emerald-400'
                      }`}>
                        {plugAutomation.current_temp !== null && plugAutomation.current_temp > 0 ? `${plugAutomation.current_temp}°C` : 'N/A'}
                      </span>
                      {plugAutomation.is_auto_cooling && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                          ❄️ Auto ON ({Math.ceil((plugAutomation.remaining_seconds || 0) / 60)}m)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {plugAutomation.enabled && (
                  <div className="space-y-3 pt-2 border-t border-zinc-800/60">
                    {/* Seuil de déclenchement CPU */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Seuil Charge CPU</span>
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/30">
                          {plugAutomation.cpu_threshold}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="85"
                        step="5"
                        value={plugAutomation.cpu_threshold}
                        onChange={(e) => setPlugAutomation({ ...plugAutomation, cpu_threshold: Number(e.target.value) })}
                        className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>25%</span>
                        <span>50%</span>
                        <span>85%</span>
                      </div>
                    </div>

                    {/* Seuil de déclenchement Température */}
                    <div className="space-y-1.5 pt-3 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Seuil Température CPU</span>
                        <span className="font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/30">
                          {plugAutomation.temperature_threshold || 75}°C
                        </span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="90"
                        step="5"
                        value={plugAutomation.temperature_threshold || 75}
                        onChange={(e) => setPlugAutomation({ ...plugAutomation, temperature_threshold: Number(e.target.value) })}
                        className="w-full accent-orange-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>40°C</span>
                        <span>65°C</span>
                        <span>90°C</span>
                      </div>
                    </div>

                    {/* Durée minimale de refroidissement */}
                    <div className="space-y-1.5 pt-3 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Durée minimale de refroidissement</span>
                        <span className="text-zinc-400 text-[10px]">
                          {plugAutomation.duration_minutes} minutes consécutives
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[5, 10, 15, 30].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setPlugAutomation({ ...plugAutomation, duration_minutes: dur })}
                            className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              plugAutomation.duration_minutes === dur
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
                            }`}
                          >
                            {dur} min
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bouton Enregistrer les préférences de régulation */}
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    disabled={isSavingAutomation}
                    onClick={() => handleSavePlugAutomation()}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingAutomation ? 'Enregistrement...' : 'Enregistrer la régulation'}</span>
                  </button>
                </div>
              </div>

              {/* Informations de configuration issues du .env */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                    <span className="text-xs font-medium text-zinc-400">Source des identifiants</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Fichier .env du serveur
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-400">URL Home Assistant :</span>
                      <span className="font-mono text-zinc-200 truncate max-w-[220px]" title={plugConfig.hass_url}>
                        {plugConfig.hass_url || <span className="text-zinc-500 italic">Non renseignée (HASS_URL)</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-400">Jeton API :</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        plugConfig.has_token 
                          ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' 
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                      }`}>
                        {plugConfig.has_token ? '✓ Configuré dans .env (HASS_TOKEN)' : 'Manquant (HASS_TOKEN)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-400">Entité :</span>
                      <span className="font-mono text-zinc-200">
                        {plugConfig.entity_id || 'switch.prise_serveur'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-400">Matériel & Lieu :</span>
                      <span className="text-zinc-200">
                        TP-Link P100 • Salon (Ventilateurs PC)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-zinc-400 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Les identifiants restent stockés dans le fichier <code className="text-cyan-300 font-mono">.env</code> de votre serveur CasaOS. Les préférences de régulation sont sauvegardées avec vos choix d'IA.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      fetchPlugStatus();
                      fetchPlugConfig();
                      fetchPlugAutomation();
                      toast.success("Statut synchronisé");
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Actualiser</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlugModalOpen(false)}
                    className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl text-xs font-bold transition-all"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
