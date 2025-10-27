/**
 * TaskCreator - Компонент для создания реальных задач из предзадач
 * Работает при выполнении условий (завершение родительской задачи и т.д.)
 */
window.TaskCreator = {
    
    /**
     * Обработка завершения задачи - создание связанных предзадач
     * @param {number} completedTaskId - ID завершённой задачи
     * @param {function} onSuccess - Callback после создания задач
     */
    processCompletedTask: async function(completedTaskId, onSuccess) {
        console.log('🚀 Обрабатываем завершение задачи:', completedTaskId);
        
        try {
            // 1. Находим все связи от этой задачи
            const connections = await this.getConnectionsFromTask(completedTaskId);
            console.log('📊 Найдено связей:', connections.length);
            
            if (connections.length === 0) {
                console.log('ℹ️  Нет связей для обработки');
                return;
            }
            
            // 2. Для каждой связи проверяем предзадачи
            const createdTasks = [];
            
            for (const conn of connections) {
                const connData = JSON.parse(conn.DETAIL_TEXT);
                const targetId = connData.targetId;
                
                // Пропускаем если это не предзадача
                if (!targetId.startsWith('future-')) {
                    continue;
                }
                
                console.log('🔍 Проверяем предзадачу:', targetId);
                
                // Загружаем данные предзадачи
                const futureTask = await this.getFutureTask(targetId);
                
                if (!futureTask) {
                    console.warn('⚠️  Предзадача не найдена:', targetId);
                    continue;
                }
                
                // Пропускаем если уже создана
                if (futureTask.data.isCreated) {
                    console.log('⏭️  Задача уже создана, пропускаем');
                    continue;
                }
                
                // Проверяем условие и создаём задачу
                const newTaskId = await this.createTaskIfConditionMet(futureTask);
                
                if (newTaskId) {
                    createdTasks.push({
                        futureId: targetId,
                        taskId: newTaskId
                    });
                }
            }
            
            console.log('✅ Создано задач:', createdTasks.length);
            
            // Вызываем callback
            if (onSuccess && createdTasks.length > 0) {
                onSuccess(createdTasks);
            }
            
        } catch (error) {
            console.error('❌ Ошибка при обработке завершения задачи:', error);
        }
    },
    
    /**
     * Получение связей от задачи
     */
    getConnectionsFromTask: function(taskId) {
        return new Promise((resolve) => {
            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_conn'
            }, (result) => {
                if (result.error()) {
                    resolve([]);
                    return;
                }
                
                const items = result.data();
                const filtered = items.filter(item => {
                    if (!item.DETAIL_TEXT) return false;
                    try {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        return data.sourceId === 'task-' + taskId;
                    } catch (e) {
                        return false;
                    }
                });
                
                resolve(filtered);
            });
        });
    },
    
    /**
     * Получение данных предзадачи
     */
    getFutureTask: function(futureId) {
        return new Promise((resolve) => {
            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_future'
            }, (result) => {
                if (result.error()) {
                    resolve(null);
                    return;
                }
                
                const items = result.data();
                const found = items.find(item => {
                    if (!item.DETAIL_TEXT) return false;
                    try {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        return data.futureId === futureId;
                    } catch (e) {
                        return false;
                    }
                });
                
                if (found) {
                    resolve({
                        entityId: found.ID,
                        data: JSON.parse(found.DETAIL_TEXT)
                    });
                } else {
                    resolve(null);
                }
            });
        });
    },
    
    /**
     * Создание задачи если условие выполнено
     */
    createTaskIfConditionMet: async function(futureTask) {
        const condition = futureTask.data.conditionType;
        console.log('📋 Условие:', condition);
        
        if (condition === 'immediately') {
            // Создаём сразу
            console.log('⚡ Создаём задачу немедленно');
            return await this.createRealTask(futureTask);
            
        } else if (condition === 'delay') {
            // Создаём с задержкой
            const delayMinutes = futureTask.data.delayMinutes || 0;
            console.log('⏰ Создаём задачу через', delayMinutes, 'минут');
            
            setTimeout(() => {
                this.createRealTask(futureTask);
            }, delayMinutes * 60 * 1000);
            
            return null; // Вернём null т.к. задача будет создана позже
            
        } else if (condition === 'ifCancel_create') {
            // Создаём только при отмене (не обрабатываем здесь)
            console.log('⏭️  Условие "при отмене", пропускаем');
            return null;
            
        } else {
            console.warn('⚠️  Неизвестное условие:', condition);
            return null;
        }
    },
    
    /**
     * Создание реальной задачи
     */
    createRealTask: function(futureTask) {
        const futureData = futureTask.data;
        console.log('📝 Создаём реальную задачу:', futureData.title);

        return new Promise((resolve) => {
            BX24.callMethod('tasks.task.add', {
                fields: {
                    TITLE: futureData.title,
                    DESCRIPTION: futureData.description || '',
                    RESPONSIBLE_ID: futureData.responsibleId,
                    GROUP_ID: futureData.groupId || 0
                }
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка создания задачи:', result.error());
                    resolve(null);
                    return;
                }

                const newTaskId = result.data();
                console.log('✅ Задача создана! ID:', newTaskId);

                // 1. Обновляем предзадачу в Entity
                this.markFutureAsCreated(futureTask.entityId, futureData, newTaskId)
                    .then(() => {
                        // 2. Создаём связь между родительской задачей и новой задачей
                        return this.createConnectionForRealTask(futureData.parentTaskId, newTaskId, futureTask.futureId);
                    })
                    .then(() => {
                        console.log('✅ Связь создана для новой задачи');
                        resolve(newTaskId);
                    })
                    .catch((error) => {
                        console.error('❌ Ошибка:', error);
                        resolve(newTaskId);
                    });
            });
        });
    },

    /**
     * Создание связи для реальной задачи
     */
    createConnectionForRealTask: function(parentTaskId, newTaskId, futureId) {
        return new Promise((resolve, reject) => {
            console.log('🔗 Создаём связь для задачи:', newTaskId, 'от предзадачи:', futureId);

            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_conn'
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка загрузки связей:', result.error());
                    reject(result.error());
                    return;
                }

                const connections = result.data();
                const futureConnections = connections.filter(conn => {
                    if (!conn.DETAIL_TEXT) return false;
                    try {
                        const data = JSON.parse(conn.DETAIL_TEXT);
                        return data.targetId === futureId;
                    } catch (e) {
                        return false;
                    }
                });

                console.log('📊 Найдено связей с предзадачей:', futureConnections.length);

                if (futureConnections.length === 0) {
                    console.log('ℹ️  Нет связей для копирования');
                    resolve();
                    return;
                }

                const promises = futureConnections.map(conn => {
                    const connData = JSON.parse(conn.DETAIL_TEXT);

                    const newConnectionData = {
                        sourceId: connData.sourceId,
                        targetId: 'task-' + newTaskId,
                        connectionType: 'task'
                    };

                    return new Promise((res) => {
                        BX24.callMethod('entity.item.add', {
                            ENTITY: 'tflow_conn',
                            NAME: 'conn_' + connData.sourceId.replace(/[^a-zA-Z0-9]/g, '_') + '_task' + newTaskId,
                            DETAIL_TEXT: JSON.stringify(newConnectionData)
                        }, (addResult) => {
                            if (addResult.error()) {
                                console.error('❌ Ошибка создания связи:', addResult.error());
                            } else {
                                console.log('✅ Создана связь:', connData.sourceId, '→', 'task-' + newTaskId);
                            }
                            res();
                        });
                    });
                });

                Promise.all(promises).then(() => resolve()).catch(() => resolve());
            });
        });
    },
    
    /**
     * Пометить предзадачу как созданную
     */
    markFutureAsCreated: function(entityId, futureData, realTaskId) {
        return new Promise((resolve, reject) => {
            futureData.isCreated = true;
            futureData.realTaskId = realTaskId;
            
            BX24.callMethod('entity.item.update', {
                ENTITY: 'tflow_future',
                ID: entityId,
                DETAIL_TEXT: JSON.stringify(futureData)
            }, (result) => {
                if (result.error()) {
                    reject(result.error());
                } else {
                    console.log('✅ Предзадача помечена как созданная');
                    resolve();
                }
            });
        });
    }
};

console.log('✅ TaskCreator component loaded');
