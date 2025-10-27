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

        const { useState, useCallback, useEffect, useMemo } = React;
        const { ReactFlow, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges, useNodesState, useEdgesState } = RF;

        // Главный компонент
        function FlowApp() {
            console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-size: 20px; font-weight: bold;');
            console.log('%c🚀 FlowApp ИНИЦИАЛИЗИРОВАН!', 'color: #00ff00; font-size: 20px; font-weight: bold;');
            console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-size: 20px; font-weight: bold;');

            // Добавляем видимый индикатор на страницу
            const debugDiv = document.createElement('div');
            debugDiv.id = 'flowtask-debug-indicator';
            debugDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #00ff00; color: #000; padding: 10px; z-index: 99999; font-weight: bold; text-align: center;';
            debugDiv.textContent = '✅ FLOWTASK ЗАГРУЖЕН! Версия: v=1761569484 - Смотрите консоль';
            document.body.appendChild(debugDiv);
            setTimeout(() => debugDiv.remove(), 5000);

            const [nodes, setNodes, onNodesChange] = useNodesState([]);
            const [edges, setEdges, onEdgesChange] = useEdgesState([]);
            const [isLoading, setIsLoading] = useState(true);
            const [debugLog, setDebugLog] = useState([]);
            const isDraggingRef = React.useRef(false);
            const connectingNodeId = React.useRef(null);
            const reactFlowInstance = React.useRef(null);

            // Функция добавления в debug лог
            const addDebugLog = (message, color = '#000') => {
                const timestamp = new Date().toLocaleTimeString();
                const logEntry = `[${timestamp}] ${message}`;
                console.log(`%c${logEntry}`, `color: ${color}; font-weight: bold;`);
                setDebugLog(prev => [...prev, { message: logEntry, color }].slice(-20)); // Последние 20 записей
            };

            React.useEffect(() => {
                addDebugLog('FlowApp смонтирован', '#00ff00');
            }, []);

            // Загрузка данных процесса при монтировании
            useEffect(() => {
                console.log('🔧 Загружаем данные процесса для задачи ID:', task.id);
                loadProcessData();
            }, [task.id]);

            // Загрузка всех данных процесса
            const loadProcessData = async () => {
                addDebugLog('📥 ЗАГРУЗКА ДАННЫХ ПРОЦЕССА', '#2196f3');

                try {
                    // 1. Загружаем позицию текущей задачи
                    const taskPosition = await loadTaskPosition(task.id);

                    // 2. Загружаем свежий статус задачи
                    const freshTaskData = await new Promise((resolve) => {
                        BX24.callMethod('tasks.task.get', {
                            taskId: task.id,
                            select: ['ID', 'TITLE', 'STATUS', 'RESPONSIBLE_ID']
                        }, (result) => {
                            if (result.error()) {
                                console.warn('Не удалось загрузить свежий статус, используем кэш');
                                resolve(task);
                            } else {
                                resolve(result.data().task);
                            }
                        });
                    });

                    // 3. Создаём узел текущей задачи с актуальным статусом
                    const mainNode = {
                        id: 'task-' + task.id,
                        type: 'taskNode',
                        position: taskPosition || { x: 250, y: 100 },
                        draggable: true,
                        data: {
                            id: freshTaskData.id,
                            title: freshTaskData.title,
                            statusCode: freshTaskData.status,
                            responsibleId: freshTaskData.responsibleId,
                            isFuture: false,
                            isRealTask: true
                        }
                    };

                    // 4. Загружаем предзадачи (future tasks)
                    const futureTasks = await loadFutureTasks(task.id);

                    // Разделяем на созданные и несозданные задачи
                    const futureNodes = [];
                    const createdTaskIds = [];

                    addDebugLog('📋 Предзадач: ' + futureTasks.length, '#2196f3');
                    futureTasks.forEach(ft => {
                        const isCreated = ft.isCreated || false;
                        const realTaskId = ft.realTaskId || 'нет';
                        addDebugLog('  → ' + ft.futureId.substring(7, 17) + ' created=' + isCreated + ' taskId=' + realTaskId, '#2196f3');
                    });

                    for (const ft of futureTasks) {
                        if (ft.isCreated && ft.realTaskId) {
                            // Эта предзадача уже стала реальной задачей
                            addDebugLog('✅ Создана → task-' + ft.realTaskId, '#00ff00');
                            createdTaskIds.push(ft.realTaskId);
                        } else {
                            // Обычная предзадача (ещё не создана)
                            addDebugLog('📋 Несоздана: ' + ft.futureId.substring(7, 17), '#ff9800');
                            futureNodes.push({
                                id: ft.futureId,
                                type: 'taskNode',
                                position: { x: parseFloat(ft.positionX), y: parseFloat(ft.positionY) },
                                draggable: true,
                                data: {
                                    id: ft.futureId,
                                    futureId: ft.futureId,
                                    parentTaskId: ft.parentTaskId,
                                    title: ft.title,
                                    description: ft.description,
                                    groupId: ft.groupId,
                                    responsibleId: ft.responsibleId,
                                    isFuture: true,
                                    isRealTask: false,
                                    conditionType: ft.conditionType,
                                    delayMinutes: ft.delayMinutes,
                                    positionX: ft.positionX,
                                    positionY: ft.positionY,
                                    isCreated: ft.isCreated,
                                    realTaskId: ft.realTaskId,
                                    entityItemId: ft.id,  // ID в Entity для удаления
                                    onDelete: () => deleteFutureTask(ft.futureId, ft.id),
                                    onEdit: (data) => {
                                        console.log('📝 Открываем редактирование:', data.futureId);
                                        // Добавляем callback для обновления
                                        data.onUpdate = updateFutureTask;
                                        window.TaskModal.showEdit(data);
                                    }
                                }
                            });
                        }
                    }

                    // Загружаем данные созданных задач
                    addDebugLog('📥 Загружаем созданные: ' + createdTaskIds.length, '#2196f3');
                    const createdTaskNodes = await loadCreatedTasks(createdTaskIds, futureTasks);
                    addDebugLog('✅ Загружено узлов: ' + createdTaskNodes.length, '#00ff00');

                    // 4. Загружаем связи (connections)
                    const connections = await loadConnections(task.id);
                    const loadedEdges = connections.map(conn => {
                        console.log('📊 Создаём edge:', conn.sourceId, '→', conn.targetId);
                        return {
                            id: 'edge-' + conn.sourceId + '-' + conn.targetId,
                            source: conn.sourceId,
                            target: conn.targetId,
                            type: conn.connectionType === 'future' ? 'default' : 'default',
                            className: conn.connectionType === 'future' ? 'future-edge' : ''
                        };
                    });
                    
                    console.log('📊 Всего загружено edges:', loadedEdges.length);
                    loadedEdges.forEach(edge => {
                        console.log('  ↳', edge.source, '→', edge.target);
                    });

                    setNodes([mainNode, ...futureNodes, ...createdTaskNodes]);
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
                        ENTITY: 'tflow_pos',
                        FILTER: {
                            PROPERTY_taskId: taskId.toString()
                        }
                    }, (result) => {
                        if (result.error()) {
                            console.warn('Позиция задачи не найдена, используем default');
                            resolve(null);
                        } else {
                            const items = result.data();
                            console.log("📥 Entity result:", items);
                            if (items.length > 0) {
                                const item = items[0];
                                console.log("📦 Item FULL JSON:", JSON.stringify(item, null, 2));
                                console.log("🔑 Keys:", Object.keys(item));
                                if (item.DETAIL_TEXT) {
                                    try {
                                        const data = JSON.parse(item.DETAIL_TEXT);
                                        console.log("✅ Position from DETAIL_TEXT:", data);
                                        resolve({
                                            x: parseFloat(data.positionX),
                                            y: parseFloat(data.positionY)
                                        });
                                    } catch (e) {
                                        console.error("❌ JSON parse error:", e);
                                        resolve(null);
                                    }
                                } else {
                                    console.error("❌ No DETAIL_TEXT:", item);
                                    resolve(null);
                                }
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
                        ENTITY: 'tflow_future'
                    }, (result) => {
                        if (result.error()) {
                            console.warn('Предзадачи не найдены');
                            resolve([]);
                        } else {
                            const items = result.data();
                            console.log("📥 Entity result:", items);
                            const futureTasks = items
                                .filter(item => {
                                    if (!item.DETAIL_TEXT) return false;
                                    try {
                                        const data = JSON.parse(item.DETAIL_TEXT);
                                        return data.parentTaskId == taskId;
                                    } catch (e) {
                                        console.warn('Failed to parse DETAIL_TEXT:', e);
                                        return false;
                                    }
                                })
                                .map(item => {
                                    const data = JSON.parse(item.DETAIL_TEXT);
                                    return {
                                        id: item.ID,
                                        futureId: data.futureId,
                                        title: data.title,
                                        description: data.description,
                                        groupId: data.groupId,
                                        responsibleId: data.responsibleId,
                                        conditionType: data.conditionType,
                                        delayMinutes: data.delayMinutes,
                                        positionX: data.positionX,
                                        positionY: data.positionY,
                                        isCreated: data.isCreated,
                                        realTaskId: data.realTaskId
                                    };
                                });
                            resolve(futureTasks);
                        }
                    });
                });
            };

            // Загрузка созданных задач (которые были предзадачами)
            const loadCreatedTasks = async (taskIds, futureTasks) => {
                if (taskIds.length === 0) {
                    console.log('ℹ️  Нет созданных задач для загрузки');
                    return [];
                }

                console.log('📥 Загружаем созданные задачи:', taskIds);
                console.log('📥 Соответствующие предзадачи:', futureTasks.filter(ft => ft.isCreated).map(ft => ft.futureId));

                const createdNodes = [];

                for (const taskId of taskIds) {
                    try {
                        const taskData = await new Promise((resolve) => {
                            BX24.callMethod('tasks.task.get', {
                                taskId: taskId,
                                select: ['ID', 'TITLE', 'STATUS', 'RESPONSIBLE_ID']
                            }, (result) => {
                                if (result.error()) {
                                    console.warn('Не удалось загрузить задачу:', taskId);
                                    resolve(null);
                                } else {
                                    resolve(result.data().task);
                                }
                            });
                        });

                        if (!taskData) continue;

                        // Находим соответствующую предзадачу для получения позиции по умолчанию
                        const futureTask = futureTasks.find(ft => ft.realTaskId == taskId);
                        if (!futureTask) continue;

                        // ВАЖНО: Проверяем, есть ли сохранённая позиция в tflow_pos
                        addDebugLog('🔍 Проверяем позицию для task-' + taskId, '#9c27b0');
                        const savedPosition = await new Promise((resolve) => {
                            BX24.callMethod('entity.item.get', {
                                ENTITY: 'tflow_pos',
                                FILTER: {
                                    PROPERTY_taskId: taskId.toString()
                                }
                            }, (posResult) => {
                                if (posResult.error() || !posResult.data().length) {
                                    console.log('📍 Для задачи', taskId, 'нет сохранённой позиции, используем из предзадачи');
                                    addDebugLog('⚠️ Нет сохранённой позиции для task-' + taskId + ', используем из предзадачи', '#ff9800');
                                    resolve(null);
                                } else {
                                    const posData = JSON.parse(posResult.data()[0].DETAIL_TEXT);
                                    console.log('📍 Найдена сохранённая позиция для задачи', taskId, ':', posData);
                                    addDebugLog('✅ Найдена позиция task-' + taskId + ': (' + Math.round(posData.positionX) + ', ' + Math.round(posData.positionY) + ')', '#4caf50');
                                    resolve({ x: parseFloat(posData.positionX), y: parseFloat(posData.positionY) });
                                }
                            });
                        });

                        // Используем сохранённую позицию или позицию из предзадачи
                        const position = savedPosition || {
                            x: parseFloat(futureTask.positionX),
                            y: parseFloat(futureTask.positionY)
                        };

                        addDebugLog('📍 Итоговая позиция task-' + taskId + ': (' + Math.round(position.x) + ', ' + Math.round(position.y) + ')', '#00bcd4');

                        createdNodes.push({
                            id: 'task-' + taskId,
                            type: 'taskNode',
                            position: position,
                            draggable: true,
                            data: {
                                id: taskId,
                                title: taskData.title,
                                statusCode: taskData.status,
                                responsibleId: taskData.responsibleId,
                                isFuture: false,
                                isRealTask: true
                            }
                        });

                        console.log('✅ Загружена созданная задача:', taskId, taskData.title, 'позиция:', position);

                    } catch (error) {
                        console.error('Ошибка при загрузке задачи:', taskId, error);
                    }
                }

                return createdNodes;
            };

            // Загрузка связей из entity
            const loadConnections = (taskId) => {
                return new Promise((resolve) => {
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_conn'
                    }, (result) => {
                        if (result.error()) {
                            console.warn('Связи не найдены');
                            resolve([]);
                        } else {
                            const items = result.data();
                            console.log("📥 Entity result:", items);
                            const connections = items
                                .filter(item => {
                                    if (!item.DETAIL_TEXT) return false;
                                    try {
                                        const data = JSON.parse(item.DETAIL_TEXT);
                                        // Фильтруем связи где source или target связан с текущей задачей
                                        return data.sourceId === 'task-' + taskId ||
                                               data.targetId === 'task-' + taskId ||
                                               data.sourceId.includes('future-') ||
                                               data.targetId.includes('future-');
                                    } catch (e) {
                                        console.warn('Failed to parse DETAIL_TEXT:', e);
                                        return false;
                                    }
                                })
                                .map(item => {
                                    const data = JSON.parse(item.DETAIL_TEXT);
                                    return {
                                        id: item.ID,
                                        sourceId: data.sourceId,
                                        targetId: data.targetId,
                                        connectionType: data.connectionType
                                    };
                                });
                            resolve(connections);
                        }
                    });
                });
            };

            // Сохранение позиции узла (с debounce)
            let savePositionTimeout = null;
            const saveNodePosition = (nodeId, position) => {
                console.log('💾 Сохраняем позицию узла:', nodeId, position);

                // Проверяем что узел всё ещё существует (не был удалён)
                const nodeExists = nodes.find(n => n.id === nodeId);
                if (!nodeExists) {
                    console.log('⚠️  Узел не найден (возможно удалён), пропускаем сохранение:', nodeId);
                    return;
                }

                // Если это основная задача (начинается с 'task-')
                if (nodeId.startsWith('task-')) {
                    const taskId = nodeId.replace('task-', '');

                    // Проверяем, есть ли уже запись
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_pos',
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
                            addDebugLog('💾 Обновляем позицию task-' + taskId + ': (' + Math.round(position.x) + ', ' + Math.round(position.y) + ')', '#2196f3');
                            BX24.callMethod('entity.item.update', {
                                ENTITY: 'tflow_pos',
                                ID: itemId,
                                DETAIL_TEXT: JSON.stringify({
                                    taskId: taskId,
                                    positionX: position.x,
                                    positionY: position.y
                                })
                            }, (updateResult) => {
                                if (updateResult.error()) {
                                    console.error('Ошибка обновления позиции:', updateResult.error());
                                    addDebugLog('❌ Ошибка сохранения позиции task-' + taskId, '#f44336');
                                } else {
                                    console.log('✅ Позиция задачи обновлена');
                                    addDebugLog('✅ Позиция task-' + taskId + ' сохранена', '#4caf50');
                                }
                            });
                        } else {
                            // Создаём новую
                            addDebugLog('➕ Создаём новую позицию task-' + taskId + ': (' + Math.round(position.x) + ', ' + Math.round(position.y) + ')', '#2196f3');
                            BX24.callMethod('entity.item.add', {
                                ENTITY: 'tflow_pos',
                                NAME: 'Task ' + taskId,
                                DETAIL_TEXT: JSON.stringify({
                                    taskId: taskId,
                                    positionX: position.x,
                                    positionY: position.y
                                })
                            }, (addResult) => {
                                if (addResult.error()) {
                                    console.error('Ошибка создания позиции:', addResult.error());
                                    addDebugLog('❌ Ошибка создания позиции task-' + taskId, '#f44336');
                                } else {
                                    console.log('✅ Позиция задачи создана:', addResult.data());
                                    addDebugLog('✅ Позиция task-' + taskId + ' создана (ID: ' + addResult.data() + ')', '#4caf50');
                                }
                            });
                        }
                    });
                }
                // Если это предзадача (начинается с 'future-')
                else if (nodeId.startsWith('future-')) {
                    console.log('📍 Сохраняем позицию предзадачи:', nodeId);
                    
                    // Находим предзадачу по futureId и обновляем её позицию
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_future'
                    }, (getResult) => {
                        if (getResult.error()) {
                            console.error('Ошибка получения предзадач:', getResult.error());
                            return;
                        }

                        const items = getResult.data();
                        const futureItem = items.find(item => {
                            if (!item.DETAIL_TEXT) return false;
                            try {
                                const data = JSON.parse(item.DETAIL_TEXT);
                                return data.futureId === nodeId;
                            } catch (e) {
                                return false;
                            }
                        });

                        if (futureItem) {
                            // Парсим существующие данные
                            const existingData = JSON.parse(futureItem.DETAIL_TEXT);
                            
                            // Обновляем позицию
                            existingData.positionX = position.x;
                            existingData.positionY = position.y;

                            // Сохраняем обратно
                            BX24.callMethod('entity.item.update', {
                                ENTITY: 'tflow_future',
                                ID: futureItem.ID,
                                DETAIL_TEXT: JSON.stringify(existingData)
                            }, (updateResult) => {
                                if (updateResult.error()) {
                                    console.error('Ошибка обновления позиции предзадачи:', updateResult.error());
                                } else {
                                    console.log('✅ Позиция предзадачи обновлена');
                                }
                            });
                        } else {
                            console.warn('⚠️  Предзадача не найдена:', nodeId);
                        }
                    });
                }
            };

            // Обработчики изменений узлов
            const onNodeDragStop = useCallback((event, node) => {
                console.log('🎯 Drag stopped for:', node.id, node.position);
                addDebugLog('🎯 Перетащили ' + node.id + ' в (' + Math.round(node.position.x) + ', ' + Math.round(node.position.y) + ')', '#ff5722');
                isDraggingRef.current = false;
                saveNodePosition(node.id, node.position);
            }, []);

            // Начало создания связи (когда начинают тянуть от handle)
            const onConnectStart = useCallback((event, { nodeId, handleType }) => {
                console.log('🔗 Начало соединения от узла:', nodeId, 'тип:', handleType);
                connectingNodeId.current = nodeId;
                console.log('✅ connectingNodeId установлен:', connectingNodeId.current);
            }, []);

            // Конец создания связи (когда отпускают)
            const onConnectEnd = useCallback((event) => {
                console.log('🔗 Конец соединения, target:', event.target.className);

                // Проверяем, отпустили ли на пустое место (react-flow__pane)
                const targetIsPane = event.target.classList.contains('react-flow__pane');

                if (targetIsPane && connectingNodeId.current) {
                    console.log('✅ Отпустили на пустое место! Открываем модалку для создания предзадачи');

                    // Конвертируем координаты браузера в координаты React Flow canvas
                    const { clientX, clientY } = event;
                    let position = { x: clientX - 300, y: clientY - 100 }; // Приблизительная компенсация
                    
                    // Если reactFlowInstance доступен, используем screenToFlowPosition
                    if (reactFlowInstance.current) {
                        position = reactFlowInstance.current.screenToFlowPosition({
                            x: clientX,
                            y: clientY
                        });
                        console.log('📍 Позиция: browser', { clientX, clientY }, '→ flow', position);
                    } else {
                        console.warn('⚠️  reactFlowInstance не готов, используем приблизительные координаты');
                    }
                    
                    // Открываем модальное окно
                    if (typeof window.TaskModal !== 'undefined') {
                        window.TaskModal.show({
                            sourceId: connectingNodeId.current,
                            taskId: task.id,
                            position: position,
                            onSave: (futureTaskData) => {
                                const sourceNodeId = connectingNodeId.current;
                                console.log('💾 Сохраняем предзадачу, sourceId:', sourceNodeId);
                                
                                // Сбрасываем connectingNodeId теперь
                                connectingNodeId.current = null;
                                
                                // Добавляем sourceId к данным
                                saveFutureTask({
                                    ...futureTaskData,
                                    sourceId: sourceNodeId
                                });
                            }
                        });
                    } else {
                        console.error('❌ TaskModal не загружен');
                    }
                }

                // НЕ сбрасываем connectingNodeId сразу - он нужен в callback onSave
                // Сбросим только если модалка не открылась
                if (!targetIsPane || !connectingNodeId.current) {
                    connectingNodeId.current = null;
                }
            }, [task.id]);

            // Соединение узел -> узел (когда тянут от одного узла к другому)
            const onConnect = useCallback((params) => {
                console.log('🔗 Соединение узел -> узел:', params);
                // Создаём прямую связь между узлами
                setEdges((eds) => addEdge({ ...params, animated: true }, eds));
            }, [setEdges]);

            // Сохранение предзадачи
            const saveFutureTask = (futureTaskData) => {
                console.log('💾 Сохраняем предзадачу:', futureTaskData);

                const futureId = 'future-' + Date.now();
                // Используем sourceId из параметров (может быть task-X или future-X)
                const sourceId = futureTaskData.sourceId || ('task-' + task.id);
                
                console.log('🔗 Создаём связь от', sourceId, 'к', futureId);

                // Сохраняем в entity через DETAIL_TEXT (PROPERTY_VALUES не работает!)
                BX24.callMethod('entity.item.add', {
                    ENTITY: 'tflow_future',
                    NAME: futureTaskData.title.substring(0, 50),
                    DETAIL_TEXT: JSON.stringify({
                        futureId: futureId,
                        parentTaskId: task.id,
                        title: futureTaskData.title,
                        description: futureTaskData.description,
                        groupId: futureTaskData.groupId,
                        responsibleId: futureTaskData.responsibleId,
                        conditionType: futureTaskData.conditionType,
                        delayMinutes: futureTaskData.delayMinutes,
                        positionX: futureTaskData.positionX,
                        positionY: futureTaskData.positionY,
                        isCreated: false,
                        realTaskId: null
                    })
                }, (result) => {
                    if (result.error()) {
                        console.error('Ошибка создания предзадачи:', result.error());
                        return;
                    }

                    console.log('✅ Предзадача создана:', result.data());

                    // Сохраняем связь через DETAIL_TEXT
                    const connectionData = {
                        parentTaskId: task.id,
                        sourceId: sourceId,
                        targetId: futureId,
                        connectionType: 'future'
                    };
                    console.log('💾 Сохраняем связь в Entity:', connectionData);
                    
                    BX24.callMethod('entity.item.add', {
                        ENTITY: 'tflow_conn',
                        NAME: sourceId + '->' + futureId,
                        DETAIL_TEXT: JSON.stringify(connectionData)
                    }, (connResult) => {
                        if (connResult.error()) {
                            console.error('Ошибка создания связи:', connResult.error());
                        } else {
                            console.log('✅ Связь создана');
                            
                            // Вместо полной перезагрузки добавляем только новые узлы и edges
                            // Это предотвращает мигание основной задачи
                            
                            // Создаём новый узел предзадачи
                            const newFutureNode = {
                                id: futureId,
                                type: 'taskNode',
                                position: {
                                    x: parseFloat(futureTaskData.positionX),
                                    y: parseFloat(futureTaskData.positionY)
                                },
                                draggable: true,
                                data: {
                                    id: futureId,
                                    futureId: futureId,
                                    parentTaskId: futureTaskData.parentTaskId,
                                    title: futureTaskData.title,
                                    description: futureTaskData.description,
                                    groupId: futureTaskData.groupId,
                                    responsibleId: futureTaskData.responsibleId,
                                    isFuture: true,
                                    isRealTask: false,
                                    conditionType: futureTaskData.conditionType,
                                    delayMinutes: futureTaskData.delayMinutes,
                                    positionX: futureTaskData.positionX,
                                    positionY: futureTaskData.positionY,
                                    isCreated: futureTaskData.isCreated || false,
                                    realTaskId: futureTaskData.realTaskId || null,
                                    entityItemId: result.data(),  // ID из Entity
                                    onDelete: () => deleteFutureTask(futureId, result.data()),
                                    onEdit: (data) => {
                                        console.log('📝 Открываем редактирование:', data.futureId);
                                        data.onUpdate = updateFutureTask;
                                        window.TaskModal.showEdit(data);
                                    }
                                }
                            };
                            
                            // Создаём новый edge
                            const newEdge = {
                                id: 'edge-' + sourceId + '-' + futureId,
                                source: sourceId,
                                target: futureId,
                                type: 'default',
                                className: 'future-edge'
                            };
                            
                            console.log('➕ Добавляем новый узел:', futureId);
                            console.log('➕ Добавляем новую связь:', sourceId, '→', futureId);
                            
                            // Обновляем состояние напрямую (без полной перезагрузки)
                            setNodes(currentNodes => [...currentNodes, newFutureNode]);
                            setEdges(currentEdges => [...currentEdges, newEdge]);
                        }
                    });
                });
            };

            // Удаление предзадачи
            const deleteFutureTask = (futureId, entityItemId) => {
                console.log('🗑️  Удаляем предзадачу:', futureId, 'Entity ID:', entityItemId);
                
                if (!confirm('Удалить предзадачу?')) {
                    return;
                }
                
                // 1. Удаляем предзадачу из Entity
                BX24.callMethod('entity.item.delete', {
                    ENTITY: 'tflow_future',
                    ID: entityItemId
                }, (result) => {
                    if (result.error()) {
                        console.error('Ошибка удаления предзадачи:', result.error());
                        alert('Ошибка удаления: ' + result.error());
                        return;
                    }
                    
                    console.log('✅ Предзадача удалена из Entity');
                    
                    // 2. Удаляем все связи с этой предзадачей
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_conn'
                    }, (getResult) => {
                        if (getResult.error()) {
                            console.warn('Не удалось загрузить связи');
                            loadProcessData();
                            return;
                        }
                        
                        const connections = getResult.data();
                        const toDelete = connections.filter(conn => {
                            if (!conn.DETAIL_TEXT) return false;
                            try {
                                const data = JSON.parse(conn.DETAIL_TEXT);
                                return data.sourceId === futureId || data.targetId === futureId;
                            } catch (e) {
                                return false;
                            }
                        });
                        
                        console.log('🗑️  Найдено связей для удаления:', toDelete.length);
                        
                        // Удаляем связи
                        let deleted = 0;
                        toDelete.forEach(conn => {
                            BX24.callMethod('entity.item.delete', {
                                ENTITY: 'tflow_conn',
                                ID: conn.ID
                            }, (delResult) => {
                                if (!delResult.error()) {
                                    deleted++;
                                    console.log('✅ Связь удалена:', conn.ID);
                                }
                                
                                // Перезагружаем после последней операции
                                if (deleted === toDelete.length) {
                                    console.log('✅ Все связи удалены, перезагружаем...');
                                    loadProcessData();
                                }
                            });
                        });
                        
                        // Если связей не было, просто перезагружаем
                        if (toDelete.length === 0) {
                            loadProcessData();
                        }
                    });
                });
            };

            // Обновление предзадачи
            const updateFutureTask = (updatedData) => {
                console.log('✏️ Обновляем предзадачу:', updatedData.futureId);

                // Найти Entity ID для этой предзадачи
                BX24.callMethod('entity.item.get', {
                    ENTITY: 'tflow_future'
                }, (result) => {
                    if (result.error()) {
                        console.error('Ошибка загрузки предзадач:', result.error());
                        alert('Ошибка обновления: ' + result.error());
                        return;
                    }

                    const items = result.data();
                    const futureItem = items.find(item => {
                        if (!item.DETAIL_TEXT) return false;
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            return data.futureId === updatedData.futureId;
                        } catch (e) {
                            return false;
                        }
                    });

                    if (!futureItem) {
                        console.error('Предзадача не найдена:', updatedData.futureId);
                        alert('Предзадача не найдена');
                        return;
                    }

                    // Обновляем Entity
                    BX24.callMethod('entity.item.update', {
                        ENTITY: 'tflow_future',
                        ID: futureItem.ID,
                        DETAIL_TEXT: JSON.stringify(updatedData)
                    }, (updateResult) => {
                        if (updateResult.error()) {
                            console.error('Ошибка обновления:', updateResult.error());
                            alert('Ошибка обновления: ' + updateResult.error());
                            return;
                        }

                        console.log('✅ Предзадача обновлена');

                        // Обновляем узел на полотне без полной перезагрузки
                        setNodes((currentNodes) => {
                            return currentNodes.map(node => {
                                if (node.id === updatedData.futureId) {
                                    return {
                                        ...node,
                                        data: {
                                            ...node.data,
                                            title: updatedData.title,
                                            description: updatedData.description,
                                            conditionType: updatedData.conditionType,
                                            delayMinutes: updatedData.delayMinutes
                                        }
                                    };
                                }
                                return node;
                            });
                        });
                    });
                });
            };

            // Подписка на изменения задачи через Pull & Push
            useEffect(() => {
                addDebugLog('🔔 ПОДПИСКА на задачу #' + task.id, '#9c27b0');

                // Callback при изменении статуса
                const handleStatusChange = (newStatus, taskData) => {
                    addDebugLog('🔄 Статус изменён: ' + newStatus, '#ff9800');
                    setNodes((currentNodes) => {
                        return currentNodes.map(node => {
                            if (node.id === 'task-' + task.id) {
                                console.log('%c  → Обновляем узел task-' + task.id + ' со статусом ' + newStatus, 'color: #ff9800;');
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        statusCode: newStatus,
                                        title: taskData.title || node.data.title
                                    }
                                };
                            }
                            return node;
                        });
                    });
                };

                // Callback при завершении задачи
                // Защита от повторных вызовов
                let isProcessingComplete = false;
                const handleTaskComplete = (taskId, taskData) => {
                    addDebugLog('✅ ЗАДАЧА ЗАВЕРШЕНА! ID: ' + taskId, '#ff0000');

                    // Защита от повторных вызовов
                    if (isProcessingComplete) {
                        addDebugLog('⏭️ УЖЕ ОБРАБАТЫВАЕТСЯ, ПРОПУСК', '#ff9800');
                        return;
                    }
                    isProcessingComplete = true;

                    addDebugLog('🚀 Вызов TaskCreator.processCompletedTask', '#2196f3');

                    window.TaskCreator.processCompletedTask(taskId, (createdTasks) => {
                        addDebugLog('✅ СОЗДАНО ЗАДАЧ: ' + createdTasks.length, '#00ff00');

                        // Даём время на сохранение связей в Entity, затем перезагружаем
                        setTimeout(() => {
                            addDebugLog('🔄 ПЕРЕЗАГРУЗКА ПОЛОТНА...', '#2196f3');
                            loadProcessData();
                            // Сбрасываем флаг через 3 секунды
                            setTimeout(() => {
                                isProcessingComplete = false;
                                addDebugLog('🔓 Флаг сброшен', '#9e9e9e');
                            }, 3000);
                        }, 1500); // 1.5 секунды
                    });
                };

                // Подписываемся через PullSubscription
                console.log('%c📞 Вызываем PullSubscription.subscribe с параметрами:', 'color: #9c27b0; font-weight: bold;');
                console.log('  • taskId:', task.id);
                console.log('  • handleStatusChange:', typeof handleStatusChange);
                console.log('  • handleTaskComplete:', typeof handleTaskComplete);

                window.PullSubscription.subscribe(
                    task.id,
                    handleStatusChange,
                    handleTaskComplete
                );

                console.log('%c✅ PullSubscription.subscribe выполнен!', 'color: #4caf50; font-weight: bold;');

                // Старый код polling (закомментирован):
                /*
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
                }, 3000);
                return () => clearInterval(pollInterval);
                */

                // Очистка при размонтировании
                return () => {
                    window.PullSubscription.unsubscribe(task.id);
                    console.log('🧹 Очистка подписок');
                };
            }, [task.id, setNodes]);

            // Типы узлов (обёрнуты в useMemo для предотвращения бесконечного цикла)
            const nodeTypes = useMemo(() => ({
                taskNode: window.TaskNode
            }), []);

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
                    background: '#f5f7fa',
                    position: 'relative'
                }
            },
                // Debug panel
                React.createElement('div', {
                    style: {
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '400px',
                        maxHeight: '300px',
                        overflow: 'auto',
                        background: 'rgba(0, 0, 0, 0.9)',
                        color: '#00ff00',
                        padding: '10px',
                        borderRadius: '8px',
                        zIndex: 1000,
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        lineHeight: '1.4'
                    }
                },
                    React.createElement('div', {
                        style: { fontWeight: 'bold', marginBottom: '5px', borderBottom: '1px solid #00ff00', paddingBottom: '5px' }
                    }, '🔍 DEBUG LOG (последние 20)'),
                    debugLog.map((log, i) =>
                        React.createElement('div', {
                            key: i,
                            style: { color: log.color, marginBottom: '2px' }
                        }, log.message)
                    )
                ),
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
                    onInit: (instance) => {
                        reactFlowInstance.current = instance;
                        console.log('✅ ReactFlow instance готов');
                    },
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
