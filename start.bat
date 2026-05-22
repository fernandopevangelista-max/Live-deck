@echo off
echo Iniciando LiveDeck Studio...

:: Backend
start "LiveDeck - Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

:: Aguarda 3 segundos para o backend subir
timeout /t 3 /nobreak > nul

:: Frontend
start "LiveDeck - Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

:: Aguarda o frontend compilar e abre o navegador
timeout /t 15 /nobreak > nul
start http://localhost:4000

echo Pronto! Abrindo no navegador...
