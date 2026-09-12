import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Key, 
  Smartphone, 
  Laptop, 
  Download, 
  Trash2, 
  RefreshCw, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  History,
  PlusCircle,
  HelpCircle,
  Clock,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Securite() {
  const [certsData, setCertsData] = useState({ ca_exists: false, certs: [] });
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  
  // Formulaire de création
  const [deviceName, setDeviceName] = useState('');
  const [password, setPassword] = useState('VicozWorld2026!');
  const [email, setEmail] = useState('');
  const [lastGenerated, setLastGenerated] = useState(null);

  const fetchCerts = async () => {
    try {
      const res = await fetch('/api/admin/certs');
      if (res.ok) {
        const data = await res.json();
        setCertsData(data);
      }
    } catch (e) {
      console.warn('Erreur récupération certificats:', e);
    }
  };

  const fetchLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      const res = await fetch('/api/admin/access-logs?limit=30');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Erreur récupération logs:', e);
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchCerts(), fetchLogs()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      toast.error("Veuillez renseigner le nom de l'équipement.");
      return;
    }

    setIsGenerating(true);
    setLastGenerated(null);
    try {
      const res = await fetch('/api/admin/certs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_name: deviceName.trim(),
          password: password.trim() || 'VicozWorld2026!',
          email: email.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Échec de génération du certificat.");
      }

      toast.success(`Badge créé pour ${data.name} !`);
      setLastGenerated({
        name: data.name,
        download_url: data.download_url,
        password: password.trim(),
        email_sent: data.email_sent
      });
      setDeviceName('');
      await fetchCerts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Supprimer le certificat pour "${name}" ? L'appareil ne pourra plus se connecter.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/certs/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success(`Certificat ${name} supprimé.`);
        await fetchCerts();
      } else {
        toast.error("Impossible de supprimer le certificat.");
      }
    } catch (e) {
      toast.error("Erreur réseau.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Centre de Sécurité & Badges mTLS
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Gestion cryptographique des accès matériels privés à VicozWorld
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            CA Racine Active (4096-bit)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche : Formulaire de création */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Nouveau Badge d'Accès</h2>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Générez un certificat client au format standard <strong>.p12</strong> pour autoriser un équipement physique à se connecter.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nom de l'équipement <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="ex: Claire-PC, Papa-iPad, MacBook-Pro"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Mot de passe du fichier .p12 <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Requis pour déverrouiller l'importation sur l'appareil.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email du destinataire <span className="text-zinc-500">(optionnel)</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="maman@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Envoie automatiquement le fichier .p12 en pièce jointe.
                </span>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Génération cryptographique...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Créer le Badge (.p12)
                  </>
                )}
              </button>
            </form>

            {/* Téléchargement instantané si généré */}
            {lastGenerated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3"
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Badge créé pour {lastGenerated.name} !
                </div>
                <p className="text-xs text-zinc-300">
                  Mot de passe : <code className="bg-black/40 px-2 py-0.5 rounded text-emerald-400 font-mono">{lastGenerated.password}</code>
                </p>
                {lastGenerated.email_sent && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Envoyé par email en pièce jointe !
                  </p>
                )}
                <a
                  href={lastGenerated.download_url}
                  download={`${lastGenerated.name}.p12`}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger {lastGenerated.name}.p12
                </a>
              </motion.div>
            )}
          </div>

          {/* Guide rapide installation */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 text-xs text-zinc-400 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-zinc-200">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              Comment installer le badge ?
            </div>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-zinc-300">Windows / Mac</strong> : double-cliquez sur le .p12 et entrez le mot de passe.</li>
              <li><strong className="text-zinc-300">iPhone / iPad</strong> : ouvrez le fichier ➔ Réglages ➔ Profil téléchargé ➔ Installer.</li>
              <li><strong className="text-zinc-300">Android</strong> : Paramètres ➔ Sécurité ➔ Installer un certificat.</li>
            </ul>
          </div>
        </div>

        {/* Colonne Droite : Appareils & Historique des connexions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Liste des équipements autorisés */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">Appareils Certifiés</h2>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {certsData.certs.length} actif{certsData.certs.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={fetchCerts}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Actualiser la liste"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {certsData.certs.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Aucun certificat client généré pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certsData.certs.map((c) => (
                  <div
                    key={c.name}
                    className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800/80 flex items-center justify-center text-indigo-400 border border-zinc-700/50">
                          {c.name.toLowerCase().includes('phone') ? (
                            <Smartphone className="w-5 h-5" />
                          ) : (
                            <Laptop className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{c.name}</div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" /> {c.expires_at}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(c.name)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Révoquer / Supprimer ce badge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">Créé le {c.created_at}</span>
                      <a
                        href={c.download_url}
                        download={`${c.name}.p12`}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        Télécharger .p12
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Journal de surveillance des accès (Audit Log) */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Journal d'Audit des Connexions</h2>
              </div>
              <button
                onClick={fetchLogs}
                disabled={isRefreshingLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                    <th className="pb-3 pr-4">Appareil Identifié</th>
                    <th className="pb-3 pr-4">IP</th>
                    <th className="pb-3 pr-4">Requête</th>
                    <th className="pb-3 pr-4">Date / Heure</th>
                    <th className="pb-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-zinc-500">
                        Aucun accès enregistré dans le journal.
                      </td>
                    </tr>
                  ) : (
                    logs.slice(0, 15).map((l) => {
                      const isAuth = l.device_cn && !l.device_cn.includes('Anonyme');
                      return (
                        <tr key={l.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-2.5 pr-4 font-medium flex items-center gap-1.5 text-zinc-200">
                            {isAuth ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <Lock className="w-3 h-3 text-emerald-400" />
                                {l.device_cn}
                              </span>
                            ) : (
                              <span className="text-zinc-500 italic flex items-center gap-1">
                                <Globe className="w-3 h-3 text-zinc-500" />
                                {l.device_cn}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-zinc-400 font-mono">{l.ip}</td>
                          <td className="py-2.5 pr-4 text-zinc-300 font-mono">
                            <span className="text-indigo-400 font-bold mr-1">{l.method}</span>
                            {l.path}
                          </td>
                          <td className="py-2.5 pr-4 text-zinc-400">{l.timestamp}</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.status_code < 400 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {l.status_code}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
