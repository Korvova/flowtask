# Архитектура Flowtask

## Обзор
Flowtask - визуальный редактор процессов для Bitrix24, позволяющий создавать последовательности задач с автоматическим переходом.

## Основные сущности

### 1. Задача (Task)
- Реальная задача в Bitrix24
- Загружается через `tasks.task.get`
- Отображается как **белая карточка** (меняет цвет по статусу)
- Цвета:
  - Новая (статус 2) → серо-белая
  - В работе (статус 3) → синяя
  - Ждёт выполнения (статус 4) → синяя
  - Завершена (статус 5) → зелёная
  - Отложена (статус 6) → серая
  - Отклонена (статус 7) → красная

### 2. Предзадача (Future Task)
- Будущая задача, которая ещё не создана
- Отображается как **тёмно-серая карточка**
- При выполнении условий превращается в реальную задачу
- После создания становится **светло-серой** (если isCreated=true)

### 3. Связь (Connection)
- Линия между задачами/предзадачами
- Показывает направление процесса
- Типы: `task` (между реальными задачами), `future` (с предзадачами)

### 4. Шаблон процесса (Process Template)
- Сохранённая последовательность предзадач
- Может применяться к любой задаче
- Состоит только из предзадач (без реальных задач)

## Структура Entity Storage

### Entity: `tflow_pos` (позиции задач)
**Назначение**: Хранение координат задач на полотне

```json
{
  "taskId": "123",
  "positionX": 250.5,
  "positionY": 100.0
}
```

**Ключевое поле**: `taskId` (строка)

---

### Entity: `tflow_future` (предзадачи)
**Назначение**: Хранение будущих задач до их создания

```json
{
  "futureId": "future-1761566973",
  "parentTaskId": 62,
  "title": "Название задачи",
  "description": "Описание задачи",
  "responsibleId": 1,
  "groupId": 0,
  "conditionType": "immediately",
  "delayMinutes": 0,
  "positionX": 500.0,
  "positionY": 200.0,
  "isCreated": false,
  "realTaskId": null
}
```

**Поля**:
- `futureId` - уникальный ID предзадачи (future-{timestamp})
- `parentTaskId` - ID родительской задачи, к которой привязана
- `conditionType` - условие создания:
  - `immediately` - сразу при завершении родителя
  - `delay` - через X минут после завершения родителя
  - `ifCancel_create` - при отмене родителя создать задачу
  - `ifCancel_cancel` - при отмене родителя отменить процесс
- `isCreated` - флаг, что задача уже создана (true/false)
- `realTaskId` - ID реальной задачи после создания (null до создания)

**Ключевое поле**: `futureId`

---

### Entity: `tflow_conn` (связи)
**Назначение**: Хранение связей между задачами и предзадачами

```json
{
  "sourceId": "task-62",
  "targetId": "future-1761566973",
  "connectionType": "future",
  "parentTaskId": 62
}
```

**Поля**:
- `sourceId` - откуда связь (task-{id} или future-{id})
- `targetId` - куда связь (task-{id} или future-{id})
- `connectionType` - тип связи:
  - `task` - между реальными задачами
  - `future` - связь с предзадачей
- `parentTaskId` - ID корневой задачи процесса

**Ключевое поле**: комбинация `sourceId` + `targetId`

---

### Entity: `tflow_template` (шаблоны процессов)
**Назначение**: Хранение сохранённых шаблонов процессов

```json
{
  "templateId": "template-1761567000",
  "name": "Процесс согласования документа",
  "description": "Полный цикл согласования с юристом и директором",
  "createdBy": 1,
  "createdAt": 1761567000,
  "futureTasks": [
    {
      "futureId": "future-1",
      "title": "Проверка юриста",
      "description": "",
      "responsibleId": 5,
      "groupId": 0,
      "conditionType": "immediately",
      "delayMinutes": 0,
      "relativeX": 200,
      "relativeY": 0
    },
    {
      "futureId": "future-2",
      "title": "Согласование директора",
      "description": "",
      "responsibleId": 1,
      "groupId": 0,
      "conditionType": "immediately",
      "delayMinutes": 0,
      "relativeX": 400,
      "relativeY": 0
    }
  ],
  "connections": [
    {
      "sourceId": "root",
      "targetId": "future-1"
    },
    {
      "sourceId": "future-1",
      "targetId": "future-2"
    }
  ]
}
```

