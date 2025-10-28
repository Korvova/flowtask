#!/bin/bash
# Ручной деплой на Bitrix сервер

echo "🚀 Деплой Flowtask на Bitrix сервер..."
echo ""

# Параметры
BITRIX_HOST="217.26.30.163"
BITRIX_USER="root"
BITRIX_PATH="/home/bitrix/www/flowtask/"
LOCAL_PATH="/var/www/flowtask/"

echo "📦 Синхронизация файлов..."
echo "  Из: $LOCAL_PATH"
echo "  В: $BITRIX_USER@$BITRIX_HOST:$BITRIX_PATH"
echo ""

# Попробуем первый пароль
sshpass -p 'ca4^UXhSN@3k' rsync -avz --delete \
    --exclude '.git' \
    --exclude '.gitignore' \
    --exclude 'node_modules' \
    --exclude 'deploy.sh' \
    "$LOCAL_PATH" "$BITRIX_USER@$BITRIX_HOST:$BITRIX_PATH" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "⏳ Пробую второй пароль..."
    sshpass -p 's&HRXRbcT8RR' rsync -avz --delete \
        --exclude '.git' \
        --exclude '.gitignore' \
        --exclude 'node_modules' \
        --exclude 'deploy.sh' \
        "$LOCAL_PATH" "$BITRIX_USER@$BITRIX_HOST:$BITRIX_PATH"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Деплой завершён успешно!"
    echo ""
    echo "📋 Приложение доступно по адресам:"
    echo "   https://test.test-rms.ru/flowtask/handler.php"
    echo "   https://test.test-rms.ru/flowtask/install.php"
    echo ""
    echo "🔧 Теперь нужно:"
    echo "   1. Настроить nginx на Bitrix сервере для /flowtask/"
    echo "   2. Обновить URL в настройках приложения Bitrix24"
    echo ""
else
    echo ""
    echo "❌ Ошибка деплоя!"
    echo "Проверьте:"
    echo "  - SSH доступ к серверу"
    echo "  - Пароль"
    echo "  - Путь $BITRIX_PATH существует"
    echo ""
fi
