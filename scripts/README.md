# Scripts de Déploiement et Maintenance

Collection de scripts pour gérer le déploiement et la maintenance de l'application Radio Staff Manager.

## Scripts Disponibles

### 1. deploy.sh - Déploiement Automatisé

Déploie l'application en production avec vérifications complètes.

```bash
./scripts/deploy.sh [options]
```

**Options:**
- `--env <file>`: Fichier d'environnement (défaut: .env.production)
- `--skip-backup`: Ne pas créer de backup avant déploiement
- `--skip-build`: Ne pas rebuilder les images Docker
- `--no-cache`: Forcer rebuild sans cache
- `--help`: Afficher l'aide

**Exemples:**
```bash
# Déploiement standard
./scripts/deploy.sh

# Déploiement rapide sans backup
./scripts/deploy.sh --skip-backup

# Rebuild complet
./scripts/deploy.sh --no-cache
```

**Processus:**
1. Vérification des prérequis
2. Création d'un backup automatique
3. Arrêt des services
4. Build des images Docker
5. Démarrage des services
6. Attente et vérification de santé
7. Rapport de déploiement

---

### 2. rollback.sh - Restauration depuis Backup

Restaure la base de données depuis un backup.

```bash
./scripts/rollback.sh [options]
```

**Options:**
- `--backup <file>`: Fichier de backup à restaurer
- `--list`: Lister les backups disponibles
- `--no-restart`: Ne pas redémarrer les services
- `--help`: Afficher l'aide

**Exemples:**
```bash
# Lister les backups
./scripts/rollback.sh --list

# Restaurer le dernier backup
./scripts/rollback.sh

# Restaurer un backup spécifique
./scripts/rollback.sh --backup radio_backup_20250117_143000
```

**Processus:**
1. Sélection du backup
2. Confirmation utilisateur
3. Arrêt des services
4. Restauration de la base de données
5. Redémarrage des services
6. Vérification

---

### 3. backup-db.sh - Backup Base de Données

Crée un backup de la base de données PostgreSQL.

```bash
./scripts/backup-db.sh [options]
```

**Options:**
- `--output <dir>`: Répertoire de sortie (défaut: /home/master/backups/radio-staff)
- `--retention <days>`: Jours de rétention (défaut: 30)
- `--compress`: Compresser avec gzip (activé par défaut)
- `--no-compress`: Ne pas compresser
- `--help`: Afficher l'aide

**Exemples:**
```bash
# Backup standard
./scripts/backup-db.sh

# Backup vers répertoire personnalisé
./scripts/backup-db.sh --output /custom/backup/path

# Backup avec rétention de 90 jours
./scripts/backup-db.sh --retention 90
```

**Processus:**
1. Vérification de PostgreSQL
2. Création du dump SQL
3. Compression (optionnelle)
4. Création de métadonnées
5. Vérification d'intégrité
6. Nettoyage des anciens backups

**Automatisation avec Cron:**
```bash
# Éditer crontab
crontab -e

# Backup quotidien à 2h du matin
0 2 * * * /home/master/radio-staff/scripts/backup-db.sh
```

---

### 4. health-check.sh - Vérification de Santé

Vérifie la santé de tous les services.

```bash
./scripts/health-check.sh [options]
```

**Options:**
- `--verbose`: Affichage détaillé
- `--json`: Sortie au format JSON
- `--nagios`: Format Nagios/Icinga
- `--timeout <sec>`: Timeout (défaut: 10)
- `--help`: Afficher l'aide

**Exemples:**
```bash
# Vérification standard
./scripts/health-check.sh

# Vérification détaillée
./scripts/health-check.sh --verbose

# Sortie JSON pour monitoring
./scripts/health-check.sh --json

# Pour Nagios/Icinga
./scripts/health-check.sh --nagios
```

**Vérifie:**
- État des conteneurs Docker
- Connectivité base de données
- Endpoints HTTP (Backend, Frontend, Keycloak, Nginx)
- Espace disque
- Mémoire
- Volumes Docker

**Codes de sortie:**
- 0: Tous les services OK
- 1: Un ou plusieurs services en échec
- 2: Erreur critique

---

### 5. generate-secrets.sh - Génération de Secrets

Génère des secrets cryptographiquement sécurisés.

```bash
./scripts/generate-secrets.sh [options]
```

