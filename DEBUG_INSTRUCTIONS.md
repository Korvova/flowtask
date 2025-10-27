# Debug Instructions - Future Task Disappearing Issue

## Latest Changes (2025-10-27 v=1761572194)

### Fixed Two Critical Issues:

**1. Pull Subscription Closure Fix**
- Fixed closure problem in PullSubscription.js where all handlers used the last subscribed taskId
- Now each subscription has its own closure-preserved taskId
- Status changes on task-71 should now update colors on task-70's canvas

**2. Parent Task Loading**
- Modified loadConnections to accept parentId parameter
- When task has PARENT_ID, now loads:
  - Parent task node
  - Parent's future tasks (предзадачи)
  - Parent's connections
- task-71 should now see processes from parent task-70

### Testing Instructions:

**Test 1: Pull Subscription (Real-time Color Updates)**
1. Open task-70: https://test.test-rms.ru/company/personal/user/1/tasks/task/view/70/
2. Open "Процессы" tab
3. You should see task-71 as a subtask (подзадача) on the canvas
4. In another browser tab, open task-71 and change its status
5. **Expected**: task-71's card color should change on task-70's canvas in real-time
6. Check console for: `✅ Событие PULL для задачи: 71`

**Test 2: Parent Task Loading**
1. Open task-71: https://test.test-rms.ru/company/personal/user/1/tasks/task/view/71/
2. Open "Процессы" tab
3. **Expected**: Should now see parent task-70 and its future tasks/connections
4. Check console for:
   - `🔼 Текущая задача имеет родителя: task-70`
   - `➕ Добавлена родительская задача: 70`
   - `📋 Предзадач у родителя: X`

## Previous Changes (2025-10-27)

I've added comprehensive console logging to track the entire workflow when a task is completed.

### Updated Files:
1. **TaskCreator.js** - Added detailed colored console logs to track task creation
2. **PullSubscription.js** - Added logs to track when task completion is detected
3. **FlowCanvas.js** - Already had good logging for loading created tasks
4. **handler.php** - Updated version to v=1761563702

## How to Test

1. **Open the task page** in Bitrix24:
   - URL: https://test.test-rms.ru/company/personal/user/1/tasks/task/view/38/
   - Open the "Процессы" tab (Flowtask app)

2. **Open browser console** (F12) and keep it visible

3. **Create a future task** (if not already created):
   - Drag from the main task to empty space
   - Set condition to "immediately" (➡️ Сразу)
   - Save the future task

4. **Complete the main task** (task #38)

## What to Look For in Console

The console will show a detailed trace with colored logs. Here's what SHOULD happen:

### Step 1: Task Completion Detection
```
🔄 fetchTaskData вызван для задачи: 38
📊 Текущий статус задачи #38: 5 (real: 5)
✅✅✅ ЗАДАЧА ЗАВЕРШЕНА (status=5)!
  → Вызываем onTaskComplete callback...
```

### Step 2: Processing Completed Task
```
🚀 НАЧАЛО: processCompletedTask для задачи: 38
📊 Найдено связей от задачи #38: 1
📋 Список связей:
  → task-38 → future-1234567890 (type: future)
```

### Step 3: Checking Future Task
```
🔍 Обрабатываем связь: task-38 → future-1234567890
  ✅ Это предзадача! Загружаем данные...
  📦 Данные предзадачи: {futureId: "future-1234567890", title: "...", ...}
    • isCreated: false
    • realTaskId: null
    • conditionType: immediately
```

### Step 4: Creating Real Task
```
  🚀 Задача НЕ создана, проверяем условие и создаём...
📝 createRealTask: Создаём реальную задачу: [название]
  Параметры: {title: "...", responsibleId: ..., ...}
✅✅✅ ЗАДАЧА СОЗДАНА ЧЕРЕЗ tasks.task.add! ID: 123
```

### Step 5: Marking Future as Created
```
  📝 Шаг 1: Помечаем предзадачу как созданную (isCreated=true, realTaskId=123)
    🏷️  markFutureAsCreated вызван: {entityId: ..., futureId: ..., realTaskId: 123}
    📦 Обновляем Entity с данными: {isCreated: true, realTaskId: 123, ...}
    ✅✅ Entity обновлён! isCreated=true, realTaskId=123
  ✅ Шаг 1 ЗАВЕРШЁН: Предзадача помечена как созданная
```

### Step 6: Creating Connections
```
  📝 Шаг 2: Создаём связи для новой задачи
  ✅ Шаг 2 ЗАВЕРШЁН: Связь создана для новой задачи
✅✅✅ createRealTask ПОЛНОСТЬЮ ЗАВЕРШЁН для ID: 123
```

### Step 7: Reloading Canvas
```
✅ ИТОГО создано задач: 1
📋 Список созданных задач:
  → future-1234567890 → task ID: 123
🔄 Перезагружаем полотно...
🔍 Всего загружено предзадач: 1
  → future-1234567890 | isCreated=true | realTaskId=123
✅ Предзадача уже создана: future-1234567890 → task-123
📥 Загружаем созданные задачи: [123]
✅ Загружена созданная задача: 123 [название]
```

## Possible Issues to Check

### Issue 1: onTaskComplete Not Called
**Look for:**
```
✅✅✅ ЗАДАЧА ЗАВЕРШЕНА (status=5)!
  ⚠️  onTaskComplete callback НЕ ОПРЕДЕЛЁН!
```
**Cause:** PullSubscription callback not properly registered

### Issue 2: No Connections Found
**Look for:**
```
📊 Найдено связей от задачи #38: 0
⚠️  Нет связей для обработки - выходим
```
**Cause:** Connection entity not saved properly, or sourceId mismatch

### Issue 3: Future Task Already Created
**Look for:**
```
  • isCreated: true
  • realTaskId: 456
  ⏭️  Задача УЖЕ создана (isCreated=true), пропускаем
```
**Cause:** Entity already marked as created from previous test

### Issue 4: Entity Update Failed
**Look for:**
```
❌ entity.item.update ERROR: [error message]
```
**Cause:** Bitrix24 API error, permissions, or entity structure issue

### Issue 5: Canvas Not Reloading
**Look for:** All steps complete but canvas still shows grey future task
**Cause:** loadProcessData not being called, or React state not updating

## Next Steps Based on Logs

1. **If no logs appear:** Check if scripts are loading (look for "TaskCreator component loaded" etc.)
2. **If task completion not detected:** Check PullSubscription setup
3. **If Entity not updating:** Check API response for errors
4. **If canvas not refreshing:** Check setTimeout delay or React state updates

## Clearing Test Data

To reset and test again:
1. Use "Проверить предзадачи" button to view Entity data
2. Manually delete future task entities with isCreated=true
3. Or change task status back to "In Progress" to test again
