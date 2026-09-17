@echo off
color 0a
title Newsletter Creator Server
echo ==================================================
echo   Starting Newsletter Creator...
echo   Please DO NOT close this black window.
echo   (If you close it, the website will stop working)
echo ==================================================

ping 127.0.0.1 -n 3 > nul
start http://localhost:5173
npm run dev
