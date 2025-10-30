/**
 * ProcessManager - UI для управления процессами
 * Показывает список всех процессов и позволяет их удалять
 */
window.ProcessManager = {
    isOpen: false,

    /**
     * Открыть окно управления процессами
     */
    open: function() {
        if (this.isOpen) {
            console.log('⚠️ Окно управления процессами уже открыто');
            return;
        }

        console.log('📋 Открываем управление процессами...');
        this.isOpen = true;

        // Создаём overlay
        const overlay = document.createElement('div');
        overlay.id = 'process-manager-overlay';
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
            max-width: 700px;
            max-height: 80vh;
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
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
        `;
        title.textContent = '📋 Управление процессами';

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
        content.id = 'process-list-content';
        content.style.cssText = `
            padding: 20px 24px;
            overflow-y: auto;
            flex: 1;
        `;

        // Футер с кнопками
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // Кнопка очистки удаленных процессов
        const cleanupBtn = document.createElement('button');
        cleanupBtn.style.cssText = `
            padding: 10px 20px;
            background: #f97316;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        `;
        cleanupBtn.textContent = '🧹 Очистить удаленные';
        cleanupBtn.onmouseover = () => { cleanupBtn.style.background = '#ea580c'; };
        cleanupBtn.onmouseout = () => { cleanupBtn.style.background = '#f97316'; };
        cleanupBtn.onclick = () => this.cleanupDeletedProcesses();

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

        footer.appendChild(cleanupBtn);
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
        const overlay = document.getElementById('process-manager-overlay');
        if (overlay) {
            overlay.remove();
        }
        this.isOpen = false;
    },

    /**
     * Загрузить и отобразить список процессов
     */
    loadProcessList: async function() {
        const content = document.getElementById('process-list-content');

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

            // Создаём таблицу процессов
            let html = `
                <div style="margin-bottom: 16px; color: #6b7280; font-size: 14px;">
                    Всего процессов: ${processes.length}
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
            `;

            // Для каждого процесса нужно загрузить информацию о задаче
            for (const process of processes) {
                const taskInfo = await this.getTaskInfo(process.processId);

                html += `
                    <div style="
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 15px; color: #1f2937; margin-bottom: 4px;">
                                ${taskInfo.exists ? taskInfo.title : 'Процесс #' + process.processId}
                            </div>
                            <div style="font-size: 13px; color: #6b7280;">
                                Задача #${process.processId} • ${process.nodeCount} узлов
                            </div>
                        </div>
                        <button
                            onclick="window.ProcessManager.deleteProcessConfirm('${process.processId}')"
                            style="
                                padding: 8px 16px;
                                background: #ef4444;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                                transition: all 0.2s;
                            "
                            onmouseover="this.style.background='#dc2626'"
                            onmouseout="this.style.background='#ef4444'"
                        >
                            🗑️ Удалить
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
     * Получить информацию о задаче
     */
    getTaskInfo: function(taskId) {
        return new Promise((resolve) => {
            BX24.callMethod('tasks.task.get', {
                taskId: taskId,
                select: ['ID', 'TITLE']
            }, (result) => {
                if (result.error()) {
                    resolve({ exists: false });
                } else {
                    const taskData = result.data();
                    const task = taskData.task || taskData;
                    resolve({
                        exists: true,
                        title: task.title || task.TITLE || 'Задача #' + taskId
                    });
                }
            });
        });
    },

    /**
     * Подтверждение удаления процесса
     */
    deleteProcessConfirm: function(processId) {
        if (confirm(`Удалить процесс #${processId}?\n\nВсе узлы и связи будут удалены без возможности восстановления.`)) {
            this.deleteProcessAction(processId);
        }
    },

    /**
     * Удаление процесса
     */
    deleteProcessAction: async function(processId) {
        const content = document.getElementById('process-list-content');

        if (!content) {
            return;
        }

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
    },

    /**
     * Очистить процессы удаленных задач
     * Проверяет все процессы и удаляет те, у которых основная задача не существует
     */
    cleanupDeletedProcesses: async function() {
        const content = document.getElementById('process-list-content');

        if (!content) {
            return;
        }

        // Показываем индикатор загрузки
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
                <div>Поиск удаленных процессов...</div>
            </div>
        `;

        try {
            const processes = await EntityManagerV2.getAllProcesses();
            console.log('📊 Проверяем процессов:', processes.length);

            const deletedProcesses = [];
            let checkedCount = 0;

            // Обновляем статус проверки
            const updateStatus = () => {
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
                        <div>Проверка процессов...</div>
                        <div style="margin-top: 12px; font-size: 14px;">
                            Проверено: ${checkedCount} из ${processes.length}
                        </div>
                    </div>
                `;
            };

            // Проверяем каждый процесс
            for (const process of processes) {
                const taskInfo = await this.getTaskInfo(process.processId);
                checkedCount++;

                if (!taskInfo.exists) {
                    deletedProcesses.push(process.processId);
                }

                // Обновляем статус каждые 5 процессов
                if (checkedCount % 5 === 0) {
                    updateStatus();
                }
            }

            console.log('🗑️ Найдено удаленных процессов:', deletedProcesses.length);

            if (deletedProcesses.length === 0) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #10b981;">
                        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                        <div style="font-size: 16px; font-weight: 500;">Удаленных процессов не найдено</div>
                        <div style="font-size: 14px; margin-top: 8px; color: #6b7280;">
                            Все процессы имеют существующие задачи
                        </div>
                    </div>
                `;

                setTimeout(() => {
                    this.loadProcessList();
                }, 2000);
                return;
            }

            // Подтверждение удаления
            const confirmed = confirm(
                `Найдено ${deletedProcesses.length} удаленных процессов:\n\n` +
                deletedProcesses.map(id => `• Процесс #${id}`).join('\n') +
                `\n\nУдалить все?`
            );

            if (!confirmed) {
                this.loadProcessList();
                return;
            }

            // Удаляем процессы
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🗑️</div>
                    <div>Удаление процессов...</div>
                    <div style="margin-top: 12px; font-size: 14px;">
                        Удалено: 0 из ${deletedProcesses.length}
                    </div>
                </div>
            `;

            let deletedCount = 0;
            let totalNodesDeleted = 0;

            for (const processId of deletedProcesses) {
                const nodesDeleted = await EntityManagerV2.deleteProcess(processId);
                totalNodesDeleted += nodesDeleted;
                deletedCount++;

                // Обновляем статус
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div style="font-size: 32px; margin-bottom: 12px;">🗑️</div>
                        <div>Удаление процессов...</div>
                        <div style="margin-top: 12px; font-size: 14px;">
                            Удалено: ${deletedCount} из ${deletedProcesses.length}
                        </div>
                    </div>
                `;
            }

            console.log(`✅ Удалено процессов: ${deletedCount}, узлов: ${totalNodesDeleted}`);

            // Показываем успех
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #10b981;">
                    <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                    <div style="font-size: 16px; font-weight: 500;">Очистка завершена</div>
                    <div style="font-size: 14px; margin-top: 8px; color: #6b7280;">
                        Удалено процессов: ${deletedCount}<br>
                        Удалено узлов: ${totalNodesDeleted}
                    </div>
                </div>
            `;

            setTimeout(() => {
                this.loadProcessList();
            }, 2000);

        } catch (error) {
            console.error('❌ Ошибка очистки процессов:', error);

            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
                    <div style="font-size: 16px; font-weight: 500;">Ошибка очистки</div>
                    <div style="font-size: 14px; margin-top: 8px;">${error.message || error}</div>
                </div>
            `;

            setTimeout(() => {
                this.loadProcessList();
            }, 2000);
        }
    }
};

console.log('✅ ProcessManager component loaded');
