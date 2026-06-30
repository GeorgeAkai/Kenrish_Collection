# Stage 1: build React frontend
FROM node:20-slim AS frontend-builder
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Django runtime
FROM python:alpine
# Upgrade base packages, then add:
#   libpq        – psycopg2 runtime dependency
#   gcc/musl-dev/postgresql-dev – needed to compile psycopg2 from source (no musl wheel)
RUN apk --no-cache upgrade && \
    apk add --no-cache libpq gcc musl-dev postgresql-dev
WORKDIR /app

RUN pip install --upgrade pip setuptools

COPY requirements-prod.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements-prod.txt && \
    apk del gcc musl-dev postgresql-dev

COPY . .
# Overwrite with freshly built frontend (takes precedence over any local dist)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN if [ -d /app/media ]; then cp -r /app/media /app/media_seed; else mkdir -p /app/media_seed; fi && chmod +x docker_run_server.sh

RUN adduser -D -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 10000

ENTRYPOINT ["./docker_run_server.sh"]
