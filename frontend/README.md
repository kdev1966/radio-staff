# Radio Staff Manager - Frontend

Application Next.js 14 avec TypeScript pour la gestion du personnel radio.

## Technologies

- **Next.js 14** - Framework React avec SSR/SSG
- **TypeScript 5.3** - Type safety
- **Tailwind CSS 3.4** - Styling moderne
- **Keycloak** - Authentification et autorisation
- **FullCalendar** - Calendrier interactif pour le planning
- **Axios** - Client HTTP

## Structure du projet

```
frontend/
├── components/          # Composants React reutilisables
│   ├── ErrorBoundary.tsx    # Gestion d'erreurs globale
│   ├── Layout.tsx           # Layout principal avec header/footer
│   ├── LoadingSpinner.tsx   # Composant de chargement
│   └── ShiftCalendar.tsx    # Calendrier des equipes
├── lib/                 # Utilitaires et configuration
│   ├── api.ts              # Client Axios avec intercepteurs
│   ├── keycloak.tsx        # Configuration Keycloak
│   └── types.ts            # Types TypeScript communs
├── pages/               # Pages Next.js
│   ├── _app.tsx            # App wrapper avec providers
│   ├── index.tsx           # Page d'accueil
│   ├── conges.tsx          # Gestion des conges
│   └── planning.tsx        # Planning des equipes
├── styles/              # Styles globaux
│   └── globals.css         # Styles Tailwind CSS
├── public/              # Fichiers statiques
├── next.config.js       # Configuration Next.js
├── tailwind.config.js   # Configuration Tailwind
└── tsconfig.json        # Configuration TypeScript
```

## Configuration

### Variables d'environnement

Copier `.env.local.example` vers `.env.local` et configurer:

```bash
# API Backend URL
NEXT_PUBLIC_API_URL=/api

# Keycloak Authentication
NEXT_PUBLIC_KEYCLOAK_URL=http://192.168.1.200:8080
NEXT_PUBLIC_KEYCLOAK_REALM=radio-staff
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=radio-frontend
```

### Keycloak

L'application utilise Keycloak pour l'authentification. Configuration requise:

- **Realm**: `radio-staff`
- **Client ID**: `radio-frontend`
- **Client Type**: Public
- **Valid Redirect URIs**: `http://192.168.1.200/*`, `http://localhost:3000/*`
- **Web Origins**: `*`

Roles Keycloak:
- `employee` - Utilisateur standard
- `manager` - Gestionnaire (peut approuver/rejeter les conges)
- `admin` - Administrateur complet

## Installation

```bash
# Installer les dependances
npm install

# Mode developpement
npm run dev

# Build production
npm run build

# Demarrer en production
npm start
```

## Fonctionnalites

### Authentification
- Login/Logout via Keycloak
- Refresh automatique du token
- Protection des routes
- Gestion des roles (employee, manager, admin)

### Planning des equipes
- Calendrier interactif (FullCalendar)
- Visualisation des shifts (Matin, Apres-midi, Nuit)
- Assignation des employes aux shifts
- Export PDF du planning

### Gestion des conges
- Creation de demandes de conge
- Visualisation de mes demandes
- Approbation/Rejet (managers uniquement)
- Types: Vacances, Maladie, Personnel
- Statuts: En attente, Approuve, Rejete

## Architecture

### API Client (`lib/api.ts`)
Client Axios configure avec:
- Intercepteur de requete: Injection automatique du token Keycloak
- Intercepteur de reponse: Gestion d'erreurs globale
- Refresh automatique du token avant expiration

### Authentication (`lib/keycloak.tsx`)
- AuthProvider React Context
- Hook `useAuth()` pour acceder au contexte
- HOC `withAuth()` pour proteger les routes
- Gestion des evenements Keycloak (token expire, logout, etc.)

### Error Handling
- **ErrorBoundary**: Attrape les erreurs React
- **API Interceptors**: Gestion des erreurs HTTP
- **Loading States**: Indicateurs de chargement
- **Error Messages**: Messages utilisateur clairs

## Composants principaux

### Layout
Wrapper principal avec:
- Header avec navigation et user info
- Footer
- Gestion du titre de page
- Bouton de retour optionnel

### ErrorBoundary
Attrape les erreurs React et affiche:
- UI d'erreur utilisateur-friendly
- Details techniques en mode dev
- Options de recuperation (reload, retour accueil)

### LoadingSpinner
Indicateur de chargement reutilisable:
- Plusieurs tailles (sm, md, lg, xl)
- Text optionnel
- Mode plein ecran optionnel

## Bonnes pratiques

### TypeScript
- Mode strict active
- Types partages dans `lib/types.ts`
- Pas de `any` (sauf necessaire)
- Interfaces pour tous les props

### Performance
- React.memo pour composants couteux
- Code splitting automatique (Next.js)
- Images optimisees (Next Image)
- Bundle analysis avec `@next/bundle-analyzer`

### Securite
- Headers de securite (CSP, X-Frame-Options, etc.)
- Tokens stockes en memoire (pas localStorage)
- Validation cote serveur toujours requise
- HTTPS en production

### Accessibilite
- Semantic HTML
- ARIA labels appropriees
- Navigation clavier
- Contraste des couleurs (WCAG AA)

## Docker

### Build
```bash
docker build -t radio-frontend .
```

### Run
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=/api \
  -e NEXT_PUBLIC_KEYCLOAK_URL=http://192.168.1.200:8080 \
  -e NEXT_PUBLIC_KEYCLOAK_REALM=radio-staff \
  -e NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=radio-frontend \
  radio-frontend
```

## Problemes connus et solutions

### Build permission denied sur .next/
Solution: Supprimer le dossier `.next/` et rebuilder

```bash
rm -rf .next
npm run build
```

### Erreur Keycloak CORS
Verifier que les Web Origins sont configures dans Keycloak client

### Token expire rapidement
Le token est rafraichi automatiquement toutes les 60 secondes

### API 401 Unauthorized
Verifier que:
1. Keycloak est accessible
2. Les variables d'env sont correctes
3. Le token est valide (check console logs)

## Developpement

### Hot Reload
Next.js supporte le hot reload automatique en mode dev.

### Debugging
1. React DevTools (extension browser)
2. Console logs prefixes par `[Keycloak]`, `[API]`, `[ErrorBoundary]`
3. Network tab pour les requetes API

### Testing
```bash
# Tests unitaires (TODO)
npm test

# Tests E2E (TODO)
npm run test:e2e

# Linting
npm run lint
```

## Support

Pour tout probleme ou question:
- Verifier les logs dans la console browser
- Verifier les logs du backend
- Verifier la configuration Keycloak
