#!/bin/bash

#############################################################################
# Script de Verification de la Securite Reseau - Radio Staff Manager
#
# Ce script verifie la configuration reseau et les mesures de securite
# implementees pour s'assurer que le deploiement est securise.
#
# USAGE:
#   bash /home/master/radio-staff/scripts/verify-network-security.sh
#
#############################################################################

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
PROJECT_DIR="/home/master/radio-staff"
DOMAIN="${1:-192.168.1.200}"
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Verification Securite Reseau Radio Staff ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Fonction pour tester et afficher les resultats
test_check() {
    local description="$1"
    local command="$2"
    local expected="$3"

    echo -e "${YELLOW}[TEST]${NC} ${description}..."

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}[PASS]${NC} ${description}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} ${description}"
        ((FAILED++))
        return 1
    fi
}

warning_check() {
    local description="$1"
    echo -e "${YELLOW}[WARN]${NC} ${description}"
    ((WARNINGS++))
}

# 1. Verification des conteneurs Docker
echo -e "${BLUE}[SECTION 1]${NC} Verification des Conteneurs Docker"
echo "----------------------------------------"

test_check "Conteneur Nginx en execution" \
    "docker ps | grep -q radio-nginx"

test_check "Conteneur Backend en execution" \
    "docker ps | grep -q radio-backend"

test_check "Conteneur Frontend en execution" \
    "docker ps | grep -q radio-frontend"

test_check "Conteneur Keycloak en execution" \
    "docker ps | grep -q radio-keycloak"

test_check "Conteneur PostgreSQL en execution" \
    "docker ps | grep -q radio-postgres"

echo ""

# 2. Verification de l'exposition des ports
echo -e "${BLUE}[SECTION 2]${NC} Verification de l'Exposition des Ports"
echo "----------------------------------------"

# Verification que seuls les ports 80 et 443 sont exposes
if docker ps --format "{{.Ports}}" | grep -q "0.0.0.0:80"; then
    echo -e "${GREEN}[PASS]${NC} Port 80 (HTTP) expose correctement"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Port 80 (HTTP) non expose"
    ((FAILED++))
fi

if docker ps --format "{{.Ports}}" | grep -q "0.0.0.0:443"; then
    echo -e "${GREEN}[PASS]${NC} Port 443 (HTTPS) configure"
    ((PASSED++))
else
    warning_check "Port 443 (HTTPS) non expose - Attendre configuration SSL"
fi

# Verification que les ports sensibles ne sont PAS exposes
if docker ps --format "{{.Ports}}" | grep -q "0.0.0.0:5432"; then
    echo -e "${RED}[FAIL]${NC} Port PostgreSQL 5432 expose publiquement (RISQUE SECURITE)"
    ((FAILED++))
else
    echo -e "${GREEN}[PASS]${NC} Port PostgreSQL 5432 NON expose (securise)"
    ((PASSED++))
fi

if docker ps --format "{{.Ports}}" | grep -q "0.0.0.0:8080"; then
    echo -e "${RED}[FAIL]${NC} Port Keycloak 8080 expose publiquement (RISQUE SECURITE)"
    ((FAILED++))
else
    echo -e "${GREEN}[PASS]${NC} Port Keycloak 8080 NON expose (securise)"
    ((PASSED++))
fi

if docker ps --format "{{.Ports}}" | grep -q "0.0.0.0:4000"; then
    echo -e "${RED}[FAIL]${NC} Port Backend 4000 expose publiquement (RISQUE SECURITE)"
    ((FAILED++))
else
    echo -e "${GREEN}[PASS]${NC} Port Backend 4000 NON expose (securise)"
    ((PASSED++))
fi

echo ""

# 3. Verification de la connectivite des services
echo -e "${BLUE}[SECTION 3]${NC} Verification de la Connectivite"
echo "----------------------------------------"

# Test de l'endpoint de sante Nginx
if curl -sf http://${DOMAIN}/health > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} Endpoint de sante Nginx accessible"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Endpoint de sante Nginx inaccessible"
    ((FAILED++))
