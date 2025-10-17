#!/bin/bash

################################################################################
# RADIO STAFF MANAGER - HEALTH CHECK SCRIPT
################################################################################
# Script de vérification de santé pour tous les services
# Usage: ./scripts/health-check.sh [options]
#
# Options:
#   --verbose           Affichage détaillé
#   --json              Sortie au format JSON
#   --nagios            Format compatible Nagios/Icinga
#   --timeout <sec>     Timeout pour les vérifications (défaut: 10)
#   --help              Afficher cette aide
#
# Exit codes:
#   0 - Tous les services sont sains
#   1 - Un ou plusieurs services ont des problèmes
#   2 - Erreur critique
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMEOUT=10
VERBOSE=false
JSON_OUTPUT=false
NAGIOS_OUTPUT=false

# Health check results
declare -A SERVICE_STATUS
declare -A SERVICE_RESPONSE_TIME
declare -A SERVICE_DETAILS
FAILED_SERVICES=0
TOTAL_SERVICES=0

################################################################################
# Functions
################################################################################

log() {
    if [[ "$JSON_OUTPUT" == "false" ]] && [[ "$NAGIOS_OUTPUT" == "false" ]]; then
        echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
    fi
}

error() {
    if [[ "$JSON_OUTPUT" == "false" ]] && [[ "$NAGIOS_OUTPUT" == "false" ]]; then
        echo -e "${RED}[ERROR]${NC} $*" >&2
    fi
}

warning() {
    if [[ "$JSON_OUTPUT" == "false" ]] && [[ "$NAGIOS_OUTPUT" == "false" ]]; then
        echo -e "${YELLOW}[WARNING]${NC} $*"
    fi
}

info() {
    if [[ "$JSON_OUTPUT" == "false" ]] && [[ "$NAGIOS_OUTPUT" == "false" ]] && [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[INFO]${NC} $*"
    fi
}

usage() {
    cat << EOF
Usage: $0 [options]

Options:
    --verbose           Affichage détaillé
    --json              Sortie au format JSON
    --nagios            Format compatible Nagios/Icinga
    --timeout <sec>     Timeout pour les vérifications (défaut: 10)
    --help              Afficher cette aide

Exit codes:
    0 - Tous les services sont sains
    1 - Un ou plusieurs services ont des problèmes
    2 - Erreur critique

Examples:
    $0                      # Vérification standard
    $0 --verbose            # Vérification détaillée
    $0 --json               # Sortie JSON pour monitoring
    $0 --nagios             # Format pour Nagios/Icinga
EOF
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --nagios)
                NAGIOS_OUTPUT=true
                shift
                ;;
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --help)
                usage
                ;;
            *)
                error "Option inconnue: $1"
                usage
                ;;
        esac
    done
}

# Check if a service is healthy
check_service() {
    local service_name="$1"
    local check_url="$2"
    local expected_status="${3:-200}"

    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))

    info "Vérification de $service_name..."

    local start_time=$(date +%s%N)
    local http_code
    local response_time

    # Perform HTTP request
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                    --max-time "$TIMEOUT" \
                    --connect-timeout "$TIMEOUT" \
                    "$check_url" 2>/dev/null || echo "000")

    local end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))

    SERVICE_RESPONSE_TIME["$service_name"]=$response_time

    # Check status
    if [[ "$http_code" == "$expected_status" ]]; then
        SERVICE_STATUS["$service_name"]="OK"
        SERVICE_DETAILS["$service_name"]="HTTP $http_code - ${response_time}ms"
        info "$service_name: OK (${response_time}ms)"
    else
        SERVICE_STATUS["$service_name"]="FAIL"
        SERVICE_DETAILS["$service_name"]="HTTP $http_code - Expected $expected_status"
        FAILED_SERVICES=$((FAILED_SERVICES + 1))
        warning "$service_name: FAIL (HTTP $http_code)"
    fi
}

# Check Docker container status
check_container() {
    local container_name="$1"
    local service_name="${2:-$container_name}"

    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))

    info "Vérification du conteneur $container_name..."

    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        local container_status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "unknown")
        local container_health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")

        if [[ "$container_status" == "running" ]]; then
            if [[ "$container_health" == "healthy" ]] || [[ "$container_health" == "none" ]]; then
                SERVICE_STATUS["$service_name"]="OK"
                SERVICE_DETAILS["$service_name"]="Container running"
                info "$service_name: OK"
            else
                SERVICE_STATUS["$service_name"]="WARN"
                SERVICE_DETAILS["$service_name"]="Container running but health=$container_health"
                FAILED_SERVICES=$((FAILED_SERVICES + 1))
                warning "$service_name: Health check failed"
            fi
        else
            SERVICE_STATUS["$service_name"]="FAIL"
            SERVICE_DETAILS["$service_name"]="Container status=$container_status"
            FAILED_SERVICES=$((FAILED_SERVICES + 1))
            error "$service_name: Container not running"
        fi
    else
        SERVICE_STATUS["$service_name"]="FAIL"
        SERVICE_DETAILS["$service_name"]="Container not found"
        FAILED_SERVICES=$((FAILED_SERVICES + 1))
        error "$service_name: Container not found"
    fi
}

