@echo off
title May Chu Ky Niem: Ngoc Anh - Tu Uyen
chcp 65001 > nul
cls
echo =======================================================
echo    DANG KHOI DONG TRANG WEB KY NIEM NGOC ANH - TU UYEN
echo    Tu dong luu toan bo log thao tac vao folder anhuyen
echo =======================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "server.ps1"
pause
