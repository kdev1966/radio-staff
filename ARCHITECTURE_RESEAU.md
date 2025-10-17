# Architecture Reseau - Radio Staff Manager

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                    │
│                      (Clients externes)                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────▼───────────┐
                    │   Firewall (optionnel) │
                    │   VPS: 192.168.1.200   │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼───────────┐
                    │      Port 80 / 443     │
                    │   (Seuls ports publics)│
                    └────────────┬───────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                        NGINX REVERSE PROXY                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Rate Limiting:                                                   │   │
│  │  - API: 30 req/s + burst 20                                      │   │
│  │  - Auth: 10 req/s + burst 5                                      │   │
│  │  - Frontend: 50 req/s + burst 50                                 │   │
│  │  - Max connexions: 20/IP                                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Headers Securite:                                                │   │
│  │  - X-Frame-Options, CSP, HSTS, X-XSS-Protection, etc.           │   │
│  │  - server_tokens off (version cachee)                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└────────┬─────────────────┬───────────────────────┬────────────────────┘
         │                 │                       │
         │ (/)             │ (/api/)               │ (/auth/)
         │                 │                       │
┌────────▼────────┐ ┌──────▼──────────┐  ┌────────▼──────────┐
│   FRONTEND      │ │    BACKEND      │  │    KEYCLOAK       │
│   (Next.js)     │ │    (NestJS)     │  │  (Auth Server)    │
│   Port: 3000    │ │    Port: 4000   │  │   Port: 8080      │
│   (interne)     │ │    (interne)    │  │   (interne)       │
└─────────────────┘ └────────┬────────┘  └─────────┬─────────┘
                             │                      │
                             │  DATABASE_URL        │  JDBC_URL
                             │                      │
                    ┌────────▼──────────────────────▼────────┐
                    │         POSTGRESQL                      │
                    │         Port: 5432                      │
                    │         (interne uniquement)            │
                    │  ┌──────────────────────────────────┐   │
                    │  │  - radiodb                       │   │
                    │  │  - Users, Employees, Shifts, etc.│   │
                    │  └──────────────────────────────────┘   │
                    └─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│              RESEAU DOCKER INTERNE: radio-network                        │
│              (Tous les services isoles)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Flux de Requetes

### 1. Requete Frontend (Page Web)

```
┌────────┐  HTTP GET /          ┌───────┐  Proxy      ┌──────────┐
│ Client ├──────────────────────►│ Nginx ├────────────►│ Frontend │
│        │                       │       │             │ :3000    │
└────────┘  ◄──────────────────┬─┴───────┘◄────────────┴──────────┘
            HTTP 200 + HTML    │
                               │
                     ┌─────────▼──────────┐
                     │ Headers Securite:  │
                     │ - CSP              │
                     │ - X-Frame-Options  │
                     │ - HSTS (si HTTPS)  │
                     │ - etc.             │
                     └────────────────────┘
```

### 2. Requete API (Donnees)

```
┌────────┐  HTTP GET /api/employees  ┌───────┐  Proxy     ┌─────────┐
│ Client ├───────────────────────────►│ Nginx ├───────────►│ Backend │
│        │  + JWT Token              │       │  + Headers │ :4000   │
└────────┘                            └───┬───┘            └────┬────┘
    ▲                                     │                     │
    │                    ┌────────────────┘                     │
    │                    │ Rate Limiting                        │
    │                    │ 30 req/s                             │
    │                    └──────────────────────────────────────┘
    │                                                            │
    │                              SQL Query                    │
    │                         ┌─────────────────────────────────▼───┐
    │   JSON Response         │          PostgreSQL                 │
    └─────────────────────────┤          :5432                      │
                              │  SELECT * FROM employees...         │
                              └─────────────────────────────────────┘
```

### 3. Authentification Keycloak

```
┌────────┐  POST /auth/realms/radio-staff/protocol/openid-connect/token
│ Client ├─────────────────────────────────────────────────────────────┐
│        │  { username, password }                                     │
└────────┘                                                              │
    ▲                                                                   │
    │                                                                   ▼
    │                            ┌───────┐  Proxy     ┌───────────────┐
    │   JWT Token + Refresh      │ Nginx ├───────────►│   Keycloak    │
    └────────────────────────────┤       │            │   :8080       │
                                 └───┬───┘            └───────┬───────┘
                                     │                        │
                          Rate Limiting                       │
                          10 req/s (strict)           Verify credentials
                          Protection brute force              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │   PostgreSQL    │
                                                    │   Users table   │
                                                    └─────────────────┘
```

