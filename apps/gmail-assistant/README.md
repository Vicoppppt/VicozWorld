# 📧 Gmail Assistant : Nettoyage & Libellés IA

Un assistant visuel et intelligent en Python pour gérer, nettoyer et classer vos e-mails Gmail grâce à l'Agent IA (Google Gemini).

---

## 🌟 2 Onglets Principaux

### 1. 🗑️ Nettoyage & Corbeille
- **Nettoyage rapide** : Filtres 1-click (HelloWork, LinkedIn, Newsletters, etc.).
- **Analyse IA de pertinence** : Identifie les mails inutiles (🔴 Corbeille), à garder (🟢) ou à vérifier (🟡).
- **Mémoire intelligente** : Mémorise automatiquement les e-mails conservés pour ne plus jamais les réanalyser.
- **Action en 1 clic** : Supprime les e-mails cochés et mémorise les e-mails décochés.

### 2. 🏷️ Classement & Libellés IA (Nouveau)
- **Détection des libellés Gmail** : Récupère automatiquement les libellés de votre compte Gmail.
- **Catégorisation sur-mesure** : Choisissez vos catégories (ex: `Factures`, `Recrutement`, `Achats`, `Voyages`, `Projet Pro`).
- **Classification Gemini IA** : L'IA choisit le meilleur libellé et explique son choix.
- **Application native Gmail** : Crée les libellés s'ils n'existent pas et les attache directement dans Gmail (`+X-GM-LABELS`).

---

## 🛠️ Démarrage Rapide

```bash
pip install -r requirements.txt
streamlit run app.py
```

Accédez à l'application dans votre navigateur : `http://localhost:8501`.
