/**
 * TaskModal - Модальное окно для создания предзадачи
 */
window.TaskModal = {
    currentConnectionData: null,
    users: [],
    groups: [],

    init: function() {
        console.log('✅ TaskModal initialized');
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
        const select = document.getElementById('futureTaskResponsible');
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
        const select = document.getElementById('futureTaskGroup');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Без группы --</option>';
        
        this.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            select.appendChild(option);
        });
    },

    show: function(connectionData) {
        this.currentConnectionData = connectionData;
        
        const modal = document.getElementById('taskModal');
        if (!modal) {
            this.createModal();
        }
        
        // Обновляем селекты
        this.updateResponsibleSelect();
        this.updateGroupSelect();
        
        document.getElementById('taskModal').style.display = 'flex';
        document.getElementById('futureTaskTitle').focus();
    },

    close: function() {
        document.getElementById('taskModal').style.display = 'none';
        this.reset();
    },

    reset: function() {
        document.getElementById('futureTaskTitle').value = '';
        document.getElementById('futureTaskDescription').value = '';
        document.getElementById('futureTaskGroup').value = '';
        document.getElementById('futureTaskResponsible').value = '';
        document.getElementById('futureTaskCondition').value = 'immediately';
        document.getElementById('futureTaskDelay').value = '0';
    },

    save: function() {
        const title = document.getElementById('futureTaskTitle').value.trim();
        const description = document.getElementById('futureTaskDescription').value.trim();
        const groupId = parseInt(document.getElementById('futureTaskGroup').value) || 0;
        const responsibleId = parseInt(document.getElementById('futureTaskResponsible').value) || 0;
        const conditionType = document.getElementById('futureTaskCondition').value;
        const delayMinutes = parseInt(document.getElementById('futureTaskDelay').value) || 0;

        // Валидация
        if (!title) {
            alert('Укажите название задачи');
            return;
        }

        if (!responsibleId) {
            alert('Выберите ответственного');
            return;
        }

        // Используем координаты мыши из currentConnectionData
        const targetPos = this.currentConnectionData.position || { x: 500, y: 300 };
        console.log('📍 Позиция для новой предзадачи:', targetPos);

        const futureTaskData = {
            title: title,
            description: description,
            groupId: groupId,
            responsibleId: responsibleId,
            conditionType: conditionType,
            delayMinutes: delayMinutes,
            positionX: targetPos.x,
            positionY: targetPos.y
        };

        console.log('💾 Сохраняем предзадачу:', futureTaskData);

        // Вызываем callback для сохранения
        if (this.currentConnectionData && this.currentConnectionData.onSave) {
            this.currentConnectionData.onSave(futureTaskData);
        }

        this.close();
    },

    createModal: function() {
        const modalHTML = `
            <div id="taskModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h2 style="margin-bottom: 20px; color: #1f2937;">Создать предзадачу</h2>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Название задачи *</label>
                        <input type="text" id="futureTaskTitle" placeholder="Название задачи" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px;" />
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Описание</label>
                        <textarea id="futureTaskDescription" placeholder="Описание задачи" rows="3" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px; resize: vertical;"></textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Группа/Проект</label>
                        <select id="futureTaskGroup" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px; background: white;">
                            <option value="">-- Без группы --</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Ответственный *</label>
                        <select id="futureTaskResponsible" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px; background: white;">
                            <option value="">-- Выберите ответственного --</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Условие создания</label>
                        <select id="futureTaskCondition" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px; background: white;">
                            <option value="immediately">⚡ Создать сразу</option>
                            <option value="delay">⏰ Создать с задержкой</option>
                            <option value="ifCancel_cancel">❌ Отменить при отмене</option>
                            <option value="ifCancel_create">✅ Создать при отмене</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Задержка (минуты)</label>
                        <input type="number" id="futureTaskDelay" value="0" min="0" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px;" />
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="window.TaskModal.close()" style="padding: 10px 20px; background: #e5e7eb; color: #374151; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 500;">Отмена</button>
                        <button onclick="window.TaskModal.save()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 500;">Создать</button>
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
        window.TaskModal.init();
    });
} else {
    console.warn('⚠️  BX24 не загружен, TaskModal не инициализирован');
}

console.log('✅ TaskModal component loaded with user/group selectors');
