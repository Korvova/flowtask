<?php
// Включаем пролог Bitrix
define("NO_KEEP_STATISTIC", true);
define("NO_AGENT_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);
define('PUBLIC_AJAX_MODE', true);

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

// Проверяем подключение модуля Push & Pull
if (!\Bitrix\Main\Loader::includeModule('pull')) {
    die('{"status":"error", "message":"Модуль Push & Pull не установлен."}');
}

// Подключаем необходимые расширения для работы Pull
\Bitrix\Main\UI\Extension::load('pull.client');
CJSCore::Init();
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Процессы - Flowtask</title>
    <?php $APPLICATION->ShowHead(); ?>
    <script src="//api.bitrix24.com/api/v1/"></script>

    <script src="assets/js/react.min.js"></script>
    <script src="assets/js/react-dom.min.js"></script>
    <script src="assets/js/reactflow.min.js"></script>
    <link rel="stylesheet" href="assets/css/reactflow.css">
    <link rel="stylesheet" href="assets/css/main.css">
</head>
<body>
    <div id="root">
        <div class="loading">⏳ Загрузка...</div>
    </div>

    <!-- НОВАЯ АРХИТЕКТУРА - Одна таблица -->
    <script src="components/EntityManagerV2.js?v=<?= time() ?>"></script>
    <script src="components/TaskHandler.js?v=<?= time() ?>"></script>
    <script src="components/TaskModalV2.js?v=<?= time() ?>"></script>
    <script src="components/FlowCanvasV2.js?v=<?= time() ?>"></script>

    <!-- Компоненты, используемые обеими версиями -->
    <script src="components/StatusColors.js?v=<?= time() ?>"></script>
    <script src="components/PullSubscription.js?v=<?= time() ?>"></script>

    <!-- Старая архитектура (временно, для совместимости) -->
    <script src="components/EntityManager.js?v=<?= time() ?>"></script>
    <script src="components/TaskCreator.js?v=<?= time() ?>"></script>
    <script src="components/TaskNode.js?v=<?= time() ?>"></script>
    <script src="components/TaskModal.js?v=<?= time() ?>"></script>
    <script src="components/FlowCanvas.js?v=<?= time() ?>"></script>

    <script>
        function showInstallPage() {
            document.getElementById("root").innerHTML = `
                <div style="max-width: 800px; margin: 50px auto; padding: 40px; background: white; border-radius: 15px;">
                    <h1>🚀 Flowtask</h1>
                    <p>Приложение установлено! Откройте любую задачу и найдите вкладку "Процессы".</p>
                </div>
            `;
            BX24.fitWindow();
        }

        BX24.init(function() {
            console.log('🚀 Flowtask');

            const placement = BX24.placement.info();

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

            // Инициализируем BX.PULL если доступен
            if (typeof BX !== 'undefined' && typeof BX.PULL !== 'undefined') {
                BX.PULL.start();
                console.log('✅ Real-time обновления активированы');
            }

            // Подписываемся на событие обновления ЛЮБОЙ задачи
            BX24.callBind('ONTASKUPDATE', function(data) {
                console.log('📨 ONTASKUPDATE событие:', data);

                // Получаем ID измененной задачи
                if (data && data.TASK_ID) {
                    const changedTaskId = parseInt(data.TASK_ID);
                    console.log('🔄 Задача обновлена:', changedTaskId);

                    // Загружаем актуальные данные задачи
                    BX24.callMethod('tasks.task.get', { taskId: changedTaskId }, function(result) {
                        if (!result.error()) {
                            const task = result.data().task;
                            const newStatus = parseInt(task.status || task.STATUS);

                            console.log('📊 Новый статус задачи', changedTaskId, ':', newStatus);

                            // Обновляем статус на canvas (для ЛЮБОЙ задачи на полотне)
                            if (window.FlowCanvasV2 && window.FlowCanvasV2.updateSingleTaskStatus) {
                                window.FlowCanvasV2.updateSingleTaskStatus(changedTaskId, newStatus);
                            }

                            // Если это текущая задача И она завершена - создаем предзадачи
                            if (changedTaskId === taskId && newStatus === 5) {
                                console.log('✅ Текущая задача завершена! Запускаем обработчик предзадач...');

                                if (window.TaskHandler && window.TaskHandler.handleTaskComplete) {
                                    window.TaskHandler.handleTaskComplete(taskId, window.currentProcessId);
                                }
                            }
                        }
                    });
                }
            }, false);
            console.log('✅ Подписка на ONTASKUPDATE активирована (для всех задач)');

            BX24.callMethod("tasks.task.get", { taskId: taskId }, function(result) {
                if (result.error()) {
                    console.error('❌ Ошибка загрузки задачи:', result.error());
                    document.getElementById("root").innerHTML =
                        "<div class=\"loading\">❌ Ошибка загрузки задачи</div>";
                    return;
                }

                const task = result.data().task;
                console.log('✅ Задача загружена:', task.id, task.title);

                const processId = task.ufFlowtaskProcessId || task.id;
                console.log('📋 Process ID:', processId);

                // Используем НОВУЮ АРХИТЕКТУРУ V2
                if (typeof window.FlowCanvasV2 !== "undefined") {
                    window.currentProcessId = processId;
                    window.currentTaskId = task.id;
                    window.FlowCanvasV2.render();
                    console.log('✅ Используем FlowCanvasV2 (новая архитектура)');
                } else if (typeof window.FlowCanvas !== "undefined") {
                    // Fallback на старую версию
                    window.FlowCanvas.render(task);
                    console.log('⚠️ Используем FlowCanvas (старая архитектура)');
                } else {
                    console.error("❌ FlowCanvas not loaded");
                }
            });

            // Увеличиваем высоту iframe
            setTimeout(() => {
                BX24.resizeWindow(window.innerWidth, Math.max(window.innerHeight, 1200));
            }, 500);
        });
    </script>
</body>
</html>
