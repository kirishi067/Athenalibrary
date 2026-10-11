@echo off
title Push Athena Library to GitHub
echo ========================================================
echo   Pushing Athena Library System to GitHub
echo   Repository: https://github.com/kirishi067/Athenalibrary.git
echo ========================================================
echo.
cd /d "d:\kirishi project"
"C:\Users\VIKRAM V\AppData\Local\Programs\MinGit\cmd\git.exe" push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
  echo ========================================================
  echo   SUCCESS: Code pushed to GitHub successfully!
  echo ========================================================
) else (
  echo ========================================================
  echo   If prompted, sign in via browser or enter GitHub Token.
  echo ========================================================
)
echo.
pause
