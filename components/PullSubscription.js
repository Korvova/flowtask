/**
 * PullSubscription - Компонент для подписки на события через BX.PullClient
 * Отслеживает изменения задач в реальном времени через Push & Pull
 */
window.PullSubscription = {
    subscriptions: {},
    lastStatuses: {}, // Кэш последних статусов для проверки изменений
    pullClient: null, // Глобальный клиент BX.PullClient
    isInitialized: false,

    /**
     * Инициализация BX.PullClient (один раз при загрузке)
     */
    initPullClient: function() {
        if (this.isInitialized) {
            console.log('✅ BX.PullClient уже инициализирован');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            console.log('🔧 Инициализация BX.PullClient...');

            // Проверяем доступность BX.PullClient
            if (typeof BX === 'undefined' || typeof BX.PullClient === 'undefined') {
                console.error('❌ BX.PullClient недоступен! Проверьте подключение библиотеки.');
                reject(new Error('BX.PullClient not available'));
                return;
            }

            try {
                // Создаём клиент BX.PullClient для приложения
                this.pullClient = new BX.PullClient({
                    restClient: BX24
                });

                console.log('✅ BX.PullClient создан');

                // Подписываемся на custom команду от нашего webhook
                this.pullClient.subscribe({
                    type: BX.PullClient.SubscriptionType.Server,
                    moduleId: 'application',
                    command: 'flowtask_task_updated',
                    callback: this.handlePullEvent.bind(this)
                });

                console.log('✅ Подписка на flowtask_task_updated установлена');

                // Запускаем клиент
                this.pullClient.start();
                console.log('✅ BX.PullClient запущен');

                // Добавляем в DEBUG LOG
                if (window.FlowCanvas && window.FlowCanvas.addDebugLog) {
                    window.FlowCanvas.addDebugLog('📡 Pull & Push ПОДКЛЮЧЕН', '#00ff00');
                }

                this.isInitialized = true;
                resolve();

            } catch (error) {
                console.error('❌ Ошибка инициализации BX.PullClient:', error);
                reject(error);
            }
        });
    },

    /**
     * Обработчик Pull событий
     */
    handlePullEvent: function(data) {
        console.log('%c📨 PULL событие получено!', 'color: #00ff00; font-weight: bold; font-size: 14px;', data);

        // Добавляем в DEBUG LOG
        if (window.FlowCanvas && window.FlowCanvas.addDebugLog) {
            window.FlowCanvas.addDebugLog('📨 PULL событие: ' + (data.command || 'unknown'), '#00bcd4');
        }

        // Проверяем что это наше событие flowtask_task_updated
        if (data.command !== 'flowtask_task_updated') {
            console.log('⏭️ Не наше событие, пропускаем');
            return;
        }

        // Извлекаем данные из params
        const eventTaskId = data.params?.taskId;
        const statusBefore = data.params?.statusBefore;
        const statusAfter = data.params?.statusAfter;

        if (!eventTaskId) {
            console.warn('⚠️ Не удалось извлечь ID задачи из события:', data);
            return;
        }

        console.log('📋 Событие для задачи #' + eventTaskId + ', статус: ' + statusBefore + ' → ' + statusAfter);

        // Проверяем, подписаны ли мы на эту задачу
        const subscription = this.subscriptions[eventTaskId];
        if (!subscription) {
            console.log('⏭️ Не подписаны на задачу #' + eventTaskId + ', пропускаем');
            return;
        }

        console.log('%c✅ Это наша задача! Загружаем данные...', 'color: #00ff00; font-weight: bold;');

        // Добавляем в DEBUG LOG
        if (window.FlowCanvas && window.FlowCanvas.addDebugLog) {
            window.FlowCanvas.addDebugLog('🔄 Обновление задачи #' + eventTaskId + ' (' + statusBefore + ' → ' + statusAfter + ')', '#4caf50');
        }

        // Загружаем актуальные данные задачи
        this.fetchTaskData(
            eventTaskId,
            subscription.onStatusChange,
            subscription.onTaskComplete,
            false
        );
    },

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

        // Сохраняем подписку
        this.subscriptions[taskId] = {
            type: 'pending',
            onStatusChange: onStatusChange,
            onTaskComplete: onTaskComplete
        };

        // Инициализируем PullClient если доступен
        if (!this.isInitialized) {
            this.initPullClient()
                .then(() => {
                    console.log('✅ Подписка на задачу #' + taskId + ' через BX.PullClient');
                    this.fetchTaskData(taskId, onStatusChange, onTaskComplete, true);
                })
                .catch((error) => {
                    console.warn('⚠️ BX.PullClient недоступен для задачи #' + taskId + ', используем polling');
                    delete this.subscriptions[taskId];
                    this.startPolling(taskId, onStatusChange, onTaskComplete);
                });
        } else {
            // PullClient уже инициализирован
            console.log('✅ Подписка на задачу #' + taskId + ' через уже запущенный BX.PullClient');
            this.fetchTaskData(taskId, onStatusChange, onTaskComplete, true);
        }
    },

    /**
     * Fallback: polling для случаев когда BX.PullClient недоступен
     */
    startPolling: function(taskId, onStatusChange, onTaskComplete, interval = 3000) {
        console.log('⏱️ Запускаем fallback polling для задачи:', taskId, 'интервал:', interval + 'мс');

        // Получаем начальный статус
        this.fetchTaskData(taskId, onStatusChange, onTaskComplete, true);

        // Затем проверяем с заданным интервалом
        const pollInterval = setInterval(() => {
            this.fetchTaskData(taskId, onStatusChange, onTaskComplete, false);
        }, interval);

        // Сохраняем подписку
        this.subscriptions[taskId] = {
            interval: pollInterval,
            onStatusChange: onStatusChange,
            onTaskComplete: onTaskComplete,
            type: 'polling'
        };

        console.log('✅ Polling запущен для задачи:', taskId);
    },

    /**
     * Загрузка актуальных данных задачи
     * @param {boolean} initial - Первый вызов (не логировать изменения)
     */
    fetchTaskData: function(taskId, onStatusChange, onTaskComplete, initial = false) {
        if (!initial) {
            console.log('%c🔄 fetchTaskData вызван для задачи:', 'color: #2196f3; font-weight: bold;', taskId);
        }

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

                if (!initial) {
                    console.log('%c📊 Текущий статус задачи #' + taskId + ':', 'color: #2196f3; font-weight: bold;', newStatus, '(real:', realStatus, ') предыдущий:', lastStatus);
                }

                // Для initial вызова просто сохраняем статус без callbacks
                if (initial) {
                    this.lastStatuses[taskId] = newStatus;
                    console.log('✅ Начальный статус задачи #' + taskId + ' сохранён:', newStatus);
                    return;
                }

                // Проверяем, изменился ли статус
                const statusChanged = lastStatus !== undefined && lastStatus !== newStatus;

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
            console.warn('⚠️ Подписка не найдена для задачи:', taskId);
            return;
        }

        if (subscription.type === 'pull') {
            // Для pull просто удаляем из subscriptions
            // Глобальная подписка на tasks остаётся активной
            console.log('🔕 Удаляем подписку на задачу #' + taskId + ' (PULL)');

        } else if (subscription.type === 'polling') {
            // Останавливаем polling
            clearInterval(subscription.interval);
            console.log('🔕 Остановлен polling для задачи:', taskId);
        }

        delete this.subscriptions[taskId];
        delete this.lastStatuses[taskId];
    },

    /**
     * Отписка от всех событий
     */
    unsubscribeAll: function() {
        console.log('🧹 Очистка всех подписок...');

        Object.keys(this.subscriptions).forEach(taskId => {
            this.unsubscribe(taskId);
        });

        // Останавливаем PullClient если был запущен
        if (this.pullClient && this.isInitialized) {
            try {
                this.pullClient.stop();
                console.log('🔴 BX.PullClient остановлен');
            } catch (error) {
                console.error('❌ Ошибка остановки BX.PullClient:', error);
            }
            this.isInitialized = false;
        }
    }
};

console.log('✅ PullSubscription component loaded');
