<?php
/**
 * Telegsarflow - ПОРТАТИВНАЯ версия для маркетплейса
 * Использует только встроенные механизмы Bitrix24
 * Работает и в облаке, и в коробке БЕЗ дополнительных настроек
 */
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Процессы Telegsarflow</title>
    <script src="//api.bitrix24.com/api/v1/"></script>

    <!-- React Flow для визуализации -->
    <script src="assets/js/react.min.js"></script>
    <script src="assets/js/react-dom.min.js"></script>
    <script src="assets/js/reactflow.min.js"></script>
    <link rel="stylesheet" href="assets/css/reactflow.css">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 20px;
            background: #f5f7fa;
        }
        .content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            font-size: 24px;
            color: #333;
            margin-bottom: 20px;
        }

        /* Используем стили канбан-карточки Bitrix24 */
        .bitrix-task-card {
            background: white;
            border-radius: 8px;
            padding: 12px;
            min-width: 200px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-left: 4px solid #10b981;
            transition: all 0.2s;
        }

        .bitrix-task-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }

        .bitrix-task-card.status-1,
        .bitrix-task-card.status-2 { border-left-color: #94a3b8; } /* Новая/Ждёт */
        .bitrix-task-card.status-3 { border-left-color: #3b82f6; } /* Выполняется */
        .bitrix-task-card.status-4 { border-left-color: #f59e0b; } /* Контроль */
        .bitrix-task-card.status-5 { border-left-color: #10b981; } /* Завершена */
        .bitrix-task-card.status-6 { border-left-color: #9ca3af; } /* Отложена */
        .bitrix-task-card.status-7 { border-left-color: #ef4444; } /* Отклонена */

        .task-card-title {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            word-wrap: break-word;
        }

        .task-card-meta {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            font-size: 12px;
            color: #666;
        }

        .task-status-badge {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            background: #f3f4f6;
            color: #6b7280;
        }

        .task-id-badge {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            background: #e0e7ff;
            color: #4f46e5;
            font-family: monospace;
        }

        .task-responsible {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
        }

        .task-deadline {
            font-size: 11px;
            color: #f59e0b;
        }

        .future-task-card {
            border-left-color: #9ca3af !important;
            opacity: 0.7;
            border-style: dashed;
            position: relative;
        }

        .future-task-card::before {
            content: '🎯';
            position: absolute;
            top: 5px;
            right: 5px;
            font-size: 16px;
        }

        .delete-btn {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ef4444;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            z-index: 10;
        }

        .react-flow__node:hover .delete-btn {
            display: flex;
        }

        #reactFlowContainer {
            width: 100%;
            height: 600px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fafafa;
            margin-top: 20px;
        }

        .pull-status {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 10px 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            font-size: 12px;
            z-index: 1000;
        }

        .pull-status.connected {
            border-left: 4px solid #10b981;
        }

        .pull-status.disconnected {
            border-left: 4px solid #ef4444;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1>⚡ Процессы задачи</h1>
        <div id="taskInfo">Загрузка...</div>
        <div id="reactFlowContainer"></div>
    </div>

    <!-- Статус PULL подключения -->
    <div class="pull-status disconnected" id="pullStatus">
        🔴 PULL отключен
    </div>

    <script>
        let currentTaskId = null;
        let pullConnected = false;

        BX24.init(function() {
            console.log('✅ Bitrix24 SDK инициализирован');

            // Получаем ID задачи
            const placement = BX24.placement.info();
            currentTaskId = placement?.options?.taskId ||
                           placement?.options?.TASK_ID ||
                           new URLSearchParams(window.location.search).get('taskId');

            if (!currentTaskId) {
                document.getElementById('taskInfo').innerHTML = '⚠️ ID задачи не найден';
                return;
            }

            console.log('📋 ID задачи:', currentTaskId);

            // Инициализируем PULL подключение через встроенный механизм Bitrix24
            initPullConnection();

            // Загружаем данные задачи и инициализируем интерфейс
            loadTaskAndInit();

            BX24.fitWindow();
        });

        // Инициализация PULL через встроенный механизм Bitrix24
        function initPullConnection() {
            try {
                // Пробуем получить доступ к родительскому BX (для iframe)
                const parentBX = window.parent && window.parent.BX ? window.parent.BX : null;

                if (parentBX && parentBX.PULL) {
                    console.log('✅ Используем родительский BX.PULL');

                    // Подписываемся на события PULL
                    parentBX.PULL.subscribe({
                        moduleId: 'telegsarflow',
                        callback: function(data) {
                            console.log('📬 PULL событие получено:', data);
                            handlePullEvent(data);
                        }
                    });

                    pullConnected = true;
                    updatePullStatus(true);

                } else if (typeof BX !== 'undefined' && BX.addCustomEvent) {
                    console.log('✅ Используем BX.addCustomEvent');

                    // Альтернативный способ через кастомные события
                    BX.addCustomEvent("onPullEvent-telegsarflow", function(command, params) {
                        console.log('📬 PULL событие (custom):', command, params);
                        handlePullEvent({ command, params });
                    });

                    pullConnected = true;
                    updatePullStatus(true);

                } else {
                    console.warn('⚠️ PULL не доступен, используем fallback polling');
                    // Запасной вариант - опрос каждые 30 секунд
                    setInterval(checkTaskStatus, 30000);
                }

            } catch (e) {
                console.error('❌ Ошибка инициализации PULL:', e);
                updatePullStatus(false);
                // Fallback - опрос
                setInterval(checkTaskStatus, 30000);
            }
        }

        // Обработка PULL событий
        function handlePullEvent(data) {
            const { command, params } = data;

            if (command === 'task_status_changed') {
                const taskId = params.TASK_ID;

                console.log(`🔔 Задача ${taskId} изменилась:`, params);

                // Обновляем карточку на canvas
                updateTaskCardOnCanvas(taskId, params);
            }
        }

        // Обновление статуса карточки на canvas
        function updateTaskCardOnCanvas(taskId, taskData) {
            // Эта функция будет вызвана из React Flow после его инициализации
            if (window.updateTaskCard) {
                window.updateTaskCard(taskId, taskData);
            }
        }

        // Fallback - проверка статуса задачи
        function checkTaskStatus() {
            if (!currentTaskId) return;

            BX24.callMethod('tasks.task.get', { taskId: currentTaskId }, function(result) {
                if (result.error()) {
                    console.error('Ошибка получения задачи:', result.error());
                } else {
                    const task = result.data();
                    console.log('🔄 Обновление задачи (polling):', task);
                    updateTaskCardOnCanvas(currentTaskId, {
                        STATUS: task.status,
                        TITLE: task.title
                    });
                }
            });
        }

        // Обновление индикатора PULL
        function updatePullStatus(connected) {
            const statusEl = document.getElementById('pullStatus');
            if (connected) {
                statusEl.className = 'pull-status connected';
                statusEl.textContent = '🟢 PULL подключен';
            } else {
                statusEl.className = 'pull-status disconnected';
                statusEl.textContent = '🟡 Polling режим';
            }
        }

        // Загрузка задачи и инициализация React Flow
        function loadTaskAndInit() {
            BX24.callMethod('tasks.task.get', { taskId: currentTaskId }, function(result) {
                if (result.error()) {
                    console.error('❌ Ошибка загрузки задачи:', result.error());
                    document.getElementById('taskInfo').innerHTML = '⚠️ Ошибка загрузки задачи';
                    return;
                }

                const task = result.data();
                console.log('✅ Задача загружена:', task);

                // Отображаем информацию
                document.getElementById('taskInfo').innerHTML = `
                    <strong>📋 ${task.title}</strong><br>
                    <small>Статус: ${getStatusName(task.status)} | ID: ${task.id}</small>
                `;

                // Инициализируем React Flow
                initReactFlow(task);
            });
        }

        // Получение имени статуса
        function getStatusName(statusCode) {
            const names = {
                '1': 'Новая',
                '2': 'Ждёт выполнения',
                '3': 'Выполняется',
                '4': 'Ждёт контроля',
                '5': 'Завершена',
                '6': 'Отложена',
                '7': 'Отклонена'
            };
            return names[statusCode] || 'Неизвестно';
        }

        // Инициализация React Flow с Bitrix-карточками
        function initReactFlow(task) {
            const { useState, useCallback } = React;
            const RF = window.ReactFlow || window.reactflow;

            if (!RF) {
                console.error('❌ React Flow не загружен');
                return;
            }

            const { ReactFlow: RFComponent, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges, Handle } = RF;

            // Кастомная нода в стиле Bitrix24 канбан-карточки
            const BitrixTaskCard = ({ id, data }) => {
                const isFuture = data.id === 'new';
                const statusCode = data.statusCode || '1';

                return React.createElement('div', {
                    className: `bitrix-task-card status-${statusCode} ${isFuture ? 'future-task-card' : ''}`,
                    style: { position: 'relative', minWidth: 220 }
                },
                    // Кнопка удаления для будущих задач
                    isFuture ? React.createElement('div', {
                        className: 'delete-btn',
                        onClick: (e) => {
                            e.stopPropagation();
                            if (data.onDelete) data.onDelete(id);
                        }
                    }, '×') : null,

                    // Handles
                    React.createElement(Handle, {
                        type: 'target',
                        position: 'left',
                        style: { background: '#667eea' }
                    }),

                    // Заголовок
                    React.createElement('div', { className: 'task-card-title' },
                        data.title
                    ),

                    // Метаданные
                    React.createElement('div', { className: 'task-card-meta' },
                        React.createElement('span', { className: 'task-status-badge' },
                            data.status
                        ),
                        React.createElement('span', { className: 'task-id-badge' },
                            `#${data.id}`
                        ),
                        data.responsibleName ? React.createElement('span', { className: 'task-responsible' },
                            '👤 ', data.responsibleName
                        ) : null,
                        data.deadline ? React.createElement('span', { className: 'task-deadline' },
                            '⏰ ', data.deadline
                        ) : null
                    ),

                    React.createElement(Handle, {
                        type: 'source',
                        position: 'right',
                        style: { background: '#667eea' }
                    })
                );
            };

            const nodeTypes = { custom: BitrixTaskCard };

            const initialNodes = [{
                id: `task-${task.id}`,
                type: 'custom',
                position: { x: 250, y: 100 },
                data: {
                    title: task.title,
                    status: getStatusName(task.status),
                    statusCode: task.status,
                    id: task.id,
                    responsibleName: task.responsibleName || '',
                    deadline: task.deadline || ''
                }
            }];

            // Основной компонент
            function FlowComponent() {
                const [nodes, setNodes] = useState(initialNodes);
                const [edges, setEdges] = useState([]);

                const onNodesChange = useCallback((changes) => {
                    setNodes((nds) => applyNodeChanges(changes, nds));
                }, []);

                const onEdgesChange = useCallback((changes) => {
                    setEdges((eds) => applyEdgeChanges(changes, eds));
                }, []);

                const onConnect = useCallback((params) => {
                    setEdges((eds) => addEdge(params, eds));
                }, []);

                // Глобальная функция для обновления карточки через PULL
                window.updateTaskCard = useCallback((taskId, taskData) => {
                    setNodes((nds) => nds.map(node => {
                        if (node.data.id == taskId) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    status: getStatusName(taskData.STATUS),
                                    statusCode: taskData.STATUS,
                                    title: taskData.TITLE || node.data.title
                                }
                            };
                        }
                        return node;
                    }));
                }, []);

                return React.createElement(RFComponent, {
                    nodes,
                    edges,
                    onNodesChange,
                    onEdgesChange,
                    onConnect,
                    nodeTypes,
                    fitView: true,
                    snapToGrid: true,
                    snapGrid: [15, 15]
                },
                    React.createElement(Controls),
                    React.createElement(Background, { variant: 'dots', gap: 12, size: 1 })
                );
            }

            // Рендерим
            const container = document.getElementById('reactFlowContainer');
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(FlowComponent));

            console.log('✅ React Flow с Bitrix-карточками инициализирован');
        }
    </script>
</body>
</html>
