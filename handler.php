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

    <script src="components/StatusColors.js?v=<?= time() ?>"></script>
    <script src="components/PullSubscription.js?v=<?= time() ?>"></script>
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

            BX24.callMethod("tasks.task.get", { taskId: taskId }, function(result) {
                if (result.error()) {
                    console.error('❌ Ошибка загрузки задачи:', result.error());
                    document.getElementById("root").innerHTML =
                        "<div class=\"loading\">❌ Ошибка загрузки задачи</div>";
                    return;
                }

                const task = result.data().task;
                console.log('✅ Задача загружена:', task.id, task.title);

                if (typeof window.FlowCanvas !== "undefined") {
                    window.FlowCanvas.render(task);
                } else {
                    console.error("FlowCanvas not loaded");
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
