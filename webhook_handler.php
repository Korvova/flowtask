<?php
/**
 * Webhook обработчик для событий Bitrix24
 * Получает события OnTaskUpdate и отправляет их через Pull & Push
 */

define("NO_KEEP_STATISTIC", true);
define("NO_AGENT_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);
define('PUBLIC_AJAX_MODE', true);

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

// Проверяем подключение модуля Push & Pull
if (!\Bitrix\Main\Loader::includeModule('pull')) {
    die(json_encode(['status' => 'error', 'message' => 'Модуль Push & Pull не установлен']));
}

// Подключаем модуль задач
\Bitrix\Main\Loader::includeModule('tasks');

// Логирование для отладки
$logFile = $_SERVER['DOCUMENT_ROOT'] . '/telegsarflow_webhook.log';
file_put_contents($logFile, "\n" . date('Y-m-d H:i:s') . " - Webhook вызван\n", FILE_APPEND);
file_put_contents($logFile, "POST: " . print_r($_POST, true) . "\n", FILE_APPEND);

// Получаем данные события из POST
$eventData = $_POST;

// Если это событие OnTaskUpdate
if (isset($eventData['event']) && $eventData['event'] === 'ONTASKUPDATE') {
    $taskId = $eventData['data']['FIELDS_AFTER']['ID'] ?? null;

    if ($taskId) {
        file_put_contents($logFile, "Task ID: $taskId обновлена\n", FILE_APPEND);

        // Получаем полные данные задачи через API
        try {
            $task = \Bitrix\Tasks\Internals\TaskTable::getById($taskId)->fetch();
            
            if ($task) {
                $status = $task['STATUS'];
                $title = $task['TITLE'];
                
                file_put_contents($logFile, "Status: $status, Title: $title\n", FILE_APPEND);

                // Отправляем через Pull всем пользователям
                \Bitrix\Pull\Event::add(0, [
                    'module_id' => 'telegsarflow',
                    'command' => 'task_status_changed',
                    'params' => [
                        'taskId' => intval($taskId),
                        'status' => intval($status),
                        'title' => $title,
                        'timestamp' => time()
                    ]
                ]);

                file_put_contents($logFile, "✅ Pull событие отправлено: taskId=$taskId, status=$status\n", FILE_APPEND);

                echo json_encode(['status' => 'success', 'taskId' => $taskId, 'newStatus' => $status]);
            } else {
                file_put_contents($logFile, "❌ Задача не найдена\n", FILE_APPEND);
                echo json_encode(['status' => 'error', 'message' => 'Task not found']);
            }
        } catch (\Exception $e) {
            file_put_contents($logFile, "❌ Ошибка: " . $e->getMessage() . "\n", FILE_APPEND);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Task ID not found']);
    }
} else {
    file_put_contents($logFile, "Unknown event: " . ($eventData['event'] ?? 'none') . "\n", FILE_APPEND);
    echo json_encode(['status' => 'error', 'message' => 'Unknown event type']);
}

\CMain::FinalActions();
