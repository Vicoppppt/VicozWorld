# 🚀 Mon Serveur Personnel - Suite Unifiée d'Applications

Cette suite regroupe l'ensemble des applications personnelles et outils auto-hébergés au sein d'une architecture monorepo modulaire, propre et prête à être déployée avec **Docker** ou **CasaOS**.

---

## 🏗️ Architecture des Applications

```text
.
├── docker-compose.yml              # Orchestrateur global de tous les conteneurs
├── .env.example                    # Modèle des variables d'environnement
├── apps/
│   ├── hub/                        # 🌐 Portail d'Accueil & Outils Web (Nginx)
│   │   ├── Dockerfile
│   │   ├── index.html              # Interface d'accueil centrale & profils
│   │   └── tools/                  # Utilitaires web autonomes (PDF, OCR...)
│   │
│   ├── letterboxd/                 # 🎬 Mon Letterboxd (Ciné, Notes, Banque...)
│   │   ├── frontend/               # Interface React 19 + Vite + TailwindCSS v4
│   │   └── backend/                # API FastAPI + SQLite + Woob Banking
│   │
│   └── gmail-assistant/            # 📧 Assistant Gmail & Libellés IA (Streamlit + Gemini)
│       ├── Dockerfile
│       ├── app.py
│       ├── ai_analyzer.py
│       ├── gmail_manager.py
│       └── cache_manager.py
│
└── data/                           # 💾 Données persistantes locales (Volumes)
    ├── letterboxd/                 # Base SQLite app.db
    └── gmail/                      # Caches JSON (emails conservés et catégorisés)
```

---

## 🌐 Cartographie des Services & Ports

| Service | Port | Technologie | Description |
| :--- | :--- | :--- | :--- |
| **`vicozworld-hub`** (`letterboxd-frontend`) | **`3000`** | React 19 / Vite / Nginx | **Hub Central Unifié VicozWorld** (Tableau de bord IA, Météo, Linky, Cinéma, Outils Web & Profils) |
| **`letterboxd-backend`** | **`8000`** | FastAPI / SQLite / Woob | API backend VicozWorld, synchronisation bancaire & batterie système |
| **`gmail-assistant`** | **`8501`** | Streamlit / Gemini IA | Assistant IA de tri et classification automatique Gmail |
| **`hub`** *(optionnel / legacy)* | **`8085`** | Nginx | Ancien portail d'accueil statique |

---

## ⚡ Démarrage Rapide avec Docker

### 1. Configuration des variables d'environnement
Copiez le fichier d'exemple et remplissez vos clés :
```bash
cp .env.example .env
```

### 2. Lancement de tous les services
```bash
docker compose up -d --build
```

### 3. Accès aux applications
- **Hub Central VicozWorld (Portail Unifié)** : [http://localhost:3000](http://localhost:3000)
- **Assistant Gmail IA** : [http://localhost:8501](http://localhost:8501)
- **CasaOS Dashboard** : [http://localhost](http://localhost)

---

## 💻 Démarrage en Mode Développement Local (Sans Docker)

### 1. Portail Web & Outils (Frontend)
```bash
cd apps/letterboxd/frontend
npm install
npm run dev
```
*(Disponible sur http://localhost:5173 - Outils disponibles sur /tools/...)*

**Backend :**
```bash
cd apps/letterboxd/backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```
*(Disponible sur http://localhost:8000)*

### 3. Assistant Gmail IA
```bash
cd apps/gmail-assistant
pip install -r requirements.txt
streamlit run app.py
```
*(Disponible sur http://localhost:8501)*

---

## 💾 Persistance des Données

Les données critiques sont conservées automatiquement dans le dossier `data/` :
- `data/letterboxd/app.db` : Données de la médiathèque, notes, solde bancaire.
- `data/gmail/` : Caches des e-mails conservés (`kept_emails.json`) et catégorisés (`categorized_emails.json`).
