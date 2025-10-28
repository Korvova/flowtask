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
     * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
     * ═══════════════════════════════════════════════════════════
     */

    /**
     * Загрузить ВСЕ элементы Entity с пагинацией
     * @param {string} entityName - Название Entity
     * @returns {Promise<Array>}
     */
    _loadAllEntityItems: function(entityName) {
        return new Promise((resolve) => {
            const allItems = [];
            const loadBatch = (start) => {
                BX24.callMethod('entity.item.get', {
                    ENTITY: entityName,
                    SORT: { ID: 'ASC' },
                    start: start
                }, (result) => {
                    if (result.error()) {
                        console.warn(`⚠️ Ошибка загрузки ${entityName}:`, result.error());
                        resolve([]);
                        return;
                    }

                    const batch = result.data();

                    if (batch.length > 0) {
                        allItems.push(...batch);
                        if (batch.length === 50) {
                            loadBatch(start + 50);
                        } else {
                            resolve(allItems);
                        }
                    } else {
                        resolve(allItems);
                    }
                });
            };
            loadBatch(0);
        });
    },

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

            this._loadAllEntityItems('tflow_future').then(items => {
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
            console.log('  ✅ entity.item.get поддерживает FILTER!');
            console.log('  🔧 Стратегия: Загружаем с пагинацией через start');

            const allItems = [];
            const seenIds = new Set();

            const loadBatch = (start) => {
                console.log(`  🔄 Запрос порции start=${start}...`);

                BX24.callMethod('entity.item.get', {
                    ENTITY: 'tflow_conn',
                    SORT: { ID: 'ASC' },
                    start: start
                }, (result) => {
                    if (result.error()) {
                        console.warn('⚠️ Ошибка загрузки:', result.error());
                        resolve([]);
                        return;
                    }

                    const batch = result.data();
                    console.log(`  ✅ Получено записей: ${batch.length}`);

                    // Проверяем на дубликаты
                    let newCount = 0;
                    batch.forEach(item => {
                        if (!seenIds.has(item.ID)) {
                            seenIds.add(item.ID);
                            allItems.push(item);
                            newCount++;
                        }
                    });

                    console.log(`  📊 Новых: ${newCount}, всего: ${allItems.length}`);

                    // Если все дубликаты - останавливаемся
                    if (newCount === 0 && batch.length > 0) {
                        console.log('⚠️ Все дубликаты - достигнут конец');
                        processAllItems(allItems);
                        return;
                    }

                    // Если получили 50 - пробуем загрузить еще
                    if (batch.length === 50 && allItems.length < 500) {
                        setTimeout(() => loadBatch(start + 50), 100);
                    } else {
                        console.log('✅ Загрузка завершена, всего:', allItems.length);
                        processAllItems(allItems);
                    }
                });
            };

            // Начинаем загрузку
            loadBatch(0);

            const processAllItems = (items) => {
                console.log('🔍 Фильтруем связи с processId =', processId);

                // Показываем ID диапазон
                const allIds = items.map(i => parseInt(i.ID)).sort((a, b) => a - b);
                console.log('📊 ID диапазон:', allIds.length > 0 ? `${allIds[0]} - ${allIds[allIds.length-1]}` : 'пусто');
                console.log('📊 Все ID:', allIds.join(', '));

                // Показываем ПЕРВЫЕ 5 связей
                const firstItems = items.slice(0, 5);
                console.log('📋 ПЕРВЫЕ 5 связей в Entity:');
                firstItems.forEach((item, idx) => {
                    if (item.DETAIL_TEXT) {
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            console.log(`  ${idx+1}. ID=${item.ID}: processId="${data.processId}" (${typeof data.processId}), source=${data.sourceId}, target=${data.targetId}`);
                        } catch (e) {}
                    }
                });

                // Показываем ПОСЛЕДНИЕ 5 связей для отладки
                const lastItems = items.slice(-5);
                console.log('📋 ПОСЛЕДНИЕ 5 связей в Entity:');
                lastItems.forEach((item, idx) => {
                    if (item.DETAIL_TEXT) {
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            console.log(`  ${idx+1}. ID=${item.ID}: processId="${data.processId}" (${typeof data.processId}), source=${data.sourceId}, target=${data.targetId}`);
                        } catch (e) {}
                    }
                });

                // ПРОВЕРЯЕМ наличие ID=402 и 404
                const has402 = items.find(i => i.ID === '402');
                const has404 = items.find(i => i.ID === '404');
                console.log('🔍 Связь ID=402 в результатах:', has402 ? '✅ ЕСТЬ' : '❌ НЕТ');
                console.log('🔍 Связь ID=404 в результатах:', has404 ? '✅ ЕСТЬ' : '❌ НЕТ');

                const connections = items
                    .filter(item => {
                        if (!item.DETAIL_TEXT) return false;
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            const matches = data.processId == processId;
                            if (!matches && data.sourceId && data.sourceId.includes('task-115')) {
                                console.log('  ⚠️ Связь task-115 НЕ прошла фильтр! processId в данных:', data.processId, 'ищем:', processId);
                            }
                            return matches;
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

                console.log('✅ Найдено связей для processId=' + processId + ':', connections.length);
                resolve(connections);
            };

            // Начинаем загрузку с первой порции
            loadBatch(0);
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
     * УДАЛЕНИЕ ДАННЫХ ПРОЦЕССА
     * ═══════════════════════════════════════════════════════════
     */

    /**
     * Удалить ВСЕ данные процесса (связи, предзадачи, позиции)
     * @param {string} processId - ID процесса
     * @returns {Promise<{connections: number, futures: number, positions: number}>}
     */
    deleteAllProcessData: function(processId) {
        return new Promise((resolve, reject) => {
            console.log('🗑️ EntityManager: Удаляем все данные процесса', processId);

            let stats = {
                connections: 0,
                futures: 0,
                positions: 0
            };

            // Удаляем связи
            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_conn'
            }, (connResult) => {
                if (connResult.error()) {
                    console.error('❌ Ошибка загрузки связей:', connResult.error());
                    reject(connResult.error());
                    return;
                }

                const connections = connResult.data().filter(item => {
                    if (!item.DETAIL_TEXT) return false;
                    try {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        return data.processId == processId;
                    } catch (e) {
                        return false;
                    }
                });

                console.log('  Найдено связей:', connections.length);

                // Удаляем предзадачи
                BX24.callMethod('entity.item.get', {
                    ENTITY: 'tflow_future'
                }, (futureResult) => {
                    if (futureResult.error()) {
                        console.error('❌ Ошибка загрузки предзадач:', futureResult.error());
                        reject(futureResult.error());
                        return;
                    }

                    const futures = futureResult.data().filter(item => {
                        if (!item.DETAIL_TEXT) return false;
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            return data.processId == processId;
                        } catch (e) {
                            return false;
                        }
                    });

                    console.log('  Найдено предзадач:', futures.length);

                    // Удаляем позиции
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_pos'
                    }, (posResult) => {
                        if (posResult.error()) {
                            console.error('❌ Ошибка загрузки позиций:', posResult.error());
                            reject(posResult.error());
                            return;
                        }

                        const positions = posResult.data().filter(item => {
                            if (!item.DETAIL_TEXT) return false;
                            try {
                                const data = JSON.parse(item.DETAIL_TEXT);
                                return data.processId == processId;
                            } catch (e) {
                                return false;
                            }
                        });

                        console.log('  Найдено позиций:', positions.length);

                        // Удаляем все найденные записи
                        const deletePromises = [];

                        connections.forEach(item => {
                            deletePromises.push(
                                new Promise((res) => {
                                    BX24.callMethod('entity.item.delete', {
                                        ENTITY: 'tflow_conn',
                                        ID: item.ID
                                    }, () => {
                                        stats.connections++;
                                        res();
                                    });
                                })
                            );
                        });

                        futures.forEach(item => {
                            deletePromises.push(
                                new Promise((res) => {
                                    BX24.callMethod('entity.item.delete', {
                                        ENTITY: 'tflow_future',
                                        ID: item.ID
                                    }, () => {
                                        stats.futures++;
                                        res();
                                    });
                                })
                            );
                        });

                        positions.forEach(item => {
                            deletePromises.push(
                                new Promise((res) => {
                                    BX24.callMethod('entity.item.delete', {
                                        ENTITY: 'tflow_pos',
                                        ID: item.ID
                                    }, () => {
                                        stats.positions++;
                                        res();
                                    });
                                })
                            );
                        });

                        Promise.all(deletePromises).then(() => {
                            console.log('✅ Удаление завершено:', stats);
                            resolve(stats);
                        });
                    });
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
