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

        const { useState, useCallback, useEffect, useRef, useMemo } = React;
        const { ReactFlow, Controls, Background, addEdge: rfAddEdge, useNodesState, useEdgesState } = RF;

        // Используем стандартный TaskNode с React Flow handles

        function FlowApp() {
            const [nodes, setNodes, onNodesChange] = useNodesState([]);
            const [edges, setEdges, onEdgesChange] = useEdgesState([]);
            const [loading, setLoading] = useState(true);
            const reactFlowInstanceRef = useRef(null);
            const isInitialLoadRef = useRef(true);  // Флаг первой загрузки

            // Важно: nodeTypes должны быть в useMemo, иначе при каждом рендере создается новый объект
            // и React Flow пересоздает узлы, что ломает обработчики кликов
            const nodeTypes = useMemo(() => ({
                task: window.TaskNode,
                future: window.TaskNode
            }), []);

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

            // Обновить статус конкретной задачи (вызывается из ONTASKUPDATE)
            const updateSingleTaskStatus = useCallback(async (taskId, newStatus) => {
                console.log('🔄 Обновляем статус задачи', taskId, 'на', newStatus);

                // Загружаем все узлы процесса
                const allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);

                // Ищем узел с этой задачей
                const nodeToUpdate = allNodes.find(n =>
                    n.type === 'task' && n.realTaskId === taskId
                );

                if (!nodeToUpdate) {
                    console.warn('⚠️ Узел задачи', taskId, 'не найден на полотне');
                    return;
                }

                // Если статус изменился
                if (nodeToUpdate.status !== newStatus) {
                    console.log('✅ Статус изменен:', nodeToUpdate.status, '→', newStatus);

                    // Обновляем статус в данных узла
                    nodeToUpdate.status = newStatus;

                    // Сохраняем в Entity Storage
                    await EntityManagerV2.saveNode(window.currentProcessId, nodeToUpdate);

                    // Обновляем визуальное отображение
                    setNodes((nds) =>
                        nds.map(node => {
                            if (node.id === nodeToUpdate.nodeId) {
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        statusCode: newStatus,  // TaskNode использует statusCode!
                                        _updateTime: Date.now()  // Форсируем перерисовку
                                    }
                                };
                            }
                            return node;
                        })
                    );

                    console.log('🎨 Canvas обновлен для задачи', taskId);
                } else {
                    console.log('ℹ️ Статус не изменился, обновление не требуется');
                }
            }, [setNodes]);

            // Экспортируем обработчики и методы обновления ОДИН РАЗ при монтировании
            useEffect(() => {
                window.FlowCanvasV2.handleDeleteNode = handleDeleteNode;
                window.FlowCanvasV2.handleEditNode = handleEditNode;

                // Экспортируем метод для обновления данных (вместо полной перезагрузки)
                window.FlowCanvasV2.updateNodes = () => {
                    console.log('🔄 Обновляем узлы без перезагрузки canvas...');
                    loadProcessData();
                };

                // Экспортируем метод для обновления статуса конкретной задачи
                window.FlowCanvasV2.updateSingleTaskStatus = updateSingleTaskStatus;

                console.log('✅ Обработчики и методы экспортированы в window.FlowCanvasV2');

                return () => {
                    window.FlowCanvasV2.handleDeleteNode = null;
                    window.FlowCanvasV2.handleEditNode = null;
                    window.FlowCanvasV2.updateNodes = null;
                    window.FlowCanvasV2.updateSingleTaskStatus = null;
                };
            }, [handleDeleteNode, handleEditNode, updateSingleTaskStatus]); // Зависимости чтобы всегда был актуальный loadProcessData

            // Загрузка данных
            useEffect(() => {
                loadProcessData();
            }, []);

            // Обновить статусы задач из Bitrix24
            const updateTaskStatuses = async (allNodes, taskNodes) => {
                return new Promise((resolve) => {
                    let updatedCount = 0;
                    let processedCount = 0;

                    taskNodes.forEach(taskNode => {
                        const taskId = taskNode.realTaskId;

                        BX24.callMethod('tasks.task.get', { taskId: taskId }, async (result) => {
                            processedCount++;

                            if (result.error()) {
                                console.warn('⚠️ Не удалось загрузить задачу', taskId, ':', result.error());
                            } else {
                                const taskData = result.data();
                                const task = taskData.task || taskData;
                                const newStatus = parseInt(task.status || task.STATUS);

                                // Если статус изменился - обновляем
                                if (taskNode.status !== newStatus) {
                                    console.log('🔄 Обновляем статус задачи', taskId, ':', taskNode.status, '→', newStatus);
                                    taskNode.status = newStatus;

                                    // Сохраняем в Entity Storage
                                    await EntityManagerV2.saveNode(window.currentProcessId, taskNode);
                                    updatedCount++;
                                }
                            }

                            // Если обработали все задачи
                            if (processedCount === taskNodes.length) {
                                console.log('✅ Обновлено статусов:', updatedCount, 'из', taskNodes.length);
                                resolve();
                            }
                        });
                    });
                });
            };

            // Загрузить данные процесса
            const loadProcessData = async () => {
                try {
                    console.log('📥 Загружаем процесс:', window.currentProcessId);

                    // Загрузить все узлы за 1 запрос
                    let allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
                    console.log('✅ Загружено узлов:', allNodes.length);

                    // АВТОИСПРАВЛЕНИЕ: добавить realTaskId узлам task-XXX без него
                    const nodesWithoutRealTaskId = allNodes.filter(n =>
                        n.type === 'task' && !n.realTaskId && n.nodeId.startsWith('task-')
                    );

                    if (nodesWithoutRealTaskId.length > 0) {
                        console.log('🔧 Исправляем', nodesWithoutRealTaskId.length, 'узлов без realTaskId...');

                        for (const node of nodesWithoutRealTaskId) {
                            const taskId = parseInt(node.nodeId.replace('task-', ''));
                            console.log('  → task-' + taskId + ': добавляем realTaskId =', taskId);
                            node.realTaskId = taskId;
                            await EntityManagerV2.saveNode(window.currentProcessId, node);
                        }

                        console.log('✅ Узлы исправлены');
                    }

                    // Обновить статусы задач из Bitrix24
                    // ВАЖНО: Всегда обновляем статусы, так как при создании новых задач
                    // из предзадач они могут иметь старые статусы из Entity Storage
                    const taskNodes = allNodes.filter(n => n.type === 'task' && n.realTaskId);
                    if (taskNodes.length > 0) {
                        console.log('🔄 Обновляем статусы', taskNodes.length, 'задач из Bitrix24...');
                        await updateTaskStatuses(allNodes, taskNodes);
                    }

                    // Если узлов нет - показываем ProcessSelector
                    if (allNodes.length === 0 && window.currentTaskId) {
                        console.log('📋 Задача без связей, показываем ProcessSelector');

                        setLoading(false); // Убираем индикатор загрузки

                        // Показываем диалог выбора процесса
                        if (window.ProcessSelector) {
                            window.ProcessSelector.show(window.currentTaskId, async (processName, isNew) => {
                                if (!processName) {
                                    // Пользователь отменил
                                    console.log('❌ Выбор процесса отменён');
                                    document.getElementById('root').innerHTML =
                                        '<div class="loading">Выбор процесса отменён</div>';
                                    return;
                                }

                                console.log('✅ Выбран процесс:', processName, 'новый:', isNew);

                                if (isNew) {
                                    // Создаём новый процесс с числовым ID и названием
                                    window.currentProcessId = window.currentTaskId; // Используем taskId как processId
                                    console.log('📝 Создаём начальный узел для нового процесса', window.currentProcessId, 'с названием "' + processName + '"');

                                    const initialNode = {
                                        nodeId: 'task-' + window.currentTaskId,
                                        type: 'task',
                                        title: 'Задача #' + window.currentTaskId,
                                        status: 2, // В работе
                                        positionX: 250,
                                        positionY: 150,
                                        connectionsFrom: [],
                                        connectionsTo: [],
                                        realTaskId: window.currentTaskId,
                                        processName: processName // Сохраняем название процесса
                                    };

                                    await EntityManagerV2.saveNode(window.currentProcessId, initialNode);
                                    console.log('✅ Начальный узел создан в процессе', window.currentProcessId, 'с названием "' + processName + '"');

                                    // Перезагружаем canvas
                                    loadProcessData();
                                } else {
                                    // Присоединяемся к существующему процессу (processName теперь это processId)
                                    window.currentProcessId = processName; // processName содержит числовой ID
                                    console.log('📝 Добавляем задачу в существующий процесс', window.currentProcessId);

                                    const initialNode = {
                                        nodeId: 'task-' + window.currentTaskId,
                                        type: 'task',
                                        title: 'Задача #' + window.currentTaskId,
                                        status: 2,
                                        positionX: 250,
                                        positionY: 150,
                                        connectionsFrom: [],
                                        connectionsTo: [],
                                        realTaskId: window.currentTaskId
                                        // processName не устанавливаем - берётся из первого узла процесса
                                    };

                                    await EntityManagerV2.saveNode(window.currentProcessId, initialNode);
                                    console.log('✅ Задача добавлена в процесс', window.currentProcessId);

                                    // Перезагружаем canvas
                                    loadProcessData();
                                }
                            });
                        } else {
                            console.error('❌ ProcessSelector не загружен!');
                        }

                        return; // Прерываем loadProcessData
                    }

                    // Фильтруем предзадачи, которые уже созданы (realTaskId !== null)
                    const visibleNodes = allNodes.filter(node => {
                        // Если это предзадача И у неё есть realTaskId - скрываем
                        if (node.type === 'future' && node.realTaskId) {
                            console.log('⏭️ Скрываем созданную предзадачу:', node.nodeId, '→ task-' + node.realTaskId);
                            return false;
                        }
                        return true;
                    });

                    console.log('👁️ Видимых узлов:', visibleNodes.length, 'из', allNodes.length);

                    // Построить nodes для ReactFlow
                    const rfNodes = visibleNodes.map(node => ({
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
                            _node: node,  // Сохраняем весь узел
                            // Callback'и как в старом FlowCanvas - вызывают глобальные обработчики
                            onDelete: node.type === 'future' ? () => {
                                if (window.FlowCanvasV2?.handleDeleteNode) {
                                    window.FlowCanvasV2.handleDeleteNode(node.nodeId);
                                }
                            } : undefined,
                            onEdit: node.type === 'future' ? () => {
                                if (window.FlowCanvasV2?.handleEditNode) {
                                    window.FlowCanvasV2.handleEditNode({ id: node.nodeId });
                                }
                            } : undefined
                        }
                    }));

                    // Создать карту перенаправления: futureId → taskId
                    const futureToTaskMap = {};
                    allNodes.forEach(node => {
                        if (node.type === 'future' && node.realTaskId) {
                            futureToTaskMap[node.nodeId] = 'task-' + node.realTaskId;
                            console.log('🔀 Перенаправление:', node.nodeId, '→', 'task-' + node.realTaskId);
                        }
                    });

                    // Построить edges для ReactFlow из ВИДИМЫХ узлов
                    const rfEdges = [];
                    visibleNodes.forEach(node => {
                        if (node.connectionsFrom) {
                            node.connectionsFrom.forEach(conn => {
                                // Перенаправляем target если это созданная предзадача
                                let targetId = conn.id;
                                if (futureToTaskMap[targetId]) {
                                    console.log('🔀 Связь перенаправлена:', node.nodeId, '→', targetId, '⇒', futureToTaskMap[targetId]);
                                    targetId = futureToTaskMap[targetId];
                                }

                                // Добавляем edge только если target существует в visibleNodes
                                const targetExists = visibleNodes.some(n => n.nodeId === targetId);
                                if (targetExists) {
                                    rfEdges.push({
                                        id: `edge-${node.nodeId}-${targetId}`,
                                        source: node.nodeId,
                                        target: targetId,
                                        type: 'default',
                                        animated: false
                                    });
                                } else {
                                    console.warn('⚠️ Target не найден:', targetId);
                                }
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

                // 1. Обновить статус в Entity Storage (чтобы не потерять при updateNodes)
                try {
                    const allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
                    const nodeToUpdate = allNodes.find(n => n.type === 'task' && n.realTaskId === taskId);

                    if (nodeToUpdate) {
                        console.log('💾 Сохраняем статус в Entity Storage:', taskId, '→', newStatus);
                        nodeToUpdate.status = newStatus;
                        await EntityManagerV2.saveNode(window.currentProcessId, nodeToUpdate);
                        console.log('✅ Статус сохранен в Entity Storage');
                    }
                } catch (error) {
                    console.error('❌ Ошибка сохранения статуса:', error);
                }

                // 2. Обновить визуально (TaskNode использует statusCode!)
                setNodes((nds) => {
                    console.log('  → Текущее количество узлов:', nds.length);

                    const updatedNodes = nds.map(node => {
                        if (node.id === 'task-' + taskId) {
                            console.log('✅ Обновляем узел:', node.id);
                            console.log('  → Старый statusCode:', node.data.statusCode);
                            console.log('  → Новый statusCode:', newStatus);

                            const newNode = {
                                ...node,
                                data: {
                                    ...node.data,
                                    statusCode: newStatus,  // TaskNode использует statusCode!
                                    _updateTime: Date.now()
                                }
                            };

                            console.log('  → Обновленный node.data:', newNode.data);
                            return newNode;
                        }
                        return node;
                    });

                    console.log('  → Возвращаем обновленные узлы');
                    return updatedNodes;
                });

                // 3. Если завершена - создать предзадачи
                if (newStatus === 5) {
                    console.log('✅ Задача завершена! Создаём предзадачи...');
                    await TaskHandler.handleTaskComplete(taskId, window.currentProcessId);

                    // Перезагрузить canvas
                    setTimeout(() => {
                        loadProcessData();
                    }, 1000);
                }

                // 4. Если отменена - создать предзадачи с условием 'on_cancel'
                if (newStatus === 6 || newStatus === '6') {
                    console.log('🚫 Задача отменена! Создаём предзадачи с условием on_cancel...');
                    await TaskHandler.handleTaskCancel(taskId, window.currentProcessId);

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
                    console.log('🔍 Проверяем узлы для подписки:', nodes.length, 'узлов');
                    nodes.forEach(node => {
                        console.log('  →', node.id, 'type:', node.type, 'realTaskId:', node.data?.realTaskId);
                    });

                    // Собираем все task узлы
                    const taskNodes = nodes.filter(node => node.type === 'task' && node.data.realTaskId);
                    console.log('✅ Найдено task узлов с realTaskId:', taskNodes.length);

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
                                (completedTaskId, actualStatus, task) => {
                                    console.log('%c✅ Задача завершена/отменена через PULL:', 'color: #00ff00; font-weight: bold;', completedTaskId, 'status:', actualStatus);
                                    handleStatusChange(completedTaskId, actualStatus);
                                }
                            );
                            console.log('  ✅ Подписка на task-' + taskId);
                        });

                        console.log('%c✅ Подписка завершена!', 'color: #4caf50; font-weight: bold;');
                    }
                }

                // НЕ отписываемся - подписки работают глобально на всю сессию
            }, [nodes.length]); // Подписываемся при изменении количества узлов!

            // Открыть ProcessSwitcher (ВАЖНО: до условного return)
            const openProcessSwitcher = useCallback(() => {
                if (window.ProcessSwitcher) {
                    window.ProcessSwitcher.open(window.currentProcessId, (newProcessId) => {
                        if (newProcessId === null) {
                            // Удалён текущий процесс - очищаем canvas
                            console.log('🗑️ Текущий процесс удалён, очищаем canvas');
                            window.currentProcessId = null;
                            setNodes([]);
                            setEdges([]);
                        } else if (newProcessId !== window.currentProcessId) {
                            // Переключаемся на другой процесс
                            console.log('🔄 Переключаемся на процесс:', newProcessId);
                            window.currentProcessId = newProcessId;
                            loadProcessData();
                        }
                    });
                }
            }, []);

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
                    background: '#f5f7fa',
                    position: 'relative'
                }
            },
                // Кнопка "Список процессов" в правом верхнем углу
                React.createElement('button', {
                    onClick: openProcessSwitcher,
                    style: {
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 5,
                        padding: '10px 16px',
                        background: '#2fc6f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    },
                    onMouseEnter: (e) => {
                        e.target.style.background = '#0ea5e9';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    },
                    onMouseLeave: (e) => {
                        e.target.style.background = '#2fc6f6';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    }
                }, '📋 Список процессов'),

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
                    nodeTypes: nodeTypes,
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
