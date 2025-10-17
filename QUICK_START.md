# Quick Start - Déploiement Radio Staff Manager

Guide de démarrage rapide pour déployer l'application en production.

## Prérequis

- VPS: 192.168.1.200 (password: kdev66)
- Docker et Docker Compose installés
- 4GB RAM minimum, 8GB recommandé
- 50GB disque minimum

## Déploiement en 5 Minutes

### 1. Connexion au VPS

```bash
ssh master@192.168.1.200
cd /home/master/radio-staff
```

### 2. Génération des Secrets

```bash
# Générer tous les secrets et mettre à jour .env.production
./scripts/generate-secrets.sh --all --update-env

# Sécuriser le fichier
chmod 600 .env.production
```

### 3. Déploiement

```bash
# Déployer l'application (backup automatique inclus)
./scripts/deploy.sh
```

### 4. Vérification

```bash
# Vérifier que tous les services sont opérationnels
./scripts/health-check.sh --verbose
```

### 5. Accéder à l'Application

Ouvrir dans le navigateur:
- **Application**: http://192.168.1.200
- **Keycloak Admin**: http://192.168.1.200/auth
  - Username: admin
  - Password: (voir .env.production KEYCLOAK_ADMIN_PASSWORD)

## Commandes Essentielles

```bash
# Déployer/Mettre à jour
./scripts/deploy.sh

# Vérifier santé
./scripts/health-check.sh

# Créer backup
./scripts/backup-db.sh

# Restaurer backup
./scripts/rollback.sh --list
./scripts/rollback.sh --backup <fichier>

# Voir les logs
docker compose logs -f

# État des services
docker compose ps
docker stats
```

## En Cas de Problème

```bash
# 1. Vérifier les logs
docker compose logs

# 2. Vérifier santé détaillée
./scripts/health-check.sh --verbose

# 3. Redémarrer un service
docker compose restart <service>

# 4. Redémarrer tout
docker compose restart

# 5. Rollback si nécessaire
./scripts/rollback.sh
```

## Documentation Complète

- **DEPLOYMENT_GUIDE.md**: Guide complet de déploiement
- **DEPLOYMENT_REPORT.md**: Rapport d'optimisation
- **scripts/README.md**: Documentation des scripts

## Support

Pour aide détaillée:
```bash
./scripts/deploy.sh --help
./scripts/rollback.sh --help
./scripts/backup-db.sh --help
./scripts/health-check.sh --help
```

## Maintenance Automatique

Configurer les backups et monitoring automatiques:

```bash
# Éditer crontab
crontab -e

# Ajouter ces lignes:

# Backup quotidien à 2h du matin
0 2 * * * /home/master/radio-staff/scripts/backup-db.sh >> /home/master/radio-staff/logs/cron-backup.log 2>&1

# Health check toutes les 5 minutes
*/5 * * * * /home/master/radio-staff/scripts/health-check.sh --json >> /home/master/radio-staff/logs/health-check.log 2>&1
```

---

**Note**: Ce guide est pour démarrage rapide. Consultez DEPLOYMENT_GUIDE.md pour instructions détaillées.
