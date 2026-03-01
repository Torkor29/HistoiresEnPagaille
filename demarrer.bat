@echo off
chcp 65001 >nul
title HistoireEnPagaille

cd /d "%~dp0"

echo.
echo  HistoireEnPagaille - Demarrage...
echo.

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] npm introuvable. Installez Node.js : https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Premier lancement : installation des dependances...
    call npm install
    if errorlevel 1 (
        echo [ERREUR] npm install a echoue.
        pause
        exit /b 1
    )
    echo.
)

echo Ouverture du navigateur dans 5 secondes (http://localhost:3000)...
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

echo Lancement de l'application (Next.js + serveur images)...
echo Si FORGE_PATH est defini dans .env, Forge sera demarre automatiquement.
echo.
echo Pour arreter : fermez cette fenetre ou appuyez sur Ctrl+C.
echo.

call npm run dev:all

pause
