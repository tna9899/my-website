@echo off
title Phat Web Truc Tuyen: Ngoc Anh - Tu Uyen
chcp 65001 > nul
cls
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "start_tunnel.ps1"
pause
