@echo off
echo Switching to RAILWAY backend (production)...
copy .env.production .env
echo Done! Frontend configured for Railway backend.
echo Run: npm run dev
pause