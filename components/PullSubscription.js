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
        BX24.callMethod('tasks.task.get', {
            taskId: taskId,
            select: ['ID', 'TITLE', 'STATUS', 'REAL_STATUS']
        }, (result) => {
            if (result.error()) {
                console.error('❌ Ошибка получения задачи:', result.error());
                return;
            }
            
            const taskData = result.data();
            if (taskData && taskData.task) {
                const newStatus = taskData.task.status;
                const realStatus = taskData.task.real_status;
                
                console.log('📊 Статус задачи:', newStatus, '(real:', realStatus, ')');
                
                // Вызываем callback изменения статуса
                if (onStatusChange) {
                    onStatusChange(newStatus, taskData.task);
                }
                
                // Проверяем завершение (статус 5 = Завершена)
                if (newStatus == 5 && onTaskComplete) {
                    console.log('✅ Задача завершена! Вызываем callback...');
                    onTaskComplete(taskId, taskData.task);
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
