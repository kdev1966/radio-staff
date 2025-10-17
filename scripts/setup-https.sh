#!/bin/bash

#############################################################################
# Script de Configuration HTTPS avec Let's Encrypt pour Radio Staff Manager
#
# Ce script configure les certificats SSL/TLS via Let's Encrypt pour
# securiser les connexions HTTPS.
#
# PREREQUIS:
# - Le domaine doit pointer vers l'IP du serveur (ou utiliser l'IP publique)
# - Les ports 80 et 443 doivent etre accessibles depuis Internet
# - Docker et docker-compose doivent etre installes
# - L'application doit etre deja deployee et accessible via HTTP
#
# USAGE:
#   sudo bash /home/master/radio-staff/scripts/setup-https.sh [DOMAIN]
#
# EXEMPLE:
#   sudo bash /home/master/radio-staff/scripts/setup-https.sh 192.168.1.200
#   sudo bash /home/master/radio-staff/scripts/setup-https.sh radio-staff.example.com
#
#############################################################################

set -e  # Arreter le script en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
PROJECT_DIR="/home/master/radio-staff"
NGINX_CONF="${PROJECT_DIR}/nginx/nginx.conf"
DOCKER_COMPOSE="${PROJECT_DIR}/docker-compose.yml"
DOMAIN="${1:-192.168.1.200}"
EMAIL="${2:-admin@${DOMAIN}}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Configuration HTTPS - Let's Encrypt  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verification que le script est execute en root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERREUR]${NC} Ce script doit etre execute en tant que root (sudo)"
    exit 1
fi

echo -e "${YELLOW}[INFO]${NC} Configuration pour le domaine: ${DOMAIN}"
echo -e "${YELLOW}[INFO]${NC} Email de contact: ${EMAIL}"
echo ""

# Verification de la connectivite
echo -e "${BLUE}[ETAPE 1/7]${NC} Verification de la connectivite..."
if ! curl -s --max-time 5 http://${DOMAIN}/health > /dev/null 2>&1; then
    echo -e "${YELLOW}[AVERTISSEMENT]${NC} Impossible d'atteindre http://${DOMAIN}/health"
    echo -e "${YELLOW}[AVERTISSEMENT]${NC} Assurez-vous que l'application est deja deployee et accessible."
    read -p "Voulez-vous continuer quand meme? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}[ANNULE]${NC} Configuration annulee."
        exit 1
    fi
else
    echo -e "${GREEN}[OK]${NC} L'application est accessible via HTTP"
fi

# Installation de certbot si necessaire
echo -e "${BLUE}[ETAPE 2/7]${NC} Installation de Certbot..."
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}[INFO]${NC} Installation de Certbot..."

    # Detection de la distribution
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot python3-certbot-nginx
    else
        echo -e "${RED}[ERREUR]${NC} Distribution non supportee. Installez certbot manuellement."
        exit 1
    fi
    echo -e "${GREEN}[OK]${NC} Certbot installe avec succes"
else
    echo -e "${GREEN}[OK]${NC} Certbot est deja installe"
fi

# Creation du repertoire pour ACME challenge
echo -e "${BLUE}[ETAPE 3/7]${NC} Creation du repertoire pour ACME challenge..."
mkdir -p /var/www/certbot
chmod 755 /var/www/certbot
echo -e "${GREEN}[OK]${NC} Repertoire cree: /var/www/certbot"

# Obtention du certificat SSL
echo -e "${BLUE}[ETAPE 4/7]${NC} Obtention du certificat SSL via Let's Encrypt..."
echo -e "${YELLOW}[INFO]${NC} Cela peut prendre quelques instants..."
echo ""

