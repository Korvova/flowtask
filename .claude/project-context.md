# Flowtask - Контекст проекта

## 🏗️ Архитектура

### Окружение разработки
- **Локальная машина**: `/var/www/flowtask` - Git репозиторий для разработки
- **Удалённый сервер**: Bitrix24 VM (213.139.229.71)
  - SSH доступ: `sshpass -p 's&HRXRbcT8RR' ssh root@213.139.229.71`
  - Там находится production версия приложения

### Процесс деплоя
1. Разработка ведётся локально в `/var/www/flowtask`
2. Изменения коммитятся в Git: `git add . && git commit -m "message"`
3. Пушатся на удалённый репозиторий: `git push`
4. На сервере Bitrix24 применяются через `deploy.sh` или автоматически

⚠️ **ВАЖНО**:
- НЕ нужно копировать файлы в `/var/www/html`
- НЕ нужно открывать файлы локально через браузер
- Тестирование проводится ТОЛЬКО на удалённом сервере Bitrix24

## 🎯 О приложении

**Flowtask** - это приложение для Bitrix24, которое:
- Работает внутри iframe в карточке задачи
- Предоставляет визуальный редактор процессов (React Flow)
- Позволяет создавать связи между задачами и предзадачами
- Использует Bitrix24 REST API для хранения данных

### Архитектура V2 (текущая)
- **Entity Storage V2**: Одна таблица `entity.item` с фильтрацией по полю `NAME`
- **EntityManagerV2.js**: Управление узлами и связями процессов
- **FlowCanvasV2.js**: React Flow canvas с валидацией связей
- **TaskModalV2.js**: Модальное окно создания/редактирования задач
- **TaskHandler.js**: Обработчик событий задач

### Основные файлы
- `handler.php` - точка входа приложения (открывается в iframe Bitrix24)
- `components/EntityManagerV2.js` - менеджер данных
- `components/FlowCanvasV2.js` - главный компонент canvas
- `components/TaskModalV2.js` - модалка для задач
- `deploy.sh` - скрипт деплоя на сервер

## 🔧 Тестирование

### Для тестирования НА сервере Bitrix24:
```bash
# 1. Закоммитить изменения
git add .
git commit -m "Описание изменений"

# 2. Запушить на сервер
git push

# 3. Проверить на сервере
# Открыть приложение в Bitrix24 через браузер
```

### SSH доступ к серверу
```bash
sshpass -p 's&HRXRbcT8RR' ssh root@213.139.229.71 "команда"
```

## 📦 MCP серверы

Доступны следующие MCP инструменты:
- **b24-dev-mcp**: Документация Bitrix24 REST API
- **browser-automation**: Автоматизация браузера для тестирования
- **context7**: Актуальная документация библиотек (React Flow и др.)

## 🎨 Особенности реализации

### Connection Validation (Context7 + React Flow)
Реализована валидация связей:
1. Запрет самосвязей
2. Запрет дублирования
3. Future узлы не могут иметь исходящие связи

### Entity Storage V2
Все узлы хранятся в одной таблице:
- `NAME` = `process_{processId}_node_{nodeId}` для узлов
- `NAME` = `process_{processId}_connection_{fromId}_{toId}` для связей

## ⚠️ Частые ошибки

1. **НЕ пытаться открыть файлы локально** - приложение работает только в контексте Bitrix24
2. **НЕ забывать про git push** - изменения применяются только после деплоя
3. **Использовать EntityManagerV2** - старый EntityManager deprecated
4. **saveConnection vs addConnection** - saveConnection автоматически определяет тип узла

## 🔍 Полезные команды

```bash
# Проверить статус на сервере
sshpass -p 's&HRXRbcT8RR' ssh root@213.139.229.71 "cd /path/to/flowtask && git status"

# Посмотреть логи
sshpass -p 's&HRXRbcT8RR' ssh root@213.139.229.71 "tail -f /var/log/nginx/error.log"

# Проверить изменения перед коммитом
git status
git diff
```
