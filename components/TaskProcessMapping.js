/**
 * TaskProcessMapping - Маппинг задач к процессам
 * Хранит связь taskId → processId в Entity Storage
 */
window.TaskProcessMapping = {

    /**
     * Получить processId для задачи
     * 1. Проверяет UF_FLOWTASK_PROCESS_ID в задаче Bitrix24
     * 2. Ищет в каком процессе находится узел task-{taskId} в Entity Storage
     */
    getProcessId: function(taskId) {
        return new Promise(async (resolve) => {
            try {
                console.log('🔍 Ищем processId для задачи', taskId);

                // Шаг 1: Проверяем поле UF_FLOWTASK_PROCESS_ID в задаче
                const taskData = await new Promise((resolveInner) => {
                    BX24.callMethod('tasks.task.get', {
                        taskId: taskId
                    }, (res) => {
                        if (res.error()) {
                            console.error('❌ Ошибка загрузки задачи:', res.error());
                            resolveInner(null);
                        } else {
                            const data = res.data();
                            const task = data.task || data;
                            resolveInner(task);
                        }
                    });
                });

                // Проверяем UF_FLOWTASK_PROCESS_ID
                if (taskData && taskData.ufFlowtaskProcessId) {
                    const processId = taskData.ufFlowtaskProcessId;
                    console.log('✅ ProcessId найден в UF поле задачи:', processId);
                    resolve(processId);
                    return;
                }

                // Шаг 2: Ищем в Entity Storage (для обратной совместимости)
                const result = await new Promise((resolveInner) => {
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_nodes',
                        FILTER: {
                            '%NAME': 'task-' + taskId
                        }
                    }, (res) => {
                        if (res.error()) {
                            console.error('❌ Ошибка поиска в Entity:', res.error());
                            resolveInner([]);
                        } else {
                            resolveInner(res.data());
                        }
                    });
                });

                if (result.length > 0) {
                    // Извлекаем processId из NAME: process_159_node_task-159
                    // processId теперь всегда числовой
                    const name = result[0].NAME;
                    const match = name.match(/^process_(\d+)_node/);

                    if (match) {
                        const processId = parseInt(match[1], 10);
                        console.log('✅ ProcessId найден в Entity Storage:', processId, 'для задачи', taskId);
                        resolve(processId);
                        return;
                    }
                }

                console.log('ℹ️ ProcessId не найден, используем taskId:', taskId);
                resolve(parseInt(taskId, 10)); // Fallback на taskId (числовой)

            } catch (error) {
                console.error('❌ Ошибка поиска processId:', error);
                resolve(taskId); // Fallback на taskId
            }
        });
    }
};

console.log('✅ TaskProcessMapping loaded');
