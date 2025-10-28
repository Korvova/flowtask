/**
 * TaskModalV2 - ПРОСТАЯ модалка для создания предзадач
 */
window.TaskModalV2 = {

    currentPosition: null,
    currentSourceId: null,

    /**
     * Открыть модалку
     */
    open: function(type, position, sourceId) {
        this.currentPosition = position;
        this.currentSourceId = sourceId;

        console.log('📝 Открываем модалку для создания:', type);
        console.log('   Позиция:', position);
        console.log('   От узла:', sourceId);

        // Показать простой prompt
        const title = prompt('Введите название предзадачи:');
        if (!title) {
            console.log('⏭️ Отменено');
            return;
        }

        this.saveFuture(title);
    },

    /**
     * Сохранить предзадачу
     */
    saveFuture: async function(title) {
        try {
            console.log('💾 Создаём предзадачу:', title);

            const futureId = 'future-' + Date.now();

            // Создать узел предзадачи
            const futureNode = {
                nodeId: futureId,
                type: 'future',
                title: title,
                description: '',
                condition: 'immediately',
                realTaskId: null,
                responsibleId: 1,
                groupId: 0,
                positionX: this.currentPosition.x,
                positionY: this.currentPosition.y,
                connectionsFrom: [],
                connectionsTo: [
                    { type: 'task', id: this.currentSourceId }
                ]
            };

            await EntityManagerV2.saveNode(window.currentProcessId, futureNode);
            console.log('✅ Предзадача создана:', futureId);

            // Добавить связь к исходному узлу
            const allNodes = await EntityManagerV2.loadProcess(window.currentProcessId);
            const sourceNode = allNodes.find(n => n.nodeId === this.currentSourceId);

            if (sourceNode) {
                if (!sourceNode.connectionsFrom) {
                    sourceNode.connectionsFrom = [];
                }

                sourceNode.connectionsFrom.push({
                    type: 'future',
                    id: futureId
                });

                await EntityManagerV2.saveNode(window.currentProcessId, sourceNode);
                console.log('✅ Связь добавлена');
            }

            // Перезагрузить canvas
            if (window.FlowCanvasV2) {
                window.FlowCanvasV2.reloadCanvas();
            }

        } catch (error) {
            console.error('❌ Ошибка создания предзадачи:', error);
            alert('Ошибка: ' + error);
        }
    }
};

console.log('✅ TaskModalV2 loaded');