**Поля**:
- `templateId` - уникальный ID шаблона
- `name` - название шаблона (для списка)
- `description` - описание шаблона
- `createdBy` - ID пользователя, создавшего шаблон
- `futureTasks` - массив предзадач (без parentTaskId!)
- `connections` - массив связей (sourceId="root" = привязка к стартовой задаче)
- `relativeX/relativeY` - относительные координаты от стартовой задачи

**Ключевое поле**: `templateId`

---

### Entity: `tflow_subscription` (подписки)
**Назначение**: Отслеживание подписок и оплат

```json
{
  "userId": 1,
  "subscriptionType": "monthly",
  "expiresAt": 1764159000,
  "templatesUsed": 5,
  "isActive": true
}
```

**Поля**:
- `subscriptionType`:
  - `monthly` - месячная подписка (500₽, безлимит шаблонов)
  - `per_template` - за шаблон (100₽ за применение)
  - `free` - бесплатная (только просмотр, без шаблонов)

---

## Жизненный цикл предзадачи

```
1. Создание предзадачи
   ↓
   isCreated: false
   realTaskId: null
   Цвет: тёмно-серый

2. Выполнение условия (parent task completed)
   ↓
   TaskCreator.processCompletedTask()
   ↓
   tasks.task.add() → ID: 66

3. Обновление Entity
   ↓
   isCreated: true
   realTaskId: 66
   Цвет: светло-серый (технически)

4. Перезагрузка полотна
   ↓
   loadProcessData()
   ↓
   loadCreatedTasks([66])
   ↓
   Показывается реальная задача (цвет по статусу)
```

## Рекурсивная загрузка дерева задач

### Алгоритм

```javascript
loadAllConnectedTasks(rootTaskId) {
  visited = new Set()
  allNodes = []
  allEdges = []

  function traverse(taskId, visited) {
    if (visited.has(taskId)) return
    visited.add(taskId)

    // 1. Загрузить задачу
    task = loadTask(taskId)
    allNodes.push(task)

    // 2. Загрузить все связи этой задачи
    connections = loadConnectionsForTask(taskId)

    // 3. Для каждой связи рекурсивно загрузить цели
    for (conn in connections) {
      allEdges.push(conn)

      if (conn.targetId.startsWith('task-')) {
        targetTaskId = extractId(conn.targetId)
        traverse(targetTaskId, visited)
      }
      else if (conn.targetId.startsWith('future-')) {
        futureTask = loadFutureTask(conn.targetId)
        if (futureTask.isCreated) {
          traverse(futureTask.realTaskId, visited)
        } else {
          allNodes.push(futureTask)
        }
      }
    }

    // 4. Загрузить предзадачи этой задачи
    futureTasks = loadFutureTasks(taskId)
    for (ft in futureTasks) {
      if (ft.isCreated) {
        traverse(ft.realTaskId, visited)
      } else {
        allNodes.push(ft)
      }
    }
  }

  traverse(rootTaskId, visited)
  return { nodes: allNodes, edges: allEdges }
}
```

### Защита от циклов
- Используется `Set visited` для отслеживания посещённых задач
- Перед рекурсией проверяем `if (visited.has(taskId)) return`

### Оптимизации
1. **Ограничение глубины**: максимум 10 уровней вложенности
2. **Lazy loading**: загружать подграф по клику на узел
3. **Кэширование**: сохранять загруженные задачи в памяти
4. **Batch запросы**: группировать запросы к API

## Работа с шаблонами

### Сохранение шаблона

**Условия:**
1. На полотне только 1 реальная задача (корневая)
2. Все остальные узлы - предзадачи (isCreated=false)
3. Нет циклических связей

**Алгоритм:**
```javascript
function saveAsTemplate(name, description) {
  // 1. Валидация
  if (hasMultipleRealTasks()) {
    alert("Процесс возможен только из предзадач без задач")
    return
  }

  // 2. Получить все предзадачи
  futureTasks = getAllFutureTasks()

  // 3. Нормализовать координаты (относительно корневой задачи)
  rootPosition = getRootTaskPosition()
  for (ft in futureTasks) {
    ft.relativeX = ft.positionX - rootPosition.x
    ft.relativeY = ft.positionY - rootPosition.y
  }

  // 4. Получить все связи
  connections = getAllConnections()

  // 5. Заменить ID корневой задачи на "root"
  for (conn in connections) {
    if (conn.sourceId === 'task-' + rootTaskId) {
      conn.sourceId = 'root'
    }
  }

  // 6. Сохранить в Entity
  template = {
    templateId: 'template-' + timestamp,
    name: name,
    description: description,
    createdBy: currentUserId,
    futureTasks: futureTasks,
    connections: connections
  }

  BX24.callMethod('entity.item.add', {
    ENTITY: 'tflow_template',
    NAME: name,
    DETAIL_TEXT: JSON.stringify(template)
  })
}
```

