/**
 * TemplateManager - Управление шаблонами процессов
 *
 * Функции:
 * - Сохранение текущего canvas как шаблон (конвертация задач в предзадачи)
 * - Загрузка шаблона на canvas (добавление к существующим узлам)
 * - Удаление и переименование шаблонов
 * - Хранение в Entity Storage (tflow_tmpl)
 */

window.TemplateManager = {
    /**
     * Открыть диалог управления шаблонами
     */
    open: function() {
        console.log('📋 Открываем менеджер шаблонов...');

        // Создаем overlay
        const overlay = document.createElement('div');
        overlay.id = 'templateManagerOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 600px;
            max-width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;

        // Заголовок
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <h2 style="margin: 0; font-size: 20px; color: #1f2937;">📋 Шаблоны процессов</h2>
            <button id="closeTemplateManager" style="
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6b7280;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            ">×</button>
        `;

        // Контент
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        `;

        // Форма сохранения нового шаблона
        const saveSection = document.createElement('div');
        saveSection.style.cssText = `
            margin-bottom: 24px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
        `;
        saveSection.innerHTML = `
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">Сохранить текущий canvas как шаблон</h3>
            <div style="display: flex; gap: 8px;">
                <input
                    type="text"
                    id="templateName"
                    placeholder="Название шаблона..."
                    style="
                        flex: 1;
                        padding: 10px 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 14px;
                        outline: none;
                    "
                />
                <button id="saveTemplateBtn" style="
                    padding: 10px 20px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                    white-space: nowrap;
                ">💾 Сохранить</button>
            </div>
        `;

        // Список шаблонов
        const templatesSection = document.createElement('div');
        templatesSection.innerHTML = `
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">Сохраненные шаблоны</h3>
            <div id="templatesList" style="display: flex; flex-direction: column; gap: 8px;">
                <div style="padding: 20px; text-align: center; color: #9ca3af;">
                    Загрузка...
                </div>
            </div>
        `;

        content.appendChild(saveSection);
        content.appendChild(templatesSection);

        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Обработчики
        document.getElementById('closeTemplateManager').onclick = () => {
            document.body.removeChild(overlay);
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        };

        document.getElementById('saveTemplateBtn').onclick = () => {
            this.saveTemplate();
        };

        // Загружаем список шаблонов
        this.loadTemplatesList();
    },

    /**
     * Сохранить текущий canvas как шаблон
     */
    saveTemplate: async function() {
        const nameInput = document.getElementById('templateName');
        const templateName = nameInput.value.trim();

        if (!templateName) {
            alert('Введите название шаблона');
            return;
        }

        try {
            console.log('💾 Сохраняем шаблон:', templateName);

            // Получаем текущие узлы и связи с canvas
            const currentNodes = window.FlowCanvasV2?.getCurrentNodes?.() || [];
            const currentEdges = window.FlowCanvasV2?.getCurrentEdges?.() || [];

            if (currentNodes.length === 0) {
                alert('На canvas нет узлов для сохранения');
                return;
            }

            console.log('📊 Узлов на canvas:', currentNodes.length);
            console.log('📊 Связей на canvas:', currentEdges.length);

            // Конвертируем все узлы в предзадачи
            const templateNodes = [];

            for (const node of currentNodes) {
                const nodeData = node.data._node || node.data;

                // Конвертируем задачу в предзадачу
                const futureNode = {
                    nodeId: node.id.startsWith('task-') ? 'future-' + Date.now() + '-' + Math.random() : node.id,
                    type: 'future',
                    title: nodeData.title || node.data.title,
                    description: nodeData.description || '',
                    condition: node.data.isFuture ? (nodeData.condition || 'immediately') : 'immediately',
                    responsibleId: nodeData.responsibleId || null,
                    groupId: nodeData.groupId || null,
                    positionX: node.position.x,
                    positionY: node.position.y,
                    connectionsFrom: [],
                    connectionsTo: []
                };

                templateNodes.push(futureNode);
            }

            // Создаем карту старых ID -> новых ID
            const idMap = {};
            for (let i = 0; i < currentNodes.length; i++) {
                idMap[currentNodes[i].id] = templateNodes[i].nodeId;
            }

            // Обрабатываем связи
            for (const edge of currentEdges) {
                const sourceNewId = idMap[edge.source];
                const targetNewId = idMap[edge.target];

                if (!sourceNewId || !targetNewId) {
                    console.warn('⚠️ Связь пропущена, не найден ID:', edge);
                    continue;
                }

                // Находим исходный узел
                const sourceNode = templateNodes.find(n => n.nodeId === sourceNewId);
                if (sourceNode) {
                    sourceNode.connectionsFrom.push({
                        type: 'future',
                        id: targetNewId
                    });
                }

                // Находим целевой узел
                const targetNode = templateNodes.find(n => n.nodeId === targetNewId);
                if (targetNode) {
                    targetNode.connectionsTo.push(sourceNewId);
                }
            }

            console.log('✅ Шаблон подготовлен:', templateNodes.length, 'узлов');

            // Убеждаемся, что хранилище существует
            await this.ensureTemplateStorage();

            // Сохраняем в Entity Storage
            const templateData = {
                name: templateName,
                nodes: templateNodes,
                createdAt: Date.now()
            };

            await new Promise((resolve, reject) => {
                BX24.callMethod('entity.item.add', {
                    ENTITY: 'tflow_tmpl',
                    NAME: 'template_' + Date.now(),
                    PROPERTY_VALUES: {
                        TEMPLATE_NAME: templateName,
                        TEMPLATE_DATA: JSON.stringify(templateData)
                    }
                }, (result) => {
                    if (result.error()) {
                        console.error('❌ Ошибка сохранения:', result.error());
                        reject(result.error());
                    } else {
                        console.log('✅ Шаблон сохранен:', result.data());
                        resolve(result.data());
                    }
                });
            });

            alert('✅ Шаблон "' + templateName + '" сохранен!');
            nameInput.value = '';

            // Обновляем список
            this.loadTemplatesList();

        } catch (error) {
            console.error('❌ Ошибка сохранения шаблона:', error);
            alert('Ошибка сохранения: ' + error.message);
        }
    },

    /**
     * Загрузить список шаблонов
     */
    loadTemplatesList: async function() {
        const listContainer = document.getElementById('templatesList');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #9ca3af;">Загрузка...</div>';

        try {
            const templates = await this.getAllTemplates();

            if (templates.length === 0) {
                listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #9ca3af;">Нет сохраненных шаблонов</div>';
                return;
            }

            console.log('📋 Загружено шаблонов:', templates.length);

            listContainer.innerHTML = '';

            for (const template of templates) {
                const templateData = JSON.parse(template.PROPERTY_VALUES.TEMPLATE_DATA);
                const templateCard = this.createTemplateCard(template.ID, templateData);
                listContainer.appendChild(templateCard);
            }

        } catch (error) {
            console.error('❌ Ошибка загрузки шаблонов:', error);
            listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Ошибка загрузки</div>';
        }
    },

    /**
     * Создать карточку шаблона
     */
    createTemplateCard: function(templateId, templateData) {
        const card = document.createElement('div');
        card.style.cssText = `
            padding: 12px 16px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s;
        `;

        card.onmouseenter = () => { card.style.borderColor = '#667eea'; };
        card.onmouseleave = () => { card.style.borderColor = '#e5e7eb'; };

        const info = document.createElement('div');
        info.style.cssText = 'flex: 1;';

        const date = new Date(templateData.createdAt);
        const dateStr = date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        info.innerHTML = `
            <div style="font-weight: 500; color: #1f2937; margin-bottom: 4px;">${templateData.name}</div>
            <div style="font-size: 12px; color: #6b7280;">
                ${templateData.nodes.length} узлов • ${dateStr}
            </div>
        `;

        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 8px;';

        // Кнопка загрузки
        const loadBtn = document.createElement('button');
        loadBtn.textContent = '📥 Загрузить';
        loadBtn.style.cssText = `
            padding: 8px 16px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
        `;
        loadBtn.onmouseenter = () => { loadBtn.style.background = '#5568d3'; };
        loadBtn.onmouseleave = () => { loadBtn.style.background = '#667eea'; };
        loadBtn.onclick = () => this.loadTemplate(templateId, templateData);

        // Кнопка переименования
        const renameBtn = document.createElement('button');
        renameBtn.textContent = '✏️';
        renameBtn.style.cssText = `
            padding: 8px 12px;
            background: #f3f4f6;
            color: #374151;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        `;
        renameBtn.onmouseenter = () => { renameBtn.style.background = '#e5e7eb'; };
        renameBtn.onmouseleave = () => { renameBtn.style.background = '#f3f4f6'; };
        renameBtn.onclick = () => this.renameTemplate(templateId, templateData);

        // Кнопка удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.cssText = `
            padding: 8px 12px;
            background: #fef2f2;
            color: #ef4444;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        `;
        deleteBtn.onmouseenter = () => { deleteBtn.style.background = '#fee2e2'; };
        deleteBtn.onmouseleave = () => { deleteBtn.style.background = '#fef2f2'; };
        deleteBtn.onclick = () => this.deleteTemplate(templateId, templateData.name);

        actions.appendChild(loadBtn);
        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(info);
        card.appendChild(actions);

        return card;
    },

    /**
     * Загрузить шаблон на canvas
     */
    loadTemplate: async function(templateId, templateData) {
        try {
            console.log('📥 Загружаем шаблон:', templateData.name);

            if (!window.FlowCanvasV2?.addTemplateNodes) {
                alert('Метод загрузки шаблона недоступен');
                return;
            }

            // Закрываем окно менеджера
            const overlay = document.getElementById('templateManagerOverlay');
            if (overlay) {
                document.body.removeChild(overlay);
            }

            // Передаем узлы в FlowCanvas для добавления
            await window.FlowCanvasV2.addTemplateNodes(templateData.nodes);

            console.log('✅ Шаблон загружен:', templateData.nodes.length, 'узлов');

        } catch (error) {
            console.error('❌ Ошибка загрузки шаблона:', error);
            alert('Ошибка загрузки: ' + error.message);
        }
    },

    /**
     * Переименовать шаблон
     */
    renameTemplate: async function(templateId, templateData) {
        const newName = prompt('Новое название шаблона:', templateData.name);

        if (!newName || newName === templateData.name) {
            return;
        }

        try {
            console.log('✏️ Переименовываем шаблон:', templateId);

            templateData.name = newName;

            await new Promise((resolve, reject) => {
                BX24.callMethod('entity.item.update', {
                    ENTITY: 'tflow_tmpl',
                    ID: templateId,
                    PROPERTY_VALUES: {
                        TEMPLATE_NAME: newName,
                        TEMPLATE_DATA: JSON.stringify(templateData)
                    }
                }, (result) => {
                    if (result.error()) {
                        reject(result.error());
                    } else {
                        resolve(result.data());
                    }
                });
            });

            console.log('✅ Шаблон переименован');
            this.loadTemplatesList();

        } catch (error) {
            console.error('❌ Ошибка переименования:', error);
            alert('Ошибка: ' + error.message);
        }
    },

    /**
     * Удалить шаблон
     */
    deleteTemplate: async function(templateId, templateName) {
        if (!confirm('Удалить шаблон "' + templateName + '"?')) {
            return;
        }

        try {
            console.log('🗑️ Удаляем шаблон:', templateId);

            await new Promise((resolve, reject) => {
                BX24.callMethod('entity.item.delete', {
                    ENTITY: 'tflow_tmpl',
                    ID: templateId
                }, (result) => {
                    if (result.error()) {
                        reject(result.error());
                    } else {
                        resolve(result.data());
                    }
                });
            });

            console.log('✅ Шаблон удален');
            this.loadTemplatesList();

        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            alert('Ошибка: ' + error.message);
        }
    },

    // Кэш проверки существования хранилища
    _storageExistsCache: false,

    /**
     * Проверить/создать хранилище для шаблонов
     * Используем тот же подход что и в EntityManagerV2
     */
    ensureTemplateStorage: async function() {
        return new Promise((resolve, reject) => {
            // Если уже проверяли - сразу возвращаем success
            if (this._storageExistsCache) {
                resolve(true);
                return;
            }

            console.log('🔍 Проверяем существование хранилища tflow_tmpl...');

            BX24.callMethod('entity.add', {
                ENTITY: 'tflow_tmpl',
                NAME: 'Flowtask Templates Storage',
                ACCESS: {
                    'AU': 'W'  // Все авторизованные пользователи могут записывать
                }
            }, (result) => {
                if (result.error()) {
                    const error = result.error();

                    // Безопасное логирование ошибки (избегаем circular structure)
                    console.log('⚠️ Ответ от entity.add:', {
                        error: error.ex?.error || error,
                        error_description: error.ex?.error_description || ''
                    });

                    // Если хранилище уже существует - это нормально
                    // Проверяем разные варианты ошибки
                    const errorCode = error.ex?.error || error;
                    const errorDesc = error.ex?.error_description || '';

                    const isAlreadyExists = (
                        (errorDesc && errorDesc.includes('already exists')) ||
                        (errorCode === 'ERROR_ENTITY_ALREADY_EXISTS') ||
                        (typeof errorCode === 'string' && errorCode.includes('ALREADY_EXISTS'))
                    );

                    if (isAlreadyExists) {
                        console.log('✅ Хранилище tflow_tmpl уже существует');
                        this._storageExistsCache = true;
                        resolve(true);
                    } else {
                        console.error('❌ Ошибка создания хранилища:', errorCode, errorDesc);
                        reject(error);
                    }
                } else {
                    console.log('✅ Хранилище tflow_tmpl создано успешно');
                    this._storageExistsCache = true;
                    resolve(true);
                }
            });
        });
    },

    /**
     * Получить все шаблоны из Entity Storage
     */
    getAllTemplates: async function() {
        // Убеждаемся, что хранилище существует
        await this.ensureTemplateStorage();

        return new Promise((resolve, reject) => {
            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_tmpl',
                SORT: { DATE_CREATE: 'DESC' }
            }, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка получения шаблонов:', result.error());
                    reject(result.error());
                } else {
                    const templates = result.data() || [];
                    resolve(templates);
                }
            });
        });
    }
};

console.log('✅ TemplateManager загружен');
