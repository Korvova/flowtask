/**
 * EntityManager - Централизованное управление Entity Storage
 *
 * Управляет 4 типами Entity:
 * 1. tflow_pos - позиции узлов на canvas
 * 2. tflow_future - предзадачи (future tasks)
 * 3. tflow_conn - связи между узлами
 * 4. tflow_tmpl - шаблоны процессов
 */

window.EntityManager = {

    /**
     * ═══════════════════════════════════════════════════════════
     * ПОЗИЦИИ (tflow_pos)
     * ═══════════════════════════════════════════════════════════
     */

    /**
     * Сохранить позицию узла
     * @param {string} nodeId - ID узла (task-123 или future-xyz)
     * @param {number} x - координата X
     * @param {number} y - координата Y
     * @param {string} processId - ID процесса
     */
    savePosition: function(nodeId, x, y, processId) {
        return new Promise((resolve, reject) => {
            console.log('💾 EntityManager: Сохраняем позицию', nodeId, { x, y, processId });

            const data = {
                nodeId: nodeId,
                positionX: x,
                positionY: y,
                processId: processId
            };

            BX24.callMethod('entity.item.add', {
                ENTITY: 'tflow_pos',
                NAME: nodeId,
                DETAIL_TEXT: JSON.stringify(data)
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка сохранения позиции:', result.error());
                    reject(result.error());
                } else {
                    console.log('✅ Позиция сохранена, ID:', result.data());
                    resolve(result.data());
                }
            });
        });
    },

    /**
     * Загрузить позицию узла
     * @param {string} nodeId - ID узла
     */
    loadPosition: function(nodeId) {
        return new Promise((resolve) => {
            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_pos'
            }, (result) => {
                if (result.error()) {
                    console.warn('⚠️ Ошибка загрузки позиций:', result.error());
                    resolve(null);
                    return;
                }

                const items = result.data();
                const position = items.find(item => {
                    if (!item.DETAIL_TEXT) return false;
                    try {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        return data.nodeId === nodeId;
                    } catch (e) {
                        return false;
                    }
                });

                if (position) {
                    const data = JSON.parse(position.DETAIL_TEXT);
                    resolve({ x: data.positionX, y: data.positionY });
                } else {
                    resolve(null);
                }
            });
        });
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * ПРЕДЗАДАЧИ (tflow_future)
     * ═══════════════════════════════════════════════════════════
     */

    /**
     * Создать предзадачу
     * @param {object} futureData - Данные предзадачи
     */
    createFutureTask: function(futureData) {
        return new Promise((resolve, reject) => {
            console.log('💾 EntityManager: Создаем предзадачу', futureData.futureId);

            BX24.callMethod('entity.item.add', {
                ENTITY: 'tflow_future',
                NAME: futureData.title.substring(0, 50),
                DETAIL_TEXT: JSON.stringify(futureData)
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка создания предзадачи:', result.error());
                    reject(result.error());
                } else {
                    console.log('✅ Предзадача создана, ID:', result.data());
                    resolve(result.data());
                }
            });
        });
    },

    /**
     * Загрузить предзадачи процесса
     * @param {string} processId - ID процесса
     */
    loadFutureTasks: function(processId) {
        return new Promise((resolve) => {
            console.log('📥 EntityManager: Загружаем предзадачи для процесса', processId);

            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_future'
            }, (result) => {
                if (result.error()) {
                    console.warn('⚠️ Ошибка загрузки предзадач:', result.error());
                    resolve([]);
                    return;
                }

                const items = result.data();
                const futureTasks = items
                    .filter(item => {
                        if (!item.DETAIL_TEXT) return false;
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            return data.processId == processId;
                        } catch (e) {
                            return false;
                        }
                    })
                    .map(item => {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        return {
                            entityId: item.ID,
                            data: data
                        };
                    });

                console.log('✅ Загружено предзадач:', futureTasks.length);
                resolve(futureTasks);
            });
        });
    },

    /**
     * Обновить предзадачу (пометить как созданную)
     * @param {number} entityId - ID записи в Entity
     * @param {object} futureData - Обновленные данные
     */
    updateFutureTask: function(entityId, futureData) {
        return new Promise((resolve, reject) => {
            console.log('🔄 EntityManager: Обновляем предзадачу', entityId);

            BX24.callMethod('entity.item.update', {
                ENTITY: 'tflow_future',
                ID: entityId,
                DETAIL_TEXT: JSON.stringify(futureData)
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка обновления предзадачи:', result.error());
                    reject(result.error());
                } else {
                    console.log('✅ Предзадача обновлена');
                    resolve();
                }
            });
        });
    },

    /**
     * Удалить предзадачу
     * @param {number} entityId - ID записи в Entity
     */
    deleteFutureTask: function(entityId) {
        return new Promise((resolve) => {
            console.log('🗑️ EntityManager: Удаляем предзадачу', entityId);

            BX24.callMethod('entity.item.delete', {
                ENTITY: 'tflow_future',
                ID: entityId
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка удаления предзадачи:', result.error());
                }
                resolve();
            });
        });
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * СВЯЗИ (tflow_conn)
     * ═══════════════════════════════════════════════════════════
     */

    /**
     * Создать связь
     * @param {object} connectionData - Данные связи
     * @param {string} connectionData.sourceId - ID узла-источника
     * @param {string} connectionData.targetId - ID узла-назначения
     * @param {string} connectionData.processId - ID процесса
     * @param {string} connectionData.connectionType - Тип связи (task/future)
     */
    createConnection: function(connectionData) {
        return new Promise((resolve, reject) => {
            console.log('💾 EntityManager: Создаем связь', connectionData.sourceId, '→', connectionData.targetId);

            BX24.callMethod('entity.item.add', {
                ENTITY: 'tflow_conn',
                NAME: connectionData.sourceId + '->' + connectionData.targetId,
                DETAIL_TEXT: JSON.stringify(connectionData)
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка создания связи:', result.error());
                    reject(result.error());
                } else {
                    console.log('✅ Связь создана, ID:', result.data());
                    resolve(result.data());
                }
            });
        });
    },

    /**
     * Загрузить связи процесса
     * @param {string} processId - ID процесса
     */
    loadConnections: function(processId) {
        return new Promise((resolve) => {
            console.log('📥 EntityManager: Загружаем связи для процесса', processId);

            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_conn'
            }, (result) => {
                if (result.error()) {
                    console.warn('⚠️ Ошибка загрузки связей:', result.error());
                    resolve([]);
                    return;
                }

                const items = result.data();
                console.log('📦 Всего связей в Entity:', items.length);

                const connections = items
                    .filter(item => {
                        if (!item.DETAIL_TEXT) return false;
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            return data.processId == processId;
                        } catch (e) {
                            return false;
                        }
                    })
                    .map(item => {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        return {
                            id: item.ID,
                            sourceId: data.sourceId,
                            targetId: data.targetId,
                            connectionType: data.connectionType,
                            processId: data.processId
                        };
                    });

                console.log('✅ Загружено связей для processId=' + processId + ':', connections.length);
                resolve(connections);
            });
        });
    },

    /**
     * Обновить связь
     * @param {number} entityId - ID записи в Entity
     * @param {object} connectionData - Обновленные данные связи
     */
    updateConnection: function(entityId, connectionData) {
        return new Promise((resolve, reject) => {
            console.log('🔄 EntityManager: Обновляем связь', entityId);

            BX24.callMethod('entity.item.update', {
                ENTITY: 'tflow_conn',
                ID: entityId,
                DETAIL_TEXT: JSON.stringify(connectionData)
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка обновления связи:', result.error());
                    reject(result.error());
                } else {
                    console.log('✅ Связь обновлена');
                    resolve();
                }
            });
        });
    },

    /**
     * Удалить связь
     * @param {number} entityId - ID записи в Entity
     */
    deleteConnection: function(entityId) {
        return new Promise((resolve) => {
            console.log('🗑️ EntityManager: Удаляем связь', entityId);

            BX24.callMethod('entity.item.delete', {
                ENTITY: 'tflow_conn',
                ID: entityId
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка удаления связи:', result.error());
                }
                resolve();
            });
        });
    },

    /**
     * Заменить futureId на taskId во всех связях
     * @param {string} futureId - ID предзадачи (future-XXX)
     * @param {string} taskId - ID реальной задачи (123)
     */
    replaceFutureWithTask: function(futureId, taskId) {
        return new Promise((resolve) => {
            console.log('🔄 EntityManager: Заменяем', futureId, 'на task-' + taskId, 'во всех связях');

            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_conn'
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка загрузки связей:', result.error());
                    resolve();
                    return;
                }

                const items = result.data();
                const promises = [];

                items.forEach(item => {
                    if (!item.DETAIL_TEXT) return;

                    try {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        let updated = false;

                        if (data.sourceId === futureId) {
                            data.sourceId = 'task-' + taskId;
                            updated = true;
                        }

                        if (data.targetId === futureId) {
                            data.targetId = 'task-' + taskId;
                            data.connectionType = 'task';
                            updated = true;
                        }

                        if (updated) {
                            console.log('  → Обновляем связь ID=' + item.ID);
                            promises.push(
                                this.updateConnection(item.ID, data)
                            );
                        }
                    } catch (e) {
                        // Пропускаем битые записи
                    }
                });

                Promise.all(promises).then(() => {
                    console.log('✅ Обновлено связей:', promises.length);
                    resolve();
                });
            });
        });
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * МИГРАЦИЯ
     * ═══════════════════════════════════════════════════════════
     */

    /**
     * Мигрировать старые связи без processId
     * @param {string} processId - ID процесса для добавления
     * @param {string} taskId - ID задачи (для проверки parentTaskId)
     */
    migrateOldConnections: function(processId, taskId) {
        return new Promise((resolve) => {
            console.log('🔄 EntityManager: Миграция старых связей для процесса', processId);

            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_conn'
            }, (result) => {
                if (result.error()) {
                    console.warn('⚠️ Ошибка загрузки связей для миграции:', result.error());
                    resolve();
                    return;
                }

                const items = result.data();
                let migratedCount = 0;
                const promises = [];

                items.forEach(item => {
                    if (!item.DETAIL_TEXT) return;

                    try {
                        const data = JSON.parse(item.DETAIL_TEXT);

                        // Проверяем, относится ли связь к текущему процессу
                        const isRelated = data.parentTaskId == taskId ||
                                         data.processId == processId ||
                                         (!data.processId && data.parentTaskId == taskId);

                        // Если processId отсутствует и связь относится к текущему процессу
                        if (!data.processId && isRelated) {
                            data.processId = processId;
                            migratedCount++;

                            promises.push(
                                this.updateConnection(item.ID, data)
                            );
                        }
                    } catch (e) {
                        // Пропускаем битые записи
                    }
                });

                Promise.all(promises).then(() => {
                    if (migratedCount > 0) {
                        console.log('✅ Мигрировано связей:', migratedCount);
                    } else {
                        console.log('ℹ️ Связи для миграции не найдены');
                    }
                    resolve(migratedCount);
                });
            });
        });
    }
};

console.log('✅ EntityManager загружен');