**Options:**
- `--all`: Générer tous les secrets requis
- `--update-env`: Mettre à jour .env.production
- `--length <n>`: Longueur (défaut: 32)
- `--help`: Afficher l'aide

**Exemples:**
```bash
# Générer un secret unique
./scripts/generate-secrets.sh

# Générer tous les secrets
./scripts/generate-secrets.sh --all

# Générer et mettre à jour .env.production
./scripts/generate-secrets.sh --all --update-env

# Secret de 64 caractères
./scripts/generate-secrets.sh --length 64
```

**Secrets générés:**
- POSTGRES_PASSWORD
- KEYCLOAK_ADMIN_PASSWORD
- KEYCLOAK_CLIENT_SECRET
- JWT_SECRET
- SESSION_SECRET

---

## Workflows Communs

### Premier Déploiement

```bash
# 1. Générer les secrets
./scripts/generate-secrets.sh --all --update-env

# 2. Éditer .env.production si nécessaire
nano .env.production

# 3. Sécuriser le fichier
chmod 600 .env.production

# 4. Déployer
./scripts/deploy.sh

# 5. Vérifier
./scripts/health-check.sh --verbose
```

### Mise à Jour de l'Application

```bash
# 1. Pull les modifications
git pull origin master

# 2. Backup automatique
./scripts/backup-db.sh

# 3. Déployer
./scripts/deploy.sh

# 4. Vérifier
./scripts/health-check.sh
```

### Rollback d'Urgence

```bash
# 1. Lister les backups
./scripts/rollback.sh --list

# 2. Restaurer
./scripts/rollback.sh --backup <backup_file>

# 3. Vérifier
./scripts/health-check.sh
```

### Monitoring Continu

```bash
# Health check toutes les 5 minutes
*/5 * * * * /home/master/radio-staff/scripts/health-check.sh --json >> /home/master/radio-staff/logs/health.log 2>&1

# Backup quotidien
0 2 * * * /home/master/radio-staff/scripts/backup-db.sh >> /home/master/radio-staff/logs/backup.log 2>&1
```

---

## Logs

Tous les scripts créent des logs dans `/home/master/radio-staff/logs/`:

```
logs/
├── deploy_20250117_143000.log
├── rollback_20250117_145000.log
├── backup_20250117_020000.log
├── health-check.log
├── cron-backup.log
└── ...
```

### Consulter les Logs

```bash
# Derniers logs de déploiement
ls -lt logs/deploy_*.log | head -1 | xargs cat

# Derniers logs de backup
tail -f logs/backup_*.log

# Logs de health check
tail -f logs/health-check.log
```

---

## Dépannage

### Script ne s'exécute pas

```bash
# Vérifier les permissions
ls -la scripts/*.sh

# Rendre exécutable
chmod +x scripts/*.sh
```

### Erreur "Docker not found"

```bash
# Vérifier Docker
docker --version
docker compose version

# Démarrer Docker
sudo systemctl start docker
```

### Erreur "Permission denied"

```bash
# Vérifier groupe docker
groups

# Ajouter au groupe (si nécessaire)
sudo usermod -aG docker $USER
newgrp docker
```

### Script bloqué

```bash
# Trouver le processus
ps aux | grep -E "deploy|backup|rollback|health-check"

# Terminer le processus
kill <PID>

# Vérifier les conteneurs
docker compose ps
```

---

## Sécurité

### Permissions Recommandées

```bash
# Scripts exécutables
chmod 755 scripts/*.sh

# Fichier .env.production
chmod 600 .env.production

# Répertoire de backup
chmod 700 /home/master/backups/radio-staff
```

### Bonnes Pratiques

1. Ne jamais commiter les secrets dans Git
2. Sauvegarder les secrets dans un gestionnaire de mots de passe
3. Changer les secrets régulièrement (tous les 90 jours)
4. Vérifier les logs après chaque opération
5. Tester les backups régulièrement
6. Monitorer les health checks

---

## Aide

Pour plus d'informations:

```bash
# Aide d'un script spécifique
./scripts/deploy.sh --help
./scripts/rollback.sh --help
./scripts/backup-db.sh --help
./scripts/health-check.sh --help
./scripts/generate-secrets.sh --help

# Documentation complète
cat DEPLOYMENT_GUIDE.md
```

---

**Dernière mise à jour:** 2025-10-17
