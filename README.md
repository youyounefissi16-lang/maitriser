# MAITRISEZ — Gestion de Quiz & Examens

Application MERN full-stack avec authentification Clerk, dédiée à la création, gestion et passation de quiz, examens à choix multiples, études de cas et examens oraux. Interfaces séparées pour les administrateurs et les utilisateurs.

## Créateur

**NEFISSI Mohamed Youcef**

---

## Fonctionnalités

### Interface Administrateur (`AdminFrontend` — port 5173)

- **Dashboard** — Statistiques globales, graphiques d'activité (Chart.js)
- **Gestion des Quiz** — CRUD complet, questions par module, minuteur, statut publié/brouillon
- **Gestion des Modules** — Organisation des quiz par thème
- **Gestion des Utilisateurs** — Consultation, recherche, pagination
- **Gestion des Examens Oraux** — Création et suivi des sessions vocales
- **Gestion des Livres** — Upload de PDF, consultation
- **Rapports** — Analyse des résultats par quiz, module, utilisateur
- **Profil Administrateur** — Modification des informations personnelles

### Interface Utilisateur (`userFrontend` — port 5174)

- **Authentification** — Clerk (email, OAuth Google/GitHub, SSO)
- **Quiz** — Passation avec minuteur, feedback immédiat
- **Examens à Choix Multiples** — Mode examen chronométré
- **Études de Cas** — Cas pratiques avec sessionStorage (persistance en cas de rafraîchissement)
- **Examens Oraux** — Réponse vocale enregistrée via le navigateur
- **Livres** — Consultation de PDF, recherche avec debounce
- **Favoris** — Sauvegarde et gestion des questions favorites
- **Révision** — Revue détaillée des résultats
- **Profil** — Informations personnelles, progression
- **Support multilingue** — Français / Anglais

### Backend (`Backend` — port 4000)

- Authentification hybride **Clerk** (principal) + **JWT** (legacy email/mot de passe)
- Synchronisation automatique des utilisateurs Clerk vers MongoDB
- Contrôle d'accès par rôle (`admin` / `user`)
- Cache mémoire sur les endpoints GET fréquents
- Pagination, validation (`express-validator`)
- Journalisation structurée
- Upload sécurisé de fichiers (PDF)

---

## Technologies

| Frontend | Backend | Auth & Securité |
|---|---|---|
| React 18 | Node.js | Clerk Core 3 (`@clerk/react`) |
| Material-UI 6 | Express.js | JWT (legacy) |
| Vite | MongoDB + Mongoose | Bcrypt |
| React Router 7 | Winston (logger) | express-validator |
| Chart.js | node-cache | CORS |
| Axios | Nodemailer | Helmet |
| react-icons | Multer | |

---

## Installation

### Prérequis

- Node.js 20.9+
- MongoDB (en cours local ou distant)
- Compte Clerk (dev ou production)

### 1. Cloner

```bash
git clone https://github.com/youyounefissi16-lang/maitriser.git
cd maitriser
```

### 2. Backend

```bash
cd Backend
cp .env.example .env
npm install
```

Éditer `.env` avec vos valeurs :

```env
MONGO_URI=mongodb://localhost:27017/quizapp
PORT=4000
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
JWT_SECRET=votre_secret
ADMIN_SECRET_CODE=youcef16
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

### 3. Frontend Administrateur

```bash
cd ../AdminFrontend
cp .env.example .env
npm install
```

Éditer `AdminFrontend/.env` :

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 4. Frontend Utilisateur

```bash
cd ../userFrontend
cp .env.example .env
npm install
```

Mêmes variables que l'admin frontend.

### 5. Lancer

```bash
# Terminal 1
cd Backend && npm start

# Terminal 2
cd AdminFrontend && npm run dev

# Terminal 3
cd userFrontend && npm run dev
```

### 6. Accès

- **Admin** : `http://localhost:5173/logging` → saisir le code secret `youcef16`
- **Utilisateur** : `http://localhost:5174/login`

---

## Structure

```
maitriser/
├── Backend/
│   ├── controllers/      # Logique métier
│   ├── models/           # Schémas Mongoose
│   ├── routes/           # Définitions des routes API
│   ├── utils/            # Cache, email, pagination, logger
│   └── index.js          # Point d'entrée
│
├── AdminFrontend/        # Interface admin (React + Vite)
│   ├── src/
│   │   ├── components/   # Composants réutilisables
│   │   ├── pages/        # Pages (Dashboard, Quiz, Users...)
│   │   ├── config/       # Axios, endpoints, authFetch
│   │   ├── styles/       # Thème et styles
│   │   └── utils/        # Token store
│   └── vite.config.js
│
├── userFrontend/         # Interface utilisateur (React + Vite)
│   ├── src/
│   │   ├── components/   # Header, quizCard, VoiceExam...
│   │   ├── pages/        # QuizPage, CaseExam, Books...
│   │   ├── config/       # API, endpoints
│   │   ├── locales/      # i18n (fr, en)
│   │   ├── styles/       # Thème teal et styles
│   │   └── utils/        # Shuffle, token store
│   └── vite.config.js
│
├── start-mongodb.ps1     # Script de démarrage MongoDB
├── sample_quizzes.csv    # Exemples de données
└── README.md
```

---

## API — Aperçu

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/clerk-sync` | Synchroniser un utilisateur Clerk |
| POST | `/api/auth/clerk-verify` | Vérifier un token Clerk |
| POST | `/api/auth/signup` | Inscription email/mot de passe (legacy) |
| POST | `/api/auth/login` | Connexion email/mot de passe (legacy) |
| GET/POST | `/api/quiz` | CRUD quiz |
| GET/POST | `/api/modules` | CRUD modules |
| GET/POST | `/api/users` | CRUD utilisateurs (admin) |
| POST | `/api/admin/claim` | Réclamer le rôle admin |
| GET | `/api/books` | Livres et fichiers PDF |
| GET/POST | `/api/voice-exams` | Examens oraux |
| POST | `/api/quiz/submit` | Soumettre un quiz |
| GET | `/api/dashboard/stats` | Statistiques dashboard |

---

## Sécurité

- Authentification via **Clerk** (tokens JWT court-lived, refresh automatique)
- Fallback JWT/Bcrypt pour les comptes legacy
- Intercepteur Axios avec token dynamique (`getToken()`)
- Protection des routes par rôle côté frontend et backend
- `.env` exclus du versionnement (secrets en local)
- Validation des entrées (`express-validator`)
- Protection path traversal sur les téléchargements de fichiers

---

## Licence

MIT
