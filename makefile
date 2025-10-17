.PHONY: dev build-offline install logs stop clean backup help

help:
	@echo "Radio Staff Manager - Make commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start development environment"
	@echo "  make logs           - View container logs"
	@echo "  make stop           - Stop all containers"
	@echo ""
	@echo "Production:"
	@echo "  make build-offline  - Build offline deployment package"
	@echo "  make install        - Install from offline package"
	@echo "  make backup         - Create database backup"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          - Clean up Docker resources"

dev:
	docker compose up -d --build

build-offline:
	bash scripts/build-offline.sh

install:
	bash scripts/install.sh

logs:
	docker compose logs -f

stop:
	docker compose down

clean:
	docker compose down -v
	rm -rf dist/
	rm -rf backups/

backup:
	bash scripts/backup.sh