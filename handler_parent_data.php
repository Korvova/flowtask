<?php
/**
 * Telegsarflow - Получение данных из родительского окна
 */
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Процессы Telegsarflow</title>
    <script src="//api.bitrix24.com/api/v1/"></script>

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 20px;
            background: #f5f7fa;
        }

        .debug-panel {
            background: #1e293b;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #3b82f6;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            max-height: 600px;
            overflow: auto;
        }

        .debug-panel strong {
            color: #60a5fa;
            font-size: 13px;
        }

        .debug-panel pre {
            color: #cbd5e1 !important;
            background: #0f172a !important;
            padding: 10px;
            margin: 5px 0;
            border-radius: 4px;
            overflow: auto;
        }

        .section {
            margin: 15px 0;
            padding: 10px;
            background: #334155;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="debug-panel">
        <strong>🔍 Поиск данных задачи в родительском окне</strong>
        <div id="debugLog"></div>
    </div>

    <script>
        const debugLogs = [];

        function addLog(title, data) {
            const html = `
                <div class="section">
                    <strong>${title}:</strong>
                    <pre>${typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}</pre>
                </div>
            `;
            debugLogs.push(html);
            document.getElementById('debugLog').innerHTML = debugLogs.join('');
            console.log(title, data);
        }

        BX24.init(function() {
            addLog('✅ BX24 инициализирован', 'OK');

            const placement = BX24.placement.info();
            const taskId = placement?.options?.taskId;
            addLog('📋 Task ID', taskId);

            // Пробуем получить доступ к родительскому окну
            try {
                const parentWindow = window.parent;
                addLog('🪟 Parent window доступен', parentWindow ? 'Да' : 'Нет');

                if (parentWindow && parentWindow !== window) {
                    // Ищем BX в родительском окне
                    if (parentWindow.BX) {
                        addLog('✅ Parent BX найден', 'OK');

                        // Ищем данные задачи в разных местах
                        const searches = [
                            { name: 'BX.Tasks', path: () => parentWindow.BX.Tasks },
                            { name: 'BX.Tasks.task', path: () => parentWindow.BX.Tasks?.task },
                            { name: 'BX.Tasks.Manager', path: () => parentWindow.BX.Tasks?.Manager },
                            { name: 'BX.Tasks.Manager.task', path: () => parentWindow.BX.Tasks?.Manager?.task },
                            { name: 'BX.Tasks.tasksData', path: () => parentWindow.BX.Tasks?.tasksData },
                            { name: 'window.tasksData', path: () => parentWindow.tasksData },
                            { name: 'window.taskData', path: () => parentWindow.taskData },
                        ];

                        searches.forEach(search => {
                            try {
                                const result = search.path();
                                if (result) {
                                    addLog(`✅ ${search.name} найден`, result);

                                    // Если это объект, смотрим его ключи
                                    if (typeof result === 'object' && result !== null) {
                                        addLog(`   Ключи ${search.name}`, Object.keys(result));

                                        // Ищем данные текущей задачи
                                        if (result[taskId]) {
                                            addLog(`🎯 НАЙДЕНА ЗАДАЧА ${taskId}`, result[taskId]);
                                        }
                                    }
                                } else {
                                    addLog(`⚠️ ${search.name}`, 'undefined');
                                }
                            } catch (e) {
                                addLog(`❌ ${search.name} ошибка`, e.message);
                            }
                        });

                        // Ищем элементы DOM с данными задачи
                        try {
                            const taskElements = parentWindow.document.querySelectorAll('[data-task-id="' + taskId + '"]');
                            addLog('🔍 Элементы с data-task-id', taskElements.length + ' найдено');

                            if (taskElements.length > 0) {
                                taskElements.forEach((el, i) => {
                                    addLog(`Элемент ${i}`, {
                                        tagName: el.tagName,
                                        className: el.className,
                                        attributes: Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(', ')
                                    });
                                });
                            }
                        } catch (e) {
                            addLog('❌ Поиск DOM элементов', e.message);
                        }

                        // Ищем кнопки задачи
                        try {
                            const buttons = parentWindow.document.querySelectorAll('[data-bx-id="task-view-b-button"]');
                            addLog('🔍 Кнопки задачи', buttons.length + ' найдено');

                            buttons.forEach((btn, i) => {
                                addLog(`Кнопка ${i}`, {
                                    action: btn.getAttribute('data-action'),
                                    text: btn.textContent.trim(),
                                    classes: btn.className
                                });
                            });
                        } catch (e) {
                            addLog('❌ Поиск кнопок', e.message);
                        }

                        // Ищем заголовок задачи в DOM
                        try {
                            const titleSelectors = [
                                '.task-title',
                                '.task-detail-title',
                                '[data-bx-id="task-title"]',
                                '.pagetitle'
                            ];

                            titleSelectors.forEach(selector => {
                                const el = parentWindow.document.querySelector(selector);
                                if (el) {
                                    addLog(`✅ Заголовок (${selector})`, el.textContent.trim());
                                }
                            });
                        } catch (e) {
                            addLog('❌ Поиск заголовка', e.message);
                        }

                    } else {
                        addLog('❌ Parent BX не найден', 'Нет доступа к BX в родительском окне');
                    }
                }
            } catch (e) {
                addLog('❌ Ошибка доступа к parent', e.message);
            }

            BX24.fitWindow();
        });
    </script>
</body>
</html>
