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
        console.log('%c🚀 НАЧАЛО: processCompletedTask для задачи:', 'color: #00ff00; font-size: 16px; font-weight: bold;', completedTaskId);

        try {
            // 1. Находим все связи от этой задачи
            const connections = await this.getConnectionsFromTask(completedTaskId);
            console.log('%c📊 Найдено связей от задачи #' + completedTaskId + ':', 'color: #2196f3; font-weight: bold;', connections.length);

            if (connections.length > 0) {
                console.log('%c📋 Список связей:', 'color: #2196f3;');
                connections.forEach(conn => {
                    const data = JSON.parse(conn.DETAIL_TEXT);
                    console.log('  →', data.sourceId, '→', data.targetId, '(type:', data.connectionType + ')');
                });
            }

            if (connections.length === 0) {
                console.log('%c⚠️  Нет связей для обработки - выходим', 'color: #ff9800;');
                return;
            }

            // 2. Для каждой связи проверяем предзадачи
            const createdTasks = [];

            for (const conn of connections) {
                const connData = JSON.parse(conn.DETAIL_TEXT);
                const targetId = connData.targetId;

                console.log('%c🔍 Обрабатываем связь:', 'color: #9c27b0; font-weight: bold;', connData.sourceId, '→', targetId);

                // Пропускаем если это не предзадача
                if (!targetId.startsWith('future-')) {
                    console.log('%c  ⏭️  Это не предзадача (не начинается с future-), пропускаем', 'color: #9c27b0;');
                    continue;
                }

                console.log('%c  ✅ Это предзадача! Загружаем данные...', 'color: #4caf50; font-weight: bold;');

                // Загружаем данные предзадачи
                const futureTask = await this.getFutureTask(targetId);

                if (!futureTask) {
                    console.warn('%c  ❌ Предзадача не найдена в Entity:', 'color: #f44336; font-weight: bold;', targetId);
                    continue;
                }

                console.log('%c  📦 Данные предзадачи:', 'color: #2196f3;', futureTask.data);
                console.log('    • isCreated:', futureTask.data.isCreated);
                console.log('    • realTaskId:', futureTask.data.realTaskId);
                console.log('    • conditionType:', futureTask.data.conditionType);

                // Пропускаем если уже создана
                if (futureTask.data.isCreated) {
                    console.log('%c  ⏭️  Задача УЖЕ создана (isCreated=true), пропускаем', 'color: #ff9800; font-weight: bold;');
                    continue;
                }

                console.log('%c  🚀 Задача НЕ создана, проверяем условие и создаём...', 'color: #00ff00; font-weight: bold;');

                // Проверяем условие и создаём задачу
                const newTaskId = await this.createTaskIfConditionMet(futureTask);

                if (newTaskId) {
                    console.log('%c  ✅ ЗАДАЧА СОЗДАНА! ID:', 'color: #00ff00; font-size: 14px; font-weight: bold;', newTaskId);
                    createdTasks.push({
                        futureId: targetId,
                        taskId: newTaskId
                    });
                } else {
                    console.log('%c  ⚠️  Задача НЕ создана (условие не выполнено или ошибка)', 'color: #ff9800;');
                }
            }

            console.log('%c✅ ИТОГО создано задач:', 'color: #00ff00; font-size: 16px; font-weight: bold;', createdTasks.length);
            if (createdTasks.length > 0) {
                console.log('%c📋 Список созданных задач:', 'color: #2196f3;');
                createdTasks.forEach(ct => {
                    console.log('  →', ct.futureId, '→ task ID:', ct.taskId);
                });
            }
            
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
        console.log('%c📝 createRealTask: Создаём реальную задачу:', 'color: #ff5722; font-weight: bold;', futureData.title);
        console.log('  Параметры:', {
            title: futureData.title,
            description: futureData.description,
            responsibleId: futureData.responsibleId,
            groupId: futureData.groupId,
            futureId: futureData.futureId
        });

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
                    console.error('%c❌ tasks.task.add ERROR:', 'color: #f44336; font-weight: bold;', result.error());
                    resolve(null);
                    return;
                }

                const resultData = result.data();
                console.log('%c📦 result.data() вернул:', 'color: #ff9800;', resultData, 'type:', typeof resultData);

                // tasks.task.add может вернуть либо число, либо объект {task: ID}
                const newTaskId = (typeof resultData === 'object' && resultData.task) ? resultData.task : resultData;
                console.log('%c✅✅✅ ЗАДАЧА СОЗДАНА ЧЕРЕЗ tasks.task.add! ID:', 'color: #00ff00; font-size: 16px; font-weight: bold;', newTaskId, 'type:', typeof newTaskId);

                // 1. Обновляем предзадачу в Entity
                console.log('%c  📝 Шаг 1: Помечаем предзадачу как созданную (isCreated=true, realTaskId=' + newTaskId + ')', 'color: #2196f3;');
                this.markFutureAsCreated(futureTask.entityId, futureData, newTaskId)
                    .then(() => {
                        console.log('%c  ✅ Шаг 1 ЗАВЕРШЁН: Предзадача помечена как созданная', 'color: #4caf50; font-weight: bold;');
                        // 2. Создаём связь между родительской задачей и новой задачей
                        console.log('%c  📝 Шаг 2: Создаём связи для новой задачи', 'color: #2196f3;');
                        return this.createConnectionForRealTask(futureData.parentTaskId, newTaskId, futureData.futureId);
                    })
                    .then(() => {
                        console.log('%c  ✅ Шаг 2 ЗАВЕРШЁН: Связь создана для новой задачи', 'color: #4caf50; font-weight: bold;');
                        console.log('%c✅✅✅ createRealTask ПОЛНОСТЬЮ ЗАВЕРШЁН для ID:', 'color: #00ff00; font-size: 16px; font-weight: bold;', newTaskId);
                        resolve(newTaskId);
                    })
                    .catch((error) => {
                        console.error('%c❌ Ошибка в процессе создания связей:', 'color: #f44336; font-weight: bold;', error);
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
        console.log('%c    🏷️  markFutureAsCreated вызван:', 'color: #9c27b0;', {
            entityId: entityId,
            futureId: futureData.futureId,
            realTaskId: realTaskId,
            realTaskIdType: typeof realTaskId
        });

        return new Promise((resolve, reject) => {
            futureData.isCreated = true;
            // Убедимся что realTaskId это число (не объект, не строка)
            futureData.realTaskId = parseInt(realTaskId);

            console.log('%c    ✏️  Устанавливаем:', 'color: #9c27b0;', 'isCreated=true', 'realTaskId=' + futureData.realTaskId, 'type=' + typeof futureData.realTaskId);

            const jsonToSave = JSON.stringify(futureData);
            console.log('%c    📦 JSON для сохранения (первые 200 символов):', 'color: #9c27b0;', jsonToSave.substring(0, 200));
            console.log('%c    📦 Ключевые поля перед сохранением:', 'color: #9c27b0;', {
                futureId: futureData.futureId,
                isCreated: futureData.isCreated,
                realTaskId: futureData.realTaskId,
                parentTaskId: futureData.parentTaskId
            });

            BX24.callMethod('entity.item.update', {
                ENTITY: 'tflow_future',
                ID: entityId,
                DETAIL_TEXT: jsonToSave
            }, (result) => {
                if (result.error()) {
                    console.error('%c    ❌ entity.item.update ERROR:', 'color: #f44336; font-weight: bold;', result.error());
                    console.error('%c    ❌ Параметры запроса:', 'color: #f44336;', {
                        ENTITY: 'tflow_future',
                        ID: entityId,
                        DETAIL_TEXT_length: jsonToSave.length
                    });
                    reject(result.error());
                } else {
                    console.log('%c    ✅✅ Entity обновлён! isCreated=true, realTaskId=' + futureData.realTaskId, 'color: #4caf50; font-weight: bold;');
                    console.log('%c    📊 Результат entity.item.update:', 'color: #9c27b0;', result.data());

                    // Проверка: перезагрузим этот Entity чтобы убедиться что сохранилось
                    setTimeout(() => {
                        BX24.callMethod('entity.item.get', {
                            ENTITY: 'tflow_future',
                            FILTER: { ID: entityId }
                        }, (checkResult) => {
                            if (!checkResult.error() && checkResult.data().length > 0) {
                                const savedData = JSON.parse(checkResult.data()[0].DETAIL_TEXT);
                                console.log('%c    🔍 ПРОВЕРКА: Что реально сохранилось в Entity:', 'color: #00ff00; font-weight: bold;', {
                                    isCreated: savedData.isCreated,
                                    realTaskId: savedData.realTaskId,
                                    realTaskIdType: typeof savedData.realTaskId
                                });
                            } else {
                                console.error('%c    ❌ Не удалось перезагрузить Entity для проверки', 'color: #f44336;');
                            }
                        });
                    }, 500);

                    resolve();
                }
            });
        });
    }
};

console.log('✅ TaskCreator component loaded');
