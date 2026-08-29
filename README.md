# CBFX

## Test Credentials
For local development, you can use the following test accounts:
- **Super Admin**: `admin@cbfx.com` / `password123`
- **Editor**: `editor@cbfx.com` / `password123`
- **Broker**: `broker@cbfx.com` / `password123`

### Stripe test card (Signals / Copy Trading subscription checkout)
Stripe is in test mode — no real charge occurs. Use:
- **Card number**: `4242 4242 4242 4242`
- **Expiry**: any future date
- **CVC**: any 3 digits
- **ZIP**: any value

## Backend

### How to run

#### With Docker (Recommended)
```bash
cd backend

# Start both services (database + backend)
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# Stop services
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v

# Database Management (Adminer)
# Start Adminer service
docker-compose up -d adminer

# Run in detached mode
docker run -d -p 3000:3000 cbfx-frontend

# Access at http://localhost:8080
# Login credentials:
# - System: PostgreSQL
# - Server: db
# - Username: cbfx_user
# - Password: cbfx_password
# - Database: cbfx_db
```

#### Without Docker
```bash
cd backend

# Create virtual environment
python -m venv cbfx-backend-env

# Activate virtual environment
source cbfx-backend-env/bin/activate  # On Linux/Mac
.\cbfx-backend-env\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn app.main:app --reload
```

## Frontend

### Prerequisites
Ensure you're using the correct Node.js version:
```bash
cd frontend

# If you have nvm installed
nvm use

# This will use Node.js version 20 (specified in .nvmrc)
```

### How to run

#### Local Development (Without Docker)
```bash
cd frontend

# Install dependencies (first time only)
npm install

# Run development server
npm run dev
```

#### With Docker - Development
```bash
cd frontend

# Build development image
docker build -f Dockerfile.dev -t cbfx-frontend-dev .

# Run with hot-reload
docker run -p 3000:3000 -v ${PWD}:/app -v /app/node_modules cbfx-frontend-dev
```

#### With Docker - Production
```bash
cd frontend

# Build production image (optimized, ~150MB)
docker build -t cbfx-frontend .

# Run production container
docker run -p 3000:3000 cbfx-frontend

# Look at the logs of the container
docker logs -f cbfx_backend

```

### Data seeding

```bash
docker compose exec -T backend python seed.py
```

The frontend will be available at **http://localhost:3000**
