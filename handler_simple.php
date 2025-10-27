<?php
/**
 * Telegsarflow - ПРОСТАЯ версия со встроенными карточками Bitrix24
 */
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Процессы Telegsarflow</title>
    <script src="//api.bitrix24.com/api/v1/"></script>

    <!-- React Flow -->
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
        h1 { font-size: 24px; color: #333; margin-bottom: 20px; }

        /* Встраиваем iframe с карточкой задачи */
        .task-card-embed {
            width: 300px;
            height: 150px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
        }

        .task-card-embed iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        #reactFlowContainer {
            width: 100%;
            height: 600px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fafafa;
            margin-top: 20px;
        }

        .react-flow__node {
            cursor: pointer;
        }

        /* Стили для кастомной карточки (на основе данных из BX24) */
        .simple-task-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            min-width: 250px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #10b981;
        }

        .simple-task-card.status-1,
        .simple-task-card.status-2 { border-left-color: #94a3b8; }
        .simple-task-card.status-3 { border-left-color: #3b82f6; }
        .simple-task-card.status-4 { border-left-color: #f59e0b; }
        .simple-task-card.status-5 { border-left-color: #10b981; }
        .simple-task-card.status-6 { border-left-color: #9ca3af; }
        .simple-task-card.status-7 { border-left-color: #ef4444; }

        .card-title {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
            line-height: 1.4;
        }

        .card-meta {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            font-size: 12px;
            color: #666;
        }

        .card-badge {
            padding: 4px 8px;
            border-radius: 12px;
            background: #f3f4f6;
            font-size: 11px;
        }

        .debug-panel {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            max-width: 400px;
            max-height: 300px;
            overflow: auto;
            font-size: 11px;
            font-family: monospace;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1>⚡ Процессы задачи</h1>
        <div id="taskInfo">Загрузка...</div>
        <div id="reactFlowContainer"></div>
    </div>

    <div class="debug-panel" id="debugPanel">
        <strong>Debug:</strong><br>
        <div id="debugLog"></div>
    </div>

    <script>
        let currentTaskId = null;
        const debugLog = [];

        function addDebugLog(message, data) {
            const timestamp = new Date().toLocaleTimeString();
            debugLog.push({ timestamp, message, data });

            const debugEl = document.getElementById('debugLog');
            debugEl.innerHTML = debugLog.map(log =>
                `<div>${log.timestamp}: ${log.message}</div>`
            ).join('');

            console.log(`[${timestamp}] ${message}`, data || '');
        }

        BX24.init(function() {
            addDebugLog('BX24 инициализирован');

            // Получаем ID задачи
            const placement = BX24.placement.info();
            addDebugLog('Placement info', placement);

            currentTaskId = placement?.options?.taskId ||
                           placement?.options?.TASK_ID ||
                           new URLSearchParams(window.location.search).get('taskId');

            addDebugLog('Task ID', currentTaskId);

            if (!currentTaskId) {
                document.getElementById('taskInfo').innerHTML = '⚠️ ID задачи не найден';
                return;
            }

            // Загружаем задачу через BX24.callMethod
            addDebugLog('Загружаем задачу...');

            BX24.callMethod('tasks.task.get', { taskId: currentTaskId }, function(result) {
                if (result.error()) {
                    addDebugLog('Ошибка загрузки', result.error());
                    document.getElementById('taskInfo').innerHTML = '⚠️ Ошибка загрузки задачи';
                    return;
                }

                const rawData = result.data();
                addDebugLog('RAW result.data()', rawData);
                addDebugLog('Ключи rawData', Object.keys(rawData));

                // Пробуем разные варианты получения данных
                const task = rawData.task || rawData;
                addDebugLog('Task object', task);
                addDebugLog('Ключи task', Object.keys(task));

                // Извлекаем данные с учётом всех возможных вариантов
                const taskData = {
                    id: task.id || task.ID || currentTaskId,
                    title: task.title || task.TITLE || task.name || task.NAME || 'Без названия',
                    status: task.status || task.STATUS || task.realStatus || task.REAL_STATUS || '1',
                    responsibleId: task.responsibleId || task.RESPONSIBLE_ID,
                    deadline: task.deadline || task.DEADLINE
                };

                addDebugLog('Финальные данные', taskData);

                // Отображаем информацию
                document.getElementById('taskInfo').innerHTML = `
                    <strong>📋 ${taskData.title}</strong><br>
                    <small>Статус: ${getStatusName(taskData.status)} | ID: ${taskData.id}</small>
                `;

                // Инициализируем React Flow
                initReactFlow(taskData);
            });

            BX24.fitWindow();
        });

        function getStatusName(statusCode) {
            const names = {
                '1': 'Новая', '2': 'Ждёт выполнения', '3': 'Выполняется',
                '4': 'Ждёт контроля', '5': 'Завершена', '6': 'Отложена', '7': 'Отклонена'
            };
            return names[String(statusCode)] || 'Неизвестно';
        }

        function initReactFlow(taskData) {
            addDebugLog('Инициализация React Flow', taskData);

            const { useState, useCallback } = React;
            const RF = window.ReactFlow || window.reactflow;

            if (!RF) {
                addDebugLog('ERROR: React Flow не загружен');
                return;
            }

            const { ReactFlow: RFComponent, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges, Handle } = RF;

            // Простая карточка
            const SimpleTaskCard = ({ data }) => {
                const statusCode = data.statusCode || '1';

                return React.createElement('div', {
                    className: `simple-task-card status-${statusCode}`
                },
                    React.createElement(Handle, {
                        type: 'target',
                        position: 'left',
                        style: { background: '#667eea' }
                    }),

                    React.createElement('div', { className: 'card-title' }, data.title),

                    React.createElement('div', { className: 'card-meta' },
                        React.createElement('span', { className: 'card-badge' }, data.status),
                        React.createElement('span', { className: 'card-badge' }, `#${data.id}`)
                    ),

                    React.createElement(Handle, {
                        type: 'source',
                        position: 'right',
                        style: { background: '#667eea' }
                    })
                );
            };

            const nodeTypes = { custom: SimpleTaskCard };

            const initialNodes = [{
                id: `task-${taskData.id}`,
                type: 'custom',
                position: { x: 250, y: 100 },
                data: {
                    id: taskData.id,
                    title: taskData.title,
                    status: getStatusName(taskData.status),
                    statusCode: taskData.status
                }
            }];

            addDebugLog('Initial nodes', initialNodes);

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

                return React.createElement(RFComponent, {
                    nodes,
                    edges,
                    onNodesChange,
                    onEdgesChange,
                    onConnect,
                    nodeTypes,
                    fitView: true
                },
                    React.createElement(Controls),
                    React.createElement(Background, { variant: 'dots' })
                );
            }

            const container = document.getElementById('reactFlowContainer');
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(FlowComponent));

            addDebugLog('React Flow отрендерен');
        }
    </script>
</body>
</html>
