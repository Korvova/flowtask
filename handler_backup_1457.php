<?php
/**
 * Telegsarflow - обработчик вкладки "Процессы"
 * Этот файл загружается внутри iframe во вкладке задачи
 */
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Процессы</title>
    <script src="//api.bitrix24.com/api/v1/"></script>

    <!-- React и React Flow библиотеки -->
    <script src="assets/js/react.min.js"></script>
    <script src="assets/js/react-dom.min.js"></script>
    <script src="assets/js/reactflow.min.js"></script>
    <link rel="stylesheet" href="assets/css/reactflow.css">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 30px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }
        .content {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            font-size: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
            font-weight: 800;
        }
        .task-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .task-info h3 {
            color: #333;
            margin-bottom: 10px;
        }
        .task-info p {
            color: #666;
            margin: 5px 0;
        }
        .badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 10px;
        }
        #reactFlowContainer {
            width: 100%;
            height: 600px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            background: #fafafa;
        }

        /* Оптимизация производительности для drag & drop */
        .react-flow__node {
            will-change: transform;
        }
        .react-flow__node.dragging {
            cursor: grabbing !important;
        }

        /* Стили для handles (точек подключения) */
        .react-flow__handle {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid #fff;
            transition: all 0.2s;
        }
        .react-flow__handle:hover {
            width: 16px;
            height: 16px;
            background: #667eea !important;
        }
        .react-flow__handle-connecting {
            background: #667eea !important;
        }

        /* Стрелки к предзадачам - тускло-серые пунктирные */
        .react-flow__edge.future-edge path {
            stroke: #9ca3af !important;
            stroke-dasharray: 5, 5;
            opacity: 0.5;
        }
        .react-flow__edge.future-edge .react-flow__edge-path {
            stroke: #9ca3af !important;
        }

        /* Кастомные стили для узлов React Flow */
        .react-flow__node-custom {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            min-width: 200px;
            /* Убрали transition для плавности drag */
        }
        /* Стиль для предзадач (будущих задач) - тускло-серые "призраки" */
        .react-flow__node.future-task .react-flow__node-custom {
            background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
            border: 2px dashed rgba(255, 255, 255, 0.4);
            opacity: 0.6;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .react-flow__node.future-task .react-flow__node-custom:hover {
            opacity: 0.8;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        /* Альтернативный селектор для внутреннего div */
        .react-flow__node-custom .future-task {
            background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%) !important;
        }
        .react-flow__node-custom:hover {
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            /* Убрали scale для плавности drag */
        }
        .react-flow__node-custom .node-title {
            margin: 0 0 10px 0;
            font-size: 16px;
            font-weight: 600;
        }
        .react-flow__node-custom .node-info {
            margin: 0;
            font-size: 12px;
            opacity: 0.9;
        }
        .react-flow__node-custom .task-id {
            font-size: 10px;
            opacity: 0.7;
            margin-top: 5px;
        }

        /* Модальное окно для создания задачи */
        .task-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.2s;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .task-modal-content {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 90%;
            animation: slideUp 0.3s;
        }
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .task-modal h3 {
            margin: 0 0 20px 0;
            color: #333;
        }
        .task-modal input,
        .task-modal textarea {
            width: 100%;
            padding: 12px;
            margin-bottom: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-family: inherit;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        .task-modal input:focus,
        .task-modal textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .task-modal textarea {
            resize: vertical;
            min-height: 100px;
        }
        .task-modal-buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        .task-modal-buttons button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .task-modal-buttons .btn-create {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .task-modal-buttons .btn-create:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .task-modal-buttons .btn-cancel {
            background: #f0f0f0;
            color: #666;
        }
        .task-modal-buttons .btn-cancel:hover {
            background: #e0e0e0;
        }
        .task-modal .error-message {
            color: #e53e3e;
            font-size: 13px;
            margin-top: -10px;
            margin-bottom: 10px;
            display: none;
        }
        .task-modal .error-message.show {
            display: block;
        }

        /* Кнопка удаления на узле */
        .node-delete-btn {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ef4444;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            opacity: 0;
            transition: opacity 0.2s, transform 0.2s;
            z-index: 10;
        }
        .react-flow__node-custom:hover .node-delete-btn {
            opacity: 1;
        }
        .node-delete-btn:hover {
            transform: scale(1.2);
            background: #dc2626;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1>Процессы Telegsarflow</h1>

        <div class="task-info" id="taskInfo">
            <h3>Информация о задаче:</h3>
            <p id="taskId">Загрузка...</p>
            <p id="taskTitle">Загрузка названия...</p>
            <div class="badge">✨ Готово к работе!</div>
        </div>

        <div id="reactFlowContainer">
            <!-- React Flow будет отрендерен здесь -->
        </div>
    </div>

    <script>
        BX24.init(function() {
            console.log('✅ Handler инициализирован');
            console.log('BX24.placement:', BX24.placement);

            // Получаем информацию о размещении (placement)
            const placement = BX24.placement.info();
            console.log('Placement info полностью:', JSON.stringify(placement, null, 2));

            // Пробуем разные способы получить taskId
            let taskId = null;

            // Способ 1: из placement.options
            if (placement && placement.options) {
                console.log('placement.options:', placement.options);
                taskId = placement.options.taskId ||
                         placement.options.TASK_ID ||
                         placement.options.ID ||
                         placement.options.id;
            }

            // Способ 2: напрямую из placement
            if (!taskId && placement) {
                taskId = placement.taskId || placement.TASK_ID || placement.ID;
            }

            // Способ 3: из URL (как fallback)
            if (!taskId) {
                const urlParams = new URLSearchParams(window.location.search);
                taskId = urlParams.get('taskId') || urlParams.get('TASK_ID') || urlParams.get('ID');
            }

            console.log('Найденный taskId:', taskId);

            if (taskId) {
                document.getElementById('taskId').innerHTML = '🔢 <strong>ID задачи:</strong> ' + taskId;

                // Получаем информацию о задаче через серверный API (для коробочной версии)
                fetch('/telegsarflow/get_task.php?taskId=' + taskId)
                    .then(response => response.json())
                    .then(data => {
                        console.log('✅ Данные с сервера:', data);

                        if (data.success && data.task) {
                            const task = data.task;
                            console.log('✅ Задача загружена:', task);

                            let html = '📋 <strong>Название:</strong> ' + task.title;

                            if (task.description) {
                                const shortDesc = task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '');
                                html += '<br>📝 <strong>Описание:</strong> ' + shortDesc;
                            }

                            if (task.status) {
                                const statusNames = {
                                    '1': 'Новая',
                                    '2': 'Ждёт выполнения',
                                    '3': 'Выполняется',
                                    '4': 'Ждёт контроля',
                                    '5': 'Завершена',
                                    '6': 'Отложена',
                                    '7': 'Отклонена'
                                };
                                html += '<br>📊 <strong>Статус:</strong> ' + (statusNames[task.status] || task.status);
                            }

                            if (task.deadline) {
                                html += '<br>⏰ <strong>Дедлайн:</strong> ' + task.deadline;
                            }

                            document.getElementById('taskTitle').innerHTML = html;

                            // Создаём React Flow с узлом задачи
                            initReactFlow(task);
                        } else {
                            console.error('❌ Ошибка:', data.error);
                            document.getElementById('taskTitle').innerHTML = '⚠️ <strong>Ошибка:</strong> ' + data.error;
                        }
                    })
                    .catch(error => {
                        console.error('❌ Ошибка загрузки:', error);
                        document.getElementById('taskTitle').innerHTML = '⚠️ <strong>Ошибка загрузки данных</strong>';
                    });
            } else {
                document.getElementById('taskId').innerHTML = '⚠️ <strong>ID задачи не передан</strong><br><small>placement: ' + JSON.stringify(placement) + '</small>';
                document.getElementById('taskTitle').textContent = '';
            }

            // Автоматически подгоняем высоту iframe
            BX24.fitWindow();
        });

        // Инициализация React Flow
        function initReactFlow(task) {
            console.log('🔍 Проверяем доступные объекты:', {
                React: typeof React,
                ReactDOM: typeof ReactDOM,
                ReactFlow: typeof ReactFlow,
                window_ReactFlow: typeof window.ReactFlow
            });

            const { useState, useCallback, useMemo } = React;

            // React Flow может быть доступен как глобальный объект window.ReactFlow
            const RF = window.ReactFlow || window.reactflow || window.ReactFlowRenderer;

            if (!RF) {
                console.error('❌ React Flow не загружен!');
                document.getElementById('reactFlowContainer').innerHTML = '<div style="padding: 20px; color: red;">Ошибка: React Flow не загружен</div>';
                return;
            }

            console.log('✅ React Flow найден:', RF);

            const { ReactFlow: RFComponent, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges, Handle } = RF;

            // Определяем кастомный компонент узла с handles
            const CustomNode = ({ id, data }) => {
                const isFutureTask = data.id === 'new' || data.status === 'Будет создана';
                const icon = isFutureTask ? '🎯' : '📋';

                // Получаем цвет статуса для реальных задач
                const statusColor = !isFutureTask && data.statusCode ? getStatusColor(data.statusCode) : null;

                const nodeStyle = {
                    padding: '10px',
                    position: 'relative',
                    background: isFutureTask
                        ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                        : statusColor
                            ? `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%)`
                            : undefined,
                    border: isFutureTask ? '2px dashed rgba(255, 255, 255, 0.4)' : statusColor ? `2px solid ${statusColor}` : undefined,
                    opacity: isFutureTask ? 0.6 : undefined,
                    boxShadow: isFutureTask ? '0 2px 8px rgba(0, 0, 0, 0.15)' : statusColor ? `0 4px 12px ${statusColor}33` : undefined
                };

                return React.createElement('div', {
                    className: isFutureTask ? 'future-task' : '',
                    style: nodeStyle
                },
                    // Кнопка удаления (только для предзадач)
                    isFutureTask ? React.createElement('div', {
                        className: 'node-delete-btn',
                        onClick: (e) => {
                            e.stopPropagation();
                            if (data.onDelete) {
                                data.onDelete(id);
                            }
                        },
                        title: 'Удалить предзадачу'
                    }, '×') : null,

                    // Handle слева (вход)
                    React.createElement(Handle, {
                        type: 'target',
                        position: 'left',
                        style: { background: '#555' }
                    }),

                    // Контент узла
                    React.createElement('div', { className: 'node-title' }, icon + ' ' + data.title),
                    React.createElement('div', { className: 'node-info' }, 'Статус: ' + data.status),
                    data.responsibleName ? React.createElement('div', { className: 'node-info', style: { fontSize: '11px', marginTop: '3px', color: '#f59e0b' } }, '👤 ' + data.responsibleName) : null,
                    data.condition ? React.createElement('div', { className: 'node-info', style: { fontSize: '11px', marginTop: '5px' } }, '⚡ ' + data.condition) : null,
                    React.createElement('div', { className: 'task-id' }, 'ID: ' + data.id),

                    // Handle справа (выход)
                    React.createElement(Handle, {
                        type: 'source',
                        position: 'right',
                        style: { background: '#555' }
                    })
                );
            };

            // Типы узлов
            const nodeTypes = {
                custom: CustomNode
            };

            // Начальные узлы
            const initialNodes = [
                {
                    id: 'task-' + task.id,
                    type: 'custom',
                    position: { x: 100, y: 100 },
                    data: {
                        title: task.title,
                        status: getStatusName(task.status),
                        statusCode: task.status,
                        id: task.id
                    }
                }
            ];

            const initialEdges = [];

            // React компонент Flow
            function FlowComponent() {
                const [nodes, setNodes] = useState(initialNodes);
                const [edges, setEdges] = useState(initialEdges);
                const [showModal, setShowModal] = useState(false);
                const [connectionData, setConnectionData] = useState(null);
                const connectingNodeId = React.useRef(null);
                const [isLoaded, setIsLoaded] = useState(false);

                // Состояние формы
                const [taskTitle, setTaskTitle] = useState('');
                const [taskDescription, setTaskDescription] = useState('');
                const [taskCondition, setTaskCondition] = useState('immediately'); // immediately, after_complete, after_delay, after_cancel
                const [taskResponsible, setTaskResponsible] = useState(task.responsibleId || ''); // ID ответственного
                const [showError, setShowError] = useState(false);
                const [users, setUsers] = useState([]);
                const [usersLoaded, setUsersLoaded] = useState(false);

                // Ленивая загрузка пользователей - только когда открывается модалка
                React.useEffect(() => {
                    if (showModal && !usersLoaded) {
                        fetch('/telegsarflow/get_users.php')
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    console.log('👥 Пользователи загружены:', data.count);
                                    setUsers(data.users);
                                    setUsersLoaded(true);
                                } else {
                                    console.error('❌ Ошибка загрузки пользователей:', data.error);
                                }
                            })
                            .catch(error => {
                                console.error('❌ Ошибка загрузки пользователей:', error);
                            });
                    }
                }, [showModal, usersLoaded]);

                // Загрузка сохранённого процесса при монтировании
                React.useEffect(() => {
                    console.log('📥 Загружаем сохранённый процесс для задачи', task.id);

                    fetch('/telegsarflow/load_process.php?taskId=' + task.id)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.processData) {
                                console.log('✅ Процесс загружен:', data.processData);
                                setNodes(data.processData.nodes || initialNodes);
                                setEdges(data.processData.edges || initialEdges);
                            } else {
                                console.log('ℹ️ Сохранённый процесс не найден, используем начальный');
                            }
                            setIsLoaded(true);
                        })
                        .catch(error => {
                            console.error('❌ Ошибка загрузки процесса:', error);
                            setIsLoaded(true);
                        });
                }, []);

                // Подписка на события изменения задачи через PULL
                React.useEffect(() => {
                    if (!isLoaded) return;

                    // Функция обновления статуса
                    const updateTaskStatus = (newStatus) => {
                        console.log('🔄 Статус задачи изменился на:', newStatus);
                        setNodes(nds => nds.map(n =>
                            n.id === 'task-' + task.id
                                ? {
                                    ...n,
                                    data: {
                                        ...n.data,
                                        status: getStatusName(newStatus),
                                        statusCode: newStatus
                                    }
                                }
                                : n
                        ));
                    };

                    // Подписка на PULL события от нашего модуля
                    const parentBX = window.parent && window.parent.BX ? window.parent.BX : (typeof BX !== 'undefined' ? BX : null);

                    if (parentBX && typeof parentBX.addCustomEvent === 'function') {
                        // Подписываемся на PULL события нашего модуля
                        parentBX.addCustomEvent("onPullEvent-telegsarflow", function(command, params) {
                            console.log("📬 PULL событие telegsarflow:", command, params);

                            if (command === 'task_status_changed' && params.TASK_ID == task.id) {
                                console.log('✅ Статус нашей задачи изменился через PULL!');
                                if (params.STATUS) {
                                    updateTaskStatus(params.STATUS);
                                }
                            }
                        });

                        console.log('✅ Подписка на PULL события telegsarflow установлена');
                    } else {
                        console.warn('⚠️ BX.addCustomEvent не доступен, используем polling');
                    }

                    // Fallback: проверка статуса раз в 30 секунд если PULL не работает
                    const checkTaskStatus = () => {
                        fetch('/telegsarflow/get_task.php?taskId=' + task.id)
                            .then(response => response.json())
                            .then(data => {
                                if (data.success && data.task) {
                                    const currentTaskNode = nodes.find(n => n.id === 'task-' + task.id);
                                    if (currentTaskNode && currentTaskNode.data.statusCode !== data.task.status) {
                                        console.log('🔄 Fallback: статус изменился через polling');
                                        updateTaskStatus(data.task.status);
                                    }
                                }
                            })
                            .catch(error => {
                                console.error('❌ Ошибка проверки статуса:', error);
                            });
                    };

                    // Fallback каждые 30 секунд
                    const interval = setInterval(checkTaskStatus, 30000);

                    return () => {
                        clearInterval(interval);
                    };
                }, [isLoaded, nodes]);

                // Функция удаления узла
                const handleDeleteNode = useCallback((nodeId) => {
                    console.log('🗑️ Удаление узла:', nodeId);

                    // Удаляем узел
                    setNodes((nds) => nds.filter(n => n.id !== nodeId));

                    // Удаляем все связи, связанные с этим узлом
                    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
                }, []);

                // Добавляем функцию удаления в данные узлов
                const nodesWithDelete = React.useMemo(() => {
                    return nodes.map(node => ({
                        ...node,
                        data: {
                            ...node.data,
                            onDelete: handleDeleteNode
                        }
                    }));
                }, [nodes, handleDeleteNode]);

                // Автосохранение при изменении узлов или связей
                React.useEffect(() => {
                    if (!isLoaded) return; // Не сохраняем пока не загрузили

                    console.log('💾 Автосохранение процесса');

                    const saveData = {
                        taskId: task.id,
                        processData: {
                            nodes: nodes,
                            edges: edges
                        }
                    };

                    fetch('/telegsarflow/save_process.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(saveData)
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            console.log('✅ Процесс сохранён');
                        }
                    })
                    .catch(error => console.error('❌ Ошибка сохранения:', error));
                }, [nodes, edges, isLoaded]);

                const onNodesChange = useCallback(
                    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
                    []
                );

                const onEdgesChange = useCallback(
                    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
                    []
                );

                // Когда начинают тянуть связь
                const onConnectStart = useCallback((event, { nodeId, handleType }) => {
                    console.log('🔗 Начало соединения от узла:', nodeId, handleType);
                    connectingNodeId.current = nodeId;
                }, []);

                // Когда отпускают связь
                const onConnectEnd = useCallback((event) => {
                    console.log('🔗 Конец соединения');

                    // Проверяем, не попали ли мы на другой узел (target будет в event)
                    const targetIsPane = event.target.classList.contains('react-flow__pane');

                    if (targetIsPane && connectingNodeId.current) {
                        console.log('✅ Отпустили на пустое место, открываем форму');

                        // Сброс формы
                        setTaskTitle('');
                        setTaskDescription('');
                        setTaskCondition('immediately');
                        setTaskResponsible(task.responsibleId || ''); // По умолчанию - ответственный текущей задачи
                        setShowError(false);

                        // Сохраняем ID узла, от которого тянули
                        setConnectionData({
                            source: connectingNodeId.current,
                            sourceHandle: null
                        });
                        setShowModal(true);
                    }

                    connectingNodeId.current = null;
                }, []);

                // Когда соединяют узлы напрямую (узел -> узел)
                const onConnect = useCallback(
                    (params) => {
                        console.log('🔗 Соединение узел -> узел:', params);
                        // Просто создаём связь без формы
                        setEdges((eds) => addEdge({ ...params, animated: true }, eds));
                    },
                    []
                );

                // Функция для преобразования кода условия в текст
                const getConditionText = (conditionCode) => {
                    const conditions = {
                        'immediately': '➡️ Сразу',
                        'after_complete': '📅 При завершении',
                        'after_delay': '⏰ Через время',
                        'after_cancel': '🚫 После отмены'
                    };
                    return conditions[conditionCode] || conditionCode;
                };

                // Создание предзадачи
                const handleCreateTask = useCallback(() => {
                    console.log('📝 Проверяем данные формы:', { taskTitle, taskDescription, taskCondition, taskResponsible });

                    if (!taskTitle.trim()) {
                        console.log('❌ Название пустое');
                        setShowError(true);
                        return;
                    }

                    console.log('✅ Создаём предзадачу');

                    // Создаём новый узел для предзадачи
                    const sourceNode = nodes.find(n => n.id === connectionData.source);
                    const newNodeId = 'task-new-' + Date.now();

                    const newNode = {
                        id: newNodeId,
                        type: 'custom',
                        position: {
                            x: sourceNode.position.x + 300,
                            y: sourceNode.position.y
                        },
                        data: {
                            title: taskTitle,
                            status: 'Будет создана',
                            id: 'new',
                            description: taskDescription,
                            condition: taskCondition,
                            responsibleId: taskResponsible,
                            responsibleName: taskResponsible ? users.find(u => u.id === taskResponsible)?.name || 'User ' + taskResponsible : null
                        },
                        className: 'future-task'
                    };

                    // Добавляем узел и связь
                    setNodes(nds => [...nds, newNode]);
                    setEdges(eds => addEdge({
                        ...connectionData,
                        target: newNodeId,
                        animated: true,
                        label: getConditionText(taskCondition),
                        className: 'future-edge',
                        style: { stroke: '#9ca3af', strokeDasharray: '5,5' },
                        labelStyle: { fill: '#6b7280', fontWeight: 500, fontSize: 11 }
                    }, eds));

                    // Закрываем модалку и сбрасываем форму
                    setShowModal(false);
                    setConnectionData(null);
                    setTaskTitle('');
                    setTaskDescription('');
                    setTaskCondition('immediately');
                    setTaskResponsible(task.responsibleId || '');
                    setShowError(false);
                }, [nodes, connectionData, taskTitle, taskDescription, taskCondition, taskResponsible]);

                // Мемоизируем nodeTypes для оптимизации
                const memoizedNodeTypes = useMemo(() => nodeTypes, []);

                // Компонент модального окна
                const TaskModal = showModal ? React.createElement('div', {
                    className: 'task-modal',
                    onClick: (e) => {
                        if (e.target.className === 'task-modal') {
                            setShowModal(false);
                            setConnectionData(null);
                        }
                    }
                },
                    React.createElement('div', { className: 'task-modal-content' },
                        React.createElement('h3', null, '🎯 Создать предзадачу'),
                        React.createElement('input', {
                            type: 'text',
                            placeholder: 'Название задачи',
                            value: taskTitle,
                            onChange: (e) => {
                                setTaskTitle(e.target.value);
                                setShowError(false);
                            },
                            onKeyDown: (e) => {
                                if (e.key === 'Enter') {
                                    handleCreateTask();
                                }
                            },
                            style: {
                                borderColor: showError ? '#e53e3e' : '#e0e0e0'
                            },
                            autoFocus: true
                        }),
                        showError ? React.createElement('div', {
                            className: 'error-message show'
                        }, '⚠️ Введите название задачи') : null,
                        React.createElement('textarea', {
                            placeholder: 'Описание задачи',
                            value: taskDescription,
                            onChange: (e) => setTaskDescription(e.target.value)
                        }),

                        // Ответственный - выпадающий список
                        React.createElement('select', {
                            value: taskResponsible,
                            onChange: (e) => setTaskResponsible(e.target.value),
                            style: {
                                width: '100%',
                                padding: '12px',
                                marginBottom: '15px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '8px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }
                        },
                            React.createElement('option', { value: '' }, '👤 Выберите ответственного'),
                            users.map(user =>
                                React.createElement('option', {
                                    key: user.id,
                                    value: user.id
                                }, user.name + (user.email ? ' (' + user.email + ')' : ''))
                            )
                        ),

                        // Условие создания - выпадающий список
                        React.createElement('select', {
                            value: taskCondition,
                            onChange: (e) => setTaskCondition(e.target.value),
                            style: {
                                width: '100%',
                                padding: '12px',
                                marginBottom: '15px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '8px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }
                        },
                            React.createElement('option', { value: 'immediately' }, '➡️ Сразу'),
                            React.createElement('option', { value: 'after_complete', disabled: true }, '📅 При завершении + дата (скоро)'),
                            React.createElement('option', { value: 'after_delay', disabled: true }, '⏰ Через X минут (скоро)'),
                            React.createElement('option', { value: 'after_cancel', disabled: true }, '🚫 После отмены запуск (скоро)')
                        ),
                        React.createElement('div', { className: 'task-modal-buttons' },
                            React.createElement('button', {
                                className: 'btn-cancel',
                                onClick: () => {
                                    setShowModal(false);
                                    setConnectionData(null);
                                }
                            }, 'Отмена'),
                            React.createElement('button', {
                                className: 'btn-create',
                                onClick: handleCreateTask
                            }, 'Создать предзадачу')
                        )
                    )
                ) : null;

                return React.createElement('div', { style: { width: '100%', height: '100%', position: 'relative' } },
                    React.createElement(RFComponent, {
                        nodes: nodesWithDelete,
                        edges: edges,
                        onNodesChange: onNodesChange,
                        onEdgesChange: onEdgesChange,
                        onConnect: onConnect,
                        onConnectStart: onConnectStart,
                        onConnectEnd: onConnectEnd,
                        nodeTypes: memoizedNodeTypes,
                        fitView: true,
                        // Оптимизации производительности
                        nodesDraggable: true,
                        nodesConnectable: true,
                        elementsSelectable: true,
                        // Отключаем лишние вычисления при drag
                        autoPanOnNodeDrag: false,
                        // Используем CSS transform вместо JS
                        preventScrolling: false
                    },
                        React.createElement(Controls),
                        React.createElement(Background, { variant: 'dots', gap: 12, size: 1 })
                    ),
                    TaskModal
                );
            }

            // Рендерим React Flow
            const container = document.getElementById('reactFlowContainer');
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(FlowComponent));

            console.log('✅ React Flow инициализирован');
        }

        // Вспомогательная функция для получения названия статуса
        function getStatusName(status) {
            const statusNames = {
                '1': 'Новая',
                '2': 'Ждёт выполнения',
                '3': 'Выполняется',
                '4': 'Ждёт контроля',
                '5': 'Завершена',
                '6': 'Отложена',
                '7': 'Отклонена'
            };
            return statusNames[status] || status;
        }

        function getStatusColor(status) {
            const statusColors = {
                '1': '#94a3b8',      // Новая - серый
                '2': '#94a3b8',      // Ждёт выполнения - серый
                '3': '#3b82f6',      // Выполняется - синий
                '4': '#f59e0b',      // Ждёт контроля - оранжевый
                '5': '#10b981',      // Завершена - зелёный
                '6': '#9ca3af',      // Отложена - светло-серый
                '7': '#ef4444'       // Отклонена - красный
            };
            return statusColors[status] || '#64748b';
        }
    </script>
</body>
</html>
