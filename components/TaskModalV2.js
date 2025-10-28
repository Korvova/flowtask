/**
 * TaskModalV2 - ПРОСТАЯ модалка для создания предзадач
 */
window.TaskModalV2 = {

    currentPosition: null,
    currentSourceId: null,
    currentProcessId: null,
    onSaveCallback: null,

    /**
     * Открыть модалку
     * @param {Object|string} params - Объект параметров или тип (для совместимости)
     * @param {Object} position - Позиция (если params это строка)
     * @param {string} sourceId - ID исходного узла (если params это строка)
     */
    open: function(params, position, sourceId) {
        // Новый формат: params это объект { sourceNodeId, processId, position, onSave }
        if (typeof params === 'object' && params.sourceNodeId) {
            this.currentSourceId = params.sourceNodeId;
            this.currentProcessId = params.processId || window.currentProcessId;
            this.onSaveCallback = params.onSave || null;

            // Если позиция передана явно - используем её
            if (params.position) {
                this.currentPosition = params.position;
                this.showPrompt();
            }
            // Иначе вычисляем позицию от исходного узла
            else {
                EntityManagerV2.loadProcess(this.currentProcessId).then(nodes => {
                    const sourceNode = nodes.find(n => n.nodeId === this.currentSourceId);

                    // Размещаем новую предзадачу справа и ниже от исходной
                    this.currentPosition = {
                        x: (sourceNode?.positionX || 400) + 250,
                        y: (sourceNode?.positionY || 300) + 100
                    };

                    this.showPrompt();
                });
            }
        }
        // Старый формат: три отдельных параметра (для совместимости)
        else {
            this.currentPosition = position;
            this.currentSourceId = sourceId;
            this.currentProcessId = window.currentProcessId;
            this.onSaveCallback = null;

            this.showPrompt();
        }
    },

    /**
     * Показать prompt для ввода названия
     */
    showPrompt: function() {
        console.log('📝 Открываем модалку для создания предзадачи');
        console.log('   Позиция:', this.currentPosition);
        console.log('   От узла:', this.currentSourceId);

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
            const processId = this.currentProcessId || window.currentProcessId;

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

            await EntityManagerV2.saveNode(processId, futureNode);
            console.log('✅ Предзадача создана:', futureId);

            // Добавить связь к исходному узлу
            const allNodes = await EntityManagerV2.loadProcess(processId);
            const sourceNode = allNodes.find(n => n.nodeId === this.currentSourceId);

            if (sourceNode) {
                if (!sourceNode.connectionsFrom) {
                    sourceNode.connectionsFrom = [];
                }

                sourceNode.connectionsFrom.push({
                    type: 'future',
                    id: futureId
                });

                await EntityManagerV2.saveNode(processId, sourceNode);
                console.log('✅ Связь добавлена');
            }

            // Вызвать callback если есть
            if (this.onSaveCallback) {
                console.log('📞 Вызываем onSave callback');
                this.onSaveCallback(futureId);
            }
            // Иначе перезагрузить canvas
            else if (window.FlowCanvasV2) {
                console.log('🔄 Перезагружаем canvas');
                window.FlowCanvasV2.reloadCanvas();
            }

        } catch (error) {
            console.error('❌ Ошибка создания предзадачи:', error);
            alert('Ошибка: ' + error);
        }
    }
};

console.log('✅ TaskModalV2 loaded');
