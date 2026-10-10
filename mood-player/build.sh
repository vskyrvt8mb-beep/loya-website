#!/bin/sh
# Сборка MoodPlayer.exe (можно собирать и на Linux/macOS, и на Windows с Go 1.22+).
set -e
cd "$(dirname "$0")"
mkdir -p dist
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H windowsgui" -o dist/MoodPlayer.exe .
echo "Готово: dist/MoodPlayer.exe"
