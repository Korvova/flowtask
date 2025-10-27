# План: Рекурсивная загрузка всех связанных задач

## Текущее поведение
- Загружается только **одна** задача (текущая)
- Загружаются её предзадачи (future tasks)
- Если предзадача создана (isCreated=true), загружается как реальная задача

## Требуемое поведение
Когда открываем любую задачу, нужно видеть ВСЁ дерево связанных задач:
- Все родительские задачи слева (которые ведут к текущей)
- Все дочерние задачи справа (которые исходят из текущей)
- Предзадачи (серые, ещё не созданные)
- Связи между всеми задачами

## Структура данных

### Entity: `tflow_conn` (связи)
```json
{
  "sourceId": "task-123" | "future-456",
  "targetId": "task-789" | "future-101",
  "connectionType": "task" | "future",
  "parentTaskId": 123
}
```

### Entity: `tflow_future` (предзадачи)
```json
{
  "futureId": "future-1234567890",
  "parentTaskId": 123,
  "title": "Название",
  "description": "Описание",
  "responsibleId": 1,
  "groupId": 0,
  "conditionType": "immediately" | "delay" | "ifCancel_create",
  "delayMinutes": 0,
  "positionX": 400,
  "positionY": 300,
  "isCreated": false,
  "realTaskId": null | 789
}
```

### Entity: `tflow_pos` (позиции задач)
```json
{
  "taskId": "123",
  "positionX": 250,
  "positionY": 100
}
```

## Алгоритм рекурсивной загрузки

### 1. Функция `loadAllConnectedTasks(startTaskId)`

```javascript
const loadAllConnectedTasks = async (startTaskId) => {
    const loadedTaskIds = new Set(); // Чтобы не загружать дважды
    const allNodes = [];
    const allEdges = [];

    // Рекурсивная функция обхода
    const traverse = async (taskId, visited = new Set()) => {
        if (visited.has(taskId)) return; // Избегаем циклов
        visited.add(taskId);
        loadedTaskIds.add(taskId);

        // 1. Загружаем задачу
        const taskNode = await loadTaskNode(taskId);
        if (taskNode) allNodes.push(taskNode);

        // 2. Загружаем позицию
        const position = await loadTaskPosition(taskId);
        if (position && taskNode) {
            taskNode.position = position;
        }

        // 3. Загружаем все связи ГДЕ эта задача = source ИЛИ target
        const connections = await loadConnectionsForTask(taskId);

        for (const conn of connections) {
            allEdges.push(createEdge(conn));

            // 4. Рекурсивно загружаем связанные задачи
            const connData = JSON.parse(conn.DETAIL_TEXT);

            if (connData.sourceId.startsWith('task-')) {
                const sourceTaskId = parseInt(connData.sourceId.replace('task-', ''));
                if (!visited.has(sourceTaskId)) {
                    await traverse(sourceTaskId, visited);
                }
            }

            if (connData.targetId.startsWith('task-')) {
                const targetTaskId = parseInt(connData.targetId.replace('task-', ''));
                if (!visited.has(targetTaskId)) {
                    await traverse(targetTaskId, visited);
                }
            } else if (connData.targetId.startsWith('future-')) {
                // Загружаем предзадачу
                const futureTask = await loadFutureTask(connData.targetId);
                if (futureTask) {
                    if (futureTask.isCreated && futureTask.realTaskId) {
                        // Предзадача создана - загружаем как реальную задачу
                        await traverse(futureTask.realTaskId, visited);
                    } else {
                        // Предзадача ещё не создана - показываем серой
                        allNodes.push(createFutureNode(futureTask));
                    }
                }
            }
        }

        // 5. Загружаем предзадачи этой задачи (parentTaskId == taskId)
        const futureTasks = await loadFutureTasks(taskId);
        for (const ft of futureTasks) {
            if (ft.isCreated && ft.realTaskId) {
                await traverse(ft.realTaskId, visited);
            } else {
                allNodes.push(createFutureNode(ft));
            }
        }
    };

    await traverse(startTaskId);

    return { nodes: allNodes, edges: allEdges };
};
```

### 2. Новые вспомогательные функции

#### `loadConnectionsForTask(taskId)`
```javascript
// Загружает ВСЕ связи где задача участвует (source ИЛИ target)
BX24.callMethod('entity.item.get', {
    ENTITY: 'tflow_conn'
}, (result) => {
    const items = result.data();
    return items.filter(item => {
        const data = JSON.parse(item.DETAIL_TEXT);
        return data.sourceId === 'task-' + taskId ||
               data.targetId === 'task-' + taskId ||
               data.sourceId.includes('future-') ||
               data.targetId.includes('future-');
    });
});
```

#### `loadTaskNode(taskId)`
```javascript
// Загружает данные задачи через tasks.task.get
BX24.callMethod('tasks.task.get', {
    taskId: taskId,
    select: ['ID', 'TITLE', 'STATUS', 'RESPONSIBLE_ID', 'GROUP_ID']
}, ...);
```

#### `loadFutureTask(futureId)`
```javascript
// Загружает одну предзадачу по futureId
BX24.callMethod('entity.item.get', {
    ENTITY: 'tflow_future'
}, (result) => {
    const items = result.data();
    return items.find(item => {
        const data = JSON.parse(item.DETAIL_TEXT);
        return data.futureId === futureId;
    });
});
```

## Проблемы и решения

### Проблема 1: Циклические зависимости
**Решение**: Используем `Set` для отслеживания посещённых задач

### Проблема 2: Множественные загрузки одной задачи
**Решение**: Проверяем `visited` перед загрузкой

### Проблема 3: Расположение задач (layout)
**Решение**: Используем сохранённые позиции из `tflow_pos`, если нет - автоматический layout

### Проблема 4: Производительность при большом дереве
**Решение**:
- Ограничение глубины рекурсии (максимум 5 уровней?)
- Lazy loading - загружать по клику на узел
- Показывать спиннер во время загрузки

## Этапы реализации

1. ✅ **Этап 1**: Исправить создание задач из предзадач (ГОТОВО)
2. ⏳ **Этап 2**: Реализовать рекурсивную загрузку
3. ⏳ **Этап 3**: Добавить автоматический layout если нет позиций
4. ⏳ **Этап 4**: Оптимизация и lazy loading

## Следующие шаги

1. Создать функцию `loadAllConnectedTasks()`
2. Заменить `loadProcessData()` на вызов новой функции
3. Тестировать на дереве задач
4. Добавить индикатор загрузки
5. Оптимизировать если медленно
