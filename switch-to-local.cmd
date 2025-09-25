@echo off
echo Switching to LOCAL backend (localhost:3000)...
copy .env.development .env
echo Done! Frontend configured for local backend.
echo Run: npm run dev
pause