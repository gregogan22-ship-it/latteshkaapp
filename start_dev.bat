@echo off
title LatteshkaAPP — Dev Server
color 0A

echo 🔄 Очистка кэша Next.js...
if exist .next (
    rmdir /s /q .next
    echo ✔ Кэш .next удалён.
) else (
    echo ⚠ Кэш .next не найден, пропускаем.
)

echo.
echo 🚀 Запуск приложения...
pnpm dev

echo.
pause
