.DEFAULT_GOAL := help
.PHONY: help check-pnpm install env shared dev run build typecheck lint clean mcp-build emulators

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

check-pnpm:
	@command -v pnpm >/dev/null 2>&1 || { \
		echo "error: pnpm not found on PATH."; \
		echo "  install with: brew install pnpm   (or: npm install -g pnpm@9.12.0)"; \
		exit 1; \
	}

install: check-pnpm ## Install workspace dependencies
	pnpm install

env: apps/web/.env.local ## Create apps/web/.env.local from the dev template

apps/web/.env.local: apps/web/.env.local.example
	cp apps/web/.env.local.example apps/web/.env.local
	@echo "Wrote apps/web/.env.local from .env.local.example."
	@echo "Fill in the PLACEHOLDER_* values before running \`make run\`."

shared: check-pnpm ## Build @protypic/shared (required before web typecheck/dev)
	pnpm -F @protypic/shared build

dev: shared ## Run the Next.js dev server on :3000 (assumes ADC + .env.local are set)
	pnpm -F @protypic/web dev

run: env shared ## Build shared, then start the Next.js dev server pointed at real GCP
	@if grep -q 'PLACEHOLDER_' apps/web/.env.local; then \
		echo ''; \
		echo "error: apps/web/.env.local still contains PLACEHOLDER_* values."; \
		echo "  Fill them in (Firebase console → Project settings → SDK config, and the GCS bucket name)."; \
		echo ''; \
		exit 1; \
	fi
	@command -v gcloud >/dev/null 2>&1 && gcloud auth application-default print-access-token >/dev/null 2>&1 || { \
		echo ''; \
		echo "warning: no application-default credentials detected."; \
		echo "  run: gcloud auth application-default login"; \
		echo "  (firebase-admin and @google-cloud/storage need these to talk to real GCP)"; \
		echo ''; \
	}
	@printf '\n\033[36mportal:\033[0m       http://localhost:3000\n'
	@printf '\033[36mprototype:\033[0m    http://view.localhost:3000/p/{guid}\n\n'
	pnpm -F @protypic/web dev

# Kept as an escape hatch for offline experimentation. `make run` does NOT use these.
# Brew's openjdk is keg-only; prepend it so the Firestore/Auth emulators find `java`.
JAVA_BIN := /opt/homebrew/opt/openjdk/bin
emulators: ## (Optional) Start Firebase Auth + Firestore + Storage emulators
	PATH="$(JAVA_BIN):$$PATH" firebase emulators:start

build: shared ## Build everything (shared + web + mcp)
	pnpm -F @protypic/web build
	pnpm -F @protypic/mcp build

mcp-build: shared ## Build only the MCP server bundle
	pnpm -F @protypic/mcp build

typecheck: shared ## Typecheck all packages
	pnpm -r typecheck

lint: ## Lint apps/web
	pnpm -F @protypic/web lint

clean: ## Remove build artifacts and node_modules
	rm -rf packages/shared/dist packages/mcp-server/dist apps/web/.next
	find . -name node_modules -type d -prune -exec rm -rf {} +