# Note: Pour une IP locale comme 192.168.1.200, Let's Encrypt ne fonctionnera pas
# car il necessite un domaine valide accessible depuis Internet
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${YELLOW}[AVERTISSEMENT]${NC} Vous utilisez une adresse IP locale (${DOMAIN})"
    echo -e "${YELLOW}[AVERTISSEMENT]${NC} Let's Encrypt ne peut pas generer de certificat pour une IP locale."
    echo -e "${YELLOW}[AVERTISSEMENT]${NC}"
    echo -e "${YELLOW}[AVERTISSEMENT]${NC} Options disponibles:"
    echo -e "${YELLOW}[AVERTISSEMENT]${NC}   1. Utiliser un nom de domaine reel (recommande)"
    echo -e "${YELLOW}[AVERTISSEMENT]${NC}   2. Generer un certificat auto-signe (pour dev/test uniquement)"
    echo ""
    read -p "Voulez-vous generer un certificat auto-signe? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}[INFO]${NC} Generation d'un certificat auto-signe..."

        mkdir -p /etc/letsencrypt/live/${DOMAIN}

        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
            -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
            -subj "/C=FR/ST=France/L=Paris/O=RadioStaff/CN=${DOMAIN}"

        cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
           /etc/letsencrypt/live/${DOMAIN}/chain.pem

        echo -e "${GREEN}[OK]${NC} Certificat auto-signe genere"
        echo -e "${YELLOW}[AVERTISSEMENT]${NC} Le navigateur affichera un avertissement de securite"
    else
        echo -e "${RED}[ANNULE]${NC} Configuration HTTPS annulee."
        echo -e "${YELLOW}[INFO]${NC} Pour utiliser HTTPS, vous devez:"
        echo -e "${YELLOW}[INFO]${NC}   1. Obtenir un nom de domaine"
        echo -e "${YELLOW}[INFO]${NC}   2. Configurer le DNS pour pointer vers votre serveur"
        echo -e "${YELLOW}[INFO]${NC}   3. Re-executer ce script avec le nom de domaine"
        exit 1
    fi
else
    # Obtention du certificat Let's Encrypt pour un domaine reel
    certbot certonly --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d ${DOMAIN}

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK]${NC} Certificat SSL obtenu avec succes"
    else
        echo -e "${RED}[ERREUR]${NC} Echec de l'obtention du certificat SSL"
        echo -e "${YELLOW}[INFO]${NC} Verifiez que:"
        echo -e "${YELLOW}[INFO]${NC}   - Le domaine ${DOMAIN} pointe vers ce serveur"
        echo -e "${YELLOW}[INFO]${NC}   - Les ports 80 et 443 sont accessibles depuis Internet"
        echo -e "${YELLOW}[INFO]${NC}   - L'application est deployee et repond sur le port 80"
        exit 1
    fi
fi

# Sauvegarde de la configuration Nginx actuelle
echo -e "${BLUE}[ETAPE 5/7]${NC} Activation de la configuration HTTPS dans Nginx..."
if [ -f "${NGINX_CONF}.backup" ]; then
    echo -e "${YELLOW}[INFO]${NC} Une sauvegarde existe deja: ${NGINX_CONF}.backup"
else
    cp ${NGINX_CONF} ${NGINX_CONF}.backup
    echo -e "${GREEN}[OK]${NC} Sauvegarde creee: ${NGINX_CONF}.backup"
fi

# Decommentation de la configuration HTTPS dans nginx.conf
echo -e "${YELLOW}[INFO]${NC} Activation de la configuration HTTPS..."
sed -i 's/^    # server {$/    server {/g' ${NGINX_CONF}
sed -i 's/^    #     /    /g' ${NGINX_CONF}
sed -i 's/^    # }$/    }/g' ${NGINX_CONF}

# Mise a jour du server_name dans la config HTTPS
sed -i "s/server_name 192.168.1.200;/server_name ${DOMAIN};/g" ${NGINX_CONF}

echo -e "${GREEN}[OK]${NC} Configuration HTTPS activee dans Nginx"

# Mise a jour de docker-compose.yml pour monter les certificats
echo -e "${BLUE}[ETAPE 6/7]${NC} Mise a jour de docker-compose.yml..."
if grep -q "# - /etc/letsencrypt:/etc/letsencrypt:ro" ${DOCKER_COMPOSE}; then
    sed -i 's/# - \/etc\/letsencrypt:\/etc\/letsencrypt:ro/- \/etc\/letsencrypt:\/etc\/letsencrypt:ro/g' ${DOCKER_COMPOSE}
    sed -i 's/# - \/var\/www\/certbot:\/var\/www\/certbot:ro/- \/var\/www\/certbot:\/var\/www\/certbot:ro/g' ${DOCKER_COMPOSE}
    echo -e "${GREEN}[OK]${NC} Volumes SSL actives dans docker-compose.yml"
