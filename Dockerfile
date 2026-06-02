# Stage 1: build React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Django runtime
FROM python:3.12-slim
WORKDIR /app

COPY requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY . .
# Overwrite with freshly built frontend (takes precedence over any local dist)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN chmod +x docker_run_server.sh

EXPOSE 10000

ENTRYPOINT ["./docker_run_server.sh"]
