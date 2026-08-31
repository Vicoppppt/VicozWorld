import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudSun, 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Snowflake, 
  CloudDrizzle, 
  CloudFog,
  Wind, 
  Droplets, 
  Gauge, 
  Compass, 
  Sparkles, 
  Search, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Umbrella, 
  Shirt, 
  Bike, 
  Settings2, 
  X,
  Navigation
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Bar,
  ComposedChart
} from 'recharts';
import toast from 'react-hot-toast';

export function Meteo() {
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Configuration de base
  const [config, setConfig] = useState({
    gemini_api_key: '',
    default_city: 'Paris',
    default_lat: 48.8566,
    default_lon: 2.3522
  });

  const [currentLocation, setCurrentLocation] = useState({
    city: 'Paris',
    lat: 48.8566,
    lon: 2.3522
  });

  const fetchWeather = async (lat, lon, city, showToast = false) => {
    if (showToast) setIsRefreshing(true);
    try {
      const url = `/api/weather/report?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur HTTP ' + res.status);
      const data = await res.json();
      setWeatherData(data);
      if (showToast) {
        toast.success(`Météo actualisée pour ${city}`);
      }
    } catch (err) {
      console.error('Erreur chargement météo:', err);
      toast.error('Impossible de récupérer les prévisions météo');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/weather/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setCurrentLocation({
          city: data.default_city,
          lat: data.default_lat,
          lon: data.default_lon
        });
        fetchWeather(data.default_lat, data.default_lon, data.default_city);
      }
    } catch (err) {
      fetchWeather(48.8566, 2.3522, 'Paris');
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Recherche de ville avec debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/weather/search?q=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const results = await res.json();
          setSearchResults(results);
        }
      } catch (err) {
        console.error('Erreur recherche ville:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectCity = (cityItem) => {
    setCurrentLocation({
      city: cityItem.name,
      lat: cityItem.latitude,
      lon: cityItem.longitude
    });
    setSearchQuery('');
    setSearchResults([]);
    setIsLoading(true);
    fetchWeather(cityItem.latitude, cityItem.longitude, cityItem.name);
  };

  // Géolocalisation navigateur
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    const toastId = toast.loading("Localisation en cours...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        toast.dismiss(toastId);
        setCurrentLocation({ city: "Ma position", lat, lon });
        setIsLoading(true);
        fetchWeather(lat, lon, "Ma position", true);
      },
      (err) => {
        toast.error("Impossible d'accéder à votre position GPS.", { id: toastId });
      }
    );
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Enregistrement de la configuration...");
    try {
      const res = await fetch('/api/weather/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success("Paramètres enregistrés !", { id: toastId });
        setIsSettingsOpen(false);
        fetchWeather(config.default_lat, config.default_lon, config.default_city, true);
      } else {
        toast.error("Erreur lors de la sauvegarde", { id: toastId });
      }
    } catch (err) {
      toast.error("Échec de la communication", { id: toastId });
    }
  };

  const renderWeatherIcon = (iconName, className = "w-8 h-8") => {
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

  const { synthesis, sources, hourly_chart, daily_forecast } = weatherData || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <CloudSun className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
              Station Météo Multi-Sources & IA
            </h1>
            <p className="text-sm text-zinc-400">
              Agrégation de Météo-France, MET Norway et Global Ensemble compilée par Gemini 2.5 Flash
            </p>
          </div>
        </div>

        {/* Contrôles Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGeolocate}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-200 transition-colors shadow-sm"
            title="Me géolocaliser"
          >
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>Position GPS</span>
          </button>

          <button
            onClick={() => fetchWeather(currentLocation.lat, currentLocation.lon, currentLocation.city, true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-medium text-cyan-300 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            <span>Clé Gemini & Ville</span>
          </button>
        </div>
      </div>

      {/* Barre de recherche de ville avec dropdown */}
      <div className="relative max-w-xl">
        <div className="relative">
          <MapPin className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une ville (ex: Lyon, Marseille, Brest, Montréal...)"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-10 py-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-lg shadow-black/20"
          />
          {isSearching && (
            <RefreshCw className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
          )}
        </div>

        {/* Dropdown de suggestions de villes */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-zinc-800"
            >
              {searchResults.map((res) => (
                <button
                  key={res.id || `${res.latitude}-${res.longitude}`}
                  onClick={() => handleSelectCity(res)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-zinc-800/80 transition-colors text-sm text-zinc-200 group"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                    <div>
                      <span className="font-semibold text-zinc-100">{res.name}</span>
                      {res.admin1 && <span className="text-xs text-zinc-400"> ({res.admin1})</span>}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">{res.country}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[45vh] text-zinc-400 gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-cyan-400" />
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-zinc-200">Interrogation des 3 modèles météo...</p>
            <p className="text-xs text-zinc-500">Météo-France (Arome) • MET Norway (ECMWF) • Global Ensemble</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Hero Banner Consensus IA Gemini */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-zinc-900 to-indigo-950/40 border border-cyan-500/30 shadow-2xl space-y-6 relative overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Gauche : Température consensuelle & Condition */}
              <div className="flex items-center gap-6">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
                  {renderWeatherIcon(sources?.meteofrance?.icon || 'cloud-sun', "w-16 h-16 sm:w-20 sm:h-20")}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Consensus 3 Modèles
                    </span>
                    {synthesis?.ai_generated ? (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        IA Gemini 2.5 Flash
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700/50">
                        Mode Moyenne Mathématique
                      </span>
                    )}
                    <span className="text-sm font-semibold text-zinc-400 flex items-center gap-1 ml-auto">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      {weatherData?.city}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl sm:text-6xl font-black text-zinc-100 tracking-tight">
                      {synthesis?.consensus_temp}°C
                    </span>
                    <span className="text-lg font-medium text-zinc-400">
                      {synthesis?.consensus_condition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Droite : Indice de Confiance IA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Indice de Confiance : {synthesis?.confidence_score}%</span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    {synthesis?.confidence_label}
                  </p>
                </div>
                <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-2 sm:pt-0 sm:pl-4">
                  <div className="text-center px-2">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Risque Pluie</div>
                    <div className={`text-sm font-bold ${synthesis?.umbrella_needed ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {synthesis?.rain_risk_level}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bulletin & Conseils IA Gemini */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800/80">
              {/* Bulletin du jour */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Synthèse du jour</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {synthesis?.summary}
                </p>
              </div>

              {/* Tenue conseillée */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Shirt className="w-4 h-4" />
                  <span>Tenue vestimentaire</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {synthesis?.outfit_advice}
                </p>
              </div>

              {/* Activités & Sorties */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Bike className="w-4 h-4" />
                  <span>Activités & Extérieur</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {synthesis?.activities_advice}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Comparateur des 3 sources météorologiques */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              Comparateur des 3 Modèles Météo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Météo-France */}
              {sources?.meteofrance && (
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-sky-500/30 space-y-4 hover:border-sky-500/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">{sources.meteofrance.country}</span>
                      <h3 className="text-sm font-bold text-zinc-100">{sources.meteofrance.name}</h3>
                    </div>
                    {renderWeatherIcon(sources.meteofrance.icon, "w-8 h-8")}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-zinc-100">{sources.meteofrance.temp}°C</span>
                    <span className="text-xs text-zinc-400">Ressenti {sources.meteofrance.apparent_temp}°C</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{sources.meteofrance.wind_kmh} km/h (raf. {sources.meteofrance.wind_gusts_kmh})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-400" />
                      <span>{sources.meteofrance.humidity}% hum.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>{sources.meteofrance.pressure_hpa} hPa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{sources.meteofrance.cloud_cover}% nuages</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. MET Norway */}
              {sources?.metnorway && (
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-indigo-500/30 space-y-4 hover:border-indigo-500/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">{sources.metnorway.country}</span>
                      <h3 className="text-sm font-bold text-zinc-100">{sources.metnorway.name}</h3>
                    </div>
                    {renderWeatherIcon(sources.metnorway.icon, "w-8 h-8")}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-zinc-100">{sources.metnorway.temp}°C</span>
                    <span className="text-xs text-zinc-400">Ressenti {sources.metnorway.apparent_temp}°C</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{sources.metnorway.wind_kmh} km/h (raf. {sources.metnorway.wind_gusts_kmh})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-400" />
                      <span>{sources.metnorway.humidity}% hum.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>{sources.metnorway.pressure_hpa} hPa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{sources.metnorway.cloud_cover}% nuages</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Global Ensemble */}
              {sources?.global_ensemble && (
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-emerald-500/30 space-y-4 hover:border-emerald-500/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{sources.global_ensemble.country}</span>
                      <h3 className="text-sm font-bold text-zinc-100">{sources.global_ensemble.name}</h3>
                    </div>
                    {renderWeatherIcon(sources.global_ensemble.icon, "w-8 h-8")}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-zinc-100">{sources.global_ensemble.temp}°C</span>
                    <span className="text-xs text-zinc-400">Ressenti {sources.global_ensemble.apparent_temp}°C</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{sources.global_ensemble.wind_kmh} km/h (raf. {sources.global_ensemble.wind_gusts_kmh})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-400" />
                      <span>{sources.global_ensemble.humidity}% hum.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>{sources.global_ensemble.pressure_hpa} hPa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{sources.global_ensemble.cloud_cover}% nuages</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Graphique 24h : Températures & Probabilité de pluie */}
          {hourly_chart && hourly_chart.length > 0 && (
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-cyan-400" />
                    Évolution des prochaines 24 heures
                  </h2>
                  <p className="text-xs text-zinc-400">Courbe de température (°C) et probabilité de précipitation (%)</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                    <span>Température (°C)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <span className="w-3 h-3 rounded-sm bg-blue-500/40 border border-blue-400/60 inline-block" />
                    <span>Risque pluie (%)</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={hourly_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="hour" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#27272a' }} />
                    <YAxis yAxisId="temp" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#27272a' }} unit="°" />
                    <YAxis yAxisId="rain" orientation="right" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#27272a' }} unit="%" domain={[0, 100]} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <p className="font-bold text-zinc-200">{label}</p>
                              <p className="text-cyan-400 font-semibold">Température : {data.temp}°C</p>
                              <p className="text-blue-400 font-medium">Probabilité pluie : {data.rain_prob}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar yAxisId="rain" dataKey="rain_prob" fill="rgba(59, 130, 246, 0.25)" stroke="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Area yAxisId="temp" type="monotone" dataKey="temp" stroke="#22d3ee" strokeWidth={2.5} fill="rgba(34, 211, 238, 0.1)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Prévisions sur 7 jours */}
          {daily_forecast && daily_forecast.length > 0 && (
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-400" />
                Prévisions sur 7 jours
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {daily_forecast.map((day, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2 hover:border-zinc-700 transition-colors">
                    <div className="text-xs font-bold text-zinc-300">{day.day_name}</div>
                    <div className="text-[10px] text-zinc-500">{day.formatted_date}</div>
                    <div className="my-2 flex justify-center">
                      {renderWeatherIcon(day.icon, "w-8 h-8")}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs font-bold">
                      <span className="text-zinc-100">{day.temp_max}°</span>
                      <span className="text-zinc-500 font-normal">{day.temp_min}°</span>
                    </div>
                    {day.rain_prob > 0 && (
                      <div className="flex items-center justify-center gap-1 text-[10px] text-blue-400">
                        <Droplets className="w-3 h-3" />
                        <span>{day.rain_prob}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Configuration */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100">Paramètres Météo & Clé Gemini</h3>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Clé API Gemini (pour la synthèse IA multi-modèles)
                  </label>
                  <input
                    type="text"
                    required
                    value={config.gemini_api_key}
                    onChange={(e) => setConfig({ ...config, gemini_api_key: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                    placeholder="Votre clé Gemini..."
                  />
                  <span className="text-[10px] text-zinc-500">Utilise Gemini 2.5 Flash pour croiser les modèles météo</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Ville par défaut
                  </label>
                  <input
                    type="text"
                    required
                    value={config.default_city}
                    onChange={(e) => setConfig({ ...config, default_city: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Latitude par défaut
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={config.default_lat}
                      onChange={(e) => setConfig({ ...config, default_lat: parseFloat(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Longitude par défaut
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={config.default_lon}
                      onChange={(e) => setConfig({ ...config, default_lon: parseFloat(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-colors shadow-lg shadow-cyan-500/20"
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
