@echo off
cd /d "%~dp0"
echo Apri http://localhost:8080 nel browser.
py -3 -m http.server 8080 --bind 127.0.0.1 --directory dist
pause