else
    echo -e "${YELLOW}[INFO]${NC} Les volumes SSL sont deja actives"
fi

# Redemarrage de Nginx
echo -e "${BLUE}[ETAPE 7/7]${NC} Redemarrage de Nginx..."
cd ${PROJECT_DIR}
docker-compose restart nginx

# Verification que Nginx a demarre correctement
sleep 5
if docker ps | grep -q radio-nginx; then
    echo -e "${GREEN}[OK]${NC} Nginx a redémarre avec succes"
else
    echo -e "${RED}[ERREUR]${NC} Echec du redemarrage de Nginx"
    echo -e "${YELLOW}[INFO]${NC} Restauration de la configuration precedente..."
    cp ${NGINX_CONF}.backup ${NGINX_CONF}
    docker-compose restart nginx
    echo -e "${YELLOW}[INFO]${NC} Configuration precedente restauree"
    exit 1
fi

# Configuration du renouvellement automatique
echo -e "${BLUE}[BONUS]${NC} Configuration du renouvellement automatique..."
CRON_JOB="0 3 * * * certbot renew --quiet --post-hook 'cd ${PROJECT_DIR} && docker-compose restart nginx' >> /var/log/certbot-renew.log 2>&1"

if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo -e "${GREEN}[OK]${NC} Renouvellement automatique configure (tous les jours a 3h)"
else
    echo -e "${YELLOW}[INFO]${NC} Renouvellement automatique deja configure"
fi

# Tests de connectivite
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}        Tests de Connectivite          ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}[TEST]${NC} Test HTTP..."
if curl -sI http://${DOMAIN}/health | head -n 1 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}[OK]${NC} HTTP accessible"
else
    echo -e "${RED}[ERREUR]${NC} HTTP non accessible"
fi

echo -e "${YELLOW}[TEST]${NC} Test HTTPS..."
if curl -skI https://${DOMAIN}/health | head -n 1 | grep -q "200"; then
    echo -e "${GREEN}[OK]${NC} HTTPS accessible"
else
    echo -e "${YELLOW}[AVERTISSEMENT]${NC} HTTPS non accessible (peut necessiter quelques secondes)"
fi

echo -e "${YELLOW}[TEST]${NC} Test redirection HTTP vers HTTPS..."
HTTP_RESPONSE=$(curl -sI http://${DOMAIN} | head -n 1)
if echo "$HTTP_RESPONSE" | grep -q "301\|302"; then
    echo -e "${GREEN}[OK]${NC} Redirection HTTP -> HTTPS active"
else
    echo -e "${YELLOW}[INFO]${NC} Redirection HTTP -> HTTPS non detectee"
fi

# Affichage du resume
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}     Configuration HTTPS Terminee!     ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}[SUCCES]${NC} HTTPS configure avec succes pour ${DOMAIN}"
echo ""
echo -e "${BLUE}Informations importantes:${NC}"
echo -e "  - URL HTTP:  http://${DOMAIN}"
echo -e "  - URL HTTPS: https://${DOMAIN}"
echo -e "  - Certificats: /etc/letsencrypt/live/${DOMAIN}/"
echo -e "  - Renouvellement: Automatique (tous les jours a 3h)"
echo ""
echo -e "${BLUE}Prochaines etapes:${NC}"
echo -e "  1. Testez l'acces HTTPS: ${GREEN}https://${DOMAIN}${NC}"
echo -e "  2. Verifiez les headers de securite avec:"
echo -e "     ${YELLOW}curl -I https://${DOMAIN}${NC}"
echo -e "  3. Testez le score SSL avec:"
echo -e "     ${YELLOW}https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}[NOTE]${NC} Si vous utilisez un certificat auto-signe, le navigateur"
echo -e "${YELLOW}[NOTE]${NC} affichera un avertissement de securite. C'est normal."
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  - Nginx:   docker-compose logs nginx"
echo -e "  - Certbot: /var/log/certbot-renew.log"
echo ""
echo -e "${GREEN}Configuration terminee avec succes!${NC}"
