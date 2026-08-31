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
| **`hub`** | **`8085`** | Nginx | Portail central d'accueil & Outils (Éditeur PDF, OCR Texte) |
| **`letterboxd-frontend`** | **`3000`** | React / Nginx | Interface Mon Letterboxd |
| **`letterboxd-backend`** | **`8000`** | FastAPI | API backend Letterboxd & Banque |
| **`gmail-assistant`** | **`8501`** | Streamlit | Assistant IA de tri et classification Gmail |

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
- **Portail d'accueil** : [http://localhost:8085](http://localhost:8085)
- **Mon Letterboxd** : [http://localhost:3000](http://localhost:3000)
- **Assistant Gmail IA** : [http://localhost:8501](http://localhost:8501)

---

## 💻 Démarrage en Mode Développement Local (Sans Docker)

### 1. Portail Hub & Outils Web
Ouvrez simplement `apps/hub/index.html` dans un navigateur ou lancez un serveur statique :
```bash
cd apps/hub
npx serve .
```

### 2. Mon Letterboxd
**Frontend :**
```bash
cd apps/letterboxd/frontend
npm install
npm run dev
```
*(Disponible sur http://localhost:5173)*

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
