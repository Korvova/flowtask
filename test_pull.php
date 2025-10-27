<?php
/**
 * Тестовая страница для проверки PULL механизма
 */

define("NO_KEEP_STATISTIC", true);
define("NO_AGENT_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

use Bitrix\Main\Loader;
use Bitrix\Pull\Event;

// Подключаем расширения Pull
if (Loader::includeModule('pull')) {
    \Bitrix\Main\UI\Extension::load('pull.client');
    \CJSCore::Init(['pull']);
    
    // ВАЖНО: Подписываем пользователя на события нашего модуля!
    global $USER;
    $userId = (int)$USER->GetID();
    if ($userId > 0) {
        \CPullWatch::Add($userId, 'TELEGSARFLOW_EVENTS');
    }
}

// Если POST запрос - отправляем событие
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    if (!Loader::includeModule('pull')) {
        echo json_encode(['success' => false, 'error' => 'Модуль Pull не установлен']);
        exit;
    }
    
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    $userId = $data['userId'] ?? 1; // По умолчанию пользователь 1
    $taskId = $data['taskId'] ?? 3;
    $status = $data['status'] ?? 5;
    
    // Отправляем PULL событие
    Event::add($userId, [
        'module_id' => 'telegsarflow',
        'command' => 'task_status_changed',
        'params' => [
            'TASK_ID' => (int)$taskId,
            'STATUS' => (int)$status,
            'test' => true,
            'time' => time()
        ]
    ]);
    
    echo json_encode([
        'success' => true, 
        'message' => 'PULL событие отправлено',
        'userId' => $userId,
        'taskId' => $taskId,
        'status' => $status
    ]);
    exit;
}

global $USER;
$currentUserId = $USER->GetID();
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Тест PULL</title>
    <?php $APPLICATION->ShowHead(); ?>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .status {
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
        }
        .event {
            padding: 10px;
            margin: 10px 0;
            background: #f0f0f0;
            border-radius: 5px;
            font-family: monospace;
        }
        button {
            padding: 10px 20px;
            margin: 5px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            color: white;
        }
        .btn-send { background: #4CAF50; }
        .btn-check { background: #2196F3; }
        .btn-clear { background: #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Тест PULL механизма</h1>
        
        <div class="status">
            <strong>Текущий пользователь:</strong> ID = <?php echo $currentUserId; ?><br>
            <strong>Модуль Pull:</strong> <?php echo Loader::includeModule('pull') ? '✅ Загружен' : '❌ Не загружен'; ?>
        </div>

        <h3>Кнопки управления:</h3>
        <button class="btn-send" onclick="sendPullEvent()">📤 Отправить PULL событие</button>
        <button class="btn-check" onclick="checkBXPull()">🔍 Проверить BX.PULL</button>
        <button class="btn-clear" onclick="clearLog()">🗑️ Очистить лог</button>

        <h3>Лог событий:</h3>
        <div id="log"></div>
    </div>

    <script>
        function log(message, isError = false) {
            const logDiv = document.getElementById('log');
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event';
            eventDiv.style.borderLeft = isError ? '4px solid #f44336' : '4px solid #4CAF50';
            eventDiv.textContent = new Date().toLocaleTimeString() + ' | ' + message;
            logDiv.insertBefore(eventDiv, logDiv.firstChild);
        }

        function clearLog() {
            document.getElementById('log').innerHTML = '';
        }

        function sendPullEvent() {
            const userId = <?php echo $currentUserId; ?>;
            const taskId = 3;
            const status = 5; // Завершена
            
            log('Отправляю PULL событие для пользователя ' + userId + ', задача ' + taskId + ', статус ' + status);
            
            fetch('', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({userId, taskId, status})
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    log('✅ PULL событие отправлено: ' + JSON.stringify(data));
                } else {
                    log('❌ Ошибка: ' + data.error, true);
                }
            })
            .catch(err => {
                log('❌ Ошибка отправки: ' + err.message, true);
            });
        }

        function checkBXPull() {
            log('Проверяю доступность BX и BX.PULL...');
            
            if (typeof BX === 'undefined') {
                log('❌ BX не определён', true);
                return;
            }
            log('✅ BX определён');
            
            if (typeof BX.PULL === 'undefined') {
                log('❌ BX.PULL не определён', true);
                return;
            }
            log('✅ BX.PULL определён');
            
            if (typeof BX.PULL.start === 'function') {
                log('✅ BX.PULL.start() доступен');
                try {
                    BX.PULL.start();
                    log('✅ BX.PULL.start() выполнен');
                } catch(e) {
                    log('ℹ️ BX.PULL уже запущен: ' + e.message);
                }
            } else {
                log('❌ BX.PULL.start() недоступен', true);
            }
            
            if (typeof BX.addCustomEvent === 'function') {
                log('✅ BX.addCustomEvent() доступен');
            } else {
                log('❌ BX.addCustomEvent() недоступен', true);
            }
        }

        // Инициализация при загрузке
        window.addEventListener('load', function() {
            log('Страница загружена');
            
            // Проверяем BX
            setTimeout(checkBXPull, 500);
            
            // Инициализируем PULL
            if (typeof BX !== 'undefined' && typeof BX.ready === 'function') {
                BX.ready(function() {
                    log('BX.ready выполнен');
                    
                    if (typeof BX.PULL !== 'undefined') {
                        BX.PULL.start();
                        log('✅ BX.PULL запущен');
                    }
                    
                    // Подписываемся на ВСЕ события для отладки
                    BX.addCustomEvent("onPullEvent", function(moduleId, command, params) {
                        log('📬 onPullEvent: moduleId=' + moduleId + ', command=' + command + ', params=' + JSON.stringify(params));
                    });

                    // Подписываемся на события нашего модуля
                    BX.addCustomEvent("onPullEvent-telegsarflow", function(command, params) {
                        log('📬 onPullEvent-telegsarflow: command=' + command + ', params=' + JSON.stringify(params));
                    });

                    // Используем PULL.subscribe (новый API)
                    if (typeof BX.PULL.subscribe === 'function') {
                        BX.PULL.subscribe({
                            moduleId: 'telegsarflow',
                            command: 'task_status_changed',
                            callback: function(params, extra, command) {
                                log('📬 BX.PULL.subscribe получено! params=' + JSON.stringify(params) + ', command=' + command);
                            }
                        });
                        log('✅ BX.PULL.subscribe установлена');
                    }

                    log('✅ Подписки на события установлены');
                });
            } else {
                log('❌ BX.ready недоступен', true);
            }
        });
    </script>
</body>
</html>
