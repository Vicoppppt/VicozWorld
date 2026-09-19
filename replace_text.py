import os
path = "apps/letterboxd/frontend/public/tools/correcteur_redaction.html"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("Gemini Connecté", "IA Connectée")
c = c.replace("Le fichier sera lu et analysé par l'IA Gemini", "Le fichier sera lu et analysé par l'IA")
c = c.replace("Évaluer la Copie avec Gemini 3.7", "Évaluer la Copie")
c = c.replace("Gemini lit la copie et confronte", "L'IA lit la copie et confronte")
c = c.replace("Configurer Clé Gemini", "Intelligence Artificielle")
c = c.replace("Gemini analyse le sujet pour", "L'IA analyse le sujet pour")
c = c.replace("Gemini 3.7 examine la rédaction", "L'IA examine la rédaction")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("Done")
