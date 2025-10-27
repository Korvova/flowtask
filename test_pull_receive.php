<?php
define("NO_KEEP_STATISTIC", true);
define("NO_AGENT_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);
define('PUBLIC_AJAX_MODE', true);

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

\Bitrix\Main\Loader::includeModule('pull');
\Bitrix\Main\UI\Extension::load('pull.client');
\CJSCore::Init();

global $APPLICATION;
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Тест Pull & Push</title>
    <?php $APPLICATION->ShowHead(); ?>
    <style>
        body { font-family: Arial; padding: 20px; }
        #log { border: 1px solid #ccc; padding: 10px; height: 400px; overflow-y: scroll; background: #f5f5f5; }
        .event { padding: 5px; margin: 5px 0; background: white; border-left: 3px solid #4CAF50; }
    </style>
</head>
<body>
    <h1>🔔 Тест Pull & Push для Telegsarflow</h1>
    <p>Эта страница подписана на события telegsarflow. Измените статус задачи ID 22 и смотрите события здесь.</p>
    <div id="log"></div>

    <script>
        const log = document.getElementById('log');
        
        function addLog(message, data) {
            const time = new Date().toLocaleTimeString();
            const div = document.createElement('div');
            div.className = 'event';
            div.innerHTML = '<strong>' + time + ':</strong> ' + message + '<br><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            log.appendChild(div);
            log.scrollTop = log.scrollHeight;
        }

        window.addEventListener('load', function() {
            addLog('Страница загружена', {});

            if (typeof BX === 'undefined') {
                addLog('❌ BX недоступен', {});
                return;
            }

            if (typeof BX.PULL === 'undefined') {
                addLog('❌ BX.PULL недоступен', {});
                return;
            }

            addLog('✅ BX.PULL доступен', {});

            // Инициализируем Pull
            try {
                BX.PULL.start();
                addLog('✅ BX.PULL.start() вызван', {});
            } catch(e) {
                addLog('❌ Ошибка BX.PULL.start()', { error: e.message });
            }

            // Подписываемся на наш модуль
            try {
                BX.PULL.subscribe({
                    moduleId: 'telegsarflow',
                    command: 'task_status_changed',
                    callback: function(params) {
                        addLog('📢 Получено событие task_status_changed', params);
                    }
                });
                addLog('✅ Подписка установлена', { moduleId: 'telegsarflow', command: 'task_status_changed' });
            } catch(e) {
                addLog('❌ Ошибка подписки', { error: e.message });
            }

            // Также подписка на все события Pull для отладки
            if (typeof BX.addCustomEvent !== 'undefined') {
                BX.addCustomEvent('onPullEvent', function(moduleId, command, params) {
                    addLog('📢 onPullEvent: ' + moduleId + ' / ' + command, params);
                });
                addLog('✅ Подписка на onPullEvent установлена', {});
            }
        });
    </script>
</body>
</html>
