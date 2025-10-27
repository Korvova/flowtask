/**
 * PullSubscription - Компонент для подписки на события BX.PULL
 * Отслеживает изменения статуса задачи в реальном времени
 */
window.PullSubscription = {
    subscriptions: {},
    lastStatuses: {}, // Кэш последних статусов для проверки изменений
    
    /**
     * Подписка на изменения задачи
     * @param {number} taskId - ID задачи
     * @param {function} onStatusChange - Callback при изменении статуса
     * @param {function} onTaskComplete - Callback при завершении задачи
     */
    subscribe: function(taskId, onStatusChange, onTaskComplete) {
        console.log('🔔 Подписываемся на события задачи:', taskId);

        // Проверяем, не подписаны ли мы уже на эту задачу
        if (this.subscriptions[taskId]) {
            console.log('⏭️ Уже подписаны на задачу:', taskId);
            return;
        }

        // Проверяем доступность BX.PULL
        console.log('🔍 Проверка BX:', typeof BX !== 'undefined' ? 'OK' : 'FAIL');
        console.log('🔍 Проверка BX.PULL:', typeof BX !== 'undefined' && typeof BX.PULL !== 'undefined' ? 'OK' : 'FAIL');

        if (typeof BX === 'undefined' || typeof BX.PULL === 'undefined') {
            console.warn('⚠️  BX.PULL недоступен, используем fallback polling');
            return this.startPolling(taskId, onStatusChange, onTaskComplete);
        }

        console.log('✅ BX.PULL доступен, используем PULL подписку');

        // ВАЖНО: Создаём замыкание для сохранения taskId, onStatusChange, onTaskComplete
        const createHandler = (tid, onStatus, onComplete) => {
            return (data) => {
                console.log('📨 PULL событие получено:', {
                    command: data.command,
                    taskId: data.params?.TASK_ID || data.params?.ID,
                    watchingFor: tid,
                    fullData: data
                });

                // Обрабатываем события задач
                if (data.command === 'task_update' ||
                    data.command === 'comment_add' ||
                    data.command === 'task_add') {

                    // Проверяем что это наша задача
                    const eventTaskId = data.params?.TASK_ID || data.params?.ID;

                    console.log('🔍 Сравнение: событие=' + eventTaskId + ' ожидаем=' + tid + ' совпадает=' + (eventTaskId == tid));

                    if (eventTaskId == tid) {
                        console.log('✅ Событие PULL для задачи:', tid, 'команда:', data.command);

                        // Загружаем актуальные данные задачи
                        this.fetchTaskData(tid, onStatus, onComplete);
                    }
                }
            };
        };

        const pullHandler = createHandler(taskId, onStatusChange, onTaskComplete);

        // Подписываемся на модуль tasks
        BX.PULL.subscribe({
            moduleId: 'tasks',
            callback: pullHandler
        });

        // Сохраняем подписку для отписки
        this.subscriptions[taskId] = {
            handler: pullHandler,
            onStatusChange: onStatusChange,
            onTaskComplete: onTaskComplete,
            type: 'pull'
        };

        console.log('✅ Подписка на BX.PULL установлена для задачи:', taskId);
    },
    
    /**
     * Fallback: polling для случаев когда BX.PULL недоступен
     */
    startPolling: function(taskId, onStatusChange, onTaskComplete) {
        console.log('⏱️  Запускаем polling для задачи:', taskId);
        
        const pollInterval = setInterval(() => {
            this.fetchTaskData(taskId, onStatusChange, onTaskComplete);
        }, 5000); // Каждые 5 секунд
        
        // Сохраняем подписку
        this.subscriptions[taskId] = {
            interval: pollInterval,
            type: 'polling'
        };
        
        return pollInterval;
    },
    
    /**
     * Загрузка актуальных данных задачи
     */
    fetchTaskData: function(taskId, onStatusChange, onTaskComplete) {
        console.log('%c🔄 fetchTaskData вызван для задачи:', 'color: #2196f3; font-weight: bold;', taskId);

        BX24.callMethod('tasks.task.get', {
            taskId: taskId,
            select: ['ID', 'TITLE', 'STATUS', 'REAL_STATUS']
        }, (result) => {
            if (result.error()) {
                console.error('%c❌ tasks.task.get ERROR:', 'color: #f44336; font-weight: bold;', result.error());
                return;
            }

            const taskData = result.data();
            if (taskData && taskData.task) {
                const newStatus = taskData.task.status;
                const realStatus = taskData.task.real_status;
                const lastStatus = this.lastStatuses[taskId];

                console.log('%c📊 Текущий статус задачи #' + taskId + ':', 'color: #2196f3; font-weight: bold;', newStatus, '(real:', realStatus, ') предыдущий:', lastStatus);

                // Проверяем, изменился ли статус
                const statusChanged = lastStatus !== newStatus;

                if (!statusChanged) {
                    console.log('%c  ⏭️ Статус не изменился, пропускаем callbacks', 'color: #9e9e9e;');
                    return;
                }

                // Сохраняем новый статус
                this.lastStatuses[taskId] = newStatus;

                // Вызываем callback изменения статуса
                if (onStatusChange) {
                    console.log('%c  → Вызываем onStatusChange callback (статус изменился: ' + lastStatus + ' → ' + newStatus + ')', 'color: #9c27b0;');
                    onStatusChange(newStatus, taskData.task);
                }

                // Проверяем завершение (статус 5 = Завершена) И это НОВОЕ завершение
                if (newStatus == 5 && lastStatus != 5) {
                    console.log('%c✅✅✅ ЗАДАЧА ЗАВЕРШЕНА (status=5)!', 'color: #00ff00; font-size: 16px; font-weight: bold;');
                    if (onTaskComplete) {
                        console.log('%c  → Вызываем onTaskComplete callback...', 'color: #00ff00; font-weight: bold;');
                        onTaskComplete(taskId, taskData.task);
                    } else {
                        console.warn('%c  ⚠️  onTaskComplete callback НЕ ОПРЕДЕЛЁН!', 'color: #ff9800; font-weight: bold;');
                    }
                } else if (newStatus == 5) {
                    console.log('%c  ⏭️ Задача уже была завершена ранее, пропускаем onTaskComplete', 'color: #9e9e9e;');
                } else {
                    console.log('%c  ℹ️  Задача ещё не завершена (status=' + newStatus + ')', 'color: #9c27b0;');
                }
            }
        });
    },
    
    /**
     * Отписка от событий
     */
    unsubscribe: function(taskId) {
        const subscription = this.subscriptions[taskId];
        
        if (!subscription) {
            console.warn('⚠️  Подписка не найдена для задачи:', taskId);
            return;
        }
        
        if (subscription.type === 'pull') {
            // Отписываемся от BX.PULL
            BX.PULL.unsubscribe('tasks', subscription.handler);
            console.log('🔕 Отписались от BX.PULL для задачи:', taskId);
            
        } else if (subscription.type === 'polling') {
            // Останавливаем polling
            clearInterval(subscription.interval);
            console.log('🔕 Остановлен polling для задачи:', taskId);
        }
        
        delete this.subscriptions[taskId];
    },
    
    /**
     * Отписка от всех событий
     */
    unsubscribeAll: function() {
        console.log('🧹 Очистка всех подписок...');
        
        Object.keys(this.subscriptions).forEach(taskId => {
            this.unsubscribe(taskId);
        });
    }
};

console.log('✅ PullSubscription component loaded');
