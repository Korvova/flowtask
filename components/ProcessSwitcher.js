/**
 * ProcessSwitcher - Модальное окно для переключения между процессами
 * Показывает список всех процессов с возможностью переключения и удаления
 */
window.ProcessSwitcher = {
    isOpen: false,
    currentProcessId: null,

    /**
     * Открыть окно переключения процессов
     * @param {number} currentProcessId - ID текущего процесса
     * @param {Function} onSwitch - Callback при переключении на другой процесс
     */
    open: function(currentProcessId, onSwitch) {
        if (this.isOpen) {
            console.log('⚠️ Окно переключения процессов уже открыто');
            return;
        }

        this.currentProcessId = currentProcessId;
        this.onSwitch = onSwitch;

        console.log('📋 Открываем переключение процессов, текущий:', currentProcessId);
        this.isOpen = true;

        // Создаём overlay
        const overlay = document.createElement('div');
        overlay.id = 'process-switcher-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        // Создаём модальное окно
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 600px;
            max-height: 70vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        // Заголовок
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        const title = document.createElement('h2');
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        `;
        title.textContent = '📋 Список процессов';

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
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
            border-radius: 6px;
            transition: all 0.2s;
        `;
        closeBtn.innerHTML = '×';
        closeBtn.onmouseover = () => { closeBtn.style.background = '#f3f4f6'; };
        closeBtn.onmouseout = () => { closeBtn.style.background = 'none'; };
        closeBtn.onclick = () => this.close();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Контент
        const content = document.createElement('div');
        content.id = 'process-switcher-content';
        content.style.cssText = `
            padding: 20px 24px;
            overflow-y: auto;
            flex: 1;
        `;

        // Футер
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
        `;

        const closeBtnBottom = document.createElement('button');
        closeBtnBottom.style.cssText = `
            padding: 10px 20px;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        `;
        closeBtnBottom.textContent = 'Закрыть';
        closeBtnBottom.onmouseover = () => { closeBtnBottom.style.background = '#4b5563'; };
        closeBtnBottom.onmouseout = () => { closeBtnBottom.style.background = '#6b7280'; };
        closeBtnBottom.onclick = () => this.close();

        footer.appendChild(closeBtnBottom);

        // Собираем модалку
        modal.appendChild(header);
        modal.appendChild(content);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        // Загружаем список процессов
        this.loadProcessList();
    },

    /**
     * Закрыть окно
     */
    close: function() {
        const overlay = document.getElementById('process-switcher-overlay');
        if (overlay) {
            overlay.remove();
        }
        this.isOpen = false;
    },

    /**
     * Загрузить и отобразить список процессов
     */
    loadProcessList: async function() {
        const content = document.getElementById('process-switcher-content');

        if (!content) {
            console.error('❌ Контейнер для списка не найден');
            return;
        }

        // Показываем загрузку
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <div style="font-size: 32px; margin-bottom: 12px;">⏳</div>
                <div>Загрузка процессов...</div>
            </div>
        `;

        try {
            const processes = await EntityManagerV2.getAllProcesses();

            if (processes.length === 0) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
                        <div style="font-size: 16px; font-weight: 500;">Процессов не найдено</div>
                    </div>
                `;
                return;
            }

            // Создаём список процессов
            let html = `
                <div style="margin-bottom: 16px; color: #6b7280; font-size: 14px;">
                    Всего процессов: ${processes.length}
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
            `;

            for (const process of processes) {
                const processName = process.processName || `Процесс #${process.processId}`;
                const isCurrent = process.processId == this.currentProcessId;

                html += `
                    <div style="
                        border: ${isCurrent ? '2px solid #2fc6f6' : '1px solid #e5e7eb'};
                        border-radius: 8px;
                        padding: 12px 16px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        transition: all 0.2s;
                        background: ${isCurrent ? '#eff6ff' : 'white'};
                        cursor: ${isCurrent ? 'default' : 'pointer'};
                    "
                    ${!isCurrent ? `
                        onmouseover="this.style.background='#f9fafb'"
                        onmouseout="this.style.background='white'"
                        onclick="window.ProcessSwitcher.switchToProcess('${process.processId}')"
                    ` : ''}>
                        <div style="flex: 1;">
                            <div style="font-weight: ${isCurrent ? '600' : '500'}; font-size: 15px; color: #1f2937;">
                                ${processName} ${isCurrent ? '(текущий)' : ''}
                            </div>
                            <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">
                                ID: ${process.processId} • ${process.nodeCount} узлов
                            </div>
                        </div>
                        <button
                            onclick="event.stopPropagation(); window.ProcessSwitcher.deleteProcessConfirm('${process.processId}')"
                            style="
                                padding: 6px 12px;
                                background: #ef4444;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                                transition: all 0.2s;
                                margin-left: 12px;
                            "
                            onmouseover="this.style.background='#dc2626'"
                            onmouseout="this.style.background='#ef4444'"
                        >
                            ✕
                        </button>
                    </div>
                `;
            }

            html += '</div>';
            content.innerHTML = html;

        } catch (error) {
            console.error('❌ Ошибка загрузки процессов:', error);
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
                    <div style="font-size: 16px; font-weight: 500;">Ошибка загрузки</div>
                    <div style="font-size: 14px; margin-top: 8px;">${error.message || error}</div>
                </div>
            `;
        }
    },

    /**
     * Переключиться на другой процесс
     */
    switchToProcess: function(processId) {
        console.log('🔄 Переключаемся на процесс:', processId);

        if (this.onSwitch) {
            this.onSwitch(processId);
        }

        this.close();
    },

    /**
     * Подтверждение удаления процесса
     */
    deleteProcessConfirm: function(processId) {
        const isCurrent = processId == this.currentProcessId;
        const message = isCurrent
            ? `Удалить текущий процесс #${processId}?\n\nВсе узлы и связи будут удалены.\nCanvas станет пустым.`
            : `Удалить процесс #${processId}?\n\nВсе узлы и связи будут удалены без возможности восстановления.`;

        if (confirm(message)) {
            this.deleteProcessAction(processId);
        }
    },

    /**
     * Удаление процесса
     */
    deleteProcessAction: async function(processId) {
        const content = document.getElementById('process-switcher-content');

        if (!content) {
            return;
        }

        const isCurrent = processId == this.currentProcessId;

        // Показываем индикатор загрузки
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <div style="font-size: 32px; margin-bottom: 12px;">🗑️</div>
                <div>Удаление процесса #${processId}...</div>
            </div>
        `;

        try {
            const deletedCount = await EntityManagerV2.deleteProcess(processId);

            console.log(`✅ Процесс ${processId} удалён (${deletedCount} узлов)`);

            // Если удалили текущий процесс - очищаем canvas
            if (isCurrent) {
                console.log('🔄 Удалён текущий процесс, очищаем canvas...');
                window.currentProcessId = null;

                // Очищаем canvas
                if (this.onSwitch) {
                    this.onSwitch(null); // null = очистить canvas
                }
            }

            // Показываем успех
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #10b981;">
                    <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                    <div style="font-size: 16px; font-weight: 500;">Процесс удалён</div>
                    <div style="font-size: 14px; margin-top: 8px;">Удалено узлов: ${deletedCount}</div>
                </div>
            `;

            // Перезагружаем список через 1 секунду
            setTimeout(() => {
                this.loadProcessList();
            }, 1000);

        } catch (error) {
            console.error('❌ Ошибка удаления процесса:', error);

            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
                    <div style="font-size: 16px; font-weight: 500;">Ошибка удаления</div>
                    <div style="font-size: 14px; margin-top: 8px;">${error.message || error}</div>
                </div>
            `;

            // Перезагружаем список через 2 секунды
            setTimeout(() => {
                this.loadProcessList();
            }, 2000);
        }
    }
};

console.log('✅ ProcessSwitcher component loaded');
