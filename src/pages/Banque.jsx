import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, RefreshCw, AlertCircle, CreditCard, Wallet, TrendingUp, LineChart as LineChartIcon, Settings2, Calculator } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalculatorWidget } from '../components/Calculator';

export function Banque() {
  const [balances, setBalances] = useState({ accounts: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comptes'); // 'comptes' | 'simulateur'

  // States du simulateur
  const [initialCapital, setInitialCapital] = useState(0);
  const [monthlyContribution, setMonthlyContribution] = useState(100);
  const [annualRate, setAnnualRate] = useState(3.0);
  const [durationYears, setDurationYears] = useState(10);

  const fetchBalances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/balances');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      setBalances(data);
      // Préremplir le simulateur avec le solde réel s'il était à zéro
      if (initialCapital === 0) {
        setInitialCapital(Math.floor(data.total));
      }
    } catch (err) {
      console.error("Erreur de récupération des soldes:", err);
      setError("Impossible de contacter le serveur local. Assurez-vous que le backend Python est lancé sur le port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const groupedAccounts = balances.accounts.reduce((acc, account) => {
    if (!acc[account.bank_name]) {
      acc[account.bank_name] = [];
    }
    acc[account.bank_name].push(account);
    return acc;
  }, {});

  const formatCurrency = (amount, currency = "EUR") => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(amount);
  };

  // Calcul du simulateur
  const projectionData = useMemo(() => {
    const data = [];
    const pCapital = Number(initialCapital) || 0;
    const pMonthly = Number(monthlyContribution) || 0;
    const pRate = Number(annualRate) || 0;
    const pDuration = Number(durationYears) || 0;

    let currentCapital = pCapital;
    const monthlyRate = (pRate / 100) / 12;

    for (let year = 0; year <= pDuration; year++) {
      if (year === 0) {
        data.push({
          year: `Année ${year}`,
          TotalVersé: pCapital,
          Capital: pCapital,
          Intérêts: 0
        });
        continue;
      }

      let yearTotalInvested = pCapital + (pMonthly * 12 * year);
      
      for (let month = 1; month <= 12; month++) {
        currentCapital = currentCapital * (1 + monthlyRate) + pMonthly;
      }

      data.push({
        year: `Année ${year}`,
        TotalVersé: Math.round(yearTotalInvested),
        Capital: Math.round(currentCapital),
        Intérêts: Math.round(currentCapital - yearTotalInvested)
      });
    }
    return data;
  }, [initialCapital, monthlyContribution, annualRate, durationYears]);

  const finalProjection = projectionData[projectionData.length - 1] || { Capital: 0, TotalVersé: 0, Intérêts: 0 };

  return (
    <div className="flex-1 flex flex-col relative min-h-screen overflow-hidden p-4 md:p-6 lg:p-12">
      {/* Effets de fond */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto relative z-10 flex-1 flex flex-col">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-6 shadow-xl shadow-emerald-500/10">
              <Landmark className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
              Mon Patrimoine
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('comptes')}
              className={`flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl font-medium transition-all ${
                activeTab === 'comptes' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Wallet className="w-5 h-5" />
              Comptes Réels
            </button>
            <button
              onClick={() => setActiveTab('simulateur')}
              className={`flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl font-medium transition-all ${
                activeTab === 'simulateur' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <LineChartIcon className="w-5 h-5" />
              Simulateur
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'comptes' && (
            <motion.div
              key="comptes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex justify-end mb-4">
                <button
                  onClick={fetchBalances}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-xl font-medium text-zinc-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                  <p className="text-zinc-400 text-lg">Connexion sécurisée aux banques...</p>
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 md:p-10 text-center max-w-2xl mx-auto">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-red-200 mb-2">Erreur de connexion</h3>
                  <p className="text-red-400/80 mb-6">{error}</p>
                </div>
              ) : (
                <>
                  {/* Total Card */}
                  <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 md:p-8 lg:p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] group-hover:bg-emerald-500/10 transition-colors duration-700" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 text-zinc-400 mb-4">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span className="font-medium uppercase tracking-wider text-sm">Solde Global</span>
                      </div>
                      <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tight">
                        {formatCurrency(balances.total)}
                      </h2>
                    </div>
                  </div>

                  {/* Groupes de banques */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(groupedAccounts).map(([bankName, accounts]) => (
                      <div key={bankName} className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-sm">
                        <h3 className="text-xl font-bold text-zinc-200 mb-6 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                            <Landmark className="w-4 h-4 text-zinc-400" />
                          </div>
                          {bankName}
                        </h3>
                        
                        <div className="space-y-4">
                          {accounts.map(account => (
                            <div key={account.id} className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 hover:border-emerald-500/30 transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-zinc-900 rounded-xl group-hover:bg-emerald-500/10 transition-colors">
                                  {account.label.toLowerCase().includes('livret') || account.label.toLowerCase().includes('epargne') ? (
                                    <Wallet className="w-5 h-5 text-emerald-500" />
                                  ) : (
                                    <CreditCard className="w-5 h-5 text-indigo-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-zinc-200">{account.label}</p>
                                  <p className="text-xs text-zinc-500 mt-0.5">ID: {account.id}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-white">{formatCurrency(account.balance, account.currency)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {balances.accounts.length === 0 && (
                    <div className="text-center p-12 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
                      <p className="text-zinc-400 text-lg">Aucun compte bancaire n'a été trouvé.</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'simulateur' && (
            <motion.div
              key="simulateur"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Controles du simulateur */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 md:p-6 lg:p-8 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-8 text-indigo-400">
                  <Settings2 className="w-6 h-6" />
                  <h3 className="text-xl font-bold text-zinc-100">Paramètres de la simulation</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Capital de départ (€)</label>
                    <input 
                      type="number" 
                      value={initialCapital}
                      onChange={(e) => setInitialCapital(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Versement mensuel (€)</label>
                    <input 
                      type="number" 
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Taux net annuel (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={annualRate}
                      onChange={(e) => setAnnualRate(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Durée (Années)</label>
                    <input 
                      type="number" 
                      value={durationYears}
                      onChange={(e) => setDurationYears(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Résumé */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-center">
                  <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider mb-2">Total versé (Effort)</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">{formatCurrency(finalProjection.TotalVersé)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/20 rounded-full blur-[30px]" />
                  <p className="text-emerald-500/80 text-sm font-medium uppercase tracking-wider mb-2">Intérêts générés</p>
                  <p className="text-2xl md:text-3xl font-bold text-emerald-400">+{formatCurrency(finalProjection.Intérêts)}</p>
                </div>
                <div className="bg-indigo-600 border border-indigo-500 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden shadow-lg shadow-indigo-600/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[40px]" />
                  <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calculator className="w-4 h-4" /> Capital Final
                  </p>
                  <p className="text-3xl md:text-4xl font-black text-white">{formatCurrency(finalProjection.Capital)}</p>
                </div>
              </div>

              {/* Graphique */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-4 md:p-6 lg:p-8 h-[350px] md:h-[500px] overflow-x-auto">
                <h3 className="text-lg font-bold text-zinc-300 mb-6">Évolution du patrimoine</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={projectionData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInterets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="year" 
                      stroke="#71717a" 
                      tick={{ fill: '#71717a' }}
                      tickMargin={10}
                    />
                    <YAxis 
                      stroke="#71717a" 
                      tick={{ fill: '#71717a' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      width={60}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }}
                      itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="TotalVersé" 
                      stackId="1" 
                      stroke="#4f46e5" 
                      fill="url(#colorTotal)" 
                      strokeWidth={3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Intérêts" 
                      stackId="1" 
                      stroke="#10b981" 
                      fill="url(#colorInterets)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Calculator */}
      <CalculatorWidget />
    </div>
  );
}
