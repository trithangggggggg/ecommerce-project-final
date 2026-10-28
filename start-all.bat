@echo off
chcp 65001 >nul
title [Ecommerce] One-Click Local Runner
cd /d "%~dp0"

echo =======================================================
echo          E-COMMERCE SYSTEM - LOCAL RUNNER
echo =======================================================
echo.
echo [1/2] Dang khoi dong Backend Spring Boot (Port 8080)...
start "Backend Server (Spring Boot :8080)" cmd /k "cd /d "%~dp0server" && gradlew.bat bootRun"

echo [2/2] Dang khoi dong Frontend React Vite (Port 5173)...
start "Frontend Client (Vite :5173)" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo =======================================================
echo  Khoi dong thanh cong!
echo  - Frontend Web : http://localhost:5173
echo  - Backend API  : http://localhost:8080
echo.
echo  Tai khoan test mac dinh:
echo    * Khach hang : customer@nexor.vn / 123123123
echo    * Quan tri   : admin@nexor.vn    / 123123123
echo =======================================================
echo.
pause