# Check database connection
check_database() {
    local service_name="PostgreSQL"

    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))

    info "Vérification de la base de données..."

    local start_time=$(date +%s%N)

    if docker compose exec -T postgres pg_isready -U radio &> /dev/null; then
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))

        SERVICE_STATUS["$service_name"]="OK"
        SERVICE_DETAILS["$service_name"]="Database ready - ${response_time}ms"
        SERVICE_RESPONSE_TIME["$service_name"]=$response_time
        info "$service_name: OK (${response_time}ms)"
    else
        SERVICE_STATUS["$service_name"]="FAIL"
        SERVICE_DETAILS["$service_name"]="Database not ready"
        FAILED_SERVICES=$((FAILED_SERVICES + 1))
        error "$service_name: Not ready"
    fi
}

# Check disk space
check_disk_space() {
    local service_name="Disk Space"

    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))

    info "Vérification de l'espace disque..."

    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    local warning_threshold=80
    local critical_threshold=90

    if [[ $disk_usage -lt $warning_threshold ]]; then
        SERVICE_STATUS["$service_name"]="OK"
        SERVICE_DETAILS["$service_name"]="Usage: ${disk_usage}%"
        info "$service_name: OK (${disk_usage}%)"
    elif [[ $disk_usage -lt $critical_threshold ]]; then
        SERVICE_STATUS["$service_name"]="WARN"
        SERVICE_DETAILS["$service_name"]="Usage: ${disk_usage}% (Warning threshold: ${warning_threshold}%)"
        warning "$service_name: ${disk_usage}% used"
    else
        SERVICE_STATUS["$service_name"]="FAIL"
        SERVICE_DETAILS["$service_name"]="Usage: ${disk_usage}% (Critical threshold: ${critical_threshold}%)"
        FAILED_SERVICES=$((FAILED_SERVICES + 1))
        error "$service_name: ${disk_usage}% used (Critical)"
    fi
}

# Check memory usage
check_memory() {
    local service_name="Memory"

    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))

    info "Vérification de la mémoire..."

    local mem_usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    local warning_threshold=80
    local critical_threshold=90

    if [[ $mem_usage -lt $warning_threshold ]]; then
        SERVICE_STATUS["$service_name"]="OK"
        SERVICE_DETAILS["$service_name"]="Usage: ${mem_usage}%"
        info "$service_name: OK (${mem_usage}%)"
    elif [[ $mem_usage -lt $critical_threshold ]]; then
        SERVICE_STATUS["$service_name"]="WARN"
        SERVICE_DETAILS["$service_name"]="Usage: ${mem_usage}% (Warning)"
        warning "$service_name: ${mem_usage}% used"
    else
        SERVICE_STATUS["$service_name"]="FAIL"
        SERVICE_DETAILS["$service_name"]="Usage: ${mem_usage}% (Critical)"
        FAILED_SERVICES=$((FAILED_SERVICES + 1))
        error "$service_name: ${mem_usage}% used (Critical)"
    fi
}

