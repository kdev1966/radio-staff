# Guide de Déploiement - Radio Staff Manager

Guide complet pour déployer l'application Radio Staff Manager en production sur VPS.

## Table des Matières

1. [Prérequis](#prérequis)
2. [Architecture](#architecture)
3. [Configuration Initiale](#configuration-initiale)
4. [Déploiement](#déploiement)
5. [Vérification](#vérification)
6. [Maintenance](#maintenance)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Rollback](#rollback)
10. [Sécurité](#sécurité)

---

## Prérequis

### Serveur VPS

- **OS**: Linux (Ubuntu 20.04+ recommandé)
- **IP**: 192.168.1.200
- **RAM**: Minimum 4 GB (8 GB recommandé)
- **Disque**: Minimum 50 GB
- **CPU**: Minimum 2 cores

### Logiciels Requis

```bash
# Docker Engine 24.0+
docker --version

# Docker Compose V2
docker compose version

# Git
git --version

# Utilitaires standards
curl --version
openssl version
```

### Installation Docker (si nécessaire)

```bash
# Désinstaller anciennes versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# Installer dépendances
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Ajouter clé GPG Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Ajouter repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Ajouter utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker

# Vérifier installation
docker compose version
```

---

## Architecture

### Services Docker

L'application utilise 5 conteneurs Docker orchestrés par Docker Compose:

```
┌─────────────────────────────────────────────────────┐
│                  Nginx (Port 80/443)                │
│           Reverse Proxy & Load Balancer             │
└─────────┬───────────────────────────────┬───────────┘
          │                               │
┌─────────▼─────────┐         ┌──────────▼──────────┐
│  Frontend (3000)  │         │   Backend (4000)    │
│     Next.js       │         │      NestJS         │
└───────────────────┘         └──────────┬──────────┘
                                         │
                    ┌────────────────────┼────────────┐
                    │                    │            │
          ┌─────────▼──────┐   ┌────────▼────────┐  │
          │ Keycloak (8080)│   │ PostgreSQL      │  │
          │  Auth Server   │   │   (5432)        │  │
          └────────────────┘   └─────────────────┘  │
                    └──────────────────────────────┘
```

### Volumes Docker

- `postgres_data`: Données PostgreSQL persistantes
- `keycloak_data`: Configuration Keycloak
- `nginx_logs`: Logs Nginx
- `nginx_cache`: Cache statique Nginx

### Réseau

- Réseau Docker interne: `radio-network` (172.25.0.0/16)
- Exposition publique uniquement via Nginx (ports 80/443)
- Tous les autres services en réseau interne uniquement

---

## Configuration Initiale

### 1. Cloner le Repository

```bash
cd /home/master
git clone <repository-url> radio-staff
cd radio-staff
```

### 2. Créer le Fichier d'Environnement

```bash
# Copier le template
cp .env.production.example .env.production

# Éditer le fichier
nano .env.production
```

### 3. Générer des Secrets Forts

**IMPORTANT**: Ne jamais utiliser les valeurs par défaut en production!

```bash
# Générer un secret pour PostgreSQL
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env.production

# Générer un secret pour Keycloak Admin
echo "KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)" >> .env.production

# Générer un secret pour Keycloak Client
echo "KEYCLOAK_CLIENT_SECRET=$(openssl rand -base64 32)" >> .env.production

# Générer un secret pour JWT
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production

# Générer un secret pour Session
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.production
```

### 4. Configuration Minimale Requise

Éditez `.env.production` et configurez au minimum:

```bash
# Database
POSTGRES_DB=radiodb
POSTGRES_USER=radio_prod_user
POSTGRES_PASSWORD=<généré_précédemment>

# Keycloak
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<généré_précédemment>
KEYCLOAK_CLIENT_SECRET=<généré_précédemment>

# JWT
JWT_SECRET=<généré_précédemment>

# Session
SESSION_SECRET=<généré_précédemment>

# Server
SERVER_HOST=192.168.1.200
```

### 5. Sécuriser le Fichier d'Environnement

```bash
# Limiter les permissions
chmod 600 .env.production

# Vérifier
ls -la .env.production
# Doit afficher: -rw------- 1 master master
```

### 6. Créer les Répertoires Nécessaires

```bash
# Répertoires de logs et backups
mkdir -p /home/master/radio-staff/logs
mkdir -p /home/master/backups/radio-staff

# Permissions
chmod 755 /home/master/radio-staff/logs
chmod 700 /home/master/backups/radio-staff
```

---

## Déploiement

### Déploiement Standard

Le script de déploiement automatise tout le processus:

```bash
cd /home/master/radio-staff

# Déploiement complet
./scripts/deploy.sh
```

Ce script va:
1. Vérifier les prérequis
2. Créer un backup de la base de données
3. Arrêter les conteneurs existants
4. Builder les nouvelles images Docker
5. Démarrer tous les services
6. Attendre que tous les services soient opérationnels
7. Exécuter les health checks

### Options Avancées

```bash
# Déploiement sans backup (plus rapide)
./scripts/deploy.sh --skip-backup

# Déploiement sans rebuild (si images déjà à jour)
./scripts/deploy.sh --skip-build

# Rebuild complet sans cache
./scripts/deploy.sh --no-cache

# Utiliser un fichier env spécifique
./scripts/deploy.sh --env .env.staging

# Combinaison d'options
./scripts/deploy.sh --skip-backup --no-cache
```

### Déploiement Manuel

Si vous préférez déployer manuellement:

```bash
cd /home/master/radio-staff

# 1. Backup
./scripts/backup-db.sh

# 2. Arrêter services existants
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# 3. Builder les images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# 4. Démarrer les services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Vérifier les logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

### Temps de Déploiement Estimés

- **Premier déploiement**: 10-15 minutes (build initial)
- **Déploiements suivants**: 3-5 minutes (avec cache)
- **Déploiement rapide** (--skip-backup --skip-build): 1-2 minutes

---

## Vérification

### 1. Vérifier l'État des Services

```bash
# Voir tous les conteneurs
docker compose ps

# Statut détaillé
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Tous les services doivent afficher `Up` et `healthy`.

### 2. Exécuter les Health Checks

```bash
# Health check complet
./scripts/health-check.sh

# Avec détails
./scripts/health-check.sh --verbose

# Format JSON (pour monitoring)
./scripts/health-check.sh --json
```

### 3. Tester les Endpoints

```bash
# Nginx health
curl http://192.168.1.200/health
# Doit retourner: healthy

# Backend API
curl http://192.168.1.200/api/health
# Doit retourner: {"status":"ok"}

# Frontend
curl -I http://192.168.1.200
# Doit retourner: HTTP/1.1 200 OK

# Keycloak
curl http://192.168.1.200/auth/health/ready
# Doit retourner un JSON avec status
```

### 4. Vérifier les Logs

```bash
# Logs de tous les services
docker compose logs

# Logs d'un service spécifique
docker compose logs backend
docker compose logs frontend
docker compose logs keycloak
docker compose logs postgres
docker compose logs nginx

# Suivre les logs en temps réel
docker compose logs -f

# Dernières 100 lignes
docker compose logs --tail=100
```

### 5. Accéder à l'Application

Ouvrez votre navigateur:

- **Application**: http://192.168.1.200
- **Keycloak Admin**: http://192.168.1.200/auth
  - Username: admin
  - Password: <KEYCLOAK_ADMIN_PASSWORD>

---

## Maintenance

### Backups

#### Backup Manuel

```bash
# Créer un backup
./scripts/backup-db.sh

# Backup vers répertoire spécifique
./scripts/backup-db.sh --output /custom/path

# Backup non compressé
./scripts/backup-db.sh --no-compress

# Lister les backups existants
./scripts/rollback.sh --list
```

#### Backup Automatisé (Cron)

Configurez un cron job pour backups automatiques:

```bash
# Éditer crontab
crontab -e

# Ajouter ces lignes:

# Backup quotidien à 2h du matin
0 2 * * * /home/master/radio-staff/scripts/backup-db.sh >> /home/master/radio-staff/logs/cron-backup.log 2>&1

# Backup avant chaque déploiement (optionnel, déjà fait par deploy.sh)
# 0 */6 * * * /home/master/radio-staff/scripts/backup-db.sh

# Health check toutes les 5 minutes
*/5 * * * * /home/master/radio-staff/scripts/health-check.sh --json >> /home/master/radio-staff/logs/health-check.log 2>&1
```

### Mise à Jour de l'Application

```bash
cd /home/master/radio-staff

# 1. Pull les dernières modifications
git pull origin master

# 2. Backup automatique
./scripts/backup-db.sh

# 3. Déployer la nouvelle version
./scripts/deploy.sh

# 4. Vérifier
./scripts/health-check.sh
```

### Mise à Jour des Images Docker

```bash
# Pull les dernières images de base
docker compose pull

# Rebuild avec les nouvelles bases
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# Redéployer
./scripts/deploy.sh
```

### Nettoyage Docker

```bash
# Supprimer images inutilisées
docker image prune -a

# Supprimer volumes inutilisés
docker volume prune

# Supprimer tout ce qui n'est pas utilisé
docker system prune -a --volumes

# ATTENTION: Ne supprime PAS les volumes actifs, mais vérifiez avant!
```

### Rotation des Logs

Les logs Docker sont automatiquement rotés selon la configuration dans `docker-compose.prod.yml`:
- Taille max par fichier: 10 MB
- Nombre max de fichiers: 3

Pour les logs système:

```bash
# Créer configuration logrotate
sudo nano /etc/logrotate.d/radio-staff
```

Ajoutez:

```
/home/master/radio-staff/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0640 master master
}
```

---

## Monitoring

### Monitoring Manuel

```bash
# État des conteneurs
docker compose ps

# Utilisation ressources
docker stats

# Logs en temps réel
docker compose logs -f

# Health check complet
./scripts/health-check.sh --verbose
```

### Monitoring Automatisé

#### Intégration Nagios/Icinga

```bash
# Créer command Nagios
define command {
    command_name    check_radio_staff
    command_line    /home/master/radio-staff/scripts/health-check.sh --nagios
}

# Créer service Nagios
define service {
    use                     generic-service
    host_name               vps-192-168-1-200
    service_description     Radio Staff Health
    check_command           check_radio_staff
    check_interval          5
    retry_interval          1
}
```

#### Monitoring avec JSON Output

Pour intégration avec outils tiers (Prometheus, Grafana, etc.):

```bash
# Output JSON
./scripts/health-check.sh --json

# Exemple de résultat
{
  "timestamp": "2025-10-17T14:30:00+02:00",
  "hostname": "vps-prod",
  "total_services": 12,
  "failed_services": 0,
  "status": "OK",
  "services": {
    "PostgreSQL": {
      "status": "OK",
      "details": "Database ready - 45ms",
      "response_time_ms": 45
    },
    ...
  }
}
```

### Métriques Importantes

Surveillez ces métriques:

1. **CPU Usage** par conteneur: < 80%
2. **Memory Usage** par conteneur: < 80%
3. **Disk Usage**: < 80%
4. **Response Time**:
   - Backend API: < 500ms
   - Frontend: < 1000ms
   - Keycloak: < 2000ms
5. **Error Rate**: < 1%
6. **Uptime**: > 99.9%

---

## Troubleshooting

### Problèmes Courants

#### 1. Services ne démarrent pas

```bash
# Vérifier les logs
docker compose logs

# Vérifier l'état détaillé
docker compose ps -a

# Redémarrer un service spécifique
docker compose restart backend

# Redémarrer tous les services
docker compose restart
```

#### 2. PostgreSQL ne répond pas

```bash
# Vérifier l'état
docker compose logs postgres

# Vérifier la connectivité
docker compose exec postgres pg_isready -U radio

# Se connecter manuellement
docker compose exec postgres psql -U radio -d radiodb

# Recréer le conteneur
docker compose stop postgres
docker compose rm postgres
docker compose up -d postgres
```

#### 3. Keycloak reste en "starting"

Keycloak peut prendre 1-2 minutes au premier démarrage:

```bash
# Vérifier les logs
docker compose logs -f keycloak

# Vérifier la mémoire disponible
docker stats keycloak

# Si timeout, augmenter les limites dans docker-compose.prod.yml
KEYCLOAK_MEM_LIMIT=2g
```

#### 4. Backend échoue au démarrage

```bash
# Vérifier les logs
docker compose logs backend

# Erreurs communes:

# a) Échec migrations Prisma
docker compose exec backend npx prisma migrate deploy

# b) Keycloak non accessible
# Attendre que Keycloak soit prêt
curl http://localhost:8080/health/ready

# c) Variables d'environnement manquantes
docker compose config  # Vérifier la configuration
```

#### 5. Frontend erreur 502

```bash
# Vérifier que le backend répond
curl http://localhost:4000/api/health

# Vérifier Nginx config
docker compose exec nginx nginx -t

# Recharger Nginx
docker compose exec nginx nginx -s reload

# Vérifier les logs Nginx
docker compose logs nginx
```

#### 6. Problèmes de mémoire

```bash
# Vérifier utilisation mémoire
docker stats

# Libérer mémoire
docker system prune

# Redémarrer services gourmands
docker compose restart keycloak backend
```

#### 7. Volumes corrompus

```bash
# ATTENTION: Ceci supprime les données!
# Assurez-vous d'avoir un backup récent

# Arrêter tous les services
docker compose down

# Supprimer les volumes
docker volume rm radio-staff_postgres_data
docker volume rm radio-staff_keycloak_data

# Restaurer depuis backup
./scripts/rollback.sh --backup <backup_file>
```

### Commandes de Diagnostic

```bash
# Inspecter un conteneur
docker inspect radio-backend

# Exécuter commandes dans conteneur
docker compose exec backend sh

# Vérifier réseau Docker
docker network inspect radio-staff_radio-network

# Vérifier volumes
docker volume ls
docker volume inspect radio-staff_postgres_data

# Espace disque
df -h
docker system df

# Processus Docker
ps aux | grep docker
```

### Logs Détaillés

```bash
# Activer logs debug pour un service
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d backend --force-recreate --no-deps

# Logs avec timestamps
docker compose logs -t backend

# Logs depuis une heure
docker compose logs --since 1h

# Export logs vers fichier
docker compose logs > /tmp/radio-staff-logs.txt
```

---

## Rollback

### Rollback Rapide

```bash
# Restaurer le backup le plus récent
./scripts/rollback.sh

# Restaurer un backup spécifique
./scripts/rollback.sh --backup radio_backup_20250117_143000

# Lister les backups disponibles
./scripts/rollback.sh --list
```

### Rollback Manuel

```bash
cd /home/master/radio-staff

# 1. Arrêter les services
docker compose down

# 2. Démarrer PostgreSQL uniquement
docker compose up -d postgres

# 3. Attendre que PostgreSQL soit prêt
docker compose exec postgres pg_isready -U radio

# 4. Restaurer le backup
gunzip -c /home/master/backups/radio-staff/radio_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U radio -d radiodb

# 5. Redémarrer tous les services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Vérifier
./scripts/health-check.sh
```

### Rollback Code Source

Si le problème vient du code et non des données:

```bash
cd /home/master/radio-staff

# Voir l'historique des commits
git log --oneline -10

# Rollback au commit précédent
git reset --hard HEAD~1

# Ou rollback à un commit spécifique
git reset --hard <commit-hash>

# Redéployer
./scripts/deploy.sh
```

---

## Sécurité

### Checklist Sécurité

- [ ] Secrets forts générés (min 32 caractères)
- [ ] Fichier .env.production avec permissions 600
- [ ] Secrets sauvegardés dans gestionnaire de mots de passe
- [ ] PostgreSQL non exposé publiquement
- [ ] Backend non exposé publiquement
- [ ] Rate limiting configuré sur Nginx
- [ ] Backups réguliers automatisés
- [ ] Backups stockés de manière sécurisée
- [ ] Logs monitored régulièrement
- [ ] Mises à jour de sécurité appliquées

### Bonnes Pratiques

#### 1. Rotation des Secrets

Changez les secrets régulièrement (recommandé: tous les 90 jours):

```bash
# Générer nouveaux secrets
./scripts/generate-secrets.sh  # À créer si nécessaire

# Ou manuellement:
echo "NEW_SECRET=$(openssl rand -base64 32)"

# Mettre à jour .env.production
nano .env.production

# Redéployer
./scripts/deploy.sh
```

#### 2. Accès SSH

```bash
# Désactiver login root
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no

# Utiliser clés SSH uniquement
# PasswordAuthentication no

# Changer port SSH
# Port 2222

# Redémarrer SSH
sudo systemctl restart sshd
```

#### 3. Firewall

```bash
# Installer UFW
sudo apt-get install ufw

# Configurer règles
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Activer
sudo ufw enable

# Vérifier
sudo ufw status
```

#### 4. SSL/TLS (HTTPS)

Pour activer HTTPS avec Let's Encrypt:

```bash
# Installer Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtenir certificat
sudo certbot --nginx -d 192.168.1.200

# OU pour IP locale, utiliser certificat auto-signé
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx.key \
  -out /etc/nginx/ssl/nginx.crt

# Décommenter configuration HTTPS dans nginx/nginx.conf
nano nginx/nginx.conf

# Redémarrer Nginx
docker compose restart nginx
```

#### 5. Audit Logs

```bash
# Activer audit logs
sudo apt-get install auditd

# Monitorer fichiers sensibles
sudo auditctl -w /home/master/radio-staff/.env.production -p wa

# Voir audit logs
sudo ausearch -f /home/master/radio-staff/.env.production
```

#### 6. Scan de Vulnérabilités

```bash
# Installer Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Scanner les images
trivy image radio-staff-backend:latest
trivy image radio-staff-frontend:latest

# Scanner le système
trivy rootfs /
```

### Contacts d'Urgence

En cas de problème de sécurité:

1. Arrêter immédiatement les services: `docker compose down`
2. Isoler le serveur du réseau si nécessaire
3. Analyser les logs: `./scripts/health-check.sh --verbose`
4. Restaurer depuis backup sain: `./scripts/rollback.sh`
5. Changer tous les secrets
6. Documenter l'incident

---

## Annexes

### A. Structure des Fichiers

```
/home/master/radio-staff/
├── .env.production              # Configuration production (SECRET)
├── .env.production.example      # Template configuration
├── docker-compose.yml           # Configuration Docker base
├── docker-compose.prod.yml      # Overrides production
├── DEPLOYMENT_GUIDE.md          # Ce guide
├── backend/
│   ├── Dockerfile              # Image backend
│   └── ...
├── frontend/
│   ├── Dockerfile              # Image frontend
│   └── ...
├── keycloak/
│   ├── Dockerfile              # Image Keycloak
│   └── realm-export.json       # Configuration realm
├── nginx/
│   ├── Dockerfile              # Image Nginx
│   └── nginx.conf              # Configuration Nginx
├── scripts/
│   ├── deploy.sh               # Script déploiement
│   ├── rollback.sh             # Script rollback
│   ├── backup-db.sh            # Script backup
│   └── health-check.sh         # Script health check
├── logs/                       # Logs des scripts
└── ...

/home/master/backups/radio-staff/
├── radio_backup_20250117_143000.sql.gz
├── radio_backup_20250117_143000.meta
└── ...
```

### B. Ports Utilisés

| Service    | Port Interne | Port Externe | Exposition      |
|------------|--------------|--------------|-----------------|
| Nginx      | 80, 443      | 80, 443      | Public          |
| Frontend   | 3000         | -            | Interne Docker  |
| Backend    | 4000         | -            | Interne Docker  |
| Keycloak   | 8080         | -            | Via Nginx /auth |
| PostgreSQL | 5432         | -            | Interne Docker  |

### C. Variables d'Environnement

Voir `.env.production.example` pour la liste complète.

Variables critiques:
- `POSTGRES_PASSWORD`: Mot de passe PostgreSQL
- `KEYCLOAK_ADMIN_PASSWORD`: Mot de passe admin Keycloak
- `KEYCLOAK_CLIENT_SECRET`: Secret client OAuth
- `JWT_SECRET`: Secret pour tokens JWT
- `SESSION_SECRET`: Secret pour sessions

### D. Commandes Utiles

```bash
# Déploiement
./scripts/deploy.sh

# Health check
./scripts/health-check.sh

# Backup
./scripts/backup-db.sh

# Rollback
./scripts/rollback.sh --list
./scripts/rollback.sh --backup <file>

# Logs
docker compose logs -f
docker compose logs -f backend

# État
docker compose ps
docker stats

# Redémarrer service
docker compose restart <service>

# Rebuild service
docker compose up -d --build <service>

# Shell dans conteneur
docker compose exec <service> sh

# SQL dans PostgreSQL
docker compose exec postgres psql -U radio -d radiodb
```

### E. Ressources

- **Docker**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **NestJS**: https://docs.nestjs.com/
- **Next.js**: https://nextjs.org/docs
- **Keycloak**: https://www.keycloak.org/documentation
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Nginx**: https://nginx.org/en/docs/

---

## Support

Pour obtenir de l'aide:

1. Consultez la section [Troubleshooting](#troubleshooting)
2. Vérifiez les logs: `docker compose logs`
3. Exécutez un health check: `./scripts/health-check.sh --verbose`
4. Consultez la documentation officielle des composants

---

**Version**: 1.0.0
**Dernière mise à jour**: 2025-10-17
**Auteur**: Équipe Radio Staff Manager
