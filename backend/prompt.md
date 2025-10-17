Rôle
Tu es un senior full-stack developer spécialisé santé / offline-first et Docker-on-premise.
Tu dois générer l’intégralité du code source d’une application de gestion du personnel du service radiologie d’un hôpital sans aucun accès Internet (air-gap total).
Le livrable final est une clé USB contenant :
un dossier dist/ avec les images Docker sauvegardées (*.tar)
un script install.sh qui charge les images, lance docker compose up et initialise la base
un manuel admin.pdf (généré automatiquement)
Stack imposée
NestJS + Prisma (PostgreSQL) – backend
Next.js (mode static export) – frontend
Keycloak (en mode standalone) – authentification SSO interne
Nginx – reverse-proxy + serveur des fichiers statiques
FullCalendar – planning visuel des shifts
Tailwind CSS – UI
Docker + Docker Compose – seul runtime autorisé sur les postes hospitaliers
Fonctionnalités métier obligatoires
Fiche employé
nom, prénom, email, téléphone, date d’entrée, contrat (CDI/CDD/INTERIM/PART-TIME), heures hebdo, diplômes, rôles (N-N).
Congés & absences
Types : CP, RTT, MALADIE, FORMATION, SPECIAL.
Workflow : demande → validation chef de service → DRH.
Blocage si chevauchement avec autre congé déjà approuvé sur même équipe.
Roulement de travail
Quarts : MATIN (07-13h), APRES-MIDI (13-19h), NUIT (19-07h).
Règles : 11 h minimum entre 2 quarts, max 48 h/semaine, nuit ≤ 2 fois/semaine.
Assignation manuelle ou auto (IA locale) avec suggestion de remplaçant.
Vues
Calendrier mensuel (FullCalendar) coloré par quart.
Tooltip au clic : liste assignés + bouton « + / – ».
Export PDF du planning (paie, inspection).
Sécurité & conformité
Authentification SSO Keycloak (2FA TOTP) – pas d’accès Internet.
Rôles : ADMIN, CHEF_SERVICE, EMPLOYE, RH.
RGPD : chiffrement au repos (LUKS + pgcrypto), logs d’audit 3 ans.
Contraintes techniques fortes
A. Zero appel extérieur : pas de CDN, pas de Google Fonts, pas de téléchargement de binaries à l’exécution.
B. Images Docker :
Doivent être buildées et sauvegardées (docker save) dans un dossier dist/offline-images/.
Doivent tourner sur architecture AMD64 Linux Alpine.
C. Migrations & seed :
prisma migrate deploy obligatoire au premier démarrage.
Seed automatique si base vide (3 employés, 1 semaine de shifts, 2 rôles).
D. Taille finale : < 2 Go sur clé USB (base vide + images).
E. Temps d’install : ≤ 5 min sur PC hôpital (Docker déjà présent).
Structure attendue du repo
Copy
radio-staff/
├── docker-compose.yml
├── Makefile
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── main.ts
│   │   ├── prisma.service.ts
│   │   ├── employee/
│   │   ├── shift/
│   │   ├── leave/
│   │   └── keycloak/
├── frontend/
│   ├── Dockerfile
│   ├── next.config.js (output: 'standalone')
│   ├── pages/
│   │   ├── index.tsx
│   │   ├── planning.tsx
│   │   └── conges.tsx
│   ├── components/ShiftCalendar.tsx
│   └── styles/tailwind.css
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── keycloak/
│   ├── Dockerfile (standalone-ha, postgres user-store)
│   └── realm-export.json
├── scripts/
│   ├── build-offline.sh      # build + docker save
│   ├── install.sh            # load + compose up
│   └── backup.sh             # dump pg + rsync
└── docs/
    ├── schema.svg            # généré par tbls
    └── admin.pdf             # manuel de déploiement
Livrables intermédiaires à générer dès maintenant
backend/prisma/schema.prisma complet (tables + enums + relations).
Controllers NestJS : EmployeeController, ShiftController, LeaveController (CRUD + règles métier).
ShiftCalendar.tsx (FullCalendar) avec appels axios.
Dockerfile multi-stage pour chaque service (cache offline).
Script build-offline.sh :
docker compose build
docker save $(docker images -q) > dist/offline-images.tar
pg_dump -h localhost -U radio radiodb > dist/seed.sql
Script install.sh (côté hôpital) :
docker load < offline-images.tar
docker compose up -d
docker exec -it radio-backend npm run prisma:migrate
affiche URL finale + compte admin Keycloak.
Style de code attendu
TypeScript strict = true
Pas de any – utiliser les types Prisma générés
Nommage : camelCase variables, kebab-case fichiers, UPPER_CASE enums
Commentaires UNIQUEMENT si logique métier non évidente
Zero lib externe non listée (vérifier licences MIT/BSD)
Processus de génération
Écris intégralement chaque fichier demandé dans l’ordre :
a. docker-compose.yml complet
b. backend/prisma/schema.prisma
c. Controllers & services NestJS
d. Components React + pages Next.js
e. Dockerfiles & scripts shell
Vérifie à la fin : make build-offline produit bien dist/offline-images.tar < 2 Go.
Teste localement : docker compose up → http://localhost:3000/planning doit afficher le calendrier avec shifts seedés.
Réponse attendue
Retourne uniquement le nom du prochain fichier à générer, puis son contenu complet, jusqu’à ce que le projet soit intégralement dockerisé, offline, testé et prêt à graver sur clé USB.
Premier fichier à générer : docker-compose.yml complet (tous services, networks, volumes, healthchecks).
Copy
Retry
Share


