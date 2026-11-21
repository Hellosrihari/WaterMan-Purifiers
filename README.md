# WaterMan-Purifiers

Starter project for WaterMan Purifiers, with a FastAPI backend, a React/Vite
frontend, and PostgreSQL for local development.

## Project structure

```text
backend/
  app/
    api/v1/endpoints/  # HTTP endpoints
    core/              # Configuration
    db/                # Database setup
    models/            # SQLAlchemy models
    schemas/           # API schemas
    services/          # Business logic
  migrations/          # Alembic database migrations
  tests/
frontend/
  src/
    assets/
    components/
    pages/
    services/
compose.yaml           # Local PostgreSQL service
```

## Run locally

1. Start PostgreSQL. Use either your local PostgreSQL service or Docker Compose
   (not both if they use the same port):

   ```sh
   docker compose up -d db
   ```

2. In a terminal, install and run the backend:

   ```sh
   cd backend
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements-dev.txt
   copy .env.example .env
   # Set DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD in .env.
   python -m alembic upgrade head
   uvicorn app.main:app --reload
   ```

   Alembic creates the application tables in the configured database; it does
   not create the PostgreSQL database itself. Create the database first using a
   PostgreSQL administrator, then make sure the configured application user can
   connect to it and create tables.

   The API health check is at `http://localhost:8000/api/v1/health`; interactive
   API docs are at `http://localhost:8000/docs`.

   Set `JWT_SECRET_KEY` in `backend/.env` to a unique, randomly generated secret
   before deploying. The example/default key is for local development only.

3. In another terminal, install and run the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   The frontend uses `http://localhost:8000` by default. Override it with
   `VITE_API_BASE_URL` in `frontend/.env` if the API runs elsewhere.
   The first user to register becomes the shop owner. Owners can add staff
   accounts from the Staff section; staff can sign in and manage customers and
   inventory, but only owners can manage staff. Customer, inventory, and staff
   records can be added and edited, but not deleted. Sessions survive a page
   refresh in the same browser tab; logging out or closing that browser session
   requires signing in again. Select the profile in the header to log out.

4. Run backend tests from the `backend` directory:

   ```sh
   pytest
   ```
