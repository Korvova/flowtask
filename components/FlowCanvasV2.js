/**
 * FlowCanvasV2 - ПРОСТОЙ canvas на новой архитектуре
 *
 * Загрузка:
 * 1. EntityManagerV2.loadProcess(processId) → массив узлов
 * 2. Строим nodes и edges для ReactFlow
 *
 * Создание связи:
 * 1. Добавляем в connectionsFrom исходного узла
 * 2. Сохраняем узел
 *
 * Закрытие задачи:
 * 1. TaskHandler.handleTaskComplete(taskId, processId)
 */
window.FlowCanvasV2 = {

    currentProcessId: null,
    reactFlowInstance: null,

    render: function() {
        const RF = window.ReactFlow || window.reactflow;

        if (!React || !RF) {
            console.error('React или ReactFlow не загружены');
            return;
        }

        const { useState, useCallback, useEffect, useRef } = React;
        const { ReactFlow, Controls, Background, addEdge: rfAddEdge, useNodesState, useEdgesState } = RF;

        // Используем стандартный TaskNode с React Flow handles

        function FlowApp() {
            const [nodes, setNodes, onNodesChange] = useNodesState([]);
            const [edges, setEdges, onEdgesChange] = useEdgesState([]);
            const [loading, setLoading] = useState(true);
            const reactFlowInstanceRef = useRef(null);

            // Удаление предзадачи
            const handleDeleteNode = useCallback(async (nodeId) => {
                try {
                    console.log('🗑️ Удаляем узел:', nodeId);

                    if (!confirm('Удалить предзадачу?')) {
                        return;
                    }

                    // Находим узел, чтобы получить entityId
                    const allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
                    const node = allNodes.find(n => n.nodeId === nodeId);

                    if (!node || !node._entityId) {
                        console.error('❌ Узел или entityId не найден');
                        alert('Ошибка: не удалось найти узел');
                        return;
                    }

                    // Удаляем узел из Entity Storage
                    await EntityManagerV2.deleteNode(node._entityId);
                    console.log('✅ Узел удалён из базы');

                    // Удаляем узел из canvas
                    setNodes((nds) => nds.filter(n => n.id !== nodeId));

                    // Удаляем все связи с этим узлом
                    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));

                    console.log('✅ Узел и связи удалены с canvas');

                } catch (error) {
                    console.error('❌ Ошибка удаления узла:', error);
                    alert('Ошибка удаления: ' + error.message);
                }
            }, [setNodes, setEdges]);

            // Редактирование предзадачи
            const handleEditNode = useCallback(async (nodeData) => {
                try {
                    console.log('✏️ Редактируем узел:', nodeData);

                    // Загружаем полные данные узла
                    const allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
                    const fullNode = allNodes.find(n => n.nodeId === nodeData.id);

                    if (!fullNode) {
                        console.error('❌ Узел не найден');
                        return;
                    }

                    // Открываем модалку в режиме редактирования
                    if (window.TaskModalV2) {
                        window.TaskModalV2.openEdit({
                            node: fullNode,
                            processId: window.currentProcessId,
                            onSave: async (updatedNode) => {
                                console.log('✅ Узел обновлён:', updatedNode);

                                // Обновляем узел на canvas
                                setNodes((nds) =>
                                    nds.map(n => {
                                        if (n.id === updatedNode.nodeId) {
                                            return {
                                                ...n,
                                                data: {
                                                    ...n.data,
                                                    title: updatedNode.title,
                                                    conditionType: updatedNode.condition,
                                                    delayMinutes: updatedNode.delayMinutes,
                                                    _node: updatedNode
                                                }
                                            };
                                        }
                                        return n;
                                    })
                                );
                            }
                        });
                    }

                } catch (error) {
                    console.error('❌ Ошибка редактирования узла:', error);
                    alert('Ошибка редактирования: ' + error.message);
                }
            }, [setNodes]);

            // Экспортируем обработчики в window для доступа из TaskNode
            useEffect(() => {
                window.FlowCanvasV2.handleDeleteNode = handleDeleteNode;
                window.FlowCanvasV2.handleEditNode = handleEditNode;
                console.log('✅ Обработчики экспортированы в window.FlowCanvasV2');

                return () => {
                    window.FlowCanvasV2.handleDeleteNode = null;
                    window.FlowCanvasV2.handleEditNode = null;
                };
            }, [handleDeleteNode, handleEditNode]);

            // Загрузка данных
            useEffect(() => {
                loadProcessData();
            }, []);

            // Загрузить данные процесса
            const loadProcessData = async () => {
                try {
                    console.log('📥 Загружаем процесс:', window.currentProcessId);

                    // Загрузить все узлы за 1 запрос
                    let allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
                    console.log('✅ Загружено узлов:', allNodes.length);

                    // Если узлов нет - создаём узел для текущей задачи
                    if (allNodes.length === 0 && window.currentTaskId) {
                        console.log('📝 Создаём начальный узел для задачи', window.currentTaskId);

                        const initialNode = {
                            nodeId: 'task-' + window.currentTaskId,
                            type: 'task',
                            title: 'Задача #' + window.currentTaskId,
                            status: 2, // В работе
                            positionX: 250,
                            positionY: 150,
                            connectionsFrom: [],
                            connectionsTo: [],
                            realTaskId: window.currentTaskId
                        };

                        await EntityManagerV2.saveNode(window.currentProcessId, initialNode);
                        console.log('✅ Начальный узел создан');

                        // Используем созданный узел напрямую без перезагрузки
                        allNodes = [initialNode];
                        console.log('✅ Узел добавлен в массив');
                    }

                    // Построить nodes для ReactFlow
                    const rfNodes = allNodes.map(node => ({
                        id: node.nodeId,
                        type: node.type === 'task' ? 'task' : 'future',
                        position: {
                            x: node.positionX || 0,
                            y: node.positionY || 0
                        },
                        data: {
                            id: node.nodeId,
                            title: node.title,
                            statusCode: node.status,  // TaskNode использует statusCode
                            isFuture: node.type === 'future',
                            conditionType: node.condition,  // TaskNode использует conditionType
                            delayMinutes: node.delayMinutes,
                            realTaskId: node.realTaskId,
                            _node: node  // Сохраняем весь узел
                            // Callback'и НЕ передаём - TaskNode использует window.FlowCanvasV2.handleDeleteNode напрямую
                        }
                    }));

                    // Построить edges для ReactFlow
                    const rfEdges = [];
                    allNodes.forEach(node => {
                        if (node.connectionsFrom) {
                            node.connectionsFrom.forEach(conn => {
                                rfEdges.push({
                                    id: `edge-${node.nodeId}-${conn.id}`,
                                    source: node.nodeId,
                                    target: conn.id,
                                    type: 'default',
                                    animated: false
                                });
                            });
                        }
                    });

                    console.log('✅ Построено nodes:', rfNodes.length, 'edges:', rfEdges.length);

                    setNodes(rfNodes);
                    setEdges(rfEdges);
                    setLoading(false);

                } catch (error) {
                    console.error('❌ Ошибка загрузки:', error);
                    setLoading(false);
                }
            };

            // Обработчик завершения драга для сохранения позиции
            const onNodeDragStop = useCallback((event, node) => {
                console.log('💾 Узел перемещён:', node.id, 'в', node.position);
                saveNodePosition(node.id, node.position.x, node.position.y);
            }, []);

            // Валидация связей (Context7: актуальная документация React Flow)
            const isValidConnection = useCallback((connection) => {
                // 1. Предотвращаем самосвязи
                if (connection.source === connection.target) {
                    console.warn('%c⚠️ Самосвязи запрещены', 'color: #ff9800; font-weight: bold;');
                    return false;
                }

                // 2. Предотвращаем дублирование связей
                const isDuplicate = edges.some(
                    edge =>
                        edge.source === connection.source &&
                        edge.target === connection.target &&
                        edge.sourceHandle === connection.sourceHandle &&
                        edge.targetHandle === connection.targetHandle
                );

                if (isDuplicate) {
                    console.warn('%c⚠️ Связь уже существует', 'color: #ff9800; font-weight: bold;');
                    return false;
                }

                // 3. Проверяем типы узлов
                const sourceNode = nodes.find(n => n.id === connection.source);
                const targetNode = nodes.find(n => n.id === connection.target);

                // Future узлы не могут иметь исходящие связи (только входящие)
                if (sourceNode?.data?.isFuture) {
                    console.warn('%c⚠️ Предзадачи не могут иметь исходящие связи', 'color: #ff9800; font-weight: bold;');
                    return false;
                }

                console.log('%c✅ Связь валидна', 'color: #00ff00; font-weight: bold;');
                return true;
            }, [nodes, edges]);

            // Создание связи
            const onConnect = useCallback(async (connection) => {
                console.log('🔗 Создание связи:', connection.source, '→', connection.target);

                try {
                    // Загрузить узлы
                    const allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
                    const sourceNode = allNodes.find(n => n.nodeId === connection.source);
                    const targetNode = allNodes.find(n => n.nodeId === connection.target);

                    if (!sourceNode) {
                        console.error('❌ Исходный узел не найден');
                        return;
                    }

                    // Добавить связь
                    if (!sourceNode.connectionsFrom) {
                        sourceNode.connectionsFrom = [];
                    }

                    sourceNode.connectionsFrom.push({
                        type: targetNode?.type || 'future',
                        id: connection.target
                    });

                    // Сохранить
                    await EntityManagerV2.saveNode(window.currentProcessId, sourceNode);
                    console.log('✅ Связь сохранена в базу');

                    // Обновить edges с анимацией (из документации React Flow)
                    setEdges((eds) => [
                        ...eds,
                        {
                            id: `edge-${connection.source}-${connection.target}`,
                            source: connection.source,
                            target: connection.target,
                            type: 'default',
                            animated: true,
                            style: { strokeWidth: 2, stroke: '#667eea' }
                        }
                    ]);

                } catch (error) {
                    console.error('❌ Ошибка создания связи:', error);
                }
            }, []);

            // Начало создания связи в пустое место
            let connectingNodeId = null;

            const onConnectStart = useCallback((event, { nodeId }) => {
                connectingNodeId = nodeId;
                console.log('🔗 Начало соединения от:', nodeId);
            }, []);

            const onConnectEnd = useCallback((event) => {
                const target = event.target;

                // Проверяем, что отпустили на пустое место
                if (target.classList.contains('react-flow__pane') && connectingNodeId) {
                    console.log('✅ Отпустили на пустое место! Создаём предзадачу');

                    // Получить координаты мыши (используем новый метод screenToFlowPosition)
                    const position = reactFlowInstanceRef.current.screenToFlowPosition({
                        x: event.clientX,
                        y: event.clientY,
                    });

                    console.log('📍 Позиция создания узла:', position);

                    // ВАЖНО: Сохраняем sourceId ДО обнуления connectingNodeId
                    const sourceId = connectingNodeId;

                    // Открыть модалку TaskModalV2
                    if (window.TaskModalV2) {
                        window.TaskModalV2.open({
                            sourceNodeId: sourceId,
                            processId: window.currentProcessId,
                            position: position,
                            onSave: async (newNode) => {
                                console.log('🎯 Новая предзадача создана:', newNode);

                                // Добавляем узел на canvas
                                const reactFlowNode = {
                                    id: newNode.nodeId,
                                    type: 'task',
                                    position: { x: newNode.positionX, y: newNode.positionY },
                                    data: {
                                        id: newNode.nodeId,
                                        title: newNode.title,
                                        statusCode: newNode.status,  // TaskNode использует statusCode!
                                        isFuture: newNode.type === 'future',
                                        conditionType: newNode.condition,
                                        delayMinutes: newNode.delayMinutes,
                                        realTaskId: newNode.realTaskId,
                                        _node: newNode
                                        // Callback'и НЕ передаём - TaskNode использует window.FlowCanvasV2 напрямую
                                    }
                                };

                                setNodes((nds) => [...nds, reactFlowNode]);

                                // Создаём связь на canvas (связь в БД уже создана в TaskModalV2)
                                const newEdge = {
                                    id: `${sourceId}-${newNode.nodeId}`,
                                    source: sourceId,
                                    target: newNode.nodeId,
                                    animated: true,
                                    style: { stroke: '#667eea', strokeWidth: 2 }
                                };

                                setEdges((eds) => [...eds, newEdge]);

                                console.log('✅ Узел и связь добавлены на canvas');
                            }
                        });
                    }
                }

                connectingNodeId = null;
            }, []);

            // Сохранение позиции узла
            const saveNodePosition = async (nodeId, x, y) => {
                try {
                    console.log('💾 Сохраняем позицию:', nodeId, x, y);

                    const allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
                    const node = allNodes.find(n => n.nodeId === nodeId);

                    if (node) {
                        node.positionX = x;
                        node.positionY = y;
                        await EntityManagerV2.saveNode(window.currentProcessId, node);
                        console.log('✅ Позиция сохранена');
                    }
                } catch (error) {
                    console.error('❌ Ошибка сохранения позиции:', error);
                }
            };

            // Обработка статуса задачи
            const handleStatusChange = useCallback(async (taskId, newStatus) => {
                console.log('🔄 Статус изменён:', taskId, '→', newStatus);

                // Обновить визуально (TaskNode использует statusCode!)
                setNodes((nds) =>
                    nds.map(node => {
                        if (node.id === 'task-' + taskId) {
                            console.log('✅ Обновляем узел:', node.id, 'новый статус:', newStatus);
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    statusCode: newStatus,  // TaskNode использует statusCode!
                                    _updateTime: Date.now()
                                }
                            };
                        }
                        return node;
                    })
                );

                // Если завершена - создать предзадачи
                if (newStatus === 5) {
                    console.log('✅ Задача завершена! Создаём предзадачи...');
                    await TaskHandler.handleTaskComplete(taskId, window.currentProcessId);

                    // Перезагрузить canvas
                    setTimeout(() => {
                        loadProcessData();
                    }, 1000);
                }
            }, []);

            // Подписка на BX.PULL при загрузке узлов
            useEffect(() => {
                if (nodes.length === 0) return; // Ждём загрузки узлов

                if (window.PullSubscription) {
                    // Собираем все task узлы
                    const taskNodes = nodes.filter(node => node.type === 'task' && node.data.realTaskId);

                    // Подписываемся только на новые задачи (которые еще не в subscriptions)
                    const newTasks = taskNodes.filter(node => {
                        const taskId = node.data.realTaskId;
                        return !window.PullSubscription.subscriptions[taskId];
                    });

                    if (newTasks.length > 0) {
                        console.log('%c📞 Подписываемся на новые задачи:', 'color: #9c27b0; font-weight: bold;', newTasks.length);

                        newTasks.forEach(node => {
                            const taskId = node.data.realTaskId;

                            // Правильные параметры для PullSubscription.subscribe:
                            // subscribe(taskId, onStatusChange, onTaskComplete)
                            window.PullSubscription.subscribe(
                                taskId,
                                (newStatus, task) => {
                                    console.log('%c🔄 Статус изменён через PULL:', 'color: #ff9800; font-weight: bold;', taskId, '→', newStatus);
                                    handleStatusChange(taskId, newStatus);
                                },
                                (completedTaskId) => {
                                    console.log('%c✅ Задача завершена через PULL:', 'color: #00ff00; font-weight: bold;', completedTaskId);
                                    handleStatusChange(completedTaskId, 5);
                                }
                            );
                            console.log('  ✅ Подписка на task-' + taskId);
                        });

                        console.log('%c✅ Подписка завершена!', 'color: #4caf50; font-weight: bold;');
                    }
                }

                // НЕ отписываемся - подписки работают глобально на всю сессию
            }, [nodes.length]); // Подписываемся при изменении количества узлов!

            // Render
            if (loading) {
                return React.createElement('div', {
                    style: {
                        width: '100%',
                        height: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }
                }, '⏳ Загрузка...');
            }

            return React.createElement('div', {
                style: {
                    width: '100%',
                    height: '100vh',
                    background: '#f5f7fa'
                }
            },
                React.createElement(ReactFlow, {
                    nodes: nodes,
                    edges: edges,
                    nodesDraggable: true,
                    onNodesChange: onNodesChange,
                    onEdgesChange: onEdgesChange,
                    onNodeDragStop: onNodeDragStop,
                    onConnect: onConnect,
                    onConnectStart: onConnectStart,
                    onConnectEnd: onConnectEnd,
                    isValidConnection: isValidConnection,
                    onInit: (instance) => {
                        reactFlowInstanceRef.current = instance;
                        console.log('✅ ReactFlow готов');
                    },
                    nodeTypes: {
                        task: window.TaskNode,
                        future: window.TaskNode
                    },
                    fitView: true,
                    minZoom: 0.5,
                    maxZoom: 1.5,
                    connectionMode: 'loose'
                },
                    React.createElement(Controls),
                    React.createElement(Background, {
                        variant: 'dots',
                        gap: 12,
                        size: 1,
                        color: '#ddd'
                    })
                )
            );
        }

        // Рендерим
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(FlowApp));

        console.log('✅ FlowCanvasV2 rendered');
    },

    // Экспортируем для вызова извне
    reloadCanvas: function() {
        console.log('🔄 Перезагрузка canvas...');
        this.render();
    }
};

console.log('✅ FlowCanvasV2 loaded');
