import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Euro, 
  Settings2, 
  Activity, 
  Clock, 
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';

export function Energie() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [configForm, setConfigForm] = useState({
    pdl: '01139218434363',
    token: '6yAJ9dvdgamG8djiG3sMkoBHqQY0LoZ57eXkYtikVLc=',
    kwh_price: 0.2516,
    subscription_price: 12.50,
    target_monthly_budget: 60.00
  });

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/electricity/stats');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
      if (data.settings) {
        setConfigForm(data.settings);
      }
    } catch (err) {
      console.error("Erreur de récupération des données énergie:", err);
      setError("Impossible de contacter le backend local. Assurez-vous que le backend Python est lancé sur le port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Synchronisation avec Linky / Enedis...");
    try {
      const response = await fetch('/api/electricity/sync', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success(`Données synchronisées (${data.synced_count || 0} jours reçus)`, { id: toastId });
        await fetchStats();
      } else {
        toast.error(data.error || "Erreur lors de la synchronisation", { id: toastId });
      }
    } catch (err) {
      console.error("Erreur sync:", err);
      toast.error("Échec de la communication avec l'API", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Sauvegarde des paramètres...");
    try {
      const response = await fetch('/api/electricity/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdl: configForm.pdl,
          token: configForm.token,
          kwh_price: parseFloat(configForm.kwh_price),
          subscription_price: parseFloat(configForm.subscription_price),
          target_monthly_budget: parseFloat(configForm.target_monthly_budget)
        })
      });
      if (response.ok) {
        toast.success("Paramètres enregistrés et recalculés !", { id: toastId });
        setIsSettingsOpen(false);
        await fetchStats();
      } else {
        toast.error("Erreur lors de l'enregistrement", { id: toastId });
      }
    } catch (err) {
      toast.error("Échec de l'enregistrement", { id: toastId });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(val || 0);
  };

  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
          <p className="font-bold text-zinc-200">{data.day_name} {data.label}</p>
          <div className="flex items-center justify-between gap-4 text-amber-400 font-semibold">
            <span>Énergie :</span>
            <span>{data.kwh} kWh</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400 font-medium">
            <span>Coût estimé :</span>
            <span>{formatCurrency(data.cost)}</span>
          </div>
          {data.max_power_va > 0 && (
            <div className="flex items-center justify-between gap-4 text-indigo-300">
              <span>Puissance max :</span>
              <span>{data.max_power_va} VA</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-zinc-400 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-sm font-medium">Récupération des données Linky & Enedis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-red-950/40 border border-red-800/60 rounded-2xl flex flex-col items-center text-center gap-4 text-red-200">
          <AlertTriangle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold">Erreur de connexion</h2>
          <p className="text-sm text-red-300/80 max-w-md">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-600/20"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const { this_month, yesterday, last_month, comparison_kwh_pct, daily_history, monthly_history } = stats || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Zap className="w-6 h-6 fill-amber-400/20" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
              Suivi Énergie & Linky
            </h1>
            <p className="text-sm text-zinc-400">
              Surveillance de votre consommation électrique et détection de dérapage budgétaire
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-200 transition-colors shadow-sm disabled:opacity-50"
            title="Synchroniser avec Enedis"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Actualiser'}</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-sm font-medium text-amber-300 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            <span>Tarifs & Clés</span>
          </button>
        </div>
      </div>

      {/* Bannière Dérapage Budgétaire */}
      {this_month && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            this_month.is_over_budget
              ? 'bg-gradient-to-r from-red-950/40 via-red-900/20 to-zinc-900/40 border-red-500/40'
              : 'bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-zinc-900/40 border-emerald-500/40'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${
              this_month.is_over_budget ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {this_month.is_over_budget ? (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  this_month.is_over_budget ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {this_month.is_over_budget ? '⚠️ Risque de dérapage' : '✅ Budget sous contrôle'}
                </span>
                <span className="text-xs text-zinc-400">Projection {this_month.month_name}</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mt-1">
                {this_month.is_over_budget
                  ? `Dépassement estimé de +${formatCurrency(this_month.budget_delta)} par rapport à votre mensualité`
                  : `Vous êtes dans les clous ! Marge estimée de ${formatCurrency(Math.abs(this_month.budget_delta))}`}
              </h3>
              <p className="text-sm text-zinc-400 mt-0.5">
                Facture mensuelle projetée : <strong className="text-zinc-200">{formatCurrency(this_month.projected_cost)}</strong> (pour une mensualité cible de {formatCurrency(this_month.target_budget)}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-zinc-800 pt-3 md:pt-0 md:pl-6 shrink-0">
            <div className="text-right">
              <div className="text-xs text-zinc-400">Consommation moyenne</div>
              <div className="text-xl font-black text-amber-400">{this_month.daily_avg_kwh} <span className="text-xs font-normal text-zinc-400">kWh/jour</span></div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Facture ce mois */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-sm">
            <span className="font-medium">Coût cumulé ({this_month?.month_name})</span>
            <Euro className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">
              {formatCurrency(this_month?.current_cost)}
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
              <span>Énergie : {formatCurrency(this_month?.energy_cost)}</span>
              <span>Abo : {formatCurrency(configForm.subscription_price)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Budget consommé</span>
              <span>{this_month?.budget_used_pct}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  (this_month?.budget_used_pct || 0) > 90 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(this_month?.budget_used_pct || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2 : Total kWh mois */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-sm">
            <span className="font-medium">Énergie consommée</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">
              {this_month?.total_kwh} <span className="text-lg font-normal text-zinc-400">kWh</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Sur {this_month?.days_elapsed} jours relevés ({this_month?.days_total} jours au total)
            </div>
          </div>
          <div className="text-xs text-amber-400/90 font-medium">
            Projection fin de mois : ~{this_month?.projected_kwh} kWh
          </div>
        </div>

        {/* KPI 3 : Conso Hier */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-sm">
            <span className="font-medium">Consommation hier</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">
              {yesterday ? yesterday.kwh : 0} <span className="text-lg font-normal text-zinc-400">kWh</span>
            </div>
            <div className="text-xs text-emerald-400 font-semibold mt-1">
              Coût estimé : {formatCurrency(yesterday?.cost)}
            </div>
          </div>
          <div className="text-xs text-zinc-400">
            Relevé du {yesterday?.formatted_date || 'N/A'}
          </div>
        </div>

        {/* KPI 4 : Tendance vs M-1 */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 text-sm">
            <span className="font-medium">Comparatif {last_month?.month_name}</span>
            {comparison_kwh_pct > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="my-3">
            <div className={`text-3xl font-extrabold tracking-tight ${
              comparison_kwh_pct > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {comparison_kwh_pct > 0 ? `+${comparison_kwh_pct}%` : `${comparison_kwh_pct}%`}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Mois dernier : {last_month?.total_kwh} kWh ({formatCurrency(last_month?.total_cost)})
            </div>
          </div>
          <div className="text-xs text-zinc-400">
            {comparison_kwh_pct > 0 ? 'Surconsommation par rapport à M-1' : 'Économie par rapport à M-1'}
          </div>
        </div>
      </div>

      {/* Graphique de consommation journalière */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              Consommation quotidienne (35 derniers jours)
            </h2>
            <p className="text-xs text-zinc-400">Évolution jour par jour en kWh avec infobulle du coût calculé</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
              <span>Conso (kWh)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400/50 inline-block" />
              <span>Moyenne ({this_month?.daily_avg_kwh} kWh)</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily_history || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#71717a" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#27272a' }}
                unit="k"
              />
              <Tooltip content={customTooltip} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
              {this_month?.daily_avg_kwh && (
                <ReferenceLine 
                  y={this_month.daily_avg_kwh} 
                  stroke="#fbbf24" 
                  strokeDasharray="4 4" 
                  strokeOpacity={0.6}
                />
              )}
              <Bar 
                dataKey="kwh" 
                radius={[4, 4, 0, 0]}
              >
                {(daily_history || []).map((entry, index) => {
                  const isHigh = this_month?.daily_avg_kwh && entry.kwh > this_month.daily_avg_kwh * 1.5;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isHigh ? '#f87171' : '#f59e0b'} 
                      className="hover:opacity-80 transition-opacity"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historique Mensuel */}
      {monthly_history && monthly_history.length > 0 && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Historique mensuel consolidé
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {monthly_history.map((m, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-center space-y-1">
                <div className="text-xs font-semibold text-zinc-400">{m.label}</div>
                <div className="text-lg font-bold text-zinc-100">{m.kwh} <span className="text-xs font-normal text-zinc-400">kWh</span></div>
                <div className="text-xs font-semibold text-emerald-400">{formatCurrency(m.cost)}</div>
              </div>
            ))}
          </div>
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
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100">Paramètres Linky & Tarifs</h3>
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
                    Numéro PRM / Point de Livraison (14 chiffres)
                  </label>
                  <input
                    type="text"
                    required
                    value={configForm.pdl}
                    onChange={(e) => setConfigForm({ ...configForm, pdl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="01139218434363"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Clé d'accès MyElectricalData (Token API)
                  </label>
                  <input
                    type="text"
                    required
                    value={configForm.token}
                    onChange={(e) => setConfigForm({ ...configForm, token: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors font-mono text-xs"
                    placeholder="Votre clé token..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Prix du kWh (€ TTC)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={configForm.kwh_price}
                      onChange={(e) => setConfigForm({ ...configForm, kwh_price: e.target.value })}
                      className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500">Ex: 0.2516 € (Tarif Bleu)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Abonnement mensuel (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={configForm.subscription_price}
                      onChange={(e) => setConfigForm({ ...configForm, subscription_price: e.target.value })}
                      className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500">Ex: 12.50 €/mois</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Mensualité cible EDF (€)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={configForm.target_monthly_budget}
                    onChange={(e) => setConfigForm({ ...configForm, target_monthly_budget: e.target.value })}
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <span className="text-[10px] text-zinc-500">Le montant prélevé par EDF pour déclencher l'alerte de dérapage</span>
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
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-lg shadow-amber-500/20"
                  >
                    Enregistrer & Recalculer
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
