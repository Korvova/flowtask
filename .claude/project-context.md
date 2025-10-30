# Flowtask - Контекст проекта

## 🏗️ Архитектура

### Окружение разработки
- **Локальная машина**: `/var/www/flowtask` - Git репозиторий для разработки
- **Удалённый сервер**: Bitrix24 VM 
  - SSH доступ: `ssh root@217.114.10.226` (пароль: ca4^UXhSN@3k)
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

### Сессия 2025-01-29 (вторая): Исправление обновления цветов задач в реальном времени

#### Проблема: Задачи не меняют цвет при изменении статуса
**Симптомы:**
- Задача 137 меняет цвет при изменении статуса ✅
- Задача 138 НЕ меняет цвет на полотне задачи 137 ❌
- При перезагрузке страницы цвета устаревшие (белый вместо синего/зеленого)
- События ONTASKUPDATE генерируют ошибки 400 Bad Request

**Причины (найдено через логирование):**
1. **BX24.callBind не работает в iframe** - генерирует ошибки 400
2. **updateSingleTaskStatus обновлял data.status вместо data.statusCode** - TaskNode использует statusCode
3. **updateTaskStatuses перезаписывал статусы** после PULL событий - loadProcessData вызывал updateTaskStatuses каждый раз
4. **handleStatusChange НЕ сохранял в Entity Storage** - только обновлял React state
5. **task-138 создан БЕЗ realTaskId** - TaskHandler.handleTaskComplete не добавлял realTaskId
6. **PULL не подписывался на task-138** - фильтр `node.data.realTaskId` пропускал её

**Решение по шагам:**

**Шаг 1:** [handler.php:85-90] Убрали BX24.callBind - не работает в iframe
```javascript
// Real-time обновления статусов обрабатываются через PullSubscription.js
if (typeof BX !== 'undefined' && typeof BX.PULL !== 'undefined') {
    BX.PULL.start();
}
```

**Шаг 2:** [FlowCanvasV2.js:168-170] Исправили updateSingleTaskStatus - используем statusCode
```javascript
data: {
    ...node.data,
    statusCode: newStatus,  // TaskNode использует statusCode!
    _updateTime: Date.now()
}
```

**Шаг 3:** [FlowCanvasV2.js:264-273] Добавили флаг isInitialLoad - updateTaskStatuses только при первой загрузке
```javascript
if (isInitialLoadRef.current) {
    await updateTaskStatuses(allNodes, taskNodes);
    isInitialLoadRef.current = false;
} else {
    console.log('ℹ️ Пропускаем updateTaskStatuses (статусы обновляются через PULL)');
}
```

**Шаг 4:** [FlowCanvasV2.js:579-592] handleStatusChange сохраняет в Entity Storage ПЕРЕД обновлением UI
```javascript
const allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
const nodeToUpdate = allNodes.find(n => n.type === 'task' && n.realTaskId === taskId);
if (nodeToUpdate) {
    nodeToUpdate.status = newStatus;
    await EntityManagerV2.saveNode(window.currentProcessId, nodeToUpdate);
}
```

**Шаг 5:** [TaskHandler.js:103] Добавили realTaskId при создании задачи из предзадачи
```javascript
const newTaskNode = {
    nodeId: 'task-' + newTaskId,
    type: 'task',
    realTaskId: newTaskId,  // ✅ Добавляем для PULL подписки!
    // ...
};
```

**Шаг 6:** [FlowCanvasV2.js:262-278] Автоисправление старых узлов без realTaskId
```javascript
const nodesWithoutRealTaskId = allNodes.filter(n =>
    n.type === 'task' && !n.realTaskId && n.nodeId.startsWith('task-')
);
for (const node of nodesWithoutRealTaskId) {
    const taskId = parseInt(node.nodeId.replace('task-', ''));
    node.realTaskId = taskId;
    await EntityManagerV2.saveNode(window.currentProcessId, node);
}
```

**Результат:**
- ✅ Все задачи на полотне меняют цвет в реальном времени
- ✅ Цвета сохраняются после перезагрузки
- ✅ Старые узлы автоматически исправляются при загрузке
- ✅ Нет ошибок 400 в консоли

**Коммиты:**
- `04c4415` - Fix: Real-time status updates for ALL tasks on canvas
- `0e3d9e9` - Fix: Use statusCode instead of status for visual updates
- `d3a905c` - Fix: Prevent status overwrite on canvas reload
- `4a35cc0` - Debug: Add detailed logging for status color changes
- `a36e58e` - Fix: Save status to Entity Storage on PULL events
- `787efa4` - Debug: Add logging for PULL subscription
- `0445570` - Fix: Add realTaskId when creating task from future
- `5583f06` - Fix: Auto-repair task nodes without realTaskId on load

**Важные находки:**
1. **TaskNode использует data.statusCode, НЕ data.status** - частая ошибка!
2. **PULL подписка требует realTaskId** - без него события не работают
3. **Entity Storage = источник правды** - React state должен синхронизироваться с ним
4. **BX24.callBind не работает в iframe** - использовать BX.PULL вместо этого
5. **Логирование критично** - без него не нашли бы realTaskId: undefined

