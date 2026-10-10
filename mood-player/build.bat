@echo off
rem Сборка MoodPlayer.exe на Windows (нужен Go: https://go.dev/dl/)
cd /d "%~dp0"
if not exist dist mkdir dist
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
go build -trimpath -ldflags "-s -w -H windowsgui" -o dist\MoodPlayer.exe .
echo Готово: dist\MoodPlayer.exe
pause
