@echo off
chcp 65001 >nul
title Configurar URL del Panel de Admin

echo.
echo ============================================
echo   CONFIGURAR URL DEL PANEL DE ADMIN
echo ============================================
echo.
echo Ejemplo: http://fi3.bot-hosting.net:22300
echo.
set /p NEW_URL="URL completa: "

if "%NEW_URL%"=="" (
    echo [ERROR] No escribiste ninguna URL.
    pause
    exit /b 1
)

set BAT_DIR=%~dp0
set BAT_DIR=%BAT_DIR:~0,-1%

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$url = '%NEW_URL%';" ^
    "if (-not $url.StartsWith('http')) { $url = 'http://' + $url };" ^
    "$u = [System.Uri]$url;" ^
    "$port = $u.Port;" ^
    "if ($port -le 0 -or $port -eq 80 -or $port -eq 443) { $port = 3000 };" ^
    "Write-Host ('  URL   : ' + $url);" ^
    "Write-Host ('  Puerto: ' + $port);" ^
    "$cfg = [ordered]@{ url=$url; port=$port; requireDiscordAuth=$false };" ^
    "Set-Content -Path '%BAT_DIR%\config\panel-config.json' -Value ($cfg | ConvertTo-Json -Depth 5) -Encoding UTF8;" ^
    "Write-Host '[OK] Guardado correctamente.';"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Algo salio mal.
    pause
    exit /b 1
)

echo.
echo Reinicia el bot para aplicar los cambios.
echo.
pause
