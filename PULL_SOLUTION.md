# Портативное PULL решение для Telegsarflow

## Проблема
Изначально пытались использовать кастомный WebSocket сервер на Node.js для real-time обновлений.
**Проблема**: Это не работает для маркетплейса - каждому клиенту нужно устанавливать Node.js, настраивать nginx, запускать процесс.

## Решение
Используем **только встроенные механизмы Bitrix24**:

### 1. Backend (event_handlers.php)
```php
use Bitrix\Pull\Event;

Event::add($userId, [
    'module_id' => 'telegsarflow',
    'command' => 'task_status_changed',
    'params' => [
        'TASK_ID' => (int)$taskId,
        'STATUS' => (int)$status,
        ...
    ]
]);
```

### 2. Frontend (handler.php)
Три способа подключения PULL с автоматическим fallback:

**Способ 1**: Родительский BX.PULL (работает в iframe)
```javascript
const parentBX = window.parent.BX;
if (parentBX && parentBX.PULL) {
    parentBX.PULL.subscribe({
        moduleId: 'telegsarflow',
        callback: handlePullEvent
    });
}
```

**Способ 2**: Кастомные события (для совместимости)
```javascript
BX.addCustomEvent("onPullEvent-telegsarflow", function(command, params) {
    handlePullEvent({ command, params });
});
```

**Способ 3**: Fallback на polling (если PULL не работает)
```javascript
// Опрос каждые 30 секунд
setInterval(checkTaskStatus, 30000);
```

## Преимущества

✅ **Портативность** - работает на любом Bitrix24 box без настройки
✅ **Нет зависимостей** - не нужен Node.js, WebSocket, nginx
✅ **Автоматический fallback** - если PULL не работает → переходит на polling
✅ **Готово для маркетплейса** - установил и работает
✅ **Визуальная индикация** - показывает режим работы (PULL/Polling)

## Как работает

1. При изменении задачи срабатывает `OnTaskUpdate`
2. Backend отправляет событие через `Event::add()` нужным пользователям
3. Frontend получает событие через BX.PULL (или polling)
4. Карточка задачи обновляется мгновенно с новым цветом статуса

## Цветовая схема статусов

- 🟢 **Зелёный** - Завершена (status 5)
- 🔴 **Красный** - Отклонена (status 7)
- 🟠 **Оранжевый** - Ждёт контроля (status 4)
- 🔵 **Синий** - Выполняется (status 3)
- ⚪ **Серый** - Новая/Ждёт/Отложена (status 1,2,6)

## Стиль карточек

Используются стили канбан-карточек Bitrix24:
- Цветная полоса слева (border-left)
- Компактные badges для статуса и ID
- Информация об ответственном и дедлайне
- Hover эффекты и тени

## Для маркетплейса

Это решение **полностью готово для маркетплейса**:
- Не требует дополнительной настройки сервера
- Работает в облаке и в коробке
- Автоматически выбирает лучший способ PULL
- Graceful degradation до polling если PULL недоступен
