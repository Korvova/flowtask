/**
 * TaskCreator - Компонент для создания реальных задач из предзадач
 * Работает при выполнении условий (завершение родительской задачи и т.д.)
 */
window.TaskCreator = {

    // Хелпер для логирования через DEBUG LOG (console.log не работает во фрейме!)
    log: function(msg, color) {
        color = color || '#2196f3';
        if (window.FlowCanvas && window.FlowCanvas.addDebugLog) {
            window.FlowCanvas.addDebugLog(msg, color);
        }
        console.log(msg); // Дублируем для бэкенд-логов
    },

    /**
     * Обработка завершения задачи - создание связанных предзадач
     * @param {number} completedTaskId - ID завершённой задачи
     * @param {function} onSuccess - Callback после создания задач
     */
    processCompletedTask: async function(completedTaskId, onSuccess) {
        this.log('═══════════════════════════════════════════', '#ff0000');
        this.log('🚀 НАЧАЛО: processCompletedTask для задачи: ' + completedTaskId, '#00ff00');
        this.log('═══════════════════════════════════════════', '#ff0000');

        try {
            this.log('STEP 1: Загружаем связи от задачи #' + completedTaskId, '#2196f3');

            // 1. Находим все связи от этой задачи
            const connections = await this.getConnectionsFromTask(completedTaskId);

            this.log('📊 Найдено связей: ' + connections.length, '#2196f3');

            if (connections.length > 0) {
                this.log('📋 Список связей:', '#2196f3');
                connections.forEach((conn, idx) => {
                    const data = JSON.parse(conn.DETAIL_TEXT);
                    this.log('  ' + (idx+1) + '. ' + data.sourceId + ' → ' + data.targetId + ' (type: ' + data.connectionType + ')', '#9c27b0');
                });
            }

            if (connections.length === 0) {
                this.log('⚠️ Нет связей для обработки - выходим', '#ff9800');
                return;
            }

            // 2. Для каждой связи проверяем предзадачи
            const createdTasks = [];
            this.log('STEP 2: Обработка ' + connections.length + ' связей', '#2196f3');

            for (let i = 0; i < connections.length; i++) {
                const conn = connections[i];
                this.log('─────────────────────────────────────────', '#666');
                this.log('🔍 Связь ' + (i+1) + ' из ' + connections.length, '#9c27b0');

                const connData = JSON.parse(conn.DETAIL_TEXT);
                const targetId = connData.targetId;

                this.log('  source: ' + connData.sourceId, '#9c27b0');
                this.log('  target: ' + targetId, '#9c27b0');

                // Пропускаем если это не предзадача
                if (!targetId.startsWith('future-')) {
                    this.log('  ⏭️ Это НЕ предзадача (не начинается с future-), пропускаем', '#ff9800');
                    continue;
                }

                this.log('  ✅ Это ПРЕДЗАДАЧА! Загружаем данные...', '#4caf50');

                // Загружаем данные предзадачи
                const futureTask = await this.getFutureTask(targetId);

                if (!futureTask) {
                    this.log('  ❌ Предзадача не найдена в Entity: ' + targetId, '#f44336');
                    continue;
                }

                this.log('  📦 Данные предзадачи загружены:', '#2196f3');
                this.log('    • futureId: ' + futureTask.data.futureId, '#2196f3');
                this.log('    • title: ' + futureTask.data.title, '#2196f3');
                this.log('    • isCreated: ' + futureTask.data.isCreated, '#2196f3');
                this.log('    • realTaskId: ' + futureTask.data.realTaskId, '#2196f3');
                this.log('    • conditionType: ' + futureTask.data.conditionType, '#2196f3');

                // Пропускаем если уже создана
                if (futureTask.data.isCreated) {
                    this.log('  ⏭️ Задача УЖЕ создана (isCreated=true), пропускаем', '#ff9800');
                    continue;
                }

                this.log('  🚀 Задача НЕ создана, начинаем создание...', '#00ff00');

                // КРИТИЧНО: Ищем связи ДО создания задачи, иначе после createConnectionForRealTask sourceId изменится!
                this.log('  🔍 Предзагружаем связи от ' + targetId + ' ДО создания задачи', '#ff9800');
                const nextConnections = await this.getConnectionsFromFutureNode(targetId);
                this.log('  📊 Предзагружено связей: ' + nextConnections.length, '#ff9800');

                // Проверяем условие и создаём задачу
                const newTaskId = await this.createTaskIfConditionMet(futureTask);

                if (newTaskId) {
                    this.log('  ✅✅ ЗАДАЧА СОЗДАНА! Новый ID: ' + newTaskId, '#00ff00');
                    createdTasks.push({
                        futureId: targetId,
                        taskId: newTaskId
                    });

                    // РЕКУРСИЯ: Обрабатываем предзагруженные связи
                    this.log('  🔄 РЕКУРСИЯ: Обрабатываем ' + nextConnections.length + ' предзагруженных связей', '#9c27b0');

                    if (nextConnections.length > 0) {
                        this.log('  📋 Найдено связей от ' + targetId + ': ' + nextConnections.length, '#2196f3');

                        // Обрабатываем каждую связь рекурсивно
                        for (let j = 0; j < nextConnections.length; j++) {
                            const nextConn = nextConnections[j];
                            const nextConnData = JSON.parse(nextConn.DETAIL_TEXT);
                            const nextTargetId = nextConnData.targetId;

                            this.log('    → Связь: ' + targetId + ' → ' + nextTargetId, '#9c27b0');

                            // Если это предзадача - создаём рекурсивно
                            if (nextTargetId.startsWith('future-')) {
                                const nextFutureTask = await this.getFutureTask(nextTargetId);

                                if (nextFutureTask && !nextFutureTask.data.isCreated) {
                                    this.log('    🚀 Создаём следующую задачу: ' + nextTargetId, '#00ff00');
                                    const nextTaskId = await this.createTaskIfConditionMet(nextFutureTask);

                                    if (nextTaskId) {
                                        this.log('    ✅ Создана задача ID: ' + nextTaskId, '#00ff00');
                                        createdTasks.push({
                                            futureId: nextTargetId,
                                            taskId: nextTaskId
                                        });

                                        // Продолжаем рекурсию дальше...
                                        // TODO: можно сделать глубже если нужно
                                    }
                                }
                            }
                        }
                    } else {
                        this.log('  ℹ️ Нет связей от ' + targetId + ' - это конечная задача', '#9c27b0');
                    }
                } else {
                    this.log('  ⚠️ Задача НЕ создана (условие не выполнено или ошибка)', '#ff9800');
                }
            }

            this.log('═══════════════════════════════════════════', '#00ff00');
            this.log('✅ ИТОГО создано задач: ' + createdTasks.length, '#00ff00');

            if (createdTasks.length > 0) {
                this.log('📋 Список созданных задач:', '#2196f3');
                createdTasks.forEach(ct => {
                    this.log('  → ' + ct.futureId + ' → task ID: ' + ct.taskId, '#2196f3');
                });
            }

            // Вызываем callback
            if (onSuccess && createdTasks.length > 0) {
                this.log('📞 Вызываем callback onSuccess с ' + createdTasks.length + ' задачами', '#00ff00');
                onSuccess(createdTasks);
            } else if (!onSuccess) {
                this.log('⚠️ onSuccess callback отсутствует', '#ff9800');
            }

            this.log('═══════════════════════════════════════════', '#00ff00');

        } catch (error) {
            this.log('❌❌❌ EXCEPTION: ' + error.toString(), '#f44336');
            this.log('Stack: ' + error.stack, '#f44336');
        }
    },
    
    /**
     * Получение связей от future-узла (ОБНОВЛЕНО: теперь использует FILTER)
     */
    getConnectionsFromFutureNode: function(futureId) {
        return new Promise((resolve) => {
            this.log('    🔍 getConnectionsFromFutureNode: Ищем связи для ' + futureId, '#9c27b0');
            this.log('    🔧 Используем loadAllConnectionsViaEntityManager (с FILTER)', '#00bcd4');

            // Загружаем ВСЕ связи через метод с FILTER
            this.loadAllConnectionsViaEntityManager().then(items => {
                this.log('    📊 Всего связей загружено: ' + items.length, '#2196f3');

                // Фильтруем связи где source = futureId
                const connections = items.filter(item => {
                    if (!item.DETAIL_TEXT) return false;
                    try {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        return data.sourceId === futureId;
                    } catch (e) {
                        return false;
                    }
                });

                this.log('    ✅ Найдено связей для ' + futureId + ': ' + connections.length, '#2196f3');

                if (connections.length > 0) {
                    this.log('    📋 Найденные связи:', '#2196f3');
                    connections.forEach((item, idx) => {
                        const data = JSON.parse(item.DETAIL_TEXT);
                        this.log('      ' + (idx+1) + '. ID=' + item.ID + ' ' + data.sourceId + ' → ' + data.targetId, '#9c27b0');
                    });
                }

                resolve(connections);
            }).catch(error => {
                this.log('    ❌ Ошибка loadAllConnectionsViaEntityManager: ' + error, '#f44336');
                resolve([]);
            });
        });
    },

    /**
     * Получение связей от задачи
     */
    getConnectionsFromTask: function(taskId) {
        return new Promise((resolve) => {
            this.log('    🔍 getConnectionsFromTask: Ищем связи для task-' + taskId, '#9c27b0');

            // СНАЧАЛА ищем futureId для этой задачи (если она была создана из предзадачи)
            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_future'
            }, (futureResult) => {
                let futureId = null;

                if (!futureResult.error()) {
                    const futureItems = futureResult.data();
                    const futureTask = futureItems.find(item => {
                        if (!item.DETAIL_TEXT) return false;
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            return data.isCreated && data.realTaskId == taskId;
                        } catch (e) {
                            return false;
                        }
                    });

                    if (futureTask) {
                        const futureData = JSON.parse(futureTask.DETAIL_TEXT);
                        futureId = futureData.futureId;
                        this.log('    🔍 Задача task-' + taskId + ' была создана из предзадачи: ' + futureId, '#ff9800');
                    }
                }

                // Теперь загружаем связи через EntityManager (с FILTER!)
                this.log('    🔧 Используем EntityManager для загрузки ВСЕХ связей', '#00bcd4');

                // Загружаем ВСЕ связи через EntityManager (с диапазонами FILTER)
                this.loadAllConnectionsViaEntityManager().then(items => {
                    this.log('    📊 Всего связей загружено: ' + items.length, '#2196f3');

                    // Логируем последние 5 связей для отладки
                    if (items.length > 0) {
                        this.log('    📋 Последние 5 связей:', '#2196f3');
                        items.slice(-5).forEach((item, idx) => {
                            try {
                                const data = JSON.parse(item.DETAIL_TEXT);
                                this.log('      ' + (items.length - 4 + idx) + '. ID=' + item.ID + ' source=' + data.sourceId + ' → target=' + data.targetId, '#9c27b0');
                            } catch (e) {
                                this.log('      ' + (items.length - 4 + idx) + '. ID=' + item.ID + ' (ошибка парсинга)', '#f44336');
                            }
                        });
                    }

                    // КРИТИЧНО: Ищем связи где sourceId = 'task-XXX' ИЛИ sourceId = 'future-XXX'
                    const filtered = items.filter(item => {
                        if (!item.DETAIL_TEXT) return false;
                        try {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            // Проверяем оба варианта!
                            const matchTask = data.sourceId === 'task-' + taskId;
                            const matchFuture = futureId && data.sourceId === futureId;
                            return matchTask || matchFuture;
                        } catch (e) {
                            return false;
                        }
                    });

                    this.log('    ✅ Найдено связей для task-' + taskId + (futureId ? ' (или ' + futureId + ')' : '') + ': ' + filtered.length, '#00ff00');

                    if (filtered.length > 0) {
                        this.log('    📋 Найденные связи:', '#2196f3');
                        filtered.forEach((item, idx) => {
                            const data = JSON.parse(item.DETAIL_TEXT);
                            this.log('      ' + (idx+1) + '. ' + data.sourceId + ' → ' + data.targetId, '#9c27b0');
                        });
                    }

                    resolve(filtered);
                }).catch(error => {
                    this.log('    ❌ Ошибка loadAllConnectionsViaEntityManager: ' + error, '#f44336');
                    resolve([]);
                });
            });
        });
    },

    /**
     * Загрузка ВСЕХ связей через EntityManager (с FILTER диапазонами)
     */
    loadAllConnectionsViaEntityManager: function() {
        return new Promise((resolve) => {
            const allItems = [];
            const seenIds = new Set();
            const step = 100;

            const loadRange = (minId) => {
                const maxId = minId + step - 1;

                BX24.callMethod('entity.item.get', {
                    ENTITY: 'tflow_conn',
                    FILTER: {
                        '>=ID': minId,
                        '<=ID': maxId
                    },
                    SORT: { ID: 'ASC' }
                }, (result) => {
                    if (result.error()) {
                        resolve(allItems);
                        return;
                    }

                    const batch = result.data();

                    batch.forEach(item => {
                        if (!seenIds.has(item.ID)) {
                            seenIds.add(item.ID);
                            allItems.push(item);
                        }
                    });

                    // Продолжаем если получили записи
                    if (batch.length > 0 && allItems.length < 1000) {
                        setTimeout(() => loadRange(minId + step), 50);
                    } else {
                        resolve(allItems);
                    }
                });
            };

            loadRange(200); // Начинаем с ID=200
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
        this.log('    📋 Проверяем условие: ' + condition, '#9c27b0');

        if (condition === 'immediately') {
            // Создаём сразу
            this.log('    ⚡ Условие "immediately" - создаём задачу НЕМЕДЛЕННО', '#00ff00');
            return await this.createRealTask(futureTask);

        } else if (condition === 'delay') {
            // Создаём с задержкой
            const delayMinutes = futureTask.data.delayMinutes || 0;
            this.log('    ⏰ Условие "delay" - создаём задачу через ' + delayMinutes + ' минут', '#ff9800');

            setTimeout(() => {
                this.createRealTask(futureTask);
            }, delayMinutes * 60 * 1000);

            return null; // Вернём null т.к. задача будет создана позже

        } else if (condition === 'ifCancel_create') {
            // Создаём только при отмене (не обрабатываем здесь)
            this.log('    ⏭️ Условие "при отмене", пропускаем', '#ff9800');
            return null;

        } else {
            this.log('    ⚠️ НЕИЗВЕСТНОЕ условие: ' + condition, '#f44336');
            return null;
        }
    },
    
    /**
     * Создание реальной задачи
     */
    createRealTask: function(futureTask) {
        const futureData = futureTask.data;
        this.log('      📝 createRealTask ВЫЗВАН', '#ff5722');
        this.log('      • Название: ' + futureData.title, '#ff5722');
        this.log('      • Описание: ' + (futureData.description || '(пусто)'), '#ff5722');
        this.log('      • Ответственный ID: ' + futureData.responsibleId, '#ff5722');
        this.log('      • Группа ID: ' + (futureData.groupId || 0), '#ff5722');
        this.log('      • Future ID: ' + futureData.futureId, '#ff5722');

        return new Promise((resolve) => {
            // Наследуем processId от предзадачи
            const processId = futureData.processId || window.currentProcessId;
            this.log('      • ProcessId: ' + processId, '#ff5722');

            BX24.callMethod('tasks.task.add', {
                fields: {
                    TITLE: futureData.title,
                    DESCRIPTION: futureData.description || '',
                    RESPONSIBLE_ID: futureData.responsibleId,
                    GROUP_ID: futureData.groupId || 0,
                    UF_FLOWTASK_PROCESS_ID: processId // ДОБАВЛЕНО: наследуем processId!
                }
            }, (result) => {
                if (result.error()) {
                    console.error('%c❌ tasks.task.add ERROR:', 'color: #f44336; font-weight: bold;', result.error());
                    // alert убран - была ошибка tasks.task.add
                    resolve(null);
                    return;
                }

                // ПОЛНЫЙ ДАМП результата
                const resultData = result.data();

                console.log('%c═════════════════════════════════════════', 'color: #ff0000; font-size: 16px; font-weight: bold;');
                console.log('%c📦 ПОЛНЫЙ ДАМП tasks.task.add', 'color: #ff0000; font-size: 16px; font-weight: bold;');
                console.log('%c═════════════════════════════════════════', 'color: #ff0000; font-size: 16px; font-weight: bold;');

                console.log('1️⃣ result:', result);
                console.log('2️⃣ result.data():', resultData);
                console.log('3️⃣ typeof result.data():', typeof resultData);
                console.log('4️⃣ JSON.stringify(result.data()):', JSON.stringify(resultData));
                console.log('5️⃣ Object.keys(result.data()):', Object.keys(resultData || {}));

                if (typeof resultData === 'object') {
                    console.log('6️⃣ resultData.task:', resultData.task);
                    console.log('7️⃣ resultData.ID:', resultData.ID);
                    console.log('8️⃣ resultData.id:', resultData.id);
                    console.log('9️⃣ Все свойства:');
                    for (let key in resultData) {
                        console.log('   • ' + key + ':', resultData[key], '(type: ' + typeof resultData[key] + ')');
                    }
                }

                console.log('%c═════════════════════════════════════════', 'color: #ff0000; font-size: 16px; font-weight: bold;');

                // Пробуем разные варианты извлечения ID
                let newTaskId = null;

                if (typeof resultData === 'number') {
                    newTaskId = resultData;
                    console.log('✅ ID получен как число напрямую:', newTaskId);
                } else if (typeof resultData === 'string') {
                    newTaskId = parseInt(resultData);
                    console.log('✅ ID получен как строка, конвертируем:', newTaskId);
                } else if (typeof resultData === 'object') {
                    // Пробуем разные варианты извлечения ID
                    // ВАЖНО: resultData.task это объект задачи, нужно взять task.id или task.ID
                    if (resultData.task && typeof resultData.task === 'object') {
                        newTaskId = resultData.task.id || resultData.task.ID;
                        console.log('✅ ID извлечён из resultData.task.id/ID:', newTaskId);
                    } else if (typeof resultData.task === 'number' || typeof resultData.task === 'string') {
                        newTaskId = parseInt(resultData.task);
                        console.log('✅ ID извлечён из resultData.task (число/строка):', newTaskId);
                    } else {
                        // Fallback: пробуем другие варианты
                        newTaskId = resultData.ID || resultData.id || resultData.TASK_ID || resultData.taskId;
                        console.log('✅ ID извлечён из других полей:', newTaskId);
                    }

                    // Если всё ещё не нашли, ищем первое числовое свойство
                    if (!newTaskId || typeof newTaskId === 'object') {
                        console.log('⚠️ ID не найден, ищем числовое свойство...');
                        for (let key in resultData) {
                            const val = resultData[key];
                            if (typeof val === 'object' && val !== null) {
                                // Смотрим внутрь объекта
                                if (val.id && typeof val.id === 'number') {
                                    newTaskId = val.id;
                                    console.log('✅ ID найден в ' + key + '.id:', newTaskId);
                                    break;
                                } else if (val.ID && typeof val.ID === 'number') {
                                    newTaskId = val.ID;
                                    console.log('✅ ID найден в ' + key + '.ID:', newTaskId);
                                    break;
                                }
                            } else if (typeof val === 'number' || !isNaN(parseInt(val))) {
                                newTaskId = parseInt(val);
                                console.log('✅ ID найден в свойстве "' + key + '":', newTaskId);
                                break;
                            }
                        }
                    }
                }

                console.log('%c🎯 ФИНАЛЬНЫЙ ID:', 'color: #00ff00; font-size: 20px; font-weight: bold;', newTaskId, 'type:', typeof newTaskId);

                // Детальный alert
                let alertText = '═══ ЗАДАЧА СОЗДАНА ═══\n\n';
                alertText += 'Финальный ID: ' + newTaskId + '\n';
                alertText += 'Тип: ' + typeof newTaskId + '\n\n';
                alertText += '--- result.data() ---\n';
                alertText += 'Тип: ' + typeof resultData + '\n';
                if (typeof resultData === 'object') {
                    alertText += 'Ключи: ' + Object.keys(resultData).join(', ') + '\n';
                    alertText += '\nСвойства:\n';
                    for (let key in resultData) {
                        alertText += key + ': ' + resultData[key] + '\n';
                    }
                } else {
                    alertText += 'Значение: ' + resultData + '\n';
                }
                // alert убран - задача создана

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
                        // 3. КРИТИЧНО: Копируем позицию из предзадачи!
                        console.log('%c  📝 Шаг 3: Копируем позицию из предзадачи на canvas', 'color: #2196f3;');
                        return this.copyPositionFromFuture(futureData, newTaskId);
                    })
                    .then(() => {
                        console.log('%c  ✅ Шаг 3 ЗАВЕРШЁН: Позиция скопирована', 'color: #4caf50; font-weight: bold;');
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
     * Создание связи для реальной задачи + обновление связей из future-узла (ОБНОВЛЕНО: используем FILTER)
     */
    createConnectionForRealTask: function(parentTaskId, newTaskId, futureId) {
        return new Promise((resolve, reject) => {
            console.log('🔗 Обновляем связи для задачи:', newTaskId, 'от предзадачи:', futureId);
            console.log('🔧 Используем loadAllConnectionsViaEntityManager (с FILTER)');

            // Загружаем ВСЕ связи через метод с FILTER
            this.loadAllConnectionsViaEntityManager().then(connections => {
                console.log('📊 Всего связей загружено:', connections.length);

                // Находим связи ГДЕ targetId = futureId (входящие в future-узел)
                const incomingConnections = connections.filter(conn => {
                    if (!conn.DETAIL_TEXT) return false;
                    try {
                        const data = JSON.parse(conn.DETAIL_TEXT);
                        return data.targetId === futureId;
                    } catch (e) {
                        return false;
                    }
                });

                // Находим связи ГДЕ sourceId = futureId (исходящие из future-узла)
                const outgoingConnections = connections.filter(conn => {
                    if (!conn.DETAIL_TEXT) return false;
                    try {
                        const data = JSON.parse(conn.DETAIL_TEXT);
                        return data.sourceId === futureId;
                    } catch (e) {
                        return false;
                    }
                });

                console.log('📊 Найдено входящих связей:', incomingConnections.length);
                console.log('📊 Найдено исходящих связей:', outgoingConnections.length);

                const promises = [];

                // 1. Обновляем входящие связи (targetId: future-XXX → task-YYY)
                incomingConnections.forEach(conn => {
                    const connData = JSON.parse(conn.DETAIL_TEXT);
                    connData.targetId = 'task-' + newTaskId;
                    connData.connectionType = 'task';

                    promises.push(new Promise((res) => {
                        BX24.callMethod('entity.item.update', {
                            ENTITY: 'tflow_conn',
                            ID: conn.ID,
                            DETAIL_TEXT: JSON.stringify(connData)
                        }, (updateResult) => {
                            if (updateResult.error()) {
                                console.error('❌ Ошибка обновления входящей связи:', updateResult.error());
                            } else {
                                console.log('✅ Обновлена входящая связь ID=' + conn.ID + ':', connData.sourceId, '→', connData.targetId);
                            }
                            res();
                        });
                    }));
                });

                // 2. Обновляем исходящие связи (sourceId: future-XXX → task-YYY)
                outgoingConnections.forEach(conn => {
                    const connData = JSON.parse(conn.DETAIL_TEXT);
                    connData.sourceId = 'task-' + newTaskId;

                    promises.push(new Promise((res) => {
                        BX24.callMethod('entity.item.update', {
                            ENTITY: 'tflow_conn',
                            ID: conn.ID,
                            DETAIL_TEXT: JSON.stringify(connData)
                        }, (updateResult) => {
                            if (updateResult.error()) {
                                console.error('❌ Ошибка обновления исходящей связи:', updateResult.error());
                            } else {
                                console.log('✅ Обновлена исходящая связь ID=' + conn.ID + ':', connData.sourceId, '→', connData.targetId);
                            }
                            res();
                        });
                    }));
                });

                if (promises.length === 0) {
                    console.log('ℹ️  Нет связей для обновления');
                    resolve();
                    return;
                }

                Promise.all(promises).then(() => {
                    console.log('✅ Все связи обновлены в Entity!');
                    resolve();
                }).catch(() => resolve());
            }).catch(error => {
                console.error('❌ Ошибка loadAllConnectionsViaEntityManager:', error);
                reject(error);
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

                                // DEBUG: Показываем alert с результатом
                                // alert убран - проверка Entity
                            } else {
                                console.error('%c    ❌ Не удалось перезагрузить Entity для проверки', 'color: #f44336;');
                                // alert убран - ошибка проверки
                            }
                        });
                    }, 500);

                    resolve();
                }
            });
        });
    },

    /**
     * Копирование позиции из предзадачи в позицию реальной задачи
     */
    copyPositionFromFuture: function(futureData, newTaskId) {
        return new Promise((resolve, reject) => {
            console.log('%c═══════════════════════════════════════', 'color: #ff9800; font-weight: bold;');
            console.log('%c📍 copyPositionFromFuture ВЫЗВАН', 'color: #ff9800; font-weight: bold; font-size: 14px;');
            console.log('Task ID:', newTaskId);
            console.log('futureData:', futureData);
            console.log('positionX:', futureData.positionX, 'type:', typeof futureData.positionX);
            console.log('positionY:', futureData.positionY, 'type:', typeof futureData.positionY);

            // Проверяем что в futureData есть positionX и positionY
            if (!futureData.positionX && !futureData.positionY) {
                console.log('%c⚠️ У предзадачи нет сохранённой позиции, пропускаем', 'color: #ff9800; font-weight: bold;');
                console.log('%c═══════════════════════════════════════', 'color: #ff9800; font-weight: bold;');
                resolve();
                return;
            }

            const position = {
                x: futureData.positionX || 0,
                y: futureData.positionY || 0
            };

            console.log('%c📍 Позиция предзадачи: (' + position.x + ', ' + position.y + ')', 'color: #00ff00; font-weight: bold;');

            // Сохраняем позицию в Entity tflow_pos
            const posData = {
                nodeId: 'task-' + newTaskId,
                positionX: position.x,
                positionY: position.y
            };
            console.log('💾 Сохраняем в Entity tflow_pos:', posData);

            BX24.callMethod('entity.item.add', {
                ENTITY: 'tflow_pos',
                NAME: 'task-' + newTaskId,
                DETAIL_TEXT: JSON.stringify(posData)
            }, (result) => {
                if (result.error()) {
                    console.error('%c❌ Ошибка сохранения позиции:', 'color: #f44336; font-weight: bold;', result.error());
                    console.log('%c═══════════════════════════════════════', 'color: #ff9800; font-weight: bold;');
                    // Не блокируем выполнение, просто логируем ошибку
                    resolve();
                } else {
                    console.log('%c✅ Позиция task-' + newTaskId + ' сохранена в Entity (ID: ' + result.data() + ')', 'color: #00ff00; font-weight: bold;');
                    console.log('%c═══════════════════════════════════════', 'color: #ff9800; font-weight: bold;');
                    resolve();
                }
            });
        });
    }
};

console.log('✅ TaskCreator component loaded');