fi

# Test de l'API Backend via Nginx
if curl -sf http://${DOMAIN}/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} API Backend accessible via Nginx (/api/)"
    ((PASSED++))
else
    echo -e "${YELLOW}[WARN]${NC} API Backend non accessible (peut etre en cours de demarrage)"
    ((WARNINGS++))
fi

# Test de Keycloak via Nginx
if curl -sf http://${DOMAIN}/auth/ > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} Keycloak accessible via Nginx (/auth/)"
    ((PASSED++))
else
    echo -e "${YELLOW}[WARN]${NC} Keycloak non accessible (peut etre en cours de demarrage)"
    ((WARNINGS++))
fi

# Test du Frontend via Nginx
if curl -sf http://${DOMAIN}/ > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} Frontend accessible via Nginx"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Frontend inaccessible"
    ((FAILED++))
fi

echo ""

# 4. Verification des headers de securite
echo -e "${BLUE}[SECTION 4]${NC} Verification des Headers de Securite"
echo "----------------------------------------"

HEADERS=$(curl -sI http://${DOMAIN}/ 2>/dev/null || echo "")

if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
    echo -e "${GREEN}[PASS]${NC} Header X-Frame-Options present"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Header X-Frame-Options manquant"
    ((FAILED++))
fi

if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
    echo -e "${GREEN}[PASS]${NC} Header X-Content-Type-Options present"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Header X-Content-Type-Options manquant"
    ((FAILED++))
fi

if echo "$HEADERS" | grep -qi "X-XSS-Protection"; then
    echo -e "${GREEN}[PASS]${NC} Header X-XSS-Protection present"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Header X-XSS-Protection manquant"
    ((FAILED++))
fi

if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
    echo -e "${GREEN}[PASS]${NC} Header Content-Security-Policy present"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Header Content-Security-Policy manquant"
    ((FAILED++))
fi

if echo "$HEADERS" | grep -qi "Referrer-Policy"; then
    echo -e "${GREEN}[PASS]${NC} Header Referrer-Policy present"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Header Referrer-Policy manquant"
    ((FAILED++))
fi

if echo "$HEADERS" | grep -qi "Permissions-Policy"; then
    echo -e "${GREEN}[PASS]${NC} Header Permissions-Policy present"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Header Permissions-Policy manquant"
    ((FAILED++))
fi

# Verification HSTS (seulement en HTTPS)
if curl -skI https://${DOMAIN}/ 2>/dev/null | grep -qi "Strict-Transport-Security"; then
    echo -e "${GREEN}[PASS]${NC} Header HSTS (Strict-Transport-Security) present"
    ((PASSED++))
else
    warning_check "Header HSTS non present - Normal si HTTPS non configure"
fi

# Verification que la version Nginx est cachee
if echo "$HEADERS" | grep -i "Server:" | grep -qi "nginx/[0-9]"; then
    echo -e "${RED}[FAIL]${NC} Version Nginx exposee dans les headers"
    ((FAILED++))
else
    echo -e "${GREEN}[PASS]${NC} Version Nginx cachee (server_tokens off)"
    ((PASSED++))
fi

echo ""

# 5. Verification de la configuration Nginx
echo -e "${BLUE}[SECTION 5]${NC} Verification Configuration Nginx"
echo "----------------------------------------"

NGINX_CONF="${PROJECT_DIR}/nginx/nginx.conf"

if grep -q "server_tokens off" "$NGINX_CONF"; then
    echo -e "${GREEN}[PASS]${NC} server_tokens off configure"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} server_tokens off non configure"
    ((FAILED++))
fi

if grep -q "limit_req_zone" "$NGINX_CONF"; then
    echo -e "${GREEN}[PASS]${NC} Rate limiting configure"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Rate limiting non configure"
    ((FAILED++))
fi

if grep -q "limit_conn_zone" "$NGINX_CONF"; then
    echo -e "${GREEN}[PASS]${NC} Connection limiting configure"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Connection limiting non configure"
    ((FAILED++))
