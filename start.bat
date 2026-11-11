@echo off
REM =========================================================
REM Growth CRM — script de bootstrap (Windows)
REM Faz tudo: sobe Postgres, instala deps, cria DB, popula, abre dev
REM =========================================================
setlocal

echo.
echo === [1/5] Subindo Postgres no Docker... ===
docker compose up -d
if errorlevel 1 (
  echo.
  echo ERRO ao iniciar o Docker. Verifique se o Docker Desktop esta aberto.
  pause
  exit /b 1
)

echo.
echo Aguardando Postgres ficar pronto...
:waitdb
docker exec growthcrm-postgres pg_isready -U postgres -d growthcrm >nul 2>&1
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto waitdb
)
echo OK.

echo.
echo === [2/5] Instalando dependencias do projeto... ===
call npm install --legacy-peer-deps
if errorlevel 1 (
  echo ERRO no npm install.
  pause
  exit /b 1
)

echo.
echo === [3/5] Sincronizando schema do banco... ===
call npx prisma db push
if errorlevel 1 (
  echo ERRO no prisma db push.
  pause
  exit /b 1
)

echo.
echo === [4/5] Populando banco com dados demo... ===
call npm run db:seed
if errorlevel 1 (
  echo ERRO no seed.
  pause
  exit /b 1
)

echo.
echo === [5/5] Iniciando servidor de desenvolvimento... ===
echo.
echo  ============================================================
echo   Pronto! Acesse: http://localhost:3000
echo.
echo   Login admin:   admin@demo.com   / admin123
echo   Login vendas:  vendas@demo.com  / vendas123
echo  ============================================================
echo.
call npm run dev

endlocal
