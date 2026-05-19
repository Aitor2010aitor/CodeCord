@echo off
REM Iniciar el Bot de Discord automáticamente
REM Este archivo ejecuta el bot cuando lo abres

echo ========================================
echo   Bot de Discord - INICIANDO...
echo ========================================
echo.

REM Cambiar al directorio del bot
cd /d "%~dp0"

REM Ejecutar el bot con Node.js
node index.js

REM Si el bot se detiene, mostrar un mensaje
echo.
echo ========================================
echo   El bot se ha detenido.
echo   Presiona cualquier tecla para cerrar...
echo ========================================
pause
