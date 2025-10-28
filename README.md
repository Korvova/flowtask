# Flowtask - Визуальные процессы для Bitrix24

Приложение для управления процессами и связанными задачами в Bitrix24.

## 📁 Структура проекта

```
flowtask/
├── handler.php              # Главная точка входа
├── install.php              # Скрипт установки приложения
├── components/              # JavaScript компоненты
│   ├── EntityManager.js     # 🆕 Управление Entity Storage
│   ├── FlowCanvas.js        # Главный canvas компонент
│   ├── TaskCreator.js       # Создание задач из предзадач
│   ├── TaskNode.js          # Узел задачи на canvas
│   ├── TaskModal.js         # Модалка создания предзадачи
│   ├── PullSubscription.js  # Real-time обновления
│   └── StatusColors.js      # Цвета статусов задач
├── assets/
│   ├── css/
│   │   ├── main.css         # Базовые стили
│   │   └── reactflow.css    # Стили React Flow
│   └── js/                  # React и React Flow библиотеки
├── api/                     # PHP API endpoints
└── task_*_webhook.php       # Webhook обработчики
```

## 🗄️ Entity Storage

Приложение использует 4 типа Entity для хранения данных:

### 1. **tflow_pos** - Позиции узлов
```json
{
  "nodeId": "task-123",
  "positionX": 250,
  "positionY": 100,
  "processId": "111"
}
```

### 2. **tflow_future** - Предзадачи
```json
{
  "futureId": "future-1761665000000",
  "parentTaskId": 111,
  "processId": "111",
  "title": "Новая задача",
  "description": "Описание",
  "responsibleId": 1,
  "groupId": 0,
  "conditionType": "ifComplete_create",
  "delayMinutes": 0,
  "positionX": 500,
  "positionY": 200,
  "isCreated": false,
  "realTaskId": null
}
```

### 3. **tflow_conn** - Связи
```json
{
  "parentTaskId": 111,
  "processId": "111",
  "sourceId": "task-111",
  "targetId": "future-1761665000000",
  "connectionType": "future"
}
```

### 4. **tflow_tmpl** - Шаблоны процессов
```json
{
  "templateName": "Шаблон процесса",
  "templateData": "{...}",
  "createdBy": 1,
  "createdAt": 1761665000
}
```

## 🔧 EntityManager API

### Позиции
```javascript
// Сохранить позицию
await EntityManager.savePosition('task-123', 250, 100, '111');

// Загрузить позицию
const position = await EntityManager.loadPosition('task-123');
// => { x: 250, y: 100 }
```

### Предзадачи
```javascript
// Создать предзадачу
await EntityManager.createFutureTask({
  futureId: 'future-123',
  title: 'Новая задача',
  processId: '111',
  // ... другие поля
});

// Загрузить предзадачи процесса
const futureTasks = await EntityManager.loadFutureTasks('111');

// Обновить предзадачу
await EntityManager.updateFutureTask(entityId, futureData);

// Удалить предзадачу
await EntityManager.deleteFutureTask(entityId);
```

### Связи
```javascript
// Создать связь
await EntityManager.createConnection({
  sourceId: 'task-111',
  targetId: 'future-123',
  processId: '111',
  connectionType: 'future'
});

// Загрузить связи процесса
const connections = await EntityManager.loadConnections('111');

// Обновить связь
await EntityManager.updateConnection(entityId, connectionData);

// Удалить связь
await EntityManager.deleteConnection(entityId);

// Заменить futureId на taskId во всех связях
await EntityManager.replaceFutureWithTask('future-123', '456');
```

### Миграция
```javascript
// Мигрировать старые связи без processId
const migratedCount = await EntityManager.migrateOldConnections('111', '111');
```

## 🔄 Как работает ProcessId

**ProcessId** - это ключевое поле для группировки задач и данных одного процесса.

### Правила:
1. **Корневая задача** процесса получает `processId = task.id`
2. **Все дочерние задачи** наследуют `processId` от родителя
3. **Все данные** (позиции, предзадачи, связи) сохраняются с `processId`
4. **При загрузке** все данные фильтруются по `processId`

### Пример:
```
Задача-111 (корневая)
  processId = "111"
  ↓ создает
Задача-112
  processId = "111" (наследуется!)
  ↓ создает
Задача-113
  processId = "111" (наследуется!)
```

Все связи, позиции и предзадачи имеют `processId = "111"`, поэтому при открытии любой из этих задач загружаются все данные процесса.

## 🚀 Установка

1. Открыть `install.php` в браузере
2. Нажать "Установить приложение"
3. Приложение создаст:
   - 4 Entity (tflow_pos, tflow_future, tflow_conn, tflow_tmpl)
   - Пользовательское поле `UF_FLOWTASK_PROCESS_ID`
   - Placement "Процессы" во вкладках задачи
   - Webhook для real-time обновлений

## 📡 Real-time обновления

Приложение использует **Bitrix Push & Pull** для мгновенных обновлений:

- `BX.PULL.start()` - запуск системы
- `PullSubscription.subscribe()` - подписка на события задачи
- Автоматическое обновление статуса и данных при изменении задачи

## 🎨 Компоненты

### FlowCanvas
Главный компонент на React + React Flow. Управляет:
- Отображением узлов (задачи, предзадачи)
- Созданием связей
- Drag & Drop узлов
- Модалками

### TaskCreator
Обрабатывает завершение задач и создает новые задачи из предзадач:
- Проверяет условия (ifComplete, ifDelay, ifCancel)
- Создает реальные задачи
- Наследует processId
- Обновляет связи в Entity

### EntityManager
Централизованное управление Entity Storage:
- Единая точка для всех операций с данными
- Промисы для async/await
- Детальное логирование
- Обработка ошибок

## 🐛 Отладка

Все компоненты логируют в консоль:
- `🚀` - Инициализация
- `✅` - Успешная операция
- `❌` - Ошибка
- `⚠️` - Предупреждение
- `📥` - Загрузка данных
- `💾` - Сохранение данных
- `🔄` - Обновление/миграция

## 📝 TODO

- [ ] Шаблоны процессов (сохранение/загрузка)
- [ ] Массовое создание задач
- [ ] Экспорт процесса в JSON
- [ ] Импорт процесса из JSON
- [ ] История изменений процесса
