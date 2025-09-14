@echo off
setlocal
set PORT=8080
if not "%~1"=="" set PORT=%~1
set DIR=%~dp0

rem Detect Python
where python >nul 2>nul && set PY=python
if not defined PY (
  where py >nul 2>nul && set PY=py
)

if not defined PY (
  echo [INFO] Python not found. Opening file directly.
  start "" "%DIR%index.html"
  exit /b 0
)

cd /d "%DIR%"
rem Start simple HTTP server in a new window
start "Weight Manager Server" %PY% -m http.server %PORT%
timeout /t 1 >nul
start "" http://localhost:%PORT%/index.html
exit /b 0