---

### Сессия 2025-01-29 (третья): Автоматическое создание задач от завершённых родителей

#### Проблема: Предзадачи от завершённых задач не создаются автоматически
**Симптомы:**
- Создаёшь предзадачу от завершённой (зелёной) задачи
- С условием "⚡ Сразу"
- Предзадача остаётся серой ❌
- Реальная задача НЕ создаётся ❌

**Логика:** Если родительская задача **уже завершена** (статус 5), то предзадача с условием "immediately" должна сразу стать реальной задачей.

**Решение:**

**Шаг 1:** [TaskModalV2.js:317-346] Проверка статуса родителя после сохранения
```javascript
if (futureNode.condition === 'immediately') {
    const allNodes = await EntityManagerV2.loadProcess(processId);
    const sourceNode = allNodes.find(n => n.nodeId === this.currentSourceId);

    if (sourceNode && sourceNode.type === 'task' && sourceNode.status === 5) {
        const newTaskId = await window.TaskHandler.createTaskFromFuture(
            futureNode, sourceNode, processId
        );

        if (newTaskId) {
            futureNode.realTaskId = newTaskId;
            await EntityManagerV2.saveNode(processId, futureNode);
            window.FlowCanvasV2.updateNodes(); // Обновить canvas
        }
    }
}
```

**Шаг 2:** [TaskHandler.js:186-226] Новый метод createTaskFromFuture()
```javascript
createTaskFromFuture: async function(futureNode, sourceNode, processId) {
    // Создать задачу в Bitrix24
    const newTaskId = await this.createRealTask(
        futureNode.title,
        futureNode.description || '',
        futureNode.responsibleId,
        futureNode.groupId,
        processId
    );

    // Создать узел task-XXX с realTaskId
    const newTaskNode = {
        nodeId: 'task-' + newTaskId,
        type: 'task',
        realTaskId: newTaskId, // ✅ Для PULL подписки
        status: 2,
        // ...
    };

    await EntityManagerV2.saveNode(processId, newTaskNode);
    return newTaskId;
}
```

**Шаг 3:** [TaskModalV2.js:342-345] Обновление canvas после создания
```javascript
if (window.FlowCanvasV2 && window.FlowCanvasV2.updateNodes) {
    window.FlowCanvasV2.updateNodes();
}
```

**Результат:**
- ✅ Предзадача от завершённой задачи → сразу создаётся реальная задача в Bitrix24
- ✅ Серая предзадача скрывается с полотна (realTaskId установлен)
- ✅ Белая карточка новой задачи появляется
- ✅ Связь идёт к новой задаче
- ✅ PULL подписывается на новую задачу (есть realTaskId)

**Коммиты:**
- `19418ef` - Feature: Auto-create task when adding future to completed task
- `c8c45e2` - Fix: Use futureNode.condition instead of undefined condition variable
- `dc004c6` - Fix: Reload canvas after auto-creating task from future

**Важные моменты:**
1. **Проверяем статус родителя** после сохранения предзадачи
2. **condition === 'immediately'** - только "⚡ Сразу", не "По расписанию"
3. **Вызываем updateNodes()** - без этого canvas не обновится
4. **realTaskId обязателен** - иначе PULL не подпишется

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

### Сессия 2025-01-30: Исправление бесконечного цикла и общее полотно процессов

#### Проблема 1: Бесконечный цикл загрузки Entity Storage
**Симптомы:**
- При открытии задачи загружалось 1500+ записей
- Страница зависала
- `entity.item.get` вызывался бесконечно с увеличивающимся `start`

**Причины:**
1. **Нет фильтрации на сервере** - `entity.item.get` загружал ВСЕ записи таблицы
2. **Ручная фильтрация на клиенте** - `startsWith('process_149_')` не находил старые записи
3. **Старый формат NAME** - записи имели формат `process_149` вместо `process_149_node_task-150`
4. **Условие остановки** - `items.length === 50` → всегда true до конца таблицы

**Решение:**

**Шаг 1:** [EntityManagerV2.js:100-105] Добавили FILTER в запрос
```javascript
BX24.callMethod('entity.item.get', {
    ENTITY: 'tflow_nodes',
    FILTER: {
        '%NAME': processName  // Поиск по подстроке
    },
    SORT: { ID: 'ASC' },
    start: start
})
```

**Шаг 2:** [EntityManagerV2.js:117] Упростили код - убрали ручную фильтрацию
```javascript
const items = result.data();
allItems.push(...items);  // FILTER уже отфильтровал нужные записи
```

**Шаг 3:** [EntityManagerV2.js:325-327] Добавили FILTER в getAllProcesses
```javascript
FILTER: {
    '%NAME': 'process_'  // Только записи процессов
}
```

**Шаг 4:** [EntityManagerV2.js:313] Добавили MAX_RECORDS = 500 для защиты

