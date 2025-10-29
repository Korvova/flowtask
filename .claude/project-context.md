# Flowtask - Контекст проекта

## 🏗️ Архитектура

### Окружение разработки
- **Локальная машина**: `/var/www/flowtask` - Git репозиторий для разработки
- **Удалённый сервер**: Bitrix24 VM (213.139.229.71)
  - SSH доступ: `sshpass -p 's&HRXRbcT8RR' ssh root@213.139.229.71`
  - Там находится production версия приложения

### Доступы к Bitrix24
- **URL**: https://test.test-rms.ru
- **Логин**: admin
- **Пароль**: Asavuf81

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
# Проверить изменения перед коммитом
git status
git diff

# Посмотреть последние коммиты
git log --oneline -10

# Посмотреть изменения в файле
git log -p components/FlowCanvasV2.js
```

---

## 📋 История выполненных задач

### Сессия 2025-01-29: Исправление кнопок и оптимизация обновления

#### Проблема 1: Кнопки в NodeToolbar не кликались
**Симптомы:**
- Кнопки "Удалить" и "Редактировать" показывались над карточкой
- При клике ничего не происходило
- Не было логов в консоли

**Причины:**
1. `nodeTypes` создавались заново при каждом рендере → React Flow пересоздавал узлы → ломались обработчики
2. CSS не был настроен: нужен `pointer-events: all` для кнопок

**Решение:**
- [FlowCanvasV2.js:41-44] Обернул nodeTypes в `useMemo(() => ({...}), [])` - теперь объект стабильный
- [reactflow.css:115-120] Добавил CSS для кнопок внутри узла:
  ```css
  .react-flow__node button {
    pointer-events: all !important;
    cursor: pointer !important;
    z-index: 100;
  }
  ```
- [reactflow.css:408-425] Добавил CSS для NodeToolbar:
  ```css
  .react-flow__node-toolbar {
    z-index: 9999 !important;
    pointer-events: all !important;
  }
  ```

**Источник:** WebSearch + GitHub issues xyflow/xyflow

**Коммиты:**
- `168fab2` - Fix: Button clicks now work! nodeTypes in useMemo + CSS fix
- `6b1af92` - Restore NodeToolbar: buttons now appear ABOVE card when selected

---

#### Проблема 2: Предзадачи оставались видимыми после создания
**Симптомы:**
- После перевода задачи в "Готово" создавалась новая задача ✅
- Но предзадача оставалась на полотне ❌
- Связи оставались на предзадачу, а не на новую задачу ❌

**Причины:**
1. В `loadProcessData()` все узлы показывались без фильтрации
2. Связи строились из всех узлов, не перенаправлялись на созданные задачи
3. TaskHandler вызывал старый FlowCanvas.reloadCanvas()

**Решение:**
- [FlowCanvasV2.js:183-191] Добавил фильтрацию созданных предзадач:
  ```javascript
  const visibleNodes = allNodes.filter(node => {
      // Если это предзадача И у неё есть realTaskId - скрываем
      if (node.type === 'future' && node.realTaskId) {
          return false;
      }
      return true;
  });
  ```
- [FlowCanvasV2.js:226-262] Создал карту перенаправления и обновил edges:
  ```javascript
  const futureToTaskMap = {};
  allNodes.forEach(node => {
      if (node.type === 'future' && node.realTaskId) {
          futureToTaskMap[node.nodeId] = 'task-' + node.realTaskId;
      }
  });

  // При создании edges перенаправляем target
  let targetId = conn.id;
  if (futureToTaskMap[targetId]) {
      targetId = futureToTaskMap[targetId];
  }
  ```
- [TaskHandler.js:124-135] Обновлен callback на FlowCanvasV2

**Коммит:** `9339f8d` - Fix: Hide completed future tasks and redirect connections

---

#### Проблема 3: Полная перезагрузка canvas при обновлении
**Симптомы:**
- При создании задачи весь canvas перезагружался
- Мерцание интерфейса
- Сбрасывалась позиция viewport и zoom

**Причина:**
`reloadCanvas()` вызывал `render()` → пересоздание всего React компонента

**Решение:**
- [FlowCanvasV2.js:139-142] Создал метод `updateNodes()`:
  ```javascript
  window.FlowCanvasV2.updateNodes = () => {
      loadProcessData(); // Обновляет только state через setNodes/setEdges
  };
  ```
- [TaskHandler.js:124-126] Теперь вызывает `updateNodes()` вместо `reloadCanvas()`

**Преимущества:**
- ✅ Нет мерцания
- ✅ Сохраняется zoom и позиция viewport
- ✅ Быстрее (только обновление state)
- ✅ Правильный подход по документации React Flow

**Источник:** Context7 xyflow/xyflow - рекомендуется через setState

**Коммит:** `3173988` - Optimize: Update nodes via setState instead of full reload

---

### Ключевые технические решения

#### React Flow: nodeTypes должны быть мемоизированы
**Проблема:** При каждом рендере создавался новый объект nodeTypes → React Flow пересоздавал узлы

**Решение:**
```javascript
const nodeTypes = useMemo(() => ({
    task: window.TaskNode,
    future: window.TaskNode
}), []);
```

**Правило:** nodeTypes должны быть в `useMemo()` или определены глобально.

---

#### Обновление узлов: setState vs render()
**Неправильно:**
```javascript
reloadCanvas() {
    this.render(); // Пересоздание компонента
}
```

**Правильно:**
```javascript
updateNodes() {
    loadProcessData(); // setNodes/setEdges - обновление state
}
```

---

#### Фильтрация созданных предзадач
**Логика:**
```javascript
if (node.type === 'future' && node.realTaskId) {
    // Эта предзадача уже стала задачей → скрываем
    return false;
}
```

**Перенаправление связей:**
```javascript
const futureToTaskMap = {
    'future-123': 'task-456' // future → созданная задача
};