fi

if grep -q "proxy_buffer_size" "$NGINX_CONF"; then
    echo -e "${GREEN}[PASS]${NC} Proxy buffering configure"
    ((PASSED++))
else
    warning_check "Proxy buffering non optimise"
fi

echo ""

# 6. Verification du reseau Docker
echo -e "${BLUE}[SECTION 6]${NC} Verification Reseau Docker"
echo "----------------------------------------"

if docker network inspect radio-network > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} Reseau Docker radio-network existe"
    ((PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Reseau Docker radio-network inexistant"
    ((FAILED++))
fi

# Verification que tous les services sont sur le meme reseau
NETWORK_CONTAINERS=$(docker network inspect radio-network -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "")

for service in nginx backend frontend keycloak postgres; do
    if echo "$NETWORK_CONTAINERS" | grep -q "radio-${service}"; then
        echo -e "${GREEN}[PASS]${NC} Service ${service} connecte au reseau radio-network"
        ((PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} Service ${service} NON connecte au reseau"
        ((FAILED++))
    fi
done

echo ""

# 7. Test de rate limiting
echo -e "${BLUE}[SECTION 7]${NC} Test de Rate Limiting (optionnel)"
echo "----------------------------------------"

echo -e "${YELLOW}[INFO]${NC} Test du rate limiting en envoyant 5 requetes rapides..."
RATE_LIMIT_TRIGGERED=false

for i in {1..5}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://${DOMAIN}/api/health 2>/dev/null || echo "000")
    if [ "$response" = "429" ]; then
        RATE_LIMIT_TRIGGERED=true
        break
    fi
    sleep 0.1
done

if [ "$RATE_LIMIT_TRIGGERED" = true ]; then
    echo -e "${GREEN}[PASS]${NC} Rate limiting fonctionne (code 429 detecte)"
    ((PASSED++))
else
    echo -e "${YELLOW}[INFO]${NC} Rate limiting non declenche avec 5 requetes (limite plus elevee)"
    ((WARNINGS++))
fi

echo ""

# 8. Verification SSL/TLS (si configure)
echo -e "${BLUE}[SECTION 8]${NC} Verification SSL/TLS"
echo "----------------------------------------"

if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    echo -e "${GREEN}[PASS]${NC} Certificats SSL trouves dans /etc/letsencrypt/live/${DOMAIN}"
    ((PASSED++))

    # Test de la connectivite HTTPS
    if curl -skI https://${DOMAIN}/ > /dev/null 2>&1; then
        echo -e "${GREEN}[PASS]${NC} HTTPS accessible"
        ((PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} HTTPS non accessible"
        ((FAILED++))
    fi

    # Verification de la redirection HTTP vers HTTPS
    HTTP_RESPONSE=$(curl -sI http://${DOMAIN} 2>/dev/null | head -n 1)
    if echo "$HTTP_RESPONSE" | grep -q "301\|302"; then
        echo -e "${GREEN}[PASS]${NC} Redirection HTTP vers HTTPS active"
        ((PASSED++))
    else
        warning_check "Redirection HTTP vers HTTPS non detectee"
    fi
else
    warning_check "Certificats SSL non trouves - HTTPS non configure"
    echo -e "${YELLOW}[INFO]${NC} Executez le script setup-https.sh pour configurer HTTPS"
fi

echo ""

# Affichage du resume final
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}           Resume de la Verification       ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Tests passes:       ${GREEN}${PASSED}${NC}"
echo -e "Tests echoues:      ${RED}${FAILED}${NC}"
echo -e "Avertissements:     ${YELLOW}${WARNINGS}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}[SUCCES]${NC} Tous les tests critiques sont passes!"
    echo -e "${GREEN}La configuration reseau est securisee.${NC}"
    exit 0
else
    echo -e "${RED}[ATTENTION]${NC} ${FAILED} test(s) critique(s) echoue(s)"
    echo -e "${YELLOW}Veuillez corriger les problemes identifies ci-dessus.${NC}"
    exit 1
fi
