import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, RefreshCw, AlertCircle, CreditCard, Wallet, TrendingUp } from 'lucide-react';

export function Banque() {
  const [balances, setBalances] = useState({ accounts: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBalances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Appel à notre API Python locale
      const response = await fetch('http://127.0.0.1:8000/api/balances');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      setBalances(data);
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

  // Grouper les comptes par banque pour un meilleur affichage
  const groupedAccounts = balances.accounts.reduce((acc, account) => {
    if (!acc[account.bank_name]) {
      acc[account.bank_name] = [];
    }
    acc[account.bank_name].push(account);
    return acc;
  }, {});

  const formatCurrency = (amount, currency = "EUR") => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="flex-1 flex flex-col relative min-h-screen overflow-hidden p-6 md:p-12">
      {/* Effets de fond */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-6 shadow-xl shadow-emerald-500/10">
              <Landmark className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
              Comptes Bancaires
            </h1>
            <p className="text-zinc-400 mt-2">Vue consolidée en temps réel via Woob en local.</p>
          </div>
          
          <button
            onClick={fetchBalances}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-xl font-medium text-zinc-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-20"
            >
              <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-zinc-400 text-lg">Connexion sécurisée aux banques...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 md:p-10 text-center max-w-2xl mx-auto"
            >
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-200 mb-2">Erreur de connexion</h3>
              <p className="text-red-400/80 mb-6">{error}</p>
              <div className="text-left bg-zinc-950 p-4 rounded-xl text-sm font-mono text-zinc-400">
                <p>1. Ouvrez un terminal</p>
                <p>2. Allez dans le dossier <code>backend</code></p>
                <p>3. Lancez <code>python server.py</code></p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Total Card */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] group-hover:bg-emerald-500/10 transition-colors duration-700" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 text-zinc-400 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span className="font-medium uppercase tracking-wider text-sm">Solde Global</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight">
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
                  <p className="text-zinc-500 text-sm mt-2">Avez-vous bien configuré vos modules via `woob config add` ?</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
