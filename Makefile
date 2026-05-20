.PHONY: review review-dev bulk-accept-pending bulk-accept-pending-execute

review: ## Build frontend then start FastAPI (http://localhost:8000/review-ui/)
	cd frontend/review && npm run build
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

review-dev: ## Start Vite dev server + FastAPI with hot reload (http://localhost:5173/review-ui/)
	@trap 'kill 0' EXIT; \
	  (cd frontend/review && npm run dev) & \
	  (cd backend && uv run uvicorn app.main:app --reload) ; \
	  wait

bulk-accept-pending: ## Dry-run: show how many pending candidates qualify for bulk promotion
	cd backend && uv run python -m app.scripts.bulk_accept_pending

bulk-accept-pending-execute: ## Execute: bulk-promote qualifying pending candidates
	cd backend && uv run python -m app.scripts.bulk_accept_pending --execute
