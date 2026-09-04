# Build context MUST be the repo root, not backend/ — since Phase 2,
# backend/app imports from the sibling backend-shared/ package, and
# requirements.txt has `-e ../backend-shared`. A build context scoped to
# backend/ alone (Render's default when "Root Directory" = backend) can't
# see backend-shared/ at all and the pip install will fail. On Render:
# set the service's Root Directory to the repo root (".") and its
# Dockerfile Path to "backend/Dockerfile" — check Render's current Docker
# service settings for the exact field names, this wasn't verified against
# Render's dashboard directly. Same fix already applied to crm-backend/ and
# user-backend/'s Dockerfiles (see their wrangler.toml image_build_context).
FROM python:3.11-slim

WORKDIR /app
COPY backend-shared ./backend-shared
COPY backend ./backend

WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Run the application
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
