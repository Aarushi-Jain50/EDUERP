#!/usr/bin/env bash

echo "========================================="
echo "   EduERP One-Command Production Deploy  "
echo "========================================="

set -e

echo "[1/4] Checking environment configuration..."
if [ ! -f .env ]; then
  echo "Copying .env.example to .env..."
  cp deployment/.env.example .env
fi

echo "[2/4] Building Docker containers..."
docker-compose -f deployment/docker-compose.yml build

echo "[3/4] Starting services in background..."
docker-compose -f deployment/docker-compose.yml up -d

echo "[4/4] Verifying health checks..."
sleep 5
curl -s http://localhost:4000/api/health | grep '"status":"ok"' && echo "Backend is healthy!"
curl -s http://localhost:3000 | grep -q "EduERP" && echo "Frontend is live!"

echo "Deploy complete! Access EduERP at http://localhost:3000"
