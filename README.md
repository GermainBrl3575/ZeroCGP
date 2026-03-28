# Zero CGT — Guide de mise en place

## Prérequis

- **Node.js 18+** — https://nodejs.org
- **Git** — https://git-scm.com
- Un compte **GitHub** — https://github.com
- Un compte **Supabase** (gratuit) — https://supabase.com
- Un compte **Vercel** (gratuit) — https://vercel.com

---

## Étape 1 — Cloner et installer

```bash
# 1. Cloner le projet
git clone https://github.com/VOTRE_USERNAME/zerocgt.git
cd zerocgt

# 2. Installer les dépendances
npm install

# 3. Copier le fichier d'environnement
cp .env.example .env.local
```

---

## Étape 2 — Créer le projet Supabase

1. Allez sur **https://app.supabase.com** → "New project"
2. Choisissez un nom (ex: `zerocgt`), un mot de passe fort, région **West EU (Ireland)**
3. Attendez ~2 min que le projet démarre
4. Allez dans **SQL Editor** → collez le contenu de `supabase/schema.sql` → **Run**
5. Allez dans **Settings > API** et copiez :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## Étape 3 — Configurer les variables d'environnement

Éditez `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXTAUTH_SECRET=votre_secret_32_chars
NEXTAUTH_URL=http://localhost:3000
```

> Pour générer `NEXTAUTH_SECRET` :
> ```bash
> openssl rand -base64 32
> ```

---

## Étape 4 — Lancer en local

```bash
npm run dev
```

Ouvrez **http://localhost:3000** 🎉

---

## Étape 5 — Pousser sur GitHub

```bash
# Initialiser Git (si pas déjà fait)
git init
git add .
git commit -m "feat: initial commit Zero CGT"

# Créer le repo sur GitHub (via GitHub CLI ou l'interface web)
# Puis :
git remote add origin https://github.com/VOTRE_USERNAME/zerocgt.git
git branch -M main
git push -u origin main
```

> ⚠️ Le fichier `.env.local` est dans `.gitignore` — vos clés ne seront JAMAIS pushées.

---

## Étape 6 — Déployer sur Vercel

### Option A — Via l'interface Vercel (recommandé)

1. Allez sur **https://vercel.com/new**
2. Cliquez **"Import Git Repository"** → connectez votre GitHub → sélectionnez `zerocgt`
3. Dans **"Environment Variables"**, ajoutez les 4 variables de votre `.env.local`
4. Cliquez **"Deploy"** → votre site est en ligne en ~2 min !

### Option B — Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Vercel détecte automatiquement Next.js. Il vous demandera vos variables d'environnement.

---

## Structure du projet

```
zerocgt/
├── app/
│   ├── page.tsx                    ← Page d'accueil (landing)
│   ├── auth/
│   │   ├── login/page.tsx          ← Connexion
│   │   └── register/page.tsx       ← Inscription
│   ├── dashboard/
│   │   ├── layout.tsx              ← Layout avec sidebar
│   │   ├── entry/page.tsx          ← Saisie du portefeuille
│   │   ├── portfolio/page.tsx      ← Vue portefeuille (treemap)
│   │   ├── optimizer/page.tsx      ← Wizard + Markowitz
│   │   └── ...                     ← Autres modules (bientôt)
│   └── api/
│       ├── yahoo/quote/route.ts    ← Prix temps réel
│       ├── yahoo/search/route.ts   ← Recherche ISIN/nom
│       ├── yahoo/history/route.ts  ← Historique 5 ans
│       └── optimize/route.ts       ← Pipeline Markowitz
├── components/
│   ├── Sidebar.tsx                 ← Barre de navigation gauche
│   └── Treemap.tsx                 ← Visualisation portefeuille
├── lib/
│   ├── supabase.ts                 ← Client + helpers BDD
│   ├── yahoo.ts                    ← Fonctions Yahoo Finance
│   ├── markowitz.ts                ← Algorithme d'optimisation
│   └── utils.ts                    ← Utilitaires (eur, pct, ISIN)
├── types/index.ts                  ← Types TypeScript
├── supabase/schema.sql             ← Schéma BDD à importer
└── .env.example                    ← Template variables d'env
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript |
| Style | Tailwind CSS |
| Auth + BDD | Supabase (PostgreSQL) |
| Graphiques | Recharts |
| Optimisation | Algorithme Markowitz maison (lib/markowitz.ts) |
| Prix | Yahoo Finance (proxy serveur) |
| Déploiement | Vercel |

---

## Commandes utiles

```bash
npm run dev        # Démarrer en développement
npm run build      # Build de production
npm run lint       # Vérifier le code
```

---

## Roadmap

- [x] Landing page
- [x] Auth (inscription / connexion)
- [x] Saisie portefeuille avec prix temps réel
- [x] Vue Portfolio (treemap + liste)
- [x] Optimiseur Markowitz (3 méthodes)
- [x] Frontière efficiente
- [ ] Rééquilibrage automatique
- [ ] Alertes de dérive
- [ ] Backtesting 5 ans
- [ ] Matrice de corrélation
- [ ] Stress tests (2008, Covid, 2022)
- [ ] Simulation Monte Carlo
- [ ] Export PDF

---

## Domaine personnalisé

Une fois déployé sur Vercel :
1. Allez dans votre projet Vercel → **Settings > Domains**
2. Ajoutez `zerocgp.capital`
3. Suivez les instructions pour configurer les DNS chez votre registraire (ex: Dynadot)
4. Mettez à jour `NEXTAUTH_URL=https://zerocgp.capital` dans les variables Vercel
