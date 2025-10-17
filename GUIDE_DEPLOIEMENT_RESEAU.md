# Guide de Deploiement Reseau - Radio Staff Manager

## Deploiement Rapide sur VPS 192.168.1.200

### Etape 1: Preparation (2 minutes)

```bash
cd /home/master/radio-staff

# Verification des fichiers
ls -la nginx/nginx.conf
ls -la docker-compose.yml
ls -la scripts/setup-https.sh
ls -la scripts/verify-network-security.sh

# Rendre les scripts executables
chmod +x scripts/*.sh
```

### Etape 2: Deploiement Docker (5 minutes)

```bash
# Arreter les services existants
docker-compose down

# Reconstruire et demarrer
docker-compose up -d --build

# Verifier que tout demarre
docker-compose ps
```

**Resultats attendus:**
```
NAME                STATUS              PORTS
radio-nginx         Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
radio-backend       Up (healthy)        (pas de ports)
radio-frontend      Up                  (pas de ports)
radio-keycloak      Up                  (pas de ports)
radio-postgres      Up                  (pas de ports)
```

### Etape 3: Verification (2 minutes)

```bash
# Executer le script de verification
bash scripts/verify-network-security.sh
```

**Tous les tests critiques doivent passer.**

### Etape 4: Tests de Connectivite (1 minute)

```bash
# Test endpoint sante
curl http://192.168.1.200/health
# Resultat: healthy

# Test API
curl http://192.168.1.200/api/health
# Resultat: {"status":"ok"}

# Test Frontend
curl -I http://192.168.1.200/
# Resultat: HTTP/1.1 200 OK

# Verification headers securite
curl -I http://192.168.1.200/ | grep -E "X-Frame-Options|Content-Security-Policy"
```

### Etape 5: Configuration HTTPS (Optionnel - 5 minutes)

#### Option A: Certificat Auto-Signe (Pour Dev/Test)

```bash
sudo bash scripts/setup-https.sh 192.168.1.200
```

#### Option B: Let's Encrypt (Pour Production)

**Prerequis:** Domaine valide pointant vers le serveur

```bash
sudo bash scripts/setup-https.sh votre-domaine.com admin@votre-domaine.com
```

### Verification Finale

```bash
# Verifier que l'application est accessible
# Ouvrir dans le navigateur:
http://192.168.1.200/

# Ou avec HTTPS apres configuration:
https://192.168.1.200/
```

---

## Securite Implementee

### Headers de Securite
- ✅ X-Frame-Options: SAMEORIGIN
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Content-Security-Policy (stricte)
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy

### Rate Limiting
- ✅ API: 30 requetes/seconde par IP
- ✅ Auth: 10 requetes/seconde par IP (anti brute force)
- ✅ Frontend: 50 requetes/seconde par IP
- ✅ Connexions: 20 simultanees par IP

### Isolation Reseau
- ✅ PostgreSQL (5432) - NON expose publiquement
- ✅ Keycloak (8080) - NON expose publiquement
- ✅ Backend (4000) - NON expose publiquement
- ✅ Seuls ports 80 et 443 exposes

### Autres Protections
- ✅ Version Nginx cachee
- ✅ Fichiers sensibles bloques (.env, .git)
- ✅ Timeouts configures
- ✅ Compression gzip active
- ✅ Cache pour assets statiques

---

## Commandes Utiles

### Monitoring
```bash
# Status des conteneurs
docker-compose ps

# Logs en temps reel
docker-compose logs -f [service-name]

# Utilisation ressources
docker stats
```

### Redemarrage Services
```bash
# Redemarrer un service specifique
docker-compose restart nginx
docker-compose restart backend

# Redemarrer tous les services
docker-compose restart
```

### Verification Securite
```bash
# Script complet de verification
bash scripts/verify-network-security.sh

# Test headers manuels
curl -I http://192.168.1.200/

# Test rate limiting
for i in {1..35}; do curl -s http://192.168.1.200/api/health & done
```

---

## Troubleshooting Rapide

### Erreur 502 Bad Gateway
```bash
# Verifier les services
docker-compose ps

# Verifier les logs
docker-compose logs backend
docker-compose logs nginx

# Redemarrer
docker-compose restart backend nginx
```

### Erreur 429 Too Many Requests
```bash
# Attendre quelques secondes, ou
# Ajuster les limites dans nginx/nginx.conf
docker-compose restart nginx
```

### Service ne demarre pas
```bash
# Voir les logs d'erreur
docker-compose logs [service-name]

# Rebuild le service
docker-compose up -d --build [service-name]
```

---

## URLs d'Acces

- **Frontend:** http://192.168.1.200/
- **API Backend:** http://192.168.1.200/api/
- **Keycloak:** http://192.168.1.200/auth/
- **Health Check:** http://192.168.1.200/health

**Apres configuration HTTPS:**
- **Frontend:** https://192.168.1.200/
- **API Backend:** https://192.168.1.200/api/
- **Keycloak:** https://192.168.1.200/auth/

---

## Documentation Complete

Pour plus de details, consultez:
- **RAPPORT_RESEAU_SECURITE.md** - Documentation complete
- **TEST_PLAN.md** - Plan de tests complet
- **Scripts:** `/home/master/radio-staff/scripts/`

---

## Support

**Verification de la configuration:**
```bash
bash scripts/verify-network-security.sh
```

**Verification SSL/TLS (apres config HTTPS):**
```bash
curl -I https://192.168.1.200/
openssl s_client -connect 192.168.1.200:443
```

**Test de score SSL:**
https://www.ssllabs.com/ssltest/analyze.html?d=192.168.1.200

---

**Guide cree le:** 2025-10-17
**Version:** 1.0
**Statut:** Production Ready
