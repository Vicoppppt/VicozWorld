import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Globe,
  Share2,
  Copy,
  Timer,
  Server,
  XCircle,
  ChevronRight,
  Sliders
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProfile } from '../context/ProfileContext';

// Palette de couleurs néon distinctes par appareil
const PALETTES = [
  { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', dot: 'bg-cyan-400', glow: 'shadow-cyan-500/20' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400', glow: 'shadow-emerald-500/20' },
  { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', dot: 'bg-pink-400', glow: 'shadow-pink-500/20' },
  { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-400', glow: 'shadow-purple-500/20' },
  { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400', glow: 'shadow-amber-500/20' },
  { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400', glow: 'shadow-blue-500/20' },
  { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-400', glow: 'shadow-rose-500/20' },
  { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', dot: 'bg-indigo-400', glow: 'shadow-indigo-500/20' }
];

function getDeviceColor(deviceName) {
  if (!deviceName) return { text: 'text-zinc-500', bg: 'bg-zinc-800/50', border: 'border-zinc-700', dot: 'bg-zinc-500', glow: '' };
  const lower = deviceName.toLowerCase();
  if (lower.includes('victor-pc')) return PALETTES[0]; // Cyan
  if (lower.includes('victor-iphone')) return PALETTES[1]; // Emerald
  if (lower.includes('claire-pc')) return PALETTES[2]; // Pink
  if (lower.includes('claire-ipad') || lower.includes('claire')) return PALETTES[3]; // Purple
  if (lower.includes('invité') || lower.includes('guest')) return PALETTES[4]; // Amber
  
  // Hachage déterministe pour les autres
  let hash = 0;
  for (let i = 0; i < deviceName.length; i++) {
    hash = deviceName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PALETTES.length;
  return PALETTES[idx];
}

export function Securite() {
  const { deviceInfo, isMaman } = useProfile();
  const isVictor = !isMaman && (!deviceInfo?.device_cn || deviceInfo.device_cn.toLowerCase().includes('victor'));

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

  // OTP Invité 2 minutes
  const [guestCodeState, setGuestCodeState] = useState({ active: false, code: null, remaining_seconds: 0, guest_url: null });
  const [isGeneratingGuest, setIsGeneratingGuest] = useState(false);

  // Services NPM configurables
  const [selectedService, setSelectedService] = useState('dozzle');

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
      const res = await fetch('/api/admin/access-logs?limit=40');
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

  const fetchGuestStatus = async () => {
    try {
      const res = await fetch('/api/admin/guest-code/status');
      if (res.ok) {
        const data = await res.json();
        setGuestCodeState(data);
      }
    } catch (e) {
      console.warn('Erreur statut guest code:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchCerts(), fetchLogs(), fetchGuestStatus()]);
      setIsLoading(false);
    };
    init();

    // Timer de rafraîchissement du compte à rebours invité
    const interval = setInterval(() => {
      setGuestCodeState(prev => {
        if (prev.active && prev.remaining_seconds > 0) {
          return { ...prev, remaining_seconds: prev.remaining_seconds - 1 };
        } else if (prev.active && prev.remaining_seconds <= 0) {
          return { active: false, code: null, remaining_seconds: 0, guest_url: null };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
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

      if (data.email_sent) {
        toast.success(`Badge créé et envoyé par email à ${email} !`);
      } else if (email.trim() && data.email_error) {
        toast.error(`Email non envoyé: ${data.email_error}`, { duration: 6000 });
      } else {
        toast.success(`Badge créé pour ${data.name} !`);
      }

      setLastGenerated({
        name: data.name,
        download_url: data.download_url,
        password: password.trim(),
        email_sent: data.email_sent,
        email_error: data.email_error
      });
      setDeviceName('');
      setEmail('');
      await fetchCerts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateGuestCode = async () => {
    setIsGeneratingGuest(true);
    try {
      const res = await fetch('/api/admin/guest-code/generate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setGuestCodeState({
          active: true,
          code: data.code,
          remaining_seconds: data.expires_in_seconds,
          guest_url: data.guest_url
        });
        navigator.clipboard.writeText(data.guest_url);
        toast.success("Code invité 2 min généré & lien copié !");
      } else {
        toast.error(data.detail || "Erreur création code invité.");
      }
    } catch (e) {
      toast.error("Erreur de connexion.");
    } finally {
      setIsGeneratingGuest(false);
    }
  };

  const handleRevokeGuestCode = async () => {
    try {
      const res = await fetch('/api/admin/guest-code/revoke', { method: 'POST' });
      if (res.ok) {
        setGuestCodeState({ active: false, code: null, remaining_seconds: 0, guest_url: null });
        toast.success("Code invité révoqué instantanément.");
      }
    } catch (e) {
      toast.error("Erreur réseau.");
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

  // Sécurité renforcée : Si ce n'est pas Victor, bloquer la vue
  if (!isVictor) {
    return (
      <div className="max-w-2xl mx-auto my-20 p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Zone d'Administration Restreinte</h1>
        <p className="text-sm text-zinc-400">
          Seuls les équipements certifiés de Victor ont les privilèges pour administrer les badges de sécurité et consulter les journaux d'audit.
        </p>
      </div>
    );
  }

  // Snippets NPM pour les autres services
  const NPM_SNIPPETS = {
    dozzle: `# Dans NPM > dozzle.vicopetit.dedyn.io > Advanced :
ssl_client_certificate /data/custom_ssl/ca.crt;
ssl_verify_client on;`,
    casa: `# Dans NPM > casa.vicopetit.dedyn.io > Advanced :
ssl_client_certificate /data/custom_ssl/ca.crt;
ssl_verify_client on;`,
    ng: `# Dans NPM > ng.vicopetit.dedyn.io > Advanced :
ssl_client_certificate /data/custom_ssl/ca.crt;
ssl_verify_client on;`
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Centre de Sécurité & Badges mTLS
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Gestion cryptographique des accès matériels privés à VicozWorld & CasaOS
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            CA Racine Active (4096-bit)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche : Formulaire création + OTP Invité */}
        <div className="lg:col-span-1 space-y-6">
          {/* Nouveau Badge */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">Nouveau Badge d'Accès</h2>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Générez un certificat client <strong>.p12</strong> pour autoriser un équipement physique à se connecter.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nom de l'équipement <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Claire-PC, Papa-iPad, MacBook-Pro"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Mot de passe du fichier .p12 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Requis pour déverrouiller l'importation sur l'appareil.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email du destinataire <span className="text-zinc-500">(optionnel)</span>
                </label>
                <input
                  type="email"
                  placeholder="maman@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Envoie automatiquement le fichier .p12 en pièce jointe.
                </span>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.01]"
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

            {lastGenerated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 space-y-3"
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Badge créé pour {lastGenerated.name} !
                </div>
                <p className="text-xs text-zinc-300">
                  Mot de passe : <code className="bg-black/40 px-2 py-0.5 rounded text-cyan-400 font-mono">{lastGenerated.password}</code>
                </p>
                {lastGenerated.email_sent ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Envoyé par email en pièce jointe !
                  </p>
                ) : lastGenerated.email_error ? (
                  <p className="text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Notice email : {lastGenerated.email_error}
                  </p>
                ) : null}
                <a
                  href={lastGenerated.download_url}
                  download={`${lastGenerated.name}.p12`}
                  className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger {lastGenerated.name}.p12
                </a>
              </motion.div>
            )}
          </div>

          {/* Mode Démo / Code Invité Dynamique 2 Minutes */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Accès Invité Temporaire</h2>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Chrono 2 min
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              Générez un <strong>code OTP à 6 chiffres éphémère</strong> valable 2 minutes. Il ouvre une session temporaire sur l'appareil d'un ami sans certificat.
            </p>

            {guestCodeState.active && guestCodeState.code ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Code à usage unique :</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    {Math.floor(guestCodeState.remaining_seconds / 60)}:
                    {(guestCodeState.remaining_seconds % 60).toString().padStart(2, '0')} restants
                  </div>
                </div>

                <div className="text-center py-2 bg-black/40 rounded-xl font-mono text-2xl font-bold tracking-widest text-amber-300 border border-amber-500/20">
                  {guestCodeState.code}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(guestCodeState.guest_url);
                      toast.success("Lien avec code copié !");
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copier le lien invité
                  </button>
                  <button
                    onClick={handleRevokeGuestCode}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-600 hover:text-white text-zinc-400 transition-colors"
                    title="Révoquer maintenant"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateGuestCode}
                disabled={isGeneratingGuest}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-medium text-xs flex items-center justify-center gap-2 border border-amber-500/20 transition-all hover:scale-[1.01]"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                {isGeneratingGuest ? "Génération..." : "Générer un code invité (Valable 2 min)"}
              </button>
            )}
          </div>
        </div>

        {/* Colonne Droite : Appareils & Historique des connexions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Liste des équipements autorisés avec COULEURS DISTINCTES */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-cyan-400" />
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
                {certsData.certs.map((c) => {
                  const color = getDeviceColor(c.name);
                  return (
                    <div
                      key={c.name}
                      className={`p-4 rounded-xl bg-zinc-950/70 border ${color.border} hover:border-zinc-500 transition-all flex flex-col justify-between space-y-3 shadow-md`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${color.bg} ${color.text} flex items-center justify-center border ${color.border}`}>
                            {c.name.toLowerCase().includes('phone') ? (
                              <Smartphone className="w-5 h-5" />
                            ) : (
                              <Laptop className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className={`text-sm font-bold flex items-center gap-1.5 ${color.text}`}>
                              <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                              {c.name}
                            </div>
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
                          <Download className="w-3 h-3 text-cyan-400" />
                          Télécharger .p12
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gestion des autres proxys CasaOS (Dozzle, CasaOS, NPM) */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Sécurisation Multi-Services (CasaOS)</h2>
            </div>
            <p className="text-xs text-zinc-400">
              Vos certificats fonctionnent pour <strong>TOUS</strong> vos sous-domaines configurés sur Nginx Proxy Manager. Vous pouvez appliquer la même sécurité mTLS à Dozzle ou CasaOS :
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'vw', name: 'vw.vicopetit...', desc: 'VicozWorld', status: 'Protégé 🔒', active: true },
                { id: 'dozzle', name: 'dozzle.vicopetit...', desc: 'Logs Docker', status: 'À sécuriser', active: false },
                { id: 'casa', name: 'casa.vicopetit...', desc: 'CasaOS', status: 'À sécuriser', active: false },
                { id: 'ng', name: 'ng.vicopetit...', desc: 'Proxy Manager', status: 'À sécuriser', active: false }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedService === s.id 
                      ? 'bg-zinc-800/90 border-cyan-500/50' 
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white truncate">{s.name}</div>
                  <div className="text-[11px] text-zinc-400">{s.desc}</div>
                  <div className={`text-[10px] font-semibold mt-1 ${s.active ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {s.status}
                  </div>
                </button>
              ))}
            </div>

            {selectedService !== 'vw' && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Règle NPM pour <code className="text-cyan-400">{selectedService}.vicopetit.dedyn.io</code> :</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(NPM_SNIPPETS[selectedService]);
                      toast.success("Règle NPM copiée !");
                    }}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <Copy className="w-3 h-3" /> Copier le bloc
                  </button>
                </div>
                <pre className="text-[11px] font-mono bg-black/50 p-2.5 rounded-lg text-zinc-400 overflow-x-auto">
                  {NPM_SNIPPETS[selectedService]}
                </pre>
                <p className="text-[11px] text-zinc-500">
                  👉 Ouvrez NPM ➔ Éditez <strong>{selectedService}.vicopetit.dedyn.io</strong> ➔ Onglet <strong>Advanced</strong> ➔ Collez ce bloc ➔ Sauvegardez. Le service sera immédiatement réservé à vos appareils !
                </p>
              </div>
            )}
          </div>

          {/* Journal d'Audit des Connexions avec COULEURS PAR APPAREIL */}
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
                    <th className="pb-3 pr-4">Action / Page</th>
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
                    logs.slice(0, 20).map((l) => {
                      const color = getDeviceColor(l.device_cn);
                      const isAuth = l.device_cn && !l.device_cn.includes('Anonyme');
                      return (
                        <tr key={l.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-2.5 pr-4 font-medium">
                            {isAuth ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${color.bg} ${color.text} border ${color.border}`}>
                                <Lock className="w-3 h-3" />
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
                          <td className="py-2.5 pr-4 text-zinc-300">
                            {l.method === 'PAGE' ? (
                              <span className="text-cyan-400 font-medium">{l.path}</span>
                            ) : (
                              <>
                                <span className="text-indigo-400 font-bold mr-1">{l.method}</span>
                                <span className="font-mono text-zinc-400">{l.path}</span>
                              </>
                            )}
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
