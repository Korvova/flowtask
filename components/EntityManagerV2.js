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
     * Загрузить ВСЕ узлы процесса (1 запрос!)
     */
    loadProcess: function(processId) {
        return new Promise((resolve, reject) => {
            console.log('📥 EntityManagerV2: Загружаем процесс', processId);

            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_nodes',
                FILTER: {
                    NAME: 'process_' + processId
                }
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка загрузки:', result.error());
                    reject(result.error());
                    return;
                }

                const items = result.data();
                console.log('✅ Загружено узлов:', items.length);

                // Парсим JSON
                const nodes = items.map(item => {
                    const data = JSON.parse(item.DETAIL_TEXT);
                    data._entityId = item.ID; // Сохраняем Entity ID для обновления
                    return data;
                });

                resolve(nodes);
            });
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
