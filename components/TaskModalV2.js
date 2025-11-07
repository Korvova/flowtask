/**
 * TaskModalV2 - Модальное окно для создания предзадачи (новая архитектура)
 */
window.TaskModalV2 = {
    currentPosition: null,
    currentSourceId: null,
    currentProcessId: null,
    onSaveCallback: null,

    init: function() {
        console.log('✅ TaskModalV2 initialized');
        this.setupClickOutsideHandlers();
    },

    /**
     * Настроить обработчики клика вне области для закрытия dropdown
     */
    setupClickOutsideHandlers: function() {
        document.addEventListener('click', (event) => {
            // Закрытие группового селектора
            const groupSearchInput = document.getElementById('groupSearchInput');
            const groupSearchResults = document.getElementById('groupSearchResults');
            const selectedGroupDisplay = document.getElementById('selectedGroupDisplay');

            if (groupSearchInput && groupSearchResults) {
                // Проверяем, что клик был вне поля поиска и вне результатов
                if (!groupSearchInput.contains(event.target) &&
                    !groupSearchResults.contains(event.target) &&
                    (!selectedGroupDisplay || !selectedGroupDisplay.contains(event.target))) {
                    groupSearchResults.style.display = 'none';
                }
            }

            // Закрытие пользовательского селектора
            const userSearchInput = document.getElementById('userSearchInput');
            const userSearchResults = document.getElementById('userSearchResults');
            const selectedUserDisplay = document.getElementById('selectedUserDisplay');

            if (userSearchInput && userSearchResults) {
                // Проверяем, что клик был вне поля поиска и вне результатов
                if (!userSearchInput.contains(event.target) &&
                    !userSearchResults.contains(event.target) &&
                    (!selectedUserDisplay || !selectedUserDisplay.contains(event.target))) {
                    userSearchResults.style.display = 'none';
                }
            }
        });
    },

    /**
     * Открыть диалог выбора ответственного с поиском
     */
    openUserSelector: function() {
        console.log('🔍 Открываем селектор пользователя...');

        const searchInput = document.getElementById('userSearchInput');
        const resultsContainer = document.getElementById('userSearchResults');

        if (!searchInput || !resultsContainer) {
            console.error('❌ Элементы поиска пользователей не найдены');
            return;
        }

        // Показываем поле поиска
        searchInput.style.display = 'block';
        searchInput.value = '';
        searchInput.focus();
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';

        // Загружаем начальный список пользователей
        this.searchUsers('');
    },

    /**
     * Поиск пользователей с динамической подгрузкой
     */
    searchUsers: function(searchQuery) {
        const resultsContainer = document.getElementById('userSearchResults');

        if (!resultsContainer) return;

        // Показываем loading
        resultsContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #9ca3af;">Загрузка...</div>';
        resultsContainer.style.display = 'block';

        // Формируем фильтр
        const filter = { ACTIVE: true };
        if (searchQuery) {
            filter['NAME_SEARCH'] = searchQuery;
        }

        BX24.callMethod('user.get', {
            FILTER: filter,
            sort: 'LAST_NAME'
        }, (result) => {
            if (result.error()) {
                console.error('❌ Ошибка загрузки пользователей:', result.error());
                resultsContainer.innerHTML = '<div style="padding: 10px; color: #dc2626;">Ошибка загрузки</div>';
                return;
            }

            const users = result.data();

            if (users.length === 0) {
                resultsContainer.innerHTML = '<div style="padding: 10px; color: #9ca3af;">Пользователи не найдены</div>';
                return;
            }

            // Отображаем результаты
            let html = '';
            users.forEach(user => {
                const fullName = `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim();
                const safeName = fullName.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
                const email = user.EMAIL || '';

                html += `
                    <div onclick="window.TaskModalV2.selectUser('${user.ID}', '${safeName}')" style="
                        padding: 10px;
                        cursor: pointer;
                        border-bottom: 1px solid #e5e7eb;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">
                        <div style="font-weight: 500; color: #374151;">${fullName}</div>
                        ${email ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">${email}</div>` : ''}
                    </div>
                `;
            });

            resultsContainer.innerHTML = html;
        });
    },

    /**
     * Выбрать пользователя из результатов поиска
     */
    selectUser: function(userId, userName) {
        console.log('👤 Выбран пользователь:', userId, userName);

        // Декодируем HTML entities
        const decodedName = userName.replace(/&quot;/g, '"').replace(/&#39;/g, "'");

        // Сохраняем в скрытое поле
        document.getElementById('futureTaskResponsibleV2').value = userId;

        // Обновляем отображение
        const displayElement = document.getElementById('selectedUserDisplay');
        const nameElement = document.getElementById('selectedUserName');
        if (displayElement && nameElement) {
            nameElement.textContent = decodedName;
            displayElement.style.display = 'flex';
        }

        // Очищаем и скрываем поиск
        const searchInput = document.getElementById('userSearchInput');
        const resultsContainer = document.getElementById('userSearchResults');
        if (searchInput) {
            searchInput.value = '';
            searchInput.style.display = 'none';
        }
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    },

    /**
     * Очистить выбранного пользователя
     */
    clearUserSelection: function() {
        document.getElementById('futureTaskResponsibleV2').value = '';
        const displayElement = document.getElementById('selectedUserDisplay');
        const nameElement = document.getElementById('selectedUserName');
        const searchInput = document.getElementById('userSearchInput');

        if (displayElement) {
            displayElement.style.display = 'none';
        }
        if (nameElement) {
            nameElement.textContent = '';
        }
        if (searchInput) {
            searchInput.style.display = 'block';
            searchInput.value = '';
        }
    },

    /**
     * Обновить отображение выбранного пользователя при редактировании
     */
    updateUserDisplay: function(userId) {
        if (!userId) {
            this.clearUserSelection();
            return;
        }

        // Загружаем информацию о пользователе
        BX24.callMethod('user.get', { ID: userId }, (result) => {
            if (result.error()) {
                console.error('❌ Ошибка загрузки пользователя:', result.error());
                return;
            }

            const users = result.data();
            if (users && users.length > 0) {
                const user = users[0];
                const fullName = `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim();
                const displayElement = document.getElementById('selectedUserDisplay');
                const nameElement = document.getElementById('selectedUserName');
                const searchInput = document.getElementById('userSearchInput');

                if (displayElement && nameElement) {
                    nameElement.textContent = fullName;
                    displayElement.style.display = 'flex';
                }
                if (searchInput) {
                    searchInput.style.display = 'none';
                }
            }
        });
    },

    /**
     * Открыть диалог выбора группы с поиском
     */
    openGroupSelector: function() {
        console.log('🔍 Открываем селектор группы...');

        const searchInput = document.getElementById('groupSearchInput');
        const resultsContainer = document.getElementById('groupSearchResults');

        if (!searchInput || !resultsContainer) {
            console.error('❌ Элементы поиска не найдены');
            return;
        }

        // Показываем поле поиска
        searchInput.style.display = 'block';
        searchInput.value = '';
        searchInput.focus();
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';

        // Загружаем начальный список групп
        this.searchGroups('');
    },

    /**
     * Поиск групп с динамической подгрузкой
     */
    searchGroups: function(searchQuery) {
        const resultsContainer = document.getElementById('groupSearchResults');

        if (!resultsContainer) return;

        // Показываем loading
        resultsContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #9ca3af;">Загрузка...</div>';
        resultsContainer.style.display = 'block';

        // Формируем фильтр
        const filter = {};
        if (searchQuery) {
            filter['%NAME'] = searchQuery;
        }

        BX24.callMethod('sonet_group.get', {
            ORDER: { NAME: 'ASC' },
            FILTER: filter
        }, (result) => {
            if (result.error()) {
                console.error('❌ Ошибка загрузки групп:', result.error());
                resultsContainer.innerHTML = '<div style="padding: 10px; color: #dc2626;">Ошибка загрузки</div>';
                return;
            }

            const groups = result.data();

            if (groups.length === 0) {
                resultsContainer.innerHTML = '<div style="padding: 10px; color: #9ca3af;">Группы не найдены</div>';
                return;
            }

            // Отображаем результаты
            let html = '';
            groups.forEach(group => {
                const safeName = group.NAME.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
                html += `
                    <div onclick="window.TaskModalV2.selectGroup('${group.ID}', '${safeName}')" style="
                        padding: 10px;
                        cursor: pointer;
                        border-bottom: 1px solid #e5e7eb;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">
                        <div style="font-weight: 500; color: #374151;">${group.NAME}</div>
                        ${group.DESCRIPTION ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">${group.DESCRIPTION}</div>` : ''}
                    </div>
                `;
            });

            resultsContainer.innerHTML = html;
        });
    },

    /**
     * Выбрать группу из результатов поиска
     */
    selectGroup: function(groupId, groupName) {
        console.log('📋 Выбрана группа:', groupId, groupName);

        // Декодируем HTML entities
        const decodedName = groupName.replace(/&quot;/g, '"').replace(/&#39;/g, "'");

        // Сохраняем в скрытое поле
        document.getElementById('futureTaskGroupV2').value = groupId;

        // Обновляем отображение
        const displayElement = document.getElementById('selectedGroupDisplay');
        const nameElement = document.getElementById('selectedGroupName');
        if (displayElement && nameElement) {
            nameElement.textContent = decodedName;
            displayElement.style.display = 'flex';
        }

        // Очищаем и скрываем поиск
        const searchInput = document.getElementById('groupSearchInput');
        const resultsContainer = document.getElementById('groupSearchResults');
        if (searchInput) {
            searchInput.value = '';
            searchInput.style.display = 'none';
        }
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    },

    /**
     * Очистить выбранную группу
     */
    clearGroupSelection: function() {
        document.getElementById('futureTaskGroupV2').value = '';
        const displayElement = document.getElementById('selectedGroupDisplay');
        const nameElement = document.getElementById('selectedGroupName');
        const searchInput = document.getElementById('groupSearchInput');

        if (displayElement) {
            displayElement.style.display = 'none';
        }
        if (nameElement) {
            nameElement.textContent = '';
        }
        if (searchInput) {
            searchInput.style.display = 'block';
            searchInput.value = '';
        }
    },

    /**
     * Обновить отображение выбранной группы при редактировании
     */
    updateGroupDisplay: function(groupId) {
        if (!groupId) {
            this.clearGroupSelection();
            return;
        }

        // Загружаем информацию о группе
        BX24.callMethod('sonet_group.get', { ID: groupId }, (result) => {
            if (result.error()) {
                console.error('❌ Ошибка загрузки группы:', result.error());
                return;
            }

            const groups = result.data();
            if (groups && groups.length > 0) {
                const group = groups[0];
                const displayElement = document.getElementById('selectedGroupDisplay');
                const nameElement = document.getElementById('selectedGroupName');
                const searchInput = document.getElementById('groupSearchInput');

                if (displayElement && nameElement) {
                    nameElement.textContent = group.NAME;
                    displayElement.style.display = 'flex';
                }
                if (searchInput) {
                    searchInput.style.display = 'none';
                }
            }
        });
    },

    /**
     * Обработчик изменения условия создания
     */
    onConditionChange: function() {
        const immediatelyRadio = document.getElementById('conditionImmediately');
        const cancelContainer = document.getElementById('cancelOnParentCancelContainer');

        if (!immediatelyRadio || !cancelContainer) return;

        // Показываем чекбокс только когда выбрано "Создать сразу"
        if (immediatelyRadio.checked) {
            cancelContainer.style.display = 'flex';
        } else {
            cancelContainer.style.display = 'none';
            // Сбрасываем чекбокс при переключении на "Создать при отмене"
            const checkbox = document.getElementById('cancelOnParentCancel');
            if (checkbox) checkbox.checked = false;
        }
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
     * Открыть модалку для редактирования предзадачи
     */
    openEdit: function(options) {
        console.log('✏️ Открываем модалку для редактирования', options);

        this.isEditing = true;
        this.editingNode = options.node;
        this.currentProcessId = options.processId;
        this.onSaveCallback = options.onSave;

        const modal = document.getElementById('taskModalV2');
        if (!modal) {
            this.createModal();
        }

        // Заполняем форму данными узла
        document.getElementById('futureTaskTitleV2').value = this.editingNode.title || '';
        document.getElementById('futureTaskDescriptionV2').value = this.editingNode.description || '';
        document.getElementById('futureTaskGroupV2').value = this.editingNode.groupId || '';
        document.getElementById('futureTaskResponsibleV2').value = this.editingNode.responsibleId || '';

        // Обновляем отображение выбранной группы и пользователя
        this.updateGroupDisplay(this.editingNode.groupId);
        this.updateUserDisplay(this.editingNode.responsibleId);

        // Устанавливаем радио-кнопки и чекбокс на основе condition
        const condition = this.editingNode.condition || 'immediately';
        if (condition === 'ifCancel_cancel') {
            // "Создать сразу" + чекбокс включен
            document.getElementById('conditionImmediately').checked = true;
            document.getElementById('conditionIfCancel').checked = false;
            document.getElementById('cancelOnParentCancel').checked = true;
        } else if (condition === 'ifCancel_create') {
            // "Создать при отмене"
            document.getElementById('conditionImmediately').checked = false;
            document.getElementById('conditionIfCancel').checked = true;
            document.getElementById('cancelOnParentCancel').checked = false;
        } else {
            // "Создать сразу" без чекбокса
            document.getElementById('conditionImmediately').checked = true;
            document.getElementById('conditionIfCancel').checked = false;
            document.getElementById('cancelOnParentCancel').checked = false;
        }

        // Обновляем видимость чекбокса
        this.onConditionChange();

        // Меняем заголовок модалки
        const modalTitle = document.querySelector('#taskModalV2 h2');
        if (modalTitle) {
            modalTitle.textContent = '✏️ Редактировать предзадачу';
        }

        document.getElementById('taskModalV2').style.display = 'flex';
        document.getElementById('futureTaskTitleV2').focus();
    },

    /**
     * Показать модальное окно
     */
    show: function() {
        console.log('📝 Открываем модалку для создания предзадачи');
        console.log('   Позиция:', this.currentPosition);
        console.log('   От узла:', this.currentSourceId);

        this.isEditing = false;
        this.editingNode = null;

        const modal = document.getElementById('taskModalV2');
        if (!modal) {
            this.createModal();
        }

        // Очищаем форму
        this.reset();

        // Возвращаем заголовок на место
        const modalTitle = document.querySelector('#taskModalV2 h2');
        if (modalTitle) {
            modalTitle.textContent = '✨ Создать предзадачу';
        }

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

        // Сбрасываем отображение группы и пользователя
        this.clearGroupSelection();
        this.clearUserSelection();

        // Сбрасываем радио-кнопки и чекбокс
        document.getElementById('conditionImmediately').checked = true;
        document.getElementById('conditionIfCancel').checked = false;
        document.getElementById('cancelOnParentCancel').checked = false;

        // Обновляем видимость чекбокса
        this.onConditionChange();
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

            // Определяем тип условия на основе радио-кнопок и чекбокса
            let conditionType;
            const immediatelyChecked = document.getElementById('conditionImmediately').checked;
            const cancelOnParentChecked = document.getElementById('cancelOnParentCancel').checked;

            if (immediatelyChecked) {
                // "Создать сразу"
                if (cancelOnParentChecked) {
                    // С чекбоксом "Отменить при отмене"
                    conditionType = 'ifCancel_cancel';
                } else {
                    // Без чекбокса
                    conditionType = 'immediately';
                }
            } else {
                // "Создать при отмене"
                conditionType = 'ifCancel_create';
            }

            // Валидация
            if (!title) {
                alert('Укажите название задачи');
                return;
            }

            if (!responsibleId) {
                alert('Выберите ответственного');
                return;
            }

            const processId = this.currentProcessId || window.currentProcessId;

            // Режим редактирования
            if (this.isEditing && this.editingNode) {
                console.log('✏️ Обновляем предзадачу:', title);

                // Обновляем существующий узел
                const updatedNode = {
                    ...this.editingNode,
                    title: title,
                    description: description,
                    groupId: groupId,
                    responsibleId: responsibleId,
                    condition: conditionType
                };

                // Сохранить в EntityManagerV2
                await EntityManagerV2.saveNode(processId, updatedNode);
                console.log('✅ Узел обновлён в Entity');

                // Вызвать callback если есть
                if (this.onSaveCallback) {
                    this.onSaveCallback(updatedNode);
                }
            }
            // Режим создания
            else {
                console.log('💾 Создаём предзадачу:', title);

                const futureId = 'future-' + Date.now();

                // Создать узел предзадачи
                const futureNode = {
                    nodeId: futureId,
                    type: 'future',
                    title: title,
                    description: description,
                    groupId: groupId,
                    responsibleId: responsibleId,
                    condition: conditionType,
                    status: 0,
                    positionX: this.currentPosition.x,
                    positionY: this.currentPosition.y,
                    connectionsFrom: this.currentSourceId ? [this.currentSourceId] : [],
                    connectionsTo: [],
                    realTaskId: null,
                    processId: processId  // КРИТИЧНО: Сохраняем processId!
                };

                // Сохранить в EntityManagerV2
                await EntityManagerV2.saveNode(processId, futureNode);
                console.log('✅ Узел предзадачи сохранён в Entity');

                // Если есть исходный узел - создать связь
                if (this.currentSourceId) {
                    await EntityManagerV2.saveConnection(processId, this.currentSourceId, futureId);
                    console.log('✅ Связь создана:', this.currentSourceId, '->', futureId);

                    // Проверяем: если родительская задача завершена И условие "immediately" - создаём задачу сразу
                    if (futureNode.condition === 'immediately') {
                        const allNodes = await EntityManagerV2.loadProcess(processId);
                        const sourceNode = allNodes.find(n => n.nodeId === this.currentSourceId);

                        if (sourceNode && sourceNode.type === 'task' && sourceNode.status === 5) {
                            console.log('🎉 Родительская задача завершена! Создаём задачу из предзадачи сразу...');

                            // Используем TaskHandler для создания задачи
                            if (window.TaskHandler && window.TaskHandler.createTaskFromFuture) {
                                try {
                                    const newTaskId = await window.TaskHandler.createTaskFromFuture(
                                        futureNode,
                                        sourceNode,
                                        processId
                                    );

                                    if (newTaskId) {
                                        console.log('✅ Задача создана сразу! ID:', newTaskId);

                                        // Обновляем предзадачу
                                        futureNode.realTaskId = newTaskId;
                                        await EntityManagerV2.saveNode(processId, futureNode);

                                        // Обновляем canvas - скрыть предзадачу, показать задачу
                                        if (window.FlowCanvasV2 && window.FlowCanvasV2.updateNodes) {
                                            console.log('🔄 Обновляем canvas после автоматического создания задачи...');
                                            window.FlowCanvasV2.updateNodes();
                                        }
                                    }
                                } catch (error) {
                                    console.error('❌ Ошибка создания задачи:', error);
                                }
                            }
                        }
                    }
                }

                // Вызвать callback если есть
                if (this.onSaveCallback) {
                    this.onSaveCallback(futureNode);
                }
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
                        <input type="hidden" id="futureTaskGroupV2" value="" />

                        <!-- Выбранная группа -->
                        <div id="selectedGroupDisplay" style="display: none; align-items: center; gap: 10px; padding: 10px; background: #f3f4f6; border-radius: 5px; margin-bottom: 10px;">
                            <span id="selectedGroupName" style="flex: 1; font-size: 14px; color: #374151;"></span>
                            <button type="button" onclick="window.TaskModalV2.clearGroupSelection()" style="padding: 5px 10px; background: #fee2e2; color: #dc2626; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                ✕ Удалить
                            </button>
                        </div>

                        <!-- Поле поиска -->
                        <div style="position: relative;">
                            <input type="text" id="groupSearchInput" placeholder="Найти группу..." onclick="window.TaskModalV2.openGroupSelector()" oninput="window.TaskModalV2.searchGroups(this.value)" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px;" />

                            <!-- Результаты поиска -->
                            <div id="groupSearchResults" style="display: none; position: absolute; top: 100%; left: 0; right: 0; max-height: 300px; overflow-y: auto; background: white; border: 1px solid #d1d5db; border-radius: 5px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000; margin-top: 5px;">
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #374151;">Ответственный *</label>
                        <input type="hidden" id="futureTaskResponsibleV2" value="" />

                        <!-- Выбранный пользователь -->
                        <div id="selectedUserDisplay" style="display: none; align-items: center; gap: 10px; padding: 10px; background: #f3f4f6; border-radius: 5px; margin-bottom: 10px;">
                            <span id="selectedUserName" style="flex: 1; font-size: 14px; color: #374151;"></span>
                            <button type="button" onclick="window.TaskModalV2.clearUserSelection()" style="padding: 5px 10px; background: #fee2e2; color: #dc2626; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                ✕ Удалить
                            </button>
                        </div>

                        <!-- Поле поиска -->
                        <div style="position: relative;">
                            <input type="text" id="userSearchInput" placeholder="Найти пользователя..." onclick="window.TaskModalV2.openUserSelector()" oninput="window.TaskModalV2.searchUsers(this.value)" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 14px;" />

                            <!-- Результаты поиска -->
                            <div id="userSearchResults" style="display: none; position: absolute; top: 100%; left: 0; right: 0; max-height: 300px; overflow-y: auto; background: white; border: 1px solid #d1d5db; border-radius: 5px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000; margin-top: 5px;">
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500; color: #374151;">Условие создания</label>

                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <!-- Первая строка: радио "Создать сразу" + чекбокс на одной линии -->
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <label style="display: flex; align-items: center; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; cursor: pointer; background: white; flex: 1;">
                                    <input type="radio" name="conditionType" value="immediately" id="conditionImmediately" checked style="margin-right: 10px;" onchange="window.TaskModalV2.onConditionChange()">
                                    <span style="font-size: 14px;">⚡ Создать сразу</span>
                                </label>

                                <!-- Чекбокс на той же строке -->
                                <label id="cancelOnParentCancelContainer" style="display: none; align-items: center; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; cursor: pointer; background: white; white-space: nowrap;">
                                    <input type="checkbox" id="cancelOnParentCancel" style="margin-right: 8px;">
                                    <span style="font-size: 14px; color: #374151;">❌ Отменить при отмене</span>
                                </label>
                            </div>

                            <!-- Вторая строка: радио "Создать при отмене" -->
                            <label style="display: flex; align-items: center; padding: 10px; border: 1px solid #d1d5db; border-radius: 5px; cursor: pointer; background: white;">
                                <input type="radio" name="conditionType" value="ifCancel_create" id="conditionIfCancel" style="margin-right: 10px;" onchange="window.TaskModalV2.onConditionChange()">
                                <span style="font-size: 14px;">❌ Создать при отмене</span>
                            </label>
                        </div>
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
