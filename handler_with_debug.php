<?php
define("NO_KEEP_STATISTIC", true);
define("NO_AGENT_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);
define("PUBLIC_AJAX_MODE", true);

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

\Bitrix\Main\Loader::includeModule("pull");
\Bitrix\Main\UI\Extension::load("pull.client");
\CJSCore::Init();

global $APPLICATION;
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Процессы - Telegsarflow</title>
    <?php $APPLICATION->ShowHead(); ?>
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
                <button onclick="hideDebugModal()" style="background: #ccc; color: #333;">Закрыть</button>
            </div>
            <div id="debugResult" class="debug-result">Нажмите кнопку для проверки...</div>
        </div>
    </div>

    <script src="components/StatusColors.js?v=1761500849"></script>
    <script src="components/TaskNode.js?v=1761502675"></script>
    <script src="components/TaskModal.js?v=1761503688"></script>
    <script src="components/FlowCanvas.js?v=1761503688"></script>

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
                ENTITY: "telegsarflow_task_positions",
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
                ENTITY: "telegsarflow_task_positions",
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
                        debugLog("   " + JSON.stringify(item.PROPERTY_VALUES, null, 2));
                    });
                }
            });
        }

        // Main app initialization
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
            console.log("✅ Telegsarflow initialized");

            const placement = BX24.placement.info();
            console.log("Placement:", placement);

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
                    console.error("Error:", result.error());
                    document.getElementById("root").innerHTML =
                        "<div class=\"loading\">❌ Ошибка загрузки задачи</div>";
                    return;
                }

                const task = result.data().task;
                console.log("Task loaded:", task);

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
<?php
\CMain::FinalActions();
?>
