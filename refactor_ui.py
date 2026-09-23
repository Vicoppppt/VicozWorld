import re
import json

with open('apps/letterboxd/frontend/src/pages/Home.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '            {cpuPercent !== undefined && cpuPercent !== null && ('
end_marker = '            <button\n              onClick={() => fetchHubData(true)}'

s = content.find(start_marker)
e = content.find(end_marker, s)

metrics_code = content[s:e]

# Replace header
content = content[:s] + content[e:]

# Now find WIDGET 2 : FLASH ACTUALITÉS
w_start = content.find('          {/* WIDGET 2 : FLASH ACTUALIT')
w_end = content.find('          {/* WIDGET 3 : SUIVI', w_start)

# Now construct the new widget
new_widget = f'''          {{/* WIDGET 2 : MONITORING SYSTEME */}}
          <motion.div
            initial={{{{ opacity: 0, y: 15 }}}}
            animate={{{{ opacity: 1, y: 0 }}}}
            transition={{{{ delay: 0.1 }}}}
            className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-5 group shadow-lg"
          >
            <div className="space-y-4">
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
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  En Direct
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex flex-wrap gap-2.5">
{metrics_code.replace('              ', '                  ')}                </div>
              </div>
            </div>
          </motion.div>\n\n'''

content = content[:w_start] + new_widget + content[w_end:]

with open('apps/letterboxd/frontend/src/pages/Home.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Refactor successful')