# Check Docker volumes
check_volumes() {
    local service_name="Docker Volumes"

    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))

    info "Vérification des volumes Docker..."

    local required_volumes=("radio-staff_postgres_data" "radio-staff_keycloak_data" "radio-staff_nginx_logs")
    local missing_volumes=()

    for volume in "${required_volumes[@]}"; do
        if ! docker volume ls --format '{{.Name}}' | grep -q "^${volume}$"; then
            missing_volumes+=("$volume")
        fi
    done

    if [[ ${#missing_volumes[@]} -eq 0 ]]; then
        SERVICE_STATUS["$service_name"]="OK"
        SERVICE_DETAILS["$service_name"]="All volumes present"
        info "$service_name: OK"
    else
        SERVICE_STATUS["$service_name"]="WARN"
        SERVICE_DETAILS["$service_name"]="Missing volumes: ${missing_volumes[*]}"
        warning "$service_name: Missing volumes: ${missing_volumes[*]}"
    fi
}

# Run all health checks
run_health_checks() {
    cd "$PROJECT_DIR"

    log "Démarrage des vérifications de santé..."
    log ""

    # Check containers
    check_container "radio-postgres" "PostgreSQL Container"
    check_container "radio-keycloak" "Keycloak Container"
    check_container "radio-backend" "Backend Container"
    check_container "radio-frontend" "Frontend Container"
    check_container "radio-nginx" "Nginx Container"

    # Check database connectivity
    check_database

    # Check HTTP endpoints
    check_service "Nginx Health" "http://localhost/health"
    check_service "Backend API" "http://localhost:4000/api/health"
    check_service "Frontend" "http://localhost:3000"
    check_service "Keycloak" "http://localhost:8080/health/ready"

    # Check system resources
    check_disk_space
    check_memory
    check_volumes

    log ""
}

# Output results in standard format
output_standard() {
    echo ""
    echo "=========================================="
    echo "RÉSULTATS DES VÉRIFICATIONS DE SANTÉ"
    echo "=========================================="
    echo ""

    local ok_count=0
    local warn_count=0
    local fail_count=0

    for service in "${!SERVICE_STATUS[@]}"; do
        local status="${SERVICE_STATUS[$service]}"
        local details="${SERVICE_DETAILS[$service]}"

        case "$status" in
            "OK")
                echo -e "${GREEN}✓${NC} $service: ${GREEN}OK${NC} - $details"
                ok_count=$((ok_count + 1))
                ;;
            "WARN")
                echo -e "${YELLOW}⚠${NC} $service: ${YELLOW}WARNING${NC} - $details"
                warn_count=$((warn_count + 1))
                ;;
            "FAIL")
                echo -e "${RED}✗${NC} $service: ${RED}FAILED${NC} - $details"
                fail_count=$((fail_count + 1))
                ;;
        esac
    done

    echo ""
    echo "Summary: $ok_count OK, $warn_count Warning, $fail_count Failed (Total: $TOTAL_SERVICES)"
    echo ""

    if [[ $fail_count -gt 0 ]]; then
        echo -e "${RED}ÉTAT: PROBLÈMES DÉTECTÉS${NC}"
        return 1
    elif [[ $warn_count -gt 0 ]]; then
        echo -e "${YELLOW}ÉTAT: AVERTISSEMENTS${NC}"
        return 0
    else
        echo -e "${GREEN}ÉTAT: TOUS LES SERVICES SONT OPÉRATIONNELS${NC}"
        return 0
    fi
}

# Output results in JSON format
output_json() {
    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"hostname\": \"$(hostname)\","
    echo "  \"total_services\": $TOTAL_SERVICES,"
    echo "  \"failed_services\": $FAILED_SERVICES,"
    echo "  \"status\": \"$( [[ $FAILED_SERVICES -eq 0 ]] && echo "OK" || echo "FAILED" )\","
    echo "  \"services\": {"

    local first=true
    for service in "${!SERVICE_STATUS[@]}"; do
        if [[ "$first" == "false" ]]; then
            echo ","
        fi
        first=false

        echo -n "    \"$service\": {"
        echo -n "\"status\": \"${SERVICE_STATUS[$service]}\", "
        echo -n "\"details\": \"${SERVICE_DETAILS[$service]}\""

        if [[ -n "${SERVICE_RESPONSE_TIME[$service]:-}" ]]; then
            echo -n ", \"response_time_ms\": ${SERVICE_RESPONSE_TIME[$service]}"
        fi

        echo -n "}"
    done

    echo ""
    echo "  }"
    echo "}"
}

# Output results in Nagios format
output_nagios() {
    if [[ $FAILED_SERVICES -eq 0 ]]; then
        echo "OK - All services are healthy | failed=0 total=$TOTAL_SERVICES"
        return 0
    else
        echo "CRITICAL - $FAILED_SERVICES service(s) failed | failed=$FAILED_SERVICES total=$TOTAL_SERVICES"
        return 2
    fi
}

main() {
    parse_args "$@"

    cd "$PROJECT_DIR"

    # Check if Docker is available
    if ! docker compose version &> /dev/null; then
        if [[ "$JSON_OUTPUT" == "true" ]]; then
            echo '{"status": "ERROR", "message": "Docker Compose not available"}'
        elif [[ "$NAGIOS_OUTPUT" == "true" ]]; then
            echo "UNKNOWN - Docker Compose not available"
        else
            error "Docker Compose n'est pas disponible"
        fi
        exit 2
    fi

    run_health_checks

    # Output results
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        output_json
    elif [[ "$NAGIOS_OUTPUT" == "true" ]]; then
        output_nagios
        exit $?
    else
        output_standard
        exit $?
    fi

    # Exit code based on failures
    [[ $FAILED_SERVICES -eq 0 ]] && exit 0 || exit 1
}

main "$@"
