import os
def replace_in_file(path, replaces):
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()
    for old, new in replaces:
        c = c.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

replace_in_file("apps/letterboxd/frontend/public/tools/convertisseur_excel.html", [
    ("Relecteur / Vérificateur Gemini 2.5", "Relecteur / Vérificateur IA"),
    ("Relecture & Vérification IA Gemini", "Relecture & Vérification IA"),
    ("l'IA Gemini 2.5 vérifie", "l'IA vérifie"),
    ("l'IA Gemini valide", "l'IA valide"),
    ("Relecture & vérification avec Google Gemini 2.5", "Relecture & vérification avec l'IA"),
    ("Vérifié par l'IA Gemini 2.5", "Vérifié par l'IA"),
])

replace_in_file("apps/letterboxd/frontend/public/tools/extracteur_texte.html", [
    ("AI Toggle Switch (Gemini 2.5)", "AI Toggle Switch"),
    ("L'IA Gemini 2.5 lit", "L'IA lit"),
    ("restauration typographique par l'IA Gemini", "restauration typographique par l'IA"),
])
print("Done")
