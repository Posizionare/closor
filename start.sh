#!/usr/bin/env bash
# =========================================================
# Growth CRM — script de bootstrap (Mac/Linux)
# =========================================================
set -e

echo "=== [1/5] Subindo Postgres no Docker... ==="
docker compose up -d

echo "Aguardando Postgres ficar pronto..."
until docker exec growthcrm-postgres pg_isready -U postgres -d growthcrm >/dev/null 2>&1; do
  sleep 1
done
echo "OK."

echo "=== [2/5] Instalando dependencias do projeto... ==="
npm install --legacy-peer-deps

echo "=== [3/5] Sincronizando schema do banco... ==="
npx prisma db push

echo "=== [4/5] Populando banco com dados demo... ==="
npm run db:seed

echo ""
echo "============================================================"
echo "  Pronto! Acesse: http://localhost:3000"
echo ""
echo "  Login admin:   admin@demo.com   / admin123"
echo "  Login vendas:  vendas@demo.com  / vendas123"
echo "============================================================"
echo ""
echo "=== [5/5] Iniciando servidor de desenvolvimento... ==="
npm run dev
