<?php
/**
 * Telegsarflow - Get Task Data
 * Получает данные задачи через PHP API Битрикса (для коробочной версии)
 */

require_once($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');

use Bitrix\Main\Loader;

header('Content-Type: application/json');

if (!Loader::includeModule('tasks')) {
    echo json_encode(['success' => false, 'error' => 'Tasks module not found']);
    exit;
}

// Получаем taskId из параметров
$taskId = isset($_GET['taskId']) ? (int)$_GET['taskId'] : 0;

if (!$taskId) {
    echo json_encode(['success' => false, 'error' => 'Task ID not provided']);
    exit;
}

try {
    // Получаем задачу через PHP API
    $task = \CTasks::GetByID($taskId, false);

    if ($taskData = $task->Fetch()) {
        echo json_encode([
            'success' => true,
            'task' => [
                'id' => $taskData['ID'],
                'title' => $taskData['TITLE'],
                'description' => $taskData['DESCRIPTION'],
                'status' => $taskData['STATUS'],
                'responsibleId' => $taskData['RESPONSIBLE_ID'],
                'createdBy' => $taskData['CREATED_BY'],
                'createdDate' => $taskData['CREATED_DATE'],
                'deadline' => $taskData['DEADLINE'] ?? null,
                'priority' => $taskData['PRIORITY'] ?? null,
                'groupId' => $taskData['GROUP_ID'] ?? null,
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Task not found',
            'taskId' => $taskId
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Exception: ' . $e->getMessage()
    ]);
}
