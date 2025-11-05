/**
 * EntityManagerV2 - ПРОСТОЙ менеджер для работы с Entity Storage
 *
 * ОДНА ТАБЛИЦА tflow_nodes для всего:
 * - Задачи (task)
 * - Предзадачи (future)
 * - Позиции
 * - Связи
 *
 * Структура записи:
 * {
 *   NAME: 'process_126',
 *   DETAIL_TEXT: {
 *     nodeId: 'task-127',
 *     type: 'task',           // task / future
 *     title: 'Название',
 *     status: 5,
 *     positionX: 100,
 *     positionY: 200,
 *     connectionsFrom: [{ type: 'future', id: 'future-123' }],
 *     connectionsTo: [{ type: 'task', id: 'task-126' }],
 *     // Для предзадач:
 *     condition: 'immediately',
 *     realTaskId: null
 *   }
 * }
 */
window.EntityManagerV2 = {

    // Кэш проверки существования хранилища
    _entityExistsCache: false,

    /**
     * Создать хранилище tflow_nodes если оно не существует
     */
    ensureEntityExists: function() {
        return new Promise((resolve, reject) => {
            // Если уже проверяли - сразу возвращаем success
            if (this._entityExistsCache) {
                resolve(true);
                return;
            }

            console.log('🔍 Проверяем существование хранилища tflow_nodes...');

            BX24.callMethod('entity.add', {
                ENTITY: 'tflow_nodes',
                NAME: 'Flowtask Nodes Storage',
                ACCESS: {
                    'AU': 'W'  // Все авторизованные пользователи могут записывать
                }
            }, (result) => {
                if (result.error()) {
                    const error = result.error();
                    const errorStr = JSON.stringify(error);

                    console.log('⚠️ Ответ от entity.add:', errorStr);

                    // Если хранилище уже существует - это нормально
                    // Проверяем разные варианты ошибки
                    const isAlreadyExists = (
                        (error.ex && error.ex.error_description && error.ex.error_description.includes('already exists')) ||
                        (error.ex && error.ex.error && (error.ex.error === 'ERROR_ENTITY_ALREADY_EXISTS' || error.ex.error.includes('ALREADY_EXISTS'))) ||
                        (error === 'ERROR_ENTITY_ALREADY_EXISTS') ||
                        errorStr.includes('already exists') ||
                        errorStr.includes('ALREADY_EXISTS')
                    );

                    if (isAlreadyExists) {
                        console.log('✅ Хранилище tflow_nodes уже существует');
                        this._entityExistsCache = true;
                        resolve(true);
                    } else {
                        console.error('❌ Ошибка создания хранилища:', error);
                        reject(error);
                    }
                } else {
                    console.log('✅ Хранилище tflow_nodes создано успешно');
                    this._entityExistsCache = true;
                    resolve(true);
                }
            });
        });
    },

    /**
     * Загрузить ВСЕ узлы процесса
     *
     * ВАЖНО: entity.item.get НЕ ПОДДЕРЖИВАЕТ FILTER!
     * Получаем все записи и фильтруем на стороне клиента
     */
    loadProcess: function(processId) {
        return new Promise(async (resolve, reject) => {
            // Сначала убедимся что хранилище существует
            try {
                await this.ensureEntityExists();
            } catch (error) {
                console.error('❌ Не удалось создать хранилище:', error);
                reject(error);
                return;
            }

            console.log('📥 EntityManagerV2: Загружаем процесс', processId);

            const processName = 'process_' + processId;
            const allItems = [];

            const loadBatch = (start = 0) => {
                console.log(`🔍 Запрос к entity.item.get: ENTITY=tflow_nodes, FILTER=%NAME=${processName}, start=${start}`);

                BX24.callMethod('entity.item.get', {
                    ENTITY: 'tflow_nodes',
                    FILTER: {
                        '%NAME': processName  // Поиск по подстроке: все NAME содержащие 'process_149'
                    },
                    SORT: { ID: 'ASC' },
                    start: start
                }, (result) => {
                    console.log('📬 Ответ от BX24:', result);

                    if (result.error()) {
                        console.error('❌ Ошибка загрузки:', result.error());
                        console.error('❌ Детали ошибки:', result.error_description());
                        reject(result.error());
                        return;
                    }

                    const items = result.data();
                    console.log(`📦 Загружено ${items.length} записей для "${processName}" (start=${start})`);

                    // FILTER уже отфильтровал нужные записи, просто добавляем
                    allItems.push(...items);

                    // Останавливаем только когда:
                    // Получили меньше 50 записей (конец таблицы)
                    if (items.length < 50) {
                        console.log(`✅ Найдено узлов процесса ${processId}: ${allItems.length}`);

                        // Парсим JSON
                        const nodes = allItems.map(item => {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            data._entityId = item.ID; // Сохраняем Entity ID для обновления
                            return data;
                        });

                        resolve(nodes);
                    } else {
                        // Продолжаем загрузку следующего батча
                        setTimeout(() => loadBatch(start + 50), 100);
                    }
                });
            };

            // Запускаем загрузку
            loadBatch(0);
        });
    },

    /**
     * Сохранить узел (создать или обновить)
     */
    saveNode: function(processId, node) {
        return new Promise((resolve, reject) => {
            const isUpdate = !!node._entityId;

            if (isUpdate) {
                // Обновление
                console.log('🔄 Обновляем узел:', node.nodeId);

                BX24.callMethod('entity.item.update', {
                    ENTITY: 'tflow_nodes',
                    ID: node._entityId,
                    NAME: 'process_' + processId + '_node_' + node.nodeId,
                    DETAIL_TEXT: JSON.stringify(node)
                }, (result) => {
                    if (result.error()) {
                        console.error('❌ Ошибка обновления:', result.error());
                        reject(result.error());
                    } else {
                        console.log('✅ Узел обновлён:', node.nodeId);
                        resolve(node._entityId);
                    }
                });
            } else {
                // Создание
                console.log('➕ Создаём узел:', node.nodeId);

                BX24.callMethod('entity.item.add', {
                    ENTITY: 'tflow_nodes',
                    NAME: 'process_' + processId + '_node_' + node.nodeId,
                    DETAIL_TEXT: JSON.stringify(node)
                }, (result) => {
                    if (result.error()) {
                        console.error('❌ Ошибка создания:', result.error());
                        reject(result.error());
                    } else {
                        const entityId = result.data();
                        console.log('✅ Узел создан:', node.nodeId, 'Entity ID:', entityId);
                        node._entityId = entityId;
                        resolve(entityId);
                    }
                });
            }
        });
    },

    /**
     * Удалить узел
     */
    deleteNode: function(entityId) {
        return new Promise((resolve, reject) => {
            console.log('🗑️ Удаляем узел, Entity ID:', entityId);

            BX24.callMethod('entity.item.delete', {
                ENTITY: 'tflow_nodes',
                ID: entityId
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка удаления:', result.error());
                    reject(result.error());
                } else {
                    console.log('✅ Узел удалён');
                    resolve();
                }
            });
        });
    },

    /**
     * Добавить связь к узлу
     */
    addConnection: function(processId, fromNodeId, toNodeId, toType) {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. Загружаем узел-источник
                const nodes = await this.loadProcess(processId);
                const fromNode = nodes.find(n => n.nodeId === fromNodeId);

                if (!fromNode) {
                    reject('Узел ' + fromNodeId + ' не найден');
                    return;
                }

                // 2. Добавляем связь
                if (!fromNode.connectionsFrom) {
                    fromNode.connectionsFrom = [];
                }

                fromNode.connectionsFrom.push({
                    type: toType,
                    id: toNodeId
                });

                // 3. Сохраняем
                await this.saveNode(processId, fromNode);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Удалить связь
     */
    removeConnection: function(processId, fromNodeId, toNodeId) {
        return new Promise(async (resolve, reject) => {
            try {
                const nodes = await this.loadProcess(processId);
                const fromNode = nodes.find(n => n.nodeId === fromNodeId);

                if (!fromNode || !fromNode.connectionsFrom) {
                    resolve();
                    return;
                }

                // Удаляем связь
                fromNode.connectionsFrom = fromNode.connectionsFrom.filter(
                    conn => conn.id !== toNodeId
                );

                await this.saveNode(processId, fromNode);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Алиас для addConnection (для совместимости)
     * Автоматически определяет тип целевого узла
     */
    saveConnection: function(processId, fromNodeId, toNodeId) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('💾 saveConnection:', fromNodeId, '→', toNodeId);

                // Загружаем узлы чтобы определить тип целевого узла
                const nodes = await this.loadProcess(processId);
                const toNode = nodes.find(n => n.nodeId === toNodeId);
                const toType = toNode?.type || 'future';

                // Вызываем addConnection
                await this.addConnection(processId, fromNodeId, toNodeId, toType);
                console.log('✅ Связь сохранена через saveConnection');
                resolve();
            } catch (error) {
                console.error('❌ Ошибка saveConnection:', error);
                reject(error);
            }
        });
    },

    /**
     * Получить список всех процессов
     * Возвращает массив { processId: 123, nodeCount: 5, lastModified: timestamp }
     *
     * ОПТИМИЗАЦИЯ: Группирует процессы во время загрузки, останавливается
     * после 3 пустых батчей (нет новых процессов)
     */
    getAllProcesses: function() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureEntityExists();

                console.log('📋 Загружаем список всех процессов (оптимизированный режим)...');
                const processMap = {}; // Группируем сразу во время загрузки
                let totalRecordsLoaded = 0;
                let emptyBatchCount = 0; // Счетчик батчей без новых процессов
                const MAX_EMPTY_BATCHES = 3; // Останавливаемся после 3 пустых батчей
                const MAX_RECORDS = 1000; // Абсолютный лимит для безопасности

                const loadBatch = (start = 0) => {
                    // Защита от переполнения
                    if (totalRecordsLoaded >= MAX_RECORDS) {
                        console.log(`⚠️ Достигнут лимит ${MAX_RECORDS} записей`);
                        finishLoading();
                        return;
                    }

                    // Останавливаемся если много батчей подряд без новых процессов
                    if (emptyBatchCount >= MAX_EMPTY_BATCHES) {
                        console.log(`✅ Остановка: ${MAX_EMPTY_BATCHES} батчей без новых процессов`);
                        finishLoading();
                        return;
                    }

                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_nodes',
                        FILTER: {
                            '%NAME': 'process_'
                        },
                        SORT: { ID: 'DESC' },
                        start: start
                    }, (result) => {
                        if (result.error()) {
                            reject(result.error());
                            return;
                        }

                        const items = result.data();
                        totalRecordsLoaded += items.length;

                        // Считаем сколько НОВЫХ процессов в этом батче
                        let newProcessesInBatch = 0;
                        const prevProcessCount = Object.keys(processMap).length;

                        items.forEach(item => {
                            if (item.NAME && item.NAME.startsWith('process_')) {
                                const match = item.NAME.match(/^process_(\d+)/);
                                if (match) {
                                    const processId = match[1];

                                    if (!processMap[processId]) {
                                        processMap[processId] = {
                                            processId: processId,
                                            nodeCount: 0,
                                            lastModified: item.DATE_ACTIVE_TO || item.DATE_ACTIVE_FROM
                                        };
                                        newProcessesInBatch++;
                                    }

                                    processMap[processId].nodeCount++;
                                }
                            }
                        });

                        const currentProcessCount = Object.keys(processMap).length;
                        console.log(`  → Батч: ${items.length} записей | Процессов: ${currentProcessCount} (новых: ${newProcessesInBatch})`);

                        // Если в батче не было новых процессов - увеличиваем счетчик
                        if (newProcessesInBatch === 0) {
                            emptyBatchCount++;
                        } else {
                            emptyBatchCount = 0; // Сброс счетчика если нашли новые процессы
                        }

                        // Останавливаемся если:
                        // 1. Получено меньше 50 записей (конец данных)
                        // 2. Достигнут лимит записей
                        // 3. Много батчей без новых процессов (проверяется в начале следующего вызова)
                        if (items.length < 50) {
                            console.log('✅ Конец данных (получено меньше 50 записей)');
                            finishLoading();
                        } else {
                            setTimeout(() => loadBatch(start + 50), 50);
                        }
                    });
                };

                const finishLoading = () => {
                    const processes = Object.values(processMap);
                    console.log(`✅ Загрузка завершена: ${processes.length} процессов из ${totalRecordsLoaded} записей`);
                    resolve(processes);
                };

                loadBatch(0);
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Удалить весь процесс со всеми узлами
     */
    deleteProcess: function(processId) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('🗑️ Удаляем процесс:', processId);

                // Загружаем все узлы процесса
                const nodes = await this.loadProcess(processId);
                console.log(`📦 Найдено ${nodes.length} узлов для удаления`);

                // Удаляем все узлы
                let deletedCount = 0;
                for (const node of nodes) {
                    if (node._entityId) {
                        await this.deleteNode(node._entityId);
                        deletedCount++;
                    }
                }

                console.log(`✅ Процесс ${processId} удалён (${deletedCount} узлов)`);
                resolve(deletedCount);
            } catch (error) {
                console.error('❌ Ошибка удаления процесса:', error);
                reject(error);
            }
        });
    }
};

console.log('✅ EntityManagerV2 loaded');
