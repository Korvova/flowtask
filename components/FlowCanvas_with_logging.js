/**
 * FlowCanvas - Главный компонент полотна React Flow
 * ВАЖНО: Entity names ≤20 chars (Bitrix24 limitation)
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

        const { useState, useCallback, useEffect } = React;
        const { ReactFlow, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges } = RF;

        // Главный компонент
        function FlowApp() {
            const [nodes, setNodes] = useState([]);
            const [edges, setEdges] = useState([]);
            const [isLoading, setIsLoading] = useState(true);

            // Загрузка данных процесса при монтировании
            useEffect(() => {
                console.log('🔧 Загружаем данные процесса для задачи ID:', task.id);
                loadProcessData();
            }, [task.id]);

            // Загрузка всех данных процесса
            const loadProcessData = async () => {
                try {
                    // 1. Загружаем позицию текущей задачи
                    const taskPosition = await loadTaskPosition(task.id);

                    // 2. Создаём узел текущей задачи
                    const mainNode = {
                        id: 'task-' + task.id,
                        type: 'taskNode',
                        position: taskPosition || { x: 250, y: 100 },
                        data: {
                            id: task.id,
                            title: task.title,
                            statusCode: task.status,
                            responsibleId: task.responsibleId,
                            isFuture: false,
                            isRealTask: true
                        }
                    };

                    // 3. Загружаем предзадачи (future tasks)
                    const futureTasks = await loadFutureTasks(task.id);
                    const futureNodes = futureTasks.map(ft => ({
                        id: ft.futureId,
                        type: 'taskNode',
                        position: { x: parseFloat(ft.positionX), y: parseFloat(ft.positionY) },
                        data: {
                            id: ft.futureId,
                            title: ft.title,
                            description: ft.description,
                            isFuture: true,
                            isRealTask: false,
                            conditionType: ft.conditionType
                        }
                    }));

                    // 4. Загружаем связи (connections)
                    const connections = await loadConnections(task.id);
                    const loadedEdges = connections.map(conn => ({
                        id: 'edge-' + conn.sourceId + '-' + conn.targetId,
                        source: conn.sourceId,
                        target: conn.targetId,
                        type: conn.connectionType === 'future' ? 'default' : 'default',
                        className: conn.connectionType === 'future' ? 'future-edge' : ''
                    }));

                    setNodes([mainNode, ...futureNodes]);
                    setEdges(loadedEdges);
                    setIsLoading(false);

                    console.log('✅ Данные процесса загружены:', {
                        nodes: [mainNode, ...futureNodes].length,
                        edges: loadedEdges.length
                    });

                } catch (error) {
                    console.error('❌ Ошибка загрузки данных процесса:', error);
                    // Если ошибка - показываем хотя бы основную задачу
                    setNodes([{
                        id: 'task-' + task.id,
                        type: 'taskNode',
                        position: { x: 250, y: 100 },
                        data: {
                            id: task.id,
                            title: task.title,
                            statusCode: task.status,
                            responsibleId: task.responsibleId,
                            isFuture: false,
                            isRealTask: true
                        }
                    }]);
                    setIsLoading(false);
                }
            };

            // Загрузка позиции задачи из entity
            const loadTaskPosition = (taskId) => {
                return new Promise((resolve) => {
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_task_pos',
                        FILTER: {
                            PROPERTY_taskId: taskId.toString()
                        }
                    }, (result) => {
                        if (result.error()) {
                            console.warn('Позиция задачи не найдена, используем default');
                            resolve(null);
                        } else {
                            const items = result.data();
                            if (items.length > 0) {
                                const item = items[0];
                                resolve({
                                    x: parseFloat(item.PROPERTY_VALUES.positionX),
                                    y: parseFloat(item.PROPERTY_VALUES.positionY)
                                });
                            } else {
                                resolve(null);
                            }
                        }
                    });
                });
            };

            // Загрузка предзадач из entity
            const loadFutureTasks = (taskId) => {
                return new Promise((resolve) => {
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_future_task',
                        FILTER: {
                            // Ищем все предзадачи где основная задача = наша
                            // TODO: добавить поле parentTaskId в entity
                        }
                    }, (result) => {
                        if (result.error()) {
                            console.warn('Предзадачи не найдены');
                            resolve([]);
                        } else {
                            const items = result.data();
                            const futureTasks = items.map(item => ({
                                futureId: item.PROPERTY_VALUES.futureId,
                                title: item.PROPERTY_VALUES.title,
                                description: item.PROPERTY_VALUES.description,
                                groupId: item.PROPERTY_VALUES.groupId,
                                responsibleId: item.PROPERTY_VALUES.responsibleId,
                                conditionType: item.PROPERTY_VALUES.conditionType,
                                delayMinutes: item.PROPERTY_VALUES.delayMinutes,
                                positionX: item.PROPERTY_VALUES.positionX,
                                positionY: item.PROPERTY_VALUES.positionY,
                                isCreated: item.PROPERTY_VALUES.isCreated === 'true',
                                realTaskId: item.PROPERTY_VALUES.realTaskId
                            }));
                            resolve(futureTasks);
                        }
                    });
                });
            };

            // Загрузка связей из entity
            const loadConnections = (taskId) => {
                return new Promise((resolve) => {
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_connections',
                        FILTER: {
                            // TODO: добавить фильтр по задаче
                        }
                    }, (result) => {
                        if (result.error()) {
                            console.warn('Связи не найдены');
                            resolve([]);
                        } else {
                            const items = result.data();
                            const connections = items.map(item => ({
                                sourceId: item.PROPERTY_VALUES.sourceId,
                                targetId: item.PROPERTY_VALUES.targetId,
                                connectionType: item.PROPERTY_VALUES.connectionType
                            }));
                            resolve(connections);
                        }
                    });
                });
            };

            // Сохранение позиции узла (с debounce)
            let savePositionTimeout = null;
            const saveNodePosition = (nodeId, position) => {
                clearTimeout(savePositionTimeout);
                savePositionTimeout = setTimeout(() => {
                    console.log('💾 Сохраняем позицию узла:', nodeId, position);

                    // Если это основная задача (начинается с 'task-')
                    if (nodeId.startsWith('task-')) {
                        const taskId = nodeId.replace('task-', '');

                        // Проверяем, есть ли уже запись
                        BX24.callMethod('entity.item.get', {
                            ENTITY: 'tflow_task_pos',
                            FILTER: {
                                PROPERTY_taskId: taskId
                            }
                        }, (getResult) => {
                            if (getResult.error()) {
                                console.error('Ошибка проверки позиции:', getResult.error());
                                return;
                            }

                            const items = getResult.data();

                            if (items.length > 0) {
                                // Обновляем существующую
                                const itemId = items[0].ID;
                                BX24.callMethod('entity.item.update', {
                                    ENTITY: 'tflow_task_pos',
                                    ID: itemId,
                                    PROPERTY_VALUES: {
                                        positionX: position.x.toString(),
                                        positionY: position.y.toString()
                                    }
                                }, (updateResult) => {
                                    if (updateResult.error()) {
                                        console.error('Ошибка обновления позиции:', updateResult.error());
                                    } else {
                                        console.log('✅ Позиция обновлена');
                                    }
                                });
                            } else {
                                // Создаём новую
                                BX24.callMethod('entity.item.add', {
                                    ENTITY: 'tflow_task_pos',
                                    NAME: 'Position for task ' + taskId,
                                    PROPERTY_VALUES: {
                                        taskId: taskId,
                                        positionX: position.x.toString(),
                                        positionY: position.y.toString()
                                    }
                                }, (addResult) => {
                                    if (addResult.error()) {
                                        console.error('Ошибка создания позиции:', addResult.error());
                                    } else {
                                        console.log('✅ Позиция создана:', addResult.data());
                                    }
                                });
                            }
                        });
                    }
                    // TODO: сохранение позиций предзадач
                }, 500); // Debounce 500ms
            };

            // Обработчики изменений узлов
            const onNodesChange = useCallback((changes) => {
                setNodes((nds) => {
                    const updatedNodes = applyNodeChanges(changes, nds);

                    // Сохраняем позицию при перемещении
                    changes.forEach(change => {
                        if (change.type === 'position' && change.position && !change.dragging) {
                            saveNodePosition(change.id, change.position);
                        }
                    });

                    return updatedNodes;
                });
            }, []);

            const onEdgesChange = useCallback((changes) => {
                setEdges((eds) => applyEdgeChanges(changes, eds));
            }, []);

            // Обработчик создания новой связи
            const onConnect = useCallback((connection) => {
                console.log('🔗 Новое соединение:', connection);

                // Открываем модальное окно для создания предзадачи
                if (typeof window.TaskModal !== 'undefined') {
                    window.TaskModal.show({
                        sourceId: connection.source,
                        targetId: connection.target,
                        taskId: task.id,
                        onSave: (futureTaskData) => {
                            // Создаём предзадачу в entity
                            saveFutureTask(futureTaskData, connection);
                        }
                    });
                } else {
                    console.error('TaskModal не загружен');
                }
            }, [task.id]);

            // Сохранение предзадачи
            const saveFutureTask = (futureTaskData, connection) => {
                console.log('💾 Сохраняем предзадачу:', futureTaskData);

                const futureId = 'future-' + Date.now();

                // Сохраняем в entity
                BX24.callMethod('entity.item.add', {
                    ENTITY: 'tflow_future_task',
                    NAME: futureTaskData.title,
                    PROPERTY_VALUES: {
                        futureId: futureId,
                        title: futureTaskData.title,
                        description: futureTaskData.description,
                        groupId: futureTaskData.groupId.toString(),
                        responsibleId: futureTaskData.responsibleId.toString(),
                        conditionType: futureTaskData.conditionType,
                        delayMinutes: futureTaskData.delayMinutes.toString(),
                        positionX: futureTaskData.positionX.toString(),
                        positionY: futureTaskData.positionY.toString(),
                        isCreated: 'false',
                        realTaskId: ''
                    }
                }, (result) => {
                    if (result.error()) {
                        console.error('Ошибка создания предзадачи:', result.error());
                        return;
                    }

                    console.log('✅ Предзадача создана:', result.data());

                    // Сохраняем связь
                    BX24.callMethod('entity.item.add', {
                        ENTITY: 'tflow_connections',
                        NAME: 'Connection ' + connection.source + ' -> ' + connection.target,
                        PROPERTY_VALUES: {
                            sourceId: connection.source,
                            targetId: connection.target,
                            connectionType: 'future'
                        }
                    }, (connResult) => {
                        if (connResult.error()) {
                            console.error('Ошибка создания связи:', connResult.error());
                        } else {
                            console.log('✅ Связь создана');
                            // Перезагружаем данные
                            loadProcessData();
                        }
                    });
                });
            };

            // Подписка на изменения задачи через Pull & Push
            useEffect(() => {
                console.log('🔔 Подписываемся на изменения задачи ID:', task.id);

                // Альтернативный метод: периодическая проверка статуса
                const pollInterval = setInterval(() => {
                    BX24.callMethod('tasks.task.get', {
                        taskId: task.id,
                        select: ['ID', 'TITLE', 'STATUS']
                    }, (result) => {
                        if (result.error()) {
                            console.error('❌ Ошибка получения задачи:', result.error());
                            return;
                        }

                        const taskData = result.data();
                        if (taskData && taskData.task) {
                            const currentStatus = taskData.task.status;

                            // Обновляем только если статус изменился
                            setNodes((currentNodes) => {
                                const currentNode = currentNodes.find(n => n.id === 'task-' + task.id);
                                if (currentNode && currentNode.data.statusCode != currentStatus) {
                                    console.log('🔄 Статус изменился:', currentNode.data.statusCode, '→', currentStatus);

                                    return currentNodes.map((node) => {
                                        if (node.id === 'task-' + task.id) {
                                            return {
                                                ...node,
                                                data: {
                                                    ...node.data,
                                                    statusCode: currentStatus,
                                                    title: taskData.task.title || node.data.title
                                                }
                                            };
                                        }
                                        return node;
                                    });
                                }
                                return currentNodes;
                            });
                        }
                    });
                }, 3000); // Проверяем каждые 3 секунды

                // Очистка при размонтировании
                return () => {
                    clearInterval(pollInterval);
                    console.log('🧹 Очистка подписок');
                };
            }, [task.id]);

            // Типы узлов
            const nodeTypes = {
                taskNode: window.TaskNode
            };

            if (isLoading) {
                return React.createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        fontSize: '24px'
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
                    onNodesChange: onNodesChange,
                    onEdgesChange: onEdgesChange,
                    onConnect: onConnect,
                    nodeTypes: nodeTypes,
                    fitView: true,
                    minZoom: 0.5,
                    maxZoom: 1.5,
                    connectionMode: 'loose', // Позволяет создавать связи в пустое место
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

        // Рендерим приложение
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(FlowApp));

        console.log('✅ FlowCanvas rendered');
    }
};

console.log('✅ FlowCanvas component loaded');
