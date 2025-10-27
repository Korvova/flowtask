<?php
require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

\Bitrix\Main\Loader::includeModule('pull');
\Bitrix\Main\UI\Extension::load('pull.client');
\CJSCore::Init(['pull']);

global $USER;
$userId = $USER->GetID();

// Подписываем пользователя на тег
\CPullWatch::Add($userId, 'TELEGSARFLOW_TEST');

// Если POST - отправляем событие
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    \Bitrix\Pull\Event::add($userId, [
        'module_id' => 'main',  // Используем стандартный модуль main
        'command' => 'test_message',
        'params' => [
            'text' => 'Сообщение через модуль main',
            'time' => date('H:i:s')
        ]
    ]);
    
    echo json_encode(['success' => true]);
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Простой тест PULL</title>
    <?php $APPLICATION->ShowHead(); ?>
</head>
<body>
    <h1>Простой тест PULL через модуль main</h1>
    <button onclick="send()">Отправить событие</button>
    <div id="log"></div>

    <script>
    function log(msg) {
        document.getElementById('log').innerHTML += '<div>' + new Date().toLocaleTimeString() + ': ' + msg + '</div>';
    }

    function send() {
        fetch('', {method: 'POST'})
            .then(r => r.json())
            .then(data => log('✅ Событие отправлено'));
    }

    BX.ready(function() {
        BX.PULL.start();
        log('BX.PULL запущен');

        // Слушаем ВСЕ события
        BX.addCustomEvent("onPullEvent", function(moduleId, command, params) {
            log('📬 onPullEvent: ' + moduleId + ' / ' + command + ' / ' + JSON.stringify(params));
        });

        // Слушаем события модуля main
        BX.addCustomEvent("onPullEvent-main", function(command, params) {
            log('📬 onPullEvent-main: ' + command + ' / ' + JSON.stringify(params));
        });

        log('Подписка установлена');
    });
    </script>
</body>
</html>