---

## Couches de Securite

### Couche 1: Reseau Externe
```
┌──────────────────────────────────────────┐
│  Firewall VPS (optionnel)                │
│  - Ports 80/443 ouverts                  │
│  - Autres ports bloques                  │
└──────────────────────────────────────────┘
```

### Couche 2: Nginx (Point d'Entree Unique)
```
┌──────────────────────────────────────────┐
│  Rate Limiting                            │
│  - Par IP                                 │
│  - Par endpoint                           │
│  - Burst tolerance                        │
├──────────────────────────────────────────┤
│  Headers Securite                         │
│  - CSP, HSTS, X-Frame-Options            │
│  - server_tokens off                      │
├──────────────────────────────────────────┤
│  Blocage Fichiers Sensibles              │
│  - .env, .git, etc.                      │
├──────────────────────────────────────────┤
│  Timeouts & Connection Limits             │
│  - Max 20 connexions/IP                  │
│  - Timeouts configures                   │
└──────────────────────────────────────────┘
```

### Couche 3: Reseau Docker Interne
```
┌──────────────────────────────────────────┐
│  Reseau Bridge: radio-network             │
│  - Communication inter-services           │
│  - Isolation du monde exterieur          │
│  - Resolution DNS interne                │
└──────────────────────────────────────────┘
```

### Couche 4: Services Applicatifs
```
┌──────────────────────────────────────────┐
│  Keycloak (Authentification)              │
│  - JWT tokens                             │
│  - Role-based access control             │
│  - Session management                     │
├──────────────────────────────────────────┤
│  Backend (Validation)                     │
│  - Validation JWT                         │
│  - Business logic                         │
│  - Input validation                       │
└──────────────────────────────────────────┘
```

### Couche 5: Base de Donnees
```
┌──────────────────────────────────────────┐
│  PostgreSQL                               │
│  - Port NON expose publiquement          │
│  - Credentials via env vars              │
│  - Acces interne uniquement              │
└──────────────────────────────────────────┘
```

---

## Matrice d'Exposition des Ports

| Service | Port Interne | Expose Publiquement | Accessible Via | Risque |
|---------|--------------|---------------------|----------------|--------|
| Nginx | 80 | ✅ Oui | Direct | ⚠️ Faible (protections actives) |
| Nginx | 443 | ✅ Oui (apres config) | Direct | ⚠️ Faible (SSL + protections) |
| Frontend | 3000 | ❌ Non | Nginx (/) | ✅ Tres faible |
| Backend | 4000 | ❌ Non | Nginx (/api/) | ✅ Tres faible |
| Keycloak | 8080 | ❌ Non | Nginx (/auth/) | ✅ Tres faible |
| PostgreSQL | 5432 | ❌ Non | Reseau interne uniquement | ✅ Tres faible |

### Avant vs Apres Securisation

#### AVANT (Non Securise)
```
INTERNET ──┐
           ├─► Port 80   (Nginx)       ✅ Accessible
           ├─► Port 443  (Nginx)       ❌ Non configure
           ├─► Port 3000 (Frontend)    ⚠️ EXPOSE (Risque)
           ├─► Port 4000 (Backend)     🔴 EXPOSE (Risque Critique)
           ├─► Port 5432 (PostgreSQL)  🔴 EXPOSE (Risque Critique)
           └─► Port 8080 (Keycloak)    🔴 EXPOSE (Risque Critique)

Headers Securite: ❌ Aucun
Rate Limiting: ❌ Non configure
```

#### APRES (Securise)
```
INTERNET ──┐
           ├─► Port 80   (Nginx)       ✅ Accessible + Rate Limited
           ├─► Port 443  (Nginx)       ✅ Pret pour HTTPS
           ├─► Port 3000 (Frontend)    ✅ NON EXPOSE (via Nginx)
           ├─► Port 4000 (Backend)     ✅ NON EXPOSE (via Nginx)
           ├─► Port 5432 (PostgreSQL)  ✅ NON EXPOSE (interne)
           └─► Port 8080 (Keycloak)    ✅ NON EXPOSE (via Nginx)

Headers Securite: ✅ 6+ headers configures
Rate Limiting: ✅ 3 zones (API, Auth, General)
Connection Limiting: ✅ 20 connexions max/IP
```