**Результат:**
- ✅ Задача 149: загружает **3 записи** вместо 1500+
- ✅ Мгновенная загрузка
- ✅ ProcessManager тоже быстрый
- ✅ Поддержка старого и нового формата NAME

**Коммиты:**
- `d2cc860` - Fix: Use FILTER parameter in entity.item.get
- `875f578` - Fix: Add FILTER to getAllProcesses
- `9345c3e` - Debug: Add batch matching logs
- `287e066` - Fix: Stop infinite loop with smart batch detection

---

#### Проблема 2: Задачи не показывают общее полотно процесса
**Симптомы:**
- Задача 151 показывает task-151 и task-152
- Задача 152 показывает только task-152
- По логике они должны показывать один процесс

**Причины:**
1. **processId = taskId** - каждая задача использует свой ID как processId
2. **Нет UF поля** - `UF_FLOWTASK_PROCESS_ID` не передаётся между задачами
3. **task.item.userfield.add** возвращает 400 ошибку - нет прав создать поле

**Решение:**

**Шаг 1:** [TaskProcessMapping.js] Создали компонент для поиска processId
```javascript
getProcessId: function(taskId) {
    // Ищем в Entity Storage запись task-{taskId}
    // Извлекаем processId из NAME: process_151_node_task-152
    // Возвращаем 151 вместо 152
}
```

**Шаг 2:** [handler.php:129-145] Используем TaskProcessMapping вместо UF поля
```javascript
window.TaskProcessMapping.getProcessId(task.id).then(processId => {
    console.log('📋 Process ID:', processId);
    window.currentProcessId = processId;
    window.FlowCanvasV2.render();
});
```

**Результат:**
- ✅ Задача 152 находит processId = 151
- ✅ Загружает весь процесс 151
- ✅ Показывает обе задачи на одном полотне
- ✅ Связанные задачи = общий процесс!

**Коммиты:**
- `e8c27c0` - Feature: Auto-create UF_FLOWTASK_PROCESS_ID field
- `5e13738` - Fix: Use Entity Storage to find processId
- `0fd7ff1` - Clean: Remove UF field creation

---

#### Проблема 3: ProcessManager UI
**Реализация:**
- [ProcessManager.js](flowtask/components/ProcessManager.js) - UI для управления процессами
- Кнопка "📋 Список процессов" в левом верхнем углу canvas
- Показывает все процессы с названиями задач
- Удаление процесса со всеми узлами

**Функционал:**
```javascript
getAllProcesses()   // Список всех процессов
deleteProcess(id)   // Удаление процесса
```

**Коммит:** `875f578` - Fix: Add FILTER to getAllProcesses

---

### Ключевые технические решения

#### FILTER в Bitrix24 Entity Storage
**Проблема:** `entity.item.get` не поддерживает фильтрацию... **ИЛИ ПОДДЕРЖИВАЕТ?**

**Решение:** Использовать параметр FILTER!
```javascript
BX24.callMethod('entity.item.get', {
    ENTITY: 'tflow_nodes',
    FILTER: {
        '%NAME': 'process_149'  // LIKE '%process_149%'
    }
})
```

**Синтаксис FILTER:**
- `'%NAME': 'value'` - содержит подстроку (LIKE '%value%')
- `'NAME': 'value'` - точное совпадение
- Работает как в `CIBlockElement::GetList`

**Источник:** `mcp__b24-dev-mcp__bitrix-method-details` - entity.item.get

---

#### TaskProcessMapping вместо UF полей
**Проблема:** Пользовательские поля требуют прав администратора

**Решение:** Хранить маппинг в Entity Storage NAME
```javascript
// Задача 152 создана из процесса 151
// NAME: process_151_node_task-152
//
// TaskProcessMapping.getProcessId(152) => 151
```

**Преимущества:**
- ✅ Не требует прав администратора
- ✅ Работает с существующими данными
- ✅ Быстро (использует FILTER)
- ✅ Не нужно обновлять задачи в Bitrix24

---

### Текущее состояние проекта

#### Рабочие функции:
- ✅ Создание предзадач
- ✅ Редактирование предзадач
- ✅ Удаление предзадач
- ✅ Создание связей
- ✅ Валидация связей
- ✅ Автоматическое создание задач
- ✅ Скрытие созданных предзадач
- ✅ Перенаправление связей
- ✅ Real-time обновление статусов
- ✅ Общее полотно для связанных задач ⭐ НОВОЕ
- ✅ Список процессов с удалением ⭐ НОВОЕ
- ✅ Быстрая загрузка (FILTER) ⭐ НОВОЕ

#### Файлы, изменённые в этой сессии:
- `components/EntityManagerV2.js` - FILTER для loadProcess и getAllProcesses
- `components/ProcessManager.js` - NEW: UI управления процессами
- `components/TaskProcessMapping.js` - NEW: Поиск processId из Entity Storage
- `components/FlowCanvasV2.js` - Кнопка "Список процессов"
- `handler.php` - Использование TaskProcessMapping

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
