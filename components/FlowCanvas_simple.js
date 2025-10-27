/**
 * FlowCanvas - Упрощённая версия БЕЗ загрузки из entity (пока работает в памяти)
 */
window.FlowCanvas = {
    render: function(task) {
        const React = window.React;
        const ReactDOM = window.ReactDOM;
        const RF = window.ReactFlow || window.reactflow;

        if (!React || !ReactDOM || !RF) {
            console.error('React или ReactFlow не загружены');
            return;
        }

        const { useState, useCallback, useEffect, useRef } = React;
        const { ReactFlow, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges } = RF;

        function FlowApp() {
            // Начальное состояние - только текущая задача
            const initialNodes = [{
                id: 'task-' + task.id,
                type: 'taskNode',
                position: { x: 250, y: 100 },
                data: {
                    id: task.id,
                    title: task.title,
                    statusCode: task.status,
                    responsibleId: task.responsibleId,
                    isFuture: false
                }
            }];

            const [nodes, setNodes] = useState(initialNodes);
            const [edges, setEdges] = useState([]);
            const saveTimerRef = useRef(null);

            // Подписка на Pull события для изменения статуса
            useEffect(() => {
                console.log('🔔 Настраиваем подписку на изменения задачи ID:', task.id);

                const setupPullSubscription = function() {
                    if (typeof BX === 'undefined' || typeof BX.PULL === 'undefined') {
                        console.error('❌ BX.PULL недоступен');
                        return false;
                    }

                    console.log('✅ BX.PULL доступен');

                    if (typeof BX.addCustomEvent !== 'undefined') {
                        BX.addCustomEvent('onPullEvent', function(moduleId, command, params) {
                            if (moduleId === 'tasks' && command === 'task_update') {
                                if (params.TASK_ID == task.id) {
                                    const newStatus = params.AFTER ? params.AFTER.STATUS : null;
                                    
                                    if (newStatus) {
                                        console.log('✨ Обновляем статус задачи:', params.TASK_ID, '→', newStatus);

                                        setNodes((currentNodes) => {
                                            return currentNodes.map((node) => {
                                                if (node.id === 'task-' + task.id) {
                                                    return {
                                                        ...node,
                                                        data: {
                                                            ...node.data,
                                                            statusCode: newStatus
                                                        }
                                                    };
                                                }
                                                return node;
                                            });
                                        });
                                    }
                                }
                            }
                        });

                        console.log('✅ Подписка onPullEvent установлена');
                        return true;
                    }

                    return false;
                };

                if (!setupPullSubscription()) {
                    setTimeout(setupPullSubscription, 500);
                }

                return () => {
                    console.log('🧹 Очистка подписок Pull');
                };
            }, [task.id]);

            // Обработчики изменений
            const onNodesChange = useCallback((changes) => {
                setNodes((nds) => {
                    const updatedNodes = applyNodeChanges(changes, nds);
                    
                    // Логируем перемещение
                    changes.forEach(change => {
                        if (change.type === 'position' && change.position && !change.dragging) {
                            console.log('📍 Узел перемещён:', change.id, change.position);
                            // TODO: Сохранение позиции в entity
                        }
                    });
                    
                    return updatedNodes;
                });
            }, []);

            const onEdgesChange = useCallback((changes) => {
                setEdges((eds) => applyEdgeChanges(changes, eds));
            }, []);

            const onConnect = useCallback((connection) => {
                console.log('🔗 Новое соединение:', connection);
                
                const sourceNode = nodes.find(n => n.id === connection.source);
                
                if (!sourceNode) {
                    console.error('Исходный узел не найден:', connection.source);
                    return;
                }

                console.log('📋 Исходный узел:', sourceNode);
                
                // Открываем TaskModal
                if (window.TaskModal) {
                    window.TaskModal.show({
                        sourceNode: sourceNode,
                        connection: {
                            ...connection,
                            sourcePosition: sourceNode.position
                        },
                        onSave: (futureTaskData) => {
                            console.log('✅ Предзадача создана:', futureTaskData);
                            
                            // Добавляем новый узел на полотно
                            const newNode = {
                                id: futureTaskData.futureId,
                                type: 'taskNode',
                                position: futureTaskData.position,
                                data: {
                                    id: futureTaskData.futureId,
                                    title: futureTaskData.title,
                                    description: futureTaskData.description,
                                    responsibleId: futureTaskData.responsibleId,
                                    groupId: futureTaskData.groupId,
                                    conditionType: futureTaskData.conditionType,
                                    delayMinutes: futureTaskData.delayMinutes,
                                    isFuture: true
                                }
                            };
                            
                            setNodes(prev => [...prev, newNode]);
                            
                            // Добавляем edge
                            const newEdge = {
                                id: 'e-' + connection.source + '-' + futureTaskData.futureId,
                                source: connection.source,
                                target: futureTaskData.futureId,
                                type: 'default'
                            };
                            
                            setEdges(prev => [...prev, newEdge]);
                            
                            console.log('✅ Узел и связь добавлены на полотно');
                        }
                    });
                } else {
                    console.error('❌ TaskModal не найден');
                }
            }, [nodes]);

            // Типы узлов
            const nodeTypes = {
                taskNode: window.TaskNode
            };

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
                    onNodesChange: onNodesChange,
                    onEdgesChange: onEdgesChange,
                    onConnect: onConnect,
                    nodeTypes: nodeTypes,
                    fitView: true,
                    minZoom: 0.5,
                    maxZoom: 1.5,
                    connectionMode: 'loose',
                    defaultEdgeOptions: {
                        type: 'default',
                        animated: false
                    }
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

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(FlowApp));

        console.log('✅ FlowCanvas (simple) rendered');
    }
};

console.log('✅ FlowCanvas (simple) component loaded');
