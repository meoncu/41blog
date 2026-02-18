@echo off
title 41Blog Dev Server
cd /d "C:\Cursor\41blog"
echo Starting 41Blog on http://localhost:4141 ...
start "" "http://localhost:4141"
npm run dev
