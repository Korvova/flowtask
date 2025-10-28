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
        const { ReactFlow, Controls, Background, addEdge: rfAddEdge } = RF;

        // Простой компонент узла задачи
        function TaskNodeComponent({ data, id }) {
            const statusColor = window.StatusColors ? window.StatusColors.getColor(data.status) : '#0066cc';

            const handleAddFuture = (e) => {
                e.stopPropagation();
                console.log('➕ Создание предзадачи для узла:', id);

                // Открываем модальное окно для создания предзадачи
                if (window.TaskModalV2) {
                    window.TaskModalV2.open({
                        sourceNodeId: id,
                        processId: window.currentProcessId,
                        onSave: () => {
                            console.log('✅ Предзадача создана, перезагружаем canvas');
                            // Перезагрузить canvas
                            window.location.reload();
                        }
                    });
                }
            };

            return React.createElement('div', {
                style: {
                    padding: '15px 20px',
                    background: 'white',
                    border: `3px solid ${statusColor}`,
                    borderRadius: '8px',
                    minWidth: '200px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    position: 'relative'
                }
            }, [
                React.createElement('div', {
                    key: 'title',
                    style: {
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '5px'
                    }
                }, data.title || 'Задача'),
                data.status ? React.createElement('div', {
                    key: 'status',
                    style: {
                        fontSize: '12px',
                        color: '#666',
                        marginTop: '5px'
                    }
                }, `Статус: ${data.status}`) : null,
                // Кнопка добавления предзадачи (только для task узлов)
                data.isRealTask ? React.createElement('button', {
                    key: 'add-btn',
                    onClick: handleAddFuture,
                    style: {
                        marginTop: '10px',
                        padding: '5px 10px',
                        background: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        width: '100%'
                    }
                }, '➕ Добавить предзадачу') : null
            ]);
        }

        function FlowApp() {
            const [nodes, setNodes] = useState([]);
            const [edges, setEdges] = useState([]);
            const [loading, setLoading] = useState(true);
            const reactFlowInstanceRef = useRef(null);

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
                            positionX: 400,
                            positionY: 300,
                            connectionsFrom: [],
                            connectionsTo: [],
                            realTaskId: window.currentTaskId
                        };

                        await EntityManagerV2.saveNode(window.currentProcessId, initialNode);
                        console.log('✅ Начальный узел создан');

                        // Перезагрузить узлы
                        allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
                        console.log('✅ Узлов после создания:', allNodes.length);
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
                            title: node.title,
                            status: node.status,
                            isRealTask: node.type === 'task',
                            isFuture: node.type === 'future',
                            condition: node.condition,
                            realTaskId: node.realTaskId,
                            _node: node  // Сохраняем весь узел
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

            // Обработка изменений nodes
            const onNodesChange = useCallback((changes) => {
                setNodes((nds) => {
                    const updated = [...nds];
                    changes.forEach(change => {
                        if (change.type === 'position' && change.dragging === false) {
                            // Сохранить позицию
                            const node = updated.find(n => n.id === change.id);
                            if (node && change.position) {
                                saveNodePosition(node.id, change.position.x, change.position.y);
                            }
                        }
                    });
                    return updated.map(node => {
                        const change = changes.find(c => c.id === node.id);
                        if (change) {
                            if (change.type === 'position') {
                                return { ...node, position: change.position || node.position };
                            }
                        }
                        return node;
                    });
                });
            }, []);

            // Обработка изменений edges
            const onEdgesChange = useCallback((changes) => {
                // Не удаляем edges через UI, только программно
            }, []);

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
                    console.log('✅ Связь сохранена');

                    // Обновить edges
                    setEdges((eds) => [
                        ...eds,
                        {
                            id: `edge-${connection.source}-${connection.target}`,
                            source: connection.source,
                            target: connection.target,
                            type: 'default'
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

                    // Получить координаты мыши
                    const reactFlowBounds = document.querySelector('.react-flow').getBoundingClientRect();
                    const position = reactFlowInstanceRef.current.project({
                        x: event.clientX - reactFlowBounds.left,
                        y: event.clientY - reactFlowBounds.top,
                    });

                    // Открыть модалку
                    if (window.TaskModal) {
                        window.TaskModal.open('future', position, connectingNodeId);
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

                // Обновить визуально
                setNodes((nds) =>
                    nds.map(node => {
                        if (node.id === 'task-' + taskId) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    status: newStatus,
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

            // Подписка на BX.PULL (только один раз)
            useEffect(() => {
                if (nodes.length === 0) return; // Ждём загрузки узлов

                if (window.PullSubscription) {
                    // Найти все task узлы
                    nodes.forEach(node => {
                        if (node.type === 'task') {
                            const taskId = node.id.replace('task-', '');

                            // Правильные параметры для PullSubscription.subscribe:
                            // subscribe(taskId, onStatusChange, onTaskComplete)
                            window.PullSubscription.subscribe(
                                taskId,
                                (newStatus, task) => {
                                    console.log('🔄 Статус изменён через PULL:', taskId, '→', newStatus);
                                    handleStatusChange(taskId, newStatus);
                                },
                                (completedTaskId) => {
                                    console.log('✅ Задача завершена через PULL:', completedTaskId);
                                    handleStatusChange(completedTaskId, 5);
                                }
                            );
                        }
                    });
                }

                // Cleanup: отписка при размонтировании
                return () => {
                    if (window.PullSubscription) {
                        nodes.forEach(node => {
                            if (node.type === 'task') {
                                const taskId = node.id.replace('task-', '');
                                window.PullSubscription.unsubscribe(taskId);
                            }
                        });
                    }
                };
            }, []); // Пустой массив - подписка только один раз!

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
                    onConnect: onConnect,
                    onConnectStart: onConnectStart,
                    onConnectEnd: onConnectEnd,
                    onInit: (instance) => {
                        reactFlowInstanceRef.current = instance;
                        console.log('✅ ReactFlow готов');
                    },
                    nodeTypes: {
                        task: TaskNodeComponent,
                        future: TaskNodeComponent
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
