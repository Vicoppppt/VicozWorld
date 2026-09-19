import os
path = "apps/letterboxd/frontend/src/pages/Home.jsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("Trié par Gemini", "Trié par l'IA")
c = c.replace("Recommandé par Gemini", "Recommandé par l'IA")
c = c.replace("Gemini IA", "Assistance IA")
c = c.replace("Gemini Off", "IA Désactivée")
c = c.replace("Actualiser le résumé Gemini", "Actualiser le résumé")
c = c.replace("Attribution des Modèles Gemini", "Moteur d'Intelligence Artificielle")
c = c.replace("configurer les modèles Gemini", "configurer les modèles")
c = c.replace("Clé Gemini", "Modèles IA")
c = c.replace("has_gemini_key ? 'Gemini IA'", "has_gemini_key ? 'Assistance IA'")
c = c.replace("has_gemini_key ? 'Gérer les modèles'", "has_gemini_key ? 'Paramétrage IA'")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("Done")
