/**
 * TaskProcessMapping - Маппинг задач к процессам
 * Хранит связь taskId → processId в Entity Storage
 */
window.TaskProcessMapping = {

    /**
     * Получить processId для задачи
     * Ищет в каком процессе находится узел task-{taskId}
     */
    getProcessId: function(taskId) {
        return new Promise(async (resolve) => {
            try {
                console.log('🔍 Ищем processId для задачи', taskId);

                // Загружаем все записи с фильтром по task-{taskId}
                const result = await new Promise((resolveInner) => {
                    BX24.callMethod('entity.item.get', {
                        ENTITY: 'tflow_nodes',
                        FILTER: {
                            '%NAME': 'task-' + taskId
                        }
                    }, (res) => {
                        if (res.error()) {
                            console.error('❌ Ошибка поиска:', res.error());
                            resolveInner([]);
                        } else {
                            resolveInner(res.data());
                        }
                    });
                });

                if (result.length > 0) {
                    // Извлекаем processId из NAME: process_123_node_task-456
                    const name = result[0].NAME;
                    const match = name.match(/^process_(\d+)/);

                    if (match) {
                        const processId = parseInt(match[1]);
                        console.log('✅ Найден processId:', processId, 'для задачи', taskId);
                        resolve(processId);
                        return;
                    }
                }

                console.log('ℹ️ ProcessId не найден, используем taskId:', taskId);
                resolve(taskId); // Fallback на taskId

            } catch (error) {
                console.error('❌ Ошибка поиска processId:', error);
                resolve(taskId); // Fallback на taskId
            }
        });
    }
};

console.log('✅ TaskProcessMapping loaded');
