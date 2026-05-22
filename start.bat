@echo off
echo ========================================
echo   LiveDeck Studio - Iniciando...
echo ========================================

:: Backend
start "LiveDeck - Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt -q && python -m uvicorn main:app --reload --port 8000"

:: Aguarda backend subir
timeout /t 8 /nobreak > nul

:: Frontend
start "LiveDeck - Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

:: Aguarda frontend compilar
echo Aguardando frontend compilar (pode demorar 1-2 min na primeira vez)...
timeout /t 30 /nobreak > nul
start http://localhost:4000

echo Pronto! Se o navegador abriu em branco, aguarde mais um pouco e atualize a pagina.