### Применение шаблона

**Условия:**
1. Задача не должна иметь дочерних связей (только начальная точка)
2. Все пользователи и группы из шаблона должны существовать

**Алгоритм:**
```javascript
function applyTemplate(templateId, targetTaskId) {
  // 1. Проверка подписки
  if (!hasActiveSubscription() && !hasTemplateCredits()) {
    showPaymentModal()
    return
  }

  // 2. Загрузить шаблон
  template = loadTemplate(templateId)

  // 3. Проверить что задача не имеет процессов
  if (hasChildProcesses(targetTaskId)) {
    alert("Можно применить только на задачи без процессов")
    return
  }

  // 4. Валидация пользователей и групп
  missingUsers = []
  missingGroups = []

  for (ft in template.futureTasks) {
    if (!userExists(ft.responsibleId)) {
      missingUsers.push(ft)
    }
    if (ft.groupId && !groupExists(ft.groupId)) {
      missingGroups.push(ft)
    }
  }

  if (missingUsers.length > 0 || missingGroups.length > 0) {
    showReplacementModal(missingUsers, missingGroups)
    return
  }

  // 5. Получить позицию целевой задачи
  targetPosition = loadTaskPosition(targetTaskId)

  // 6. Создать предзадачи с новыми ID
  idMapping = {} // старый futureId → новый futureId

  for (ft in template.futureTasks) {
    newFutureId = 'future-' + Date.now() + '-' + random()
    idMapping[ft.futureId] = newFutureId

    newFutureTask = {
      futureId: newFutureId,
      parentTaskId: targetTaskId,
      title: ft.title,
      description: ft.description,
      responsibleId: ft.responsibleId,
      groupId: ft.groupId,
      conditionType: ft.conditionType,
      delayMinutes: ft.delayMinutes,
      positionX: targetPosition.x + ft.relativeX,
      positionY: targetPosition.y + ft.relativeY,
      isCreated: false,
      realTaskId: null
    }

    saveFutureTask(newFutureTask)
  }

  // 7. Создать связи с новыми ID
  for (conn in template.connections) {
    newConnection = {
      sourceId: conn.sourceId === 'root'
        ? 'task-' + targetTaskId
        : idMapping[conn.sourceId],
      targetId: idMapping[conn.targetId],
      connectionType: 'future',
      parentTaskId: targetTaskId
    }

    saveConnection(newConnection)
  }

  // 8. Списать оплату
  if (subscriptionType === 'per_template') {
    chargeTemplate()
  }

  // 9. Перезагрузить полотно
  loadProcessData()
}
```

## Монетизация

### Тарифы
1. **Free** (бесплатно):
   - Просмотр процессов
   - Создание предзадач
   - Ручное управление процессами
   - ❌ Сохранение шаблонов
   - ❌ Применение шаблонов

2. **Pro** (500₽/месяц):
   - ✅ Всё из Free
   - ✅ Безлимит шаблонов
   - ✅ Сохранение процессов
   - ✅ Применение шаблонов

3. **Pay-per-use** (100₽/шаблон):
   - ✅ Всё из Free
   - ✅ Покупка отдельных применений шаблона
   - 1 применение = 100₽

### Проверка доступа

```javascript
function canUseTem plates() {
  subscription = loadSubscription(currentUserId)

  if (!subscription) {
    return { allowed: false, reason: 'no_subscription' }
  }

  if (subscription.subscriptionType === 'monthly') {
    if (subscription.expiresAt > Date.now()) {
      return { allowed: true }
    } else {
      return { allowed: false, reason: 'expired' }
    }
  }

  if (subscription.subscriptionType === 'per_template') {
    if (subscription.templatesUsed > 0) {
      return { allowed: true }
    } else {
      return { allowed: false, reason: 'no_credits' }
    }
  }

  return { allowed: false, reason: 'free_plan' }
}
```

## Следующие шаги

1. ✅ Создание задач из предзадач - **ГОТОВО**
2. ⏳ Рекурсивная загрузка всего дерева - **В ПЛАНЕ**
3. ⏳ Сохранение шаблонов - **В ПЛАНЕ**
4. ⏳ Применение шаблонов - **В ПЛАНЕ**
5. ⏳ Система подписок - **В ПЛАНЕ**
