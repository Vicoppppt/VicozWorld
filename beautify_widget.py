import re
import json

with open('apps/letterboxd/frontend/src/pages/Home.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "          {/* WIDGET 2 : MONITORING SYSTEME */}"
end_marker = "          {/* WIDGET 3 : SUIVI"

s = content.find(start_marker)
e = content.find(end_marker, s)

new_widget = """          {/* WIDGET 2 : MONITORING SYSTEME */}
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
          </motion.div>\n\n"""

content = content[:s] + new_widget + content[e:]

with open('apps/letterboxd/frontend/src/pages/Home.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
