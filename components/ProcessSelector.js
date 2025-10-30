/**
 * ProcessSelector - Выбор процесса при открытии задачи без связей
 *
 * Показывает 2 варианта:
 * 1. Создать новый процесс (поле "Название процесса", по умолчанию = ID задачи)
 * 2. Участвовать в существующем процессе (выбор из списка)
 */
window.ProcessSelector = {

    /**
     * Показать диалог выбора процесса
     * @param {number} taskId - ID текущей задачи
     * @param {Function} onSelect - Callback(processName, isNew)
     */
    show: function(taskId, onSelect) {
        console.log('📋 ProcessSelector: показываем выбор для задачи', taskId);

        // Загружаем список существующих процессов
        this.loadExistingProcesses().then(processes => {
            this.renderDialog(taskId, processes, onSelect);
        });
    },

    /**
     * Загрузить список существующих процессов (уникальных NAME)
     */
    loadExistingProcesses: async function() {
        return new Promise((resolve) => {
            const processNames = new Set();
            let start = 0;
            const batchSize = 50;

            const loadBatch = (startPos) => {
                BX24.callMethod('entity.item.get', {
                    ENTITY: 'tflow_nodes',
                    FILTER: {
                        '%NAME': 'process_'
                    },
                    SORT: { ID: 'DESC' },
                    start: startPos
                }, (result) => {
                    if (result.error()) {
                        console.error('❌ Ошибка загрузки процессов:', result.error());
                        resolve([]);
                        return;
                    }

                    const items = result.data();
                    console.log('📦 Загружено записей:', items.length, 'с позиции', startPos);

                    // Извлекаем уникальные processId из NAME
                    items.forEach(item => {
                        // NAME формат: process_154_node_task-154
                        const match = item.NAME.match(/^process_(\d+|[a-zA-Z0-9_-]+)/);
                        if (match) {
                            const processName = match[1];
                            processNames.add(processName);
                        }
                    });

                    // Если есть ещё записи - продолжаем
                    if (result.more()) {
                        loadBatch(startPos + batchSize);
                    } else {
                        // Конвертируем Set в массив
                        const processList = Array.from(processNames);
                        console.log('✅ Найдено уникальных процессов:', processList.length);
                        resolve(processList);
                    }
                });
            };

            loadBatch(0);
        });
    },

    /**
     * Отобразить диалог выбора
     */
    renderDialog: function(taskId, processes, onSelect) {
        const dialogHtml = `
            <div id="process-selector-overlay" style="
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
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                ">
                    <h2 style="margin: 0 0 20px 0; font-size: 20px;">Выберите вариант</h2>

                    <!-- Вариант 1: Создать новый процесс -->
                    <div style="margin-bottom: 25px; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        <label style="display: block; margin-bottom: 10px;">
                            <input type="radio" name="process-choice" value="new" checked style="margin-right: 8px;">
                            <strong>Создать новый процесс</strong>
                        </label>
                        <div style="margin-left: 28px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #666;">
                                Название процесса:
                            </label>
                            <input
                                type="text"
                                id="process-name-input"
                                value="${taskId}"
                                style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 4px;
                                    font-size: 14px;
                                    box-sizing: border-box;
                                "
                            />
                            <div style="font-size: 12px; color: #999; margin-top: 5px;">
                                По умолчанию используется ID задачи
                            </div>
                        </div>
                    </div>

                    <!-- Вариант 2: Участвовать в существующем -->
                    <div style="margin-bottom: 25px; padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        <label style="display: block; margin-bottom: 10px;">
                            <input type="radio" name="process-choice" value="existing" style="margin-right: 8px;">
                            <strong>Участвовать в существующем процессе</strong>
                        </label>
                        <div style="margin-left: 28px;">
                            <select
                                id="process-list-select"
                                disabled
                                style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 4px;
                                    font-size: 14px;
                                    background: #f5f5f5;
                                    box-sizing: border-box;
                                "
                            >
                                <option value="">-- Выберите процесс --</option>
                                ${processes.map(p => `<option value="${p}">Процесс ${p}</option>`).join('')}
                            </select>
                            ${processes.length === 0 ? '<div style="font-size: 12px; color: #999; margin-top: 5px;">Нет существующих процессов</div>' : ''}
                        </div>
                    </div>

                    <!-- Кнопки -->
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="process-cancel-btn" style="
                            padding: 10px 20px;
                            border: 1px solid #ddd;
                            background: white;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Отмена</button>
                        <button id="process-select-btn" style="
                            padding: 10px 20px;
                            border: none;
                            background: #2fc6f6;
                            color: white;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                        ">Продолжить</button>
                    </div>
                </div>
            </div>
        `;

        // Добавляем диалог в DOM
        document.body.insertAdjacentHTML('beforeend', dialogHtml);

        // Обработчики переключения радиокнопок
        const radioNew = document.querySelector('input[name="process-choice"][value="new"]');
        const radioExisting = document.querySelector('input[name="process-choice"][value="existing"]');
        const nameInput = document.getElementById('process-name-input');
        const selectList = document.getElementById('process-list-select');

        radioNew.addEventListener('change', () => {
            nameInput.disabled = false;
            nameInput.style.background = 'white';
            selectList.disabled = true;
            selectList.style.background = '#f5f5f5';
        });

        radioExisting.addEventListener('change', () => {
            nameInput.disabled = true;
            nameInput.style.background = '#f5f5f5';
            selectList.disabled = false;
            selectList.style.background = 'white';
        });

        // Кнопка "Продолжить"
        document.getElementById('process-select-btn').addEventListener('click', () => {
            const choice = document.querySelector('input[name="process-choice"]:checked').value;

            if (choice === 'new') {
                const processName = nameInput.value.trim();
                if (!processName) {
                    alert('Введите название процесса');
                    return;
                }
                console.log('✅ Выбрано: новый процесс "' + processName + '"');
                this.close();
                onSelect(processName, true);
            } else {
                const selectedProcess = selectList.value;
                if (!selectedProcess) {
                    alert('Выберите процесс из списка');
                    return;
                }
                console.log('✅ Выбрано: существующий процесс "' + selectedProcess + '"');
                this.close();
                onSelect(selectedProcess, false);
            }
        });

        // Кнопка "Отмена"
        document.getElementById('process-cancel-btn').addEventListener('click', () => {
            console.log('❌ Отмена выбора процесса');
            this.close();
            // Показываем пустой canvas или сообщение
            onSelect(null, false);
        });
    },

    /**
     * Закрыть диалог
     */
    close: function() {
        const overlay = document.getElementById('process-selector-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
};

console.log('✅ ProcessSelector loaded');
