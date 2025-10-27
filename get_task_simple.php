<?php
// Минимальная инициализация без авторизации
define("NO_KEEP_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);

require($_SERVER["DOCUMENT_ROOT"]."/bitrix/modules/main/include/prolog_before.php");

use Bitrix\Main\Loader;

header('Content-Type: application/json; charset=utf-8');

if (!Loader::includeModule('tasks')) {
    echo json_encode(['error' => 'Module tasks not found'], JSON_UNESCAPED_UNICODE);
    exit;
}

$taskId = intval($_GET['taskId'] ?? 0);

if ($taskId <= 0) {
    echo json_encode(['error' => 'Task ID not specified'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Получаем задачу
$task = \CTasks::GetByID($taskId, false);
if ($taskData = $task->Fetch()) {
    echo json_encode([
        'success' => true,
        'task' => [
            'id' => $taskData['ID'],
            'title' => $taskData['TITLE'],
            'status' => $taskData['STATUS'],
            'realStatus' => $taskData['REAL_STATUS'],
            'responsibleId' => $taskData['RESPONSIBLE_ID'],
            'responsibleName' => trim(($taskData['RESPONSIBLE_NAME'] ?? '') . ' ' . ($taskData['RESPONSIBLE_LAST_NAME'] ?? '')),
            'deadline' => $taskData['DEADLINE'] ?? null,
            'description' => $taskData['DESCRIPTION'] ?? ''
        ]
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['error' => 'Task not found', 'taskId' => $taskId], JSON_UNESCAPED_UNICODE);
}
