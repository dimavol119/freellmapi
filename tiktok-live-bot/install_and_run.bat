@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Installing libraries...
python -m pip install --upgrade -r requirements.txt
echo.
echo Starting the bot...
python live_bot.py
pause
