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
FROM python:3.12-slim
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY requirements-prod.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements-prod.txt

COPY . .
# Overwrite with freshly built frontend (takes precedence over any local dist)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN cp -r /app/media /app/media_seed && chmod +x docker_run_server.sh

EXPOSE 10000

ENTRYPOINT ["./docker_run_server.sh"]