---

## Rate Limiting - Configuration Detaillee

### Zones Configurees

```nginx
# Zone API - Backend
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
```
- **Taille memoire:** 10 MB (supporte ~160,000 IPs)
- **Taux:** 30 requetes par seconde
- **Burst:** 20 requetes supplementaires
- **Application:** Tous les endpoints /api/*

```nginx
# Zone Auth - Keycloak
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
```
- **Taille memoire:** 10 MB
- **Taux:** 10 requetes par seconde (strict)
- **Burst:** 5 requetes supplementaires
- **Application:** Tous les endpoints /auth/*
- **But:** Prevention attaques brute force

```nginx
# Zone General - Frontend
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=50r/s;
```
- **Taille memoire:** 10 MB
- **Taux:** 50 requetes par seconde
- **Burst:** 50 requetes supplementaires
- **Application:** Pages frontend (/)

```nginx
# Connection Limiting
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 20;
```
- **Taille memoire:** 10 MB
- **Max connexions:** 20 simultanees par IP
- **Application:** Globale

### Comportement en Cas de Depassement

```
Requete 1-30:   ✅ OK (dans la limite)
Requete 31-50:  ✅ OK (burst tolerance)
Requete 51+:    ❌ 429 Too Many Requests

Message retourne:
"Too Many Requests - Rate limit exceeded"
```

### Ajustement selon Usage

**Pour environnement dev/test:**
```nginx
rate=100r/s;  # Plus permissif
burst=100;
```

**Pour production haute charge:**
```nginx
rate=30r/s;   # Equilibre
burst=20;
```

**Pour environnement sensible:**
```nginx
rate=10r/s;   # Tres strict
burst=5;
```

---

## Headers de Securite - Reference Complete

### Headers Implementes

| Header | Valeur | Protection Contre | Niveau |
|--------|--------|-------------------|--------|
| X-Frame-Options | SAMEORIGIN | Clickjacking | Critique |
| X-Content-Type-Options | nosniff | MIME sniffing | Important |
| X-XSS-Protection | 1; mode=block | XSS | Important |
| Content-Security-Policy | (voir config) | XSS, Injection | Critique |
| Referrer-Policy | strict-origin-when-cross-origin | Info leakage | Important |
| Permissions-Policy | geolocation=(), microphone=(), camera=() | API abuse | Moyen |
| Strict-Transport-Security | max-age=31536000 | MITM, Downgrade | Critique |

### Content Security Policy (CSP)

Configuration actuelle:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' http://192.168.1.200;
frame-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
```

**Note:** `unsafe-inline` et `unsafe-eval` necessaires pour Next.js.
En production stricte, considerer CSP avec nonces.

---

## Performance et Optimisations

### Cache Nginx

```nginx
# Cache pour assets statiques
proxy_cache_path /var/cache/nginx
    levels=1:2
    keys_zone=STATIC:10m
    inactive=7d
    use_temp_path=off;

# Application du cache
location /_next/static {
    proxy_cache STATIC;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header X-Cache-Status $upstream_cache_status;
}
```

**Benefices:**
- Reduction charge backend
- Latence reduite pour assets statiques
- Bande passante economisee

### Keepalive Connections

```nginx
upstream backend {
    server backend:4000;
    keepalive 32;  # Maintenir 32 connexions ouvertes
}
```

**Benefices:**
- Reduction latence TCP handshake
- Meilleures performances
- Moins de charge CPU

### Compression Gzip

```nginx
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript...;
```

**Benefices:**
- Reduction taille reponses (~70%)
- Transfert plus rapide
- Economies bande passante

### Metriques de Performance Attendues

| Metrique | Sans Optimisations | Avec Optimisations |
|----------|--------------------|--------------------|
| Temps chargement page | ~2-3s | ~0.5-1s |
| Taille transfert | ~2 MB | ~600 KB |
| Requetes vers backend | 100% | ~20% (cache) |
| Latence API | ~100-200ms | ~50-100ms |

---

## Monitoring et Alerting

### Endpoints de Monitoring

```bash
# Health check Nginx
curl http://192.168.1.200/health
# Reponse: healthy

# Health check Backend
curl http://192.168.1.200/api/health
# Reponse: {"status":"ok","database":"connected"}
```

### Metriques a Surveiller

#### Disponibilite (Uptime)
- Target: 99.9% (8.76h downtime/an)
- Monitoring: Chaque 1 minute

#### Latence
- P50 < 100ms
- P95 < 300ms
- P99 < 500ms

#### Taux d'Erreur
- 5xx errors < 0.1%
- 4xx errors < 5%

#### Rate Limiting
- 429 errors monitoring
- Ajustement si > 1% des requetes

### Logs a Analyser

```bash
# Erreurs Nginx
docker-compose logs nginx | grep "error"

# Rate limiting triggers
docker-compose logs nginx | grep "429"

# Erreurs applicatives
docker-compose logs backend | grep "ERROR"

# Erreurs Keycloak
docker-compose logs keycloak | grep "ERROR"
```

---

## Checklist de Securite

### Pre-Deploiement
- [ ] Variables d'environnement configurees (`.env`)
- [ ] Mots de passe forts definis
- [ ] Configuration Nginx verifiee (`nginx -t`)
- [ ] Ports sensibles non exposes dans docker-compose.yml
- [ ] Scripts executables (`chmod +x scripts/*.sh`)

### Post-Deploiement
- [ ] Tous les conteneurs en etat "Up"
- [ ] Endpoint /health retourne "healthy"
- [ ] Headers de securite presents (`curl -I`)
- [ ] Rate limiting fonctionne (test avec requetes multiples)
- [ ] Ports 5432, 8080, 4000 NON accessibles depuis l'exterieur
- [ ] Script de verification passe (`verify-network-security.sh`)

### Configuration HTTPS (Optionnel)
- [ ] Certificat SSL obtenu
- [ ] HTTPS accessible
- [ ] Redirection HTTP vers HTTPS active
- [ ] HSTS header present
- [ ] Score SSL Labs A ou A+
- [ ] Renouvellement automatique configure

### Monitoring Continue
- [ ] Health checks automatises
- [ ] Logs centralises
- [ ] Alertes configurees
- [ ] Sauvegardes planifiees
- [ ] Plan de reprise apres incident

---

## Conformite et Standards

### Standards Suivis

✅ **OWASP Top 10 2021**
- A01: Broken Access Control → Protege par Keycloak + JWT
- A02: Cryptographic Failures → HTTPS (apres config)
- A03: Injection → Validation backend + CSP
- A05: Security Misconfiguration → Headers + config securisee
- A07: XSS → CSP + X-XSS-Protection

✅ **CIS Docker Benchmark**
- Network isolation
- Non-root containers
- Resource limits
- Read-only filesystems (nginx.conf)

✅ **Mozilla SSL Configuration**
- TLS 1.2 et 1.3 uniquement
- Cipher suites modernes
- HSTS avec preload
- OCSP Stapling

✅ **NIST Cybersecurity Framework**
- Identify: Architecture documentee
- Protect: Multiples couches de securite
- Detect: Monitoring et logs
- Respond: Scripts de verification
- Recover: Sauvegardes et procedures

---

## Glossaire

**Rate Limiting:** Limitation du nombre de requetes par unite de temps
**Burst:** Nombre de requetes supplementaires tolerees temporairement
**Reverse Proxy:** Serveur intermediaire qui redirige les requetes
**CSP:** Content Security Policy - Politique de securite du contenu
**HSTS:** HTTP Strict Transport Security - Force l'utilisation de HTTPS
**JWT:** JSON Web Token - Token d'authentification
**mTLS:** Mutual TLS - Authentification bidirectionnelle
**OCSP:** Online Certificate Status Protocol - Verification certificats
**XSS:** Cross-Site Scripting - Injection de scripts malveillants
**CSRF:** Cross-Site Request Forgery - Execution de requetes non autorisees
**DDoS:** Distributed Denial of Service - Attaque par saturation

---

**Document cree le:** 2025-10-17
**Auteur:** Network Security Engineer
**Version:** 1.0
**Statut:** Production Ready
