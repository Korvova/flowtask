/**
 * TaskModalV2 - Модальное окно для создания предзадачи (новая архитектура)
 */
window.TaskModalV2 = {
    currentPosition: null,
    currentSourceId: null,
    currentProcessId: null,
    onSaveCallback: null,
    users: [],
    groups: [],

    init: function() {
        console.log('✅ TaskModalV2 initialized');
        this.loadUsers();
        this.loadGroups();
    },

    loadUsers: function() {
        console.log('📥 Загружаем пользователей...');
        BX24.callMethod('user.get', {
            ACTIVE: true
        }, (result) => {
            if (result.error()) {
                console.error('Ошибка загрузки пользователей:', result.error());
                return;
            }

            this.users = result.data().map(user => ({
                id: user.ID,
                name: user.NAME + ' ' + user.LAST_NAME,
                email: user.EMAIL
            }));

            console.log('✅ Загружено пользователей:', this.users.length);
            this.updateResponsibleSelect();
        });
    },

    loadGroups: function() {
        console.log('📥 Загружаем группы/проекты...');
        BX24.callMethod('sonet_group.get', {
            ORDER: { NAME: 'ASC' }
        }, (result) => {
            if (result.error()) {
                console.warn('Ошибка загрузки через sonet_group.get, пробуем workgroup.list');

                // Пробуем альтернативный метод
                BX24.callMethod('workgroup.list', {
                    SELECT: ['ID', 'NAME']
                }, (result2) => {
                    if (result2.error()) {
                        console.error('Ошибка загрузки групп:', result2.error());
                        this.groups = [];
                        return;
                    }

                    this.groups = result2.data().map(group => ({
                        id: group.ID,
                        name: group.NAME
                    }));

                    console.log('✅ Загружено групп:', this.groups.length);
                    this.updateGroupSelect();
                });
                return;
            }

            this.groups = result.data().map(group => ({
                id: group.ID,
                name: group.NAME
            }));

            console.log('✅ Загружено групп:', this.groups.length);
            this.updateGroupSelect();
        });
    },

    updateResponsibleSelect: function() {
        const select = document.getElementById('futureTaskResponsibleV2');
        if (!select) return;

        select.innerHTML = '<option value="">-- Выберите ответственного --</option>';

        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name + (user.email ? ' (' + user.email + ')' : '');
            select.appendChild(option);
        });
    },

    updateGroupSelect: function() {
        const select = document.getElementById('futureTaskGroupV2');
        if (!select) return;

        select.innerHTML = '<option value="">-- Без группы --</option>';

        this.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            select.appendChild(option);
        });
    },

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
                this.show();
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

                    this.show();
                });
            }
        }
        // Старый формат: три отдельных параметра (для совместимости)
        else {
            this.currentPosition = position;
            this.currentSourceId = sourceId;
            this.currentProcessId = window.currentProcessId;
            this.onSaveCallback = null;

            this.show();
        }
    },

    /**
     * Показать модальное окно
     */
    show: function() {
        console.log('📝 Открываем модалку для создания предзадачи');
        console.log('   Позиция:', this.currentPosition);
        console.log('   От узла:', this.currentSourceId);

        const modal = document.getElementById('taskModalV2');
        if (!modal) {
            this.createModal();
        }

        // Обновляем селекты
        this.updateResponsibleSelect();
        this.updateGroupSelect();

        // Очищаем форму
        this.reset();

        document.getElementById('taskModalV2').style.display = 'flex';
        document.getElementById('futureTaskTitleV2').focus();
    },

    close: function() {
        document.getElementById('taskModalV2').style.display = 'none';
        this.reset();
    },

    reset: function() {
        document.getElementById('futureTaskTitleV2').value = '';
        document.getElementById('futureTaskDescriptionV2').value = '';
        document.getElementById('futureTaskGroupV2').value = '';
        document.getElementById('futureTaskResponsibleV2').value = '';
        document.getElementById('futureTaskConditionV2').value = 'immediately';
        document.getElementById('futureTaskDelayV2').value = '0';
    },

    /**
     * Сохранить предзадачу
     */
    save: async function() {
        try {
            const title = document.getElementById('futureTaskTitleV2').value.trim();
            const description = document.getElementById('futureTaskDescriptionV2').value.trim();
            const groupId = parseInt(document.getElementById('futureTaskGroupV2').value) || 0;
            const responsibleId = parseInt(document.getElementById('futureTaskResponsibleV2').value) || 0;
            const conditionType = document.getElementById('futureTaskConditionV2').value;
            const delayMinutes = parseInt(document.getElementById('futureTaskDelayV2').value) || 0;

            // Валидация
            if (!title) {
                alert('Укажите название задачи');
                return;
            }

            if (!responsibleId) {
                alert('Выберите ответственного');
                return;
            }

            console.log('💾 Создаём предзадачу:', title);

            const futureId = 'future-' + Date.now();
            const processId = this.currentProcessId || window.currentProcessId;

            // Создать узел предзадачи
            const futureNode = {
                nodeId: futureId,
                type: 'future',
                title: title,
                description: description,
                groupId: groupId,
                responsibleId: responsibleId,
                condition: conditionType,
                delayMinutes: delayMinutes,
                status: 0,
                positionX: this.currentPosition.x,
                positionY: this.currentPosition.y,
                connectionsFrom: this.currentSourceId ? [this.currentSourceId] : [],
                connectionsTo: [],
                realTaskId: null
            };

            // Сохранить в EntityManagerV2
            await EntityManagerV2.saveNode(processId, futureNode);
            console.log('✅ Узел предзадачи сохранён в Entity');

            // Если есть исходный узел - создать связь
            if (this.currentSourceId) {
                await EntityManagerV2.saveConnection(processId, this.currentSourceId, futureId);
                console.log('✅ Связь создана:', this.currentSourceId, '->', futureId);
            }

            // Вызвать callback если есть
            if (this.onSaveCallback) {
                this.onSaveCallback(futureNode);
            }

            this.close();

        } catch (error) {
            console.error('❌ Ошибка сохранения предзадачи:', error);
            alert('Ошибка сохранения: ' + error.message);
        }
    },

    createModal: function() {
        const modalHTML = `
            <div id="taskModalV2" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 999999; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <h2 style="margin-bottom: 20px; color: #1f2937;">Создать предзадачу</h2>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Название задачи *</label>
                        <input type="text" id="futureTaskTitleV2" placeholder="Название задачи" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px;" />
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Описание</label>
                        <textarea id="futureTaskDescriptionV2" placeholder="Описание задачи" rows="3" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px; resize: vertical;"></textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Группа/Проект</label>
                        <select id="futureTaskGroupV2" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px; background: white;">
                            <option value="">-- Без группы --</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Ответственный *</label>
                        <select id="futureTaskResponsibleV2" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px; background: white;">
                            <option value="">-- Выберите ответственного --</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Условие создания</label>
                        <select id="futureTaskConditionV2" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px; background: white;">
                            <option value="immediately">⚡ Создать сразу</option>
                            <option value="delay">⏰ Создать с задержкой</option>
                            <option value="ifCancel_cancel">❌ Отменить при отмене</option>
                            <option value="ifCancel_create">✅ Создать при отмене</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Задержка (минуты)</label>
                        <input type="number" id="futureTaskDelayV2" value="0" min="0" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px;" />
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="window.TaskModalV2.close()" style="padding: 10px 20px; background: #e5e7eb; color: #374151; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 500;">Отмена</button>
                        <button onclick="window.TaskModalV2.save()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 500;">Создать</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
};

// Инициализируем при загрузке
if (typeof BX24 !== 'undefined') {
    BX24.init(() => {
        window.TaskModalV2.init();
    });
} else {
    console.warn('⚠️  BX24 не загружен, TaskModalV2 не инициализирован');
}

console.log('✅ TaskModalV2 component loaded');