// При создании edge
let targetId = conn.id;
if (futureToTaskMap[targetId]) {
    targetId = futureToTaskMap[targetId]; // Перенаправляем!
}
```

---

### Текущее состояние проекта

#### Рабочие функции:
- ✅ Создание предзадач
- ✅ Редактирование предзадач (кнопка ✏️)
- ✅ Удаление предзадач (кнопка 🗑️)
- ✅ Создание связей между узлами
- ✅ Валидация связей (нет дублей, нет самосвязей)
- ✅ Автоматическое создание задач из предзадач
- ✅ Скрытие созданных предзадач
- ✅ Перенаправление связей на новые задачи
- ✅ Плавное обновление без перезагрузки

#### Известные ограничения:
- Future узлы не могут иметь исходящих связей (по дизайну)
- Условие создания: пока работает только "immediately"

---

### Файлы, которые часто изменяются

**Основные компоненты:**
- `components/FlowCanvasV2.js` - главный canvas, логика загрузки/отображения
- `components/TaskNode.js` - карточка задачи с кнопками NodeToolbar
- `components/TaskModalV2.js` - модалка создания/редактирования
- `components/EntityManagerV2.js` - работа с Bitrix24 Entity Storage
- `components/TaskHandler.js` - обработка событий задач

**Стили:**
- `assets/css/reactflow.css` - стили React Flow (NodeToolbar, кнопки)
- `assets/css/main.css` - общие стили

**Конфигурация:**
- `handler.php` - точка входа
- `deploy.sh` - деплой на сервер

---

### Следующие задачи (TODO)

**Приоритет 1:**
- [ ] Реализовать условия создания: "delay" (с задержкой), "ifCancel" (при отмене)
- [ ] Добавить визуальную индикацию статуса создания (pending/created)

**Приоритет 2:**
- [ ] Оптимизировать загрузку: загружать только измененные узлы
- [ ] Добавить возможность отмены связи (кнопка на edge)

**Приоритет 3:**
- [ ] Миграция старых данных из V1 в V2
- [ ] Тесты для критических функций

---

### Полезные ссылки

**Документация:**
- Context7 React Flow: `/xyflow/xyflow`
- Bitrix24 REST API: использовать `mcp__b24-dev-mcp__bitrix-search`

**Тестирование:**
- URL приложения: https://test.test-rms.ru/flowtask/handler.php
- Тестовая задача: https://test.test-rms.ru/company/personal/user/1/tasks/task/view/131/

**Git:**
```bash
# Последние изменения
git log --oneline -10

# Изменения в конкретном файле
git show <commit>:path/to/file

# История изменений файла
git log -p components/FlowCanvasV2.js
```
