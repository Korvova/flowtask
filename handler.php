<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Процессы - Telegsarflow</title>
    <script src="//api.bitrix24.com/api/v1/"></script>

    <script src="assets/js/react.min.js"></script>
    <script src="assets/js/react-dom.min.js"></script>
    <script src="assets/js/reactflow.min.js"></script>
    <link rel="stylesheet" href="assets/css/reactflow.css">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 20px;
            background: #f5f7fa;
        }
        #root { width: 100%; height: 100vh; }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-size: 24px;
            color: #666;
        }
        #debugPanel {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
        }
        #debugPanel button {
            padding: 10px 15px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-left: 5px;
        }
        #debugPanel button:hover {
            background: #5568d3;
        }
        #debugModal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            align-items: center;
            justify-content: center;
        }
        #debugModal.show {
            display: flex;
        }
        .debug-content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .debug-result {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 12px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">⏳ Загрузка...</div>
    </div>

    <!-- Debug Panel -->
    <div id="debugPanel">
        <button onclick="showDebugModal()">🔍 Debug Entity</button>
    </div>

    <!-- Debug Modal -->
    <div id="debugModal">
        <div class="debug-content">
            <h2>🔍 Отладка Entity</h2>
            <div>
                <button onclick="listAllEntities()">1. Список Entity</button>
                <button onclick="testAddPosition()">2. Добавить позицию</button>
                <button onclick="testGetPosition()">3. Получить позицию</button>
                <button onclick="checkEntityProperties()" style="background: #fd7e14;">🔬 Проверить свойства</button>
                <button onclick="showEntityDetails()" style="background: #17a2b8;">🔬 Детали Entity</button>
                <button onclick="checkFutureTasksDebug()" style="background: #6f42c1;">📋 Проверить предзадачи</button>
                <button onclick="createAllEntities()" style="background: #28a745;">➕ Создать Entity</button>
                <button onclick="deleteOldEntities()" style="background: #dc3545;">🗑️ Удалить старые</button>
                <button onclick="hideDebugModal()" style="background: #ccc; color: #333;">Закрыть</button>
            </div>
            <div id="debugResult" class="debug-result">Нажмите кнопку для проверки...</div>
        </div>
    </div>

    <script src="components/StatusColors.js?v=1761564465"></script>
    <script src="components/PullSubscription.js?v=1761564465"></script>
    <script src="components/TaskCreator.js?v=1761564465"></script>
    <script src="components/TaskNode.js?v=1761564465"></script>
    <script src="components/TaskModal.js?v=1761564465"></script>
    <script src="components/FlowCanvas.js?v=1761564465"></script>

    <script>
        // Debug functions
        function showDebugModal() {
            document.getElementById("debugModal").classList.add("show");
        }

        function hideDebugModal() {
            document.getElementById("debugModal").classList.remove("show");
        }

        function debugLog(message) {
            const result = document.getElementById("debugResult");
            result.textContent += message + "\n";
            console.log(message);
        }

        function clearDebugLog() {
            document.getElementById("debugResult").textContent = "";
        }

        function listAllEntities() {
            clearDebugLog();
            debugLog("📋 Получение списка всех Entity...\n");

            BX24.callMethod("entity.get", {}, function(result) {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + JSON.stringify(result.error(), null, 2));
                } else {
                    const entities = result.data();
                    debugLog("✅ Найдено Entity: " + entities.length + "\n");

                    entities.forEach((entity, index) => {
                        debugLog("━━━━━━━━━━━━━━━━━━━━");
                        debugLog((index + 1) + ". ENTITY: " + entity.ENTITY);
                        debugLog("   NAME: " + entity.NAME);
                    });

                    if (entities.length === 0) {
                        debugLog("\n⚠️ Entity НЕ НАЙДЕНЫ!");
                        debugLog("Нужно переустановить приложение!");
                    }
                }
            });
        }

        function testAddPosition() {
            clearDebugLog();
            debugLog("➕ Тест добавления позиции...\n");

            BX24.callMethod("entity.item.add", {
                ENTITY: "tflow_task_pos",
                NAME: "Test position for task 99",
                PROPERTY_VALUES: {
                    taskId: "99",
                    positionX: "300",
                    positionY: "200"
                }
            }, function(result) {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + JSON.stringify(result.error(), null, 2));
                } else {
                    debugLog("✅ Позиция добавлена!");
                    debugLog("ID: " + result.data());
                }
            });
        }

        function testGetPosition() {
            clearDebugLog();
            debugLog("🔍 Тест получения позиции...\n");

            BX24.callMethod("entity.item.get", {
                ENTITY: "tflow_task_pos",
                FILTER: {
                    PROPERTY_taskId: "99"
                }
            }, function(result) {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + JSON.stringify(result.error(), null, 2));
                } else {
                    const items = result.data();
                    debugLog("✅ Найдено: " + items.length + "\n");

                    items.forEach((item, index) => {
                        debugLog((index + 1) + ". ID: " + item.ID);
                        if (item.PROPERTY_VALUES) {
                        debugLog("   taskId: " + item.PROPERTY_VALUES.taskId);
                        debugLog("   positionX: " + item.PROPERTY_VALUES.positionX);
                        debugLog("   positionY: " + item.PROPERTY_VALUES.positionY);
                    } else {
                        debugLog("   (нет свойств)");
                    }
                    });
                }
            });
        }


        function createAllEntities() {
            clearDebugLog();
            debugLog("🔧 Создаём Entity с короткими именами...\n");

            const entities = [
                {
                    ENTITY: "tflow_pos",
                    NAME: "Task Pos",
                    PROPERTY: {
                        taskId: { NAME: "Task ID", TYPE: "S" },
                        positionX: { NAME: "Position X", TYPE: "N" },
                        positionY: { NAME: "Position Y", TYPE: "N" }
                    }
                },
                {
                    ENTITY: "tflow_future",
                    NAME: "Future Tasks",
                    PROPERTY: {
                        futureId: { NAME: "Future ID", TYPE: "S" },
                        title: { NAME: "Title", TYPE: "S" },
                        description: { NAME: "Description", TYPE: "S" },
                        groupId: { NAME: "Group ID", TYPE: "S" },
                        responsibleId: { NAME: "Responsible ID", TYPE: "S" },
                        conditionType: { NAME: "Condition Type", TYPE: "S" },
                        delayMinutes: { NAME: "Delay Minutes", TYPE: "N" },
                        positionX: { NAME: "Position X", TYPE: "N" },
                        positionY: { NAME: "Position Y", TYPE: "N" },
                        isCreated: { NAME: "Is Created", TYPE: "S" },
                        realTaskId: { NAME: "Real Task ID", TYPE: "S" }
                    }
                },
                {
                    ENTITY: "tflow_conn",
                    NAME: "Connections",
                    PROPERTY: {
                        sourceId: { NAME: "Source ID", TYPE: "S" },
                        targetId: { NAME: "Target ID", TYPE: "S" },
                        connectionType: { NAME: "Type", TYPE: "S" }
                    }
                },
                {
                    ENTITY: "tflow_tmpl",
                    NAME: "Templates",
                    PROPERTY: {
                        templateName: { NAME: "Template Name", TYPE: "S" },
                        processData: { NAME: "Process Data", TYPE: "S" },
                        createdBy: { NAME: "Created By", TYPE: "S" }
                    }
                }
            ];

            let created = 0;
            entities.forEach((entityData, index) => {
                setTimeout(() => {
                    BX24.callMethod("entity.add", {
                        ENTITY: entityData.ENTITY,
                        NAME: entityData.NAME,
                        PROPERTY: entityData.PROPERTY,
                        ACCESS: { X: {} }
                    }, (result) => {
                        if (result.error()) {
                            debugLog("❌ " + entityData.ENTITY + ": " + result.error());
                        } else {
                            debugLog("✅ " + entityData.ENTITY + " создан");
                            created++;
                        }

                        if (index === entities.length - 1) {
                            setTimeout(() => {
                                debugLog("\n🎉 Создано " + created + " из " + entities.length + " entity");
                            }, 500);
                        }
                    });
                }, index * 500);
            });
        }

        function deleteOldEntities() {
            clearDebugLog();
            debugLog("🗑️ Удаление старых Entity (telegsarflow_*)...\n");

            BX24.callMethod("entity.get", {}, (result) => {
                if (result.error()) {
                    debugLog("❌ Ошибка: " + result.error());
                    return;
                }

                const entities = result.data();
                const toDelete = entities.filter(e => e.ENTITY.startsWith("telegsarflow_"));

                debugLog("Найдено " + toDelete.length + " старых entity\n");

                if (toDelete.length === 0) {
                    debugLog("✅ Старых entity не найдено");
                    return;
                }

                toDelete.forEach((e, index) => {
                    setTimeout(() => {
                        BX24.callMethod("entity.delete", {
                            ENTITY: e.ENTITY
                        }, (delResult) => {
                            if (delResult.error()) {
                                debugLog("❌ " + e.ENTITY + ": " + delResult.error());
                            } else {
                                debugLog("✅ Удалён: " + e.ENTITY);
                            }
                        });
                    }, index * 300);
                });
            });
        }
        // Main app initialization
        // Глобальные debug функции (должны быть вне showInstallPage)
        function checkFutureTasksDebug() {
        const output = document.getElementById('debugOutput');
        output.innerHTML = '<div class="loading">Загрузка предзадач...</div>';

        // Get current task ID
        const urlParams = new URLSearchParams(window.location.search);
        const taskId = urlParams.get('task_id');

        if (!taskId) {
            output.innerHTML = '<div style="color: red;">❌ Не найден task_id в URL</div>';
            return;
        }

        output.innerHTML += '<div>🔍 Проверяем предзадачи для задачи #' + taskId + '</div>';

        BX24.callMethod('entity.item.get', {
            ENTITY: 'tflow_future'
        }, (result) => {
            if (result.error()) {
                output.innerHTML = '<div style="color: red;">❌ Ошибка: ' + JSON.stringify(result.error()) + '</div>';
                return;
            }

            const items = result.data();
            let html = '<h3>📋 Предзадачи для задачи #' + taskId + '</h3>';
            html += '<div>Всего предзадач в Entity: ' + items.length + '</div><hr>';

            let foundCount = 0;
            items.forEach(item => {
                if (!item.DETAIL_TEXT) return;

                try {
                    const data = JSON.parse(item.DETAIL_TEXT);
                    if (data.parentTaskId == taskId) {
                        foundCount++;
                        html += '<div style="border: 2px solid #667eea; padding: 15px; margin: 10px 0; border-radius: 8px;">';
                        html += '<h4 style="color: #667eea; margin: 0 0 10px 0;">Предзадача #' + item.ID + '</h4>';
                        html += '<div><strong>Future ID:</strong> ' + data.futureId + '</div>';
                        html += '<div><strong>Название:</strong> ' + data.title + '</div>';
                        html += '<div><strong>Родитель:</strong> task-' + data.parentTaskId + '</div>';

                        const isCreated = data.isCreated || false;
                        const createdStyle = isCreated ? 'color: green; font-weight: bold;' : 'color: orange;';
                        html += '<div style="' + createdStyle + '"><strong>⭐ isCreated:</strong> ' + (isCreated ? 'true ✅' : 'false ⚠️') + '</div>';

                        const realTaskId = data.realTaskId || 'не установлен';
                        const taskStyle = (realTaskId !== 'не установлен') ? 'color: green; font-weight: bold;' : 'color: orange;';
                        html += '<div style="' + taskStyle + '"><strong>⭐ realTaskId:</strong> ' + realTaskId + '</div>';

                        html += '<div><strong>Позиция:</strong> (' + data.positionX + ', ' + data.positionY + ')</div>';
                        html += '<div><strong>Условие:</strong> ' + data.conditionType + '</div>';
                        html += '<div><strong>Ответственный:</strong> ' + data.responsibleId + '</div>';
                        if (data.groupId) {
                            html += '<div><strong>Группа:</strong> ' + data.groupId + '</div>';
                        }
                        html += '</div>';
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            });

            if (foundCount === 0) {
                html += '<div style="color: orange; padding: 20px; border: 2px dashed orange; border-radius: 8px;">⚠️ Не найдено предзадач для задачи #' + taskId + '</div>';
            } else {
                html += '<div style="color: green; padding: 15px; background: #d4edda; border-radius: 8px; margin-top: 20px;">✅ Найдено предзадач: ' + foundCount + '</div>';
            }

            // Also check connections
            html += '<hr><h3>🔗 Связи</h3>';
            BX24.callMethod('entity.item.get', {
                ENTITY: 'tflow_conn'
            }, (connResult) => {
                if (connResult.error()) {
                    html += '<div style="color: red;">❌ Ошибка загрузки связей</div>';
                    output.innerHTML = html;
                    return;
                }

                const connections = connResult.data();
                html += '<div>Всего связей в Entity: ' + connections.length + '</div>';

                let connCount = 0;
                connections.forEach(conn => {
                    if (!conn.DETAIL_TEXT) return;

                    try {
                        const data = JSON.parse(conn.DETAIL_TEXT);
                        if (data.sourceId.includes(taskId) || data.targetId.includes(taskId) ||
                            data.sourceId.includes('future-') || data.targetId.includes('future-')) {
                            connCount++;
                            html += '<div style="border-left: 4px solid #17a2b8; padding: 10px; margin: 8px 0; background: #f8f9fa;">';
                            html += '<div><strong>ID:</strong> ' + conn.ID + '</div>';
                            html += '<div><strong>Источник:</strong> ' + data.sourceId + '</div>';
                            html += '<div><strong>→ Цель:</strong> ' + data.targetId + '</div>';
                            html += '<div><strong>Тип:</strong> ' + data.connectionType + '</div>';
                            html += '</div>';
                        }
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                });

                if (connCount === 0) {
                    html += '<div style="color: orange; padding: 15px; margin-top: 10px;">⚠️ Не найдено связей</div>';
                } else {
                    html += '<div style="color: green; padding: 15px; background: #d4edda; border-radius: 8px; margin-top: 10px;">✅ Найдено связей: ' + connCount + '</div>';
                }

                output.innerHTML = html;
            });
        });
    }

        function showEntityDetails() {
            clearDebugLog();
            debugLog("🔍 Детали Entity tflow_task_pos...\n");

            BX24.callMethod("entity.get", {
                ENTITY: "tflow_task_pos"
            }, function(result) {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + result.error());
                } else {
                    const entity = result.data();
                    debugLog("✅ Entity найден:\n");
                    debugLog(JSON.stringify(entity, null, 2));
                }
            });
        }

        function showInstallPage() {
            document.getElementById("root").innerHTML = `
                <div style="max-width: 800px; margin: 50px auto; padding: 40px; background: white; border-radius: 15px;">
                    <h1>🚀 Telegsarflow</h1>
                    <p>Приложение установлено!</p>
                </div>
            `;
            BX24.fitWindow();
        }

        BX24.init(function() {
            console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-size: 16px;');
            console.log('%c🚀 FLOWTASK ЗАГРУЖЕН! Версия: v=1761564465', 'color: #00ff00; font-size: 20px; font-weight: bold;');
            console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-size: 16px;');

            const placement = BX24.placement.info();
            console.log('%c📍 Placement Info:', 'color: #2196f3; font-weight: bold;', placement);

            if (placement?.placement === "DEFAULT") {
                showInstallPage();
                return;
            }

            const taskId = placement?.options?.taskId || placement?.options?.ID;

            if (!taskId) {
                document.getElementById("root").innerHTML =
                    "<div class=\"loading\">❌ Не удалось определить ID задачи</div>";
                return;
            }

            if (typeof BX !== "undefined" && typeof BX.PULL !== "undefined") {
                console.log("✅ BX.PULL доступен");
                BX.PULL.start();
            }

            BX24.callMethod("tasks.task.get", { taskId: taskId }, function(result) {
                if (result.error()) {
                    console.error('%c❌ ОШИБКА загрузки задачи:', 'color: #f44336; font-weight: bold;', result.error());
                    document.getElementById("root").innerHTML =
                        "<div class=\"loading\">❌ Ошибка загрузки задачи</div>";
                    return;
                }

                const task = result.data().task;
                console.log('%c✅ Задача загружена:', 'color: #4caf50; font-weight: bold;', task);
                console.log('%c  • ID:', 'color: #2196f3;', task.id);
                console.log('%c  • Название:', 'color: #2196f3;', task.title);
                console.log('%c  • Статус:', 'color: #2196f3;', task.status);

                if (typeof window.FlowCanvas !== "undefined") {
                    window.FlowCanvas.render(task);
                } else {
                    console.error("FlowCanvas not loaded");
                }
            });

            BX24.fitWindow();
        });
    </script>
</body>
</html>
