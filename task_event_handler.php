<?php
/**
 * Обработчик событий задач через пролог Bitrix24
 * Использует прямой доступ к API Bitrix через пролог
 */

// Подключаем пролог Bitrix
require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/header.php");

use Bitrix\Main\Loader;
use Bitrix\Main\EventManager;
use Bitrix\Pull\Event as PullEvent;

// Логирование
$logFile = $_SERVER["DOCUMENT_ROOT"] . "/flowtask/logs/events.log";
function logEvent($message) {
    global $logFile;
    $dir = dirname($logFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . $message . PHP_EOL, FILE_APPEND);
}

logEvent('=== FLOWTASK EVENT HANDLER LOADED ===');

// Загружаем модули
if (!Loader::includeModule('tasks')) {
    logEvent('ERROR: Tasks module not loaded');
    die('Tasks module not available');
}

if (!Loader::includeModule('pull')) {
    logEvent('ERROR: Pull module not loaded');
    die('Pull module not available');
}

logEvent('✅ Modules loaded: tasks, pull');

// Регистрируем обработчик события OnTaskUpdate
$eventManager = EventManager::getInstance();

$eventManager->addEventHandler(
    'tasks',
    'OnTaskUpdate',
    function($taskId, $fields) {
        logEvent("📨 OnTaskUpdate fired: taskId=$taskId");
        logEvent("Fields: " . print_r($fields, true));

        // Отправляем Push событие всем пользователям
        try {
            // Получаем ID пользователя из контекста или отправляем всем
            global $USER;
            $userId = $USER && $USER->GetID() ? $USER->GetID() : 1;

            logEvent("Sending Push event to user $userId");

            PullEvent::add($userId, [
                'module_id' => 'tasks',
                'command' => 'task_update',
                'params' => [
                    'TASK_ID' => $taskId,
                    'ID' => $taskId,
                    'fields' => $fields
                ]
            ]);

            logEvent("✅ Push event sent successfully");

        } catch (Exception $e) {
            logEvent("❌ Error sending Push: " . $e->getMessage());
        }

        return true;
    }
);

logEvent('✅ OnTaskUpdate handler registered');

echo json_encode([
    'success' => true,
    'message' => 'Flowtask event handler initialized',
    'handlers' => [
        'OnTaskUpdate' => 'registered'
    ]
]);

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/footer.php");
