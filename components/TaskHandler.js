/**
 * TaskHandler - ПРОСТАЯ обработка событий задач
 *
 * При закрытии задачи (status=5):
 * 1. Загрузить узел задачи
 * 2. Найти все connectionsFrom где type='future'
 * 3. Создать реальные задачи для каждой предзадачи
 */
window.TaskHandler = {

    /**
     * Обработка завершения задачи
     */
    handleTaskComplete: async function(taskId, processId) {
        console.log('═══════════════════════════════════════════');
        console.log('🎉 Задача завершена! ID:', taskId);
        console.log('═══════════════════════════════════════════');

        try {
            // 1. Загружаем ВСЕ узлы процесса
            const nodes = await EntityManagerV2.loadProcess(processId);
            console.log('📊 Загружено узлов процесса:', nodes.length);

            // 2. Найти узел задачи
            const taskNode = nodes.find(n => n.nodeId === 'task-' + taskId);
            if (!taskNode) {
                console.log('⚠️ Узел task-' + taskId + ' не найден');
                return;
            }

            console.log('✅ Найден узел задачи:', taskNode.nodeId);
            console.log('📊 Связей исходящих:', (taskNode.connectionsFrom || []).length);

            // 3. Найти все предзадачи
            const futureConnections = (taskNode.connectionsFrom || []).filter(
                conn => conn.type === 'future'
            );

            console.log('📋 Предзадач для создания:', futureConnections.length);

            if (futureConnections.length === 0) {
                console.log('ℹ️ Нет предзадач для создания');
                return;
            }

            // 4. Создать задачи для каждой предзадачи
            const createdTasks = [];

            for (const conn of futureConnections) {
                const futureId = conn.id;
                console.log('─────────────────────────────────────────');
                console.log('🔍 Обрабатываем предзадачу:', futureId);

                // Найти узел предзадачи
                const futureNode = nodes.find(n => n.nodeId === futureId);
                if (!futureNode) {
                    console.log('⚠️ Предзадача не найдена:', futureId);
                    continue;
                }

                // Проверить условие
                if (futureNode.realTaskId) {
                    console.log('⏭️ Уже создана, ID:', futureNode.realTaskId);
                    continue;
                }

                console.log('📝 Создаём задачу:', futureNode.title);
                console.log('   Условие:', futureNode.condition);

                // Проверить условие создания
                if (futureNode.condition !== 'immediately') {
                    console.log('⏭️ Условие не "immediately", пропускаем');
                    continue;
                }

                // Создать реальную задачу
                const newTaskId = await this.createRealTask(
                    futureNode.title,
                    futureNode.description || '',
                    futureNode.responsibleId || 1,
                    futureNode.groupId || 0,
                    processId
                );

                if (!newTaskId) {
                    console.log('❌ Не удалось создать задачу');
                    continue;
                }

                console.log('✅ Задача создана! ID:', newTaskId);

                // Обновить предзадачу
                futureNode.realTaskId = newTaskId;
                await EntityManagerV2.saveNode(processId, futureNode);

                // Создать узел новой задачи
                const newTaskNode = {
                    nodeId: 'task-' + newTaskId,
                    type: 'task',
                    title: futureNode.title,
                    description: futureNode.description || '',
                    status: 2,
                    positionX: futureNode.positionX || 0,
                    positionY: futureNode.positionY || 0,
                    connectionsFrom: futureNode.connectionsFrom || [],
                    connectionsTo: [{ type: 'task', id: taskNode.nodeId }]
                };

                await EntityManagerV2.saveNode(processId, newTaskNode);

                createdTasks.push({
                    futureId: futureId,
                    taskId: newTaskId
                });

                console.log('✅ Узел task-' + newTaskId + ' создан');
            }

            console.log('═══════════════════════════════════════════');
            console.log('✅ Создано задач:', createdTasks.length);
            console.log('═══════════════════════════════════════════');

            // Вызвать callback для обновления canvas
            if (window.FlowCanvasV2 && window.FlowCanvasV2.reloadCanvas) {
                console.log('🔄 Перезагружаем FlowCanvasV2...');
                window.FlowCanvasV2.reloadCanvas();
            } else if (window.FlowCanvas && window.FlowCanvas.reloadCanvas) {
                console.log('🔄 Перезагружаем FlowCanvas (старый)...');
                window.FlowCanvas.reloadCanvas();
            } else {
                console.warn('⚠️ Не найден метод reloadCanvas');
            }

        } catch (error) {
            console.error('❌ Ошибка обработки:', error);
        }
    },

    /**
     * Создать реальную задачу через Bitrix API
     */
    createRealTask: function(title, description, responsibleId, groupId, processId) {
        return new Promise((resolve) => {
            console.log('📝 Создаём задачу через API:');
            console.log('   Название:', title);
            console.log('   Ответственный:', responsibleId);
            console.log('   ProcessId:', processId);

            BX24.callMethod('tasks.task.add', {
                fields: {
                    TITLE: title,
                    DESCRIPTION: description,
                    RESPONSIBLE_ID: responsibleId,
                    GROUP_ID: groupId,
                    UF_FLOWTASK_PROCESS_ID: processId
                }
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка создания задачи:', result.error());
                    resolve(null);
                    return;
                }

                const data = result.data();
                let taskId = null;

                // Извлечь ID задачи
                if (typeof data === 'object' && data.task) {
                    taskId = data.task.id || data.task.ID;
                } else if (typeof data === 'number') {
                    taskId = data;
                } else if (typeof data === 'string') {
                    taskId = parseInt(data);
                }

                console.log('✅ API вернул ID:', taskId);
                resolve(taskId);
            });
        });
    }
};

console.log('✅ TaskHandler loaded');
