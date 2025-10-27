/**
 * PullSubscription - Компонент для подписки на события BX.PULL
 * Отслеживает изменения статуса задачи в реальном времени
 */
window.PullSubscription = {
    subscriptions: {},
    
    /**
     * Подписка на изменения задачи
     * @param {number} taskId - ID задачи
     * @param {function} onStatusChange - Callback при изменении статуса
     * @param {function} onTaskComplete - Callback при завершении задачи
     */
    subscribe: function(taskId, onStatusChange, onTaskComplete) {
        console.log('🔔 Подписываемся на события задачи:', taskId);
        
        // Проверяем доступность BX.PULL
        if (typeof BX === 'undefined' || typeof BX.PULL === 'undefined') {
            console.warn('⚠️  BX.PULL недоступен, используем fallback polling');
            return this.startPolling(taskId, onStatusChange, onTaskComplete);
        }
        
        // Создаём обработчик событий
        const pullHandler = (data) => {
            console.log('📨 Получено событие PULL:', data.command);
            
            // Обрабатываем события задач
            if (data.command === 'task_update' || 
                data.command === 'comment_add' || 
                data.command === 'task_add') {
                
                // Проверяем что это наша задача
                const eventTaskId = data.params?.TASK_ID || data.params?.ID;
                
                if (eventTaskId == taskId) {
                    console.log('✅ Событие для нашей задачи:', taskId);
                    
                    // Загружаем актуальные данные задачи
                    this.fetchTaskData(taskId, onStatusChange, onTaskComplete);
                }
            }
        };
        
        // Подписываемся на модуль tasks
        BX.PULL.subscribe({
            moduleId: 'tasks',
            callback: pullHandler
        });
        
        // Сохраняем подписку для отписки
        this.subscriptions[taskId] = {
            handler: pullHandler,
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

                console.log('%c📊 Текущий статус задачи #' + taskId + ':', 'color: #2196f3; font-weight: bold;', newStatus, '(real:', realStatus, ')');

                // Вызываем callback изменения статуса
                if (onStatusChange) {
                    console.log('%c  → Вызываем onStatusChange callback', 'color: #9c27b0;');
                    onStatusChange(newStatus, taskData.task);
                }

                // Проверяем завершение (статус 5 = Завершена)
                if (newStatus == 5) {
                    console.log('%c✅✅✅ ЗАДАЧА ЗАВЕРШЕНА (status=5)!', 'color: #00ff00; font-size: 16px; font-weight: bold;');
                    if (onTaskComplete) {
                        console.log('%c  → Вызываем onTaskComplete callback...', 'color: #00ff00; font-weight: bold;');
                        onTaskComplete(taskId, taskData.task);
                    } else {
                        console.warn('%c  ⚠️  onTaskComplete callback НЕ ОПРЕДЕЛЁН!', 'color: #ff9800; font-weight: bold;');
                    }
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
