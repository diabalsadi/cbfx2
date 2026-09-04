# Build context is the repo root (see image_build_context in
# wrangler.toml), not this directory — required so this Dockerfile can
# COPY backend-shared/, a sibling package outside user-backend/. Resolves
# the "backend-shared sibling-folder build-context question" Phase 3's
# scaffold left unresolved, per plan.md's Phase 4 instructions.
#
# The image preserves the same user-backend/ + backend-shared/ sibling
# layout the repo already has, so requirements.txt's `-e ../backend-shared`
# line resolves identically here and in local (non-Docker) dev — no
# requirements.txt changes needed for Docker specifically.
FROM --platform=linux/amd64 python:3.11-slim

WORKDIR /app
COPY backend-shared ./backend-shared
COPY user-backend/requirements.txt ./user-backend/requirements.txt

WORKDIR /app/user-backend
RUN pip install --no-cache-dir -r requirements.txt

COPY user-backend/app ./app

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
