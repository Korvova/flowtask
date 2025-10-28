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

    /**
     * Создать хранилище tflow_nodes если оно не существует
     */
    ensureEntityExists: function() {
        return new Promise((resolve, reject) => {
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
                    // Если хранилище уже существует - это нормально
                    if (error.ex && error.ex.error_description && error.ex.error_description.includes('already exists')) {
                        console.log('✅ Хранилище tflow_nodes уже существует');
                        resolve(true);
                    } else {
                        console.error('❌ Ошибка создания хранилища:', error);
                        reject(error);
                    }
                } else {
                    console.log('✅ Хранилище tflow_nodes создано успешно');
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
                console.log(`🔍 Запрос к entity.item.get: ENTITY=tflow_nodes, start=${start}`);

                BX24.callMethod('entity.item.get', {
                    ENTITY: 'tflow_nodes',
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
                    console.log(`📦 Загружено ${items.length} записей (start=${start})`);

                    // Добавляем только записи нашего процесса
                    items.forEach(item => {
                        if (item.NAME === processName) {
                            allItems.push(item);
                        }
                    });

                    // Если получили 50 записей, значит есть еще
                    if (items.length === 50) {
                        setTimeout(() => loadBatch(start + 50), 100);
                    } else {
                        // Все загружено
                        console.log(`✅ Найдено узлов процесса ${processId}: ${allItems.length}`);

                        // Парсим JSON
                        const nodes = allItems.map(item => {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            data._entityId = item.ID; // Сохраняем Entity ID для обновления
                            return data;
                        });

                        resolve(nodes);
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
                    NAME: 'process_' + processId,
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
                    NAME: 'process_' + processId,
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
    }
};

console.log('✅ EntityManagerV2 loaded');
