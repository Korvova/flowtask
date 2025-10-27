<?php
/**
 * Обработчик событий от Bitrix24 REST API
 * Получает события OnTaskUpdate и отправляет их в наше приложение
 */

header('Content-Type: application/json');

// Логируем все входящие данные для отладки
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Логируем в файл для отладки
$logFile = __DIR__ . '/events.log';
file_put_contents($logFile, date('Y-m-d H:i:s') . ' | ' . $input . PHP_EOL, FILE_APPEND);

// Если это событие OnTaskUpdate
if (isset($data['event']) && $data['event'] === 'ONTASKUPDATE') {
    // Извлекаем данные задачи
    $taskData = $data['data'] ?? [];

    // Логируем событие
    file_put_contents($logFile, 'Task updated: ' . json_encode($taskData) . PHP_EOL, FILE_APPEND);

    echo json_encode([
        'success' => true,
        'event' => 'ONTASKUPDATE',
        'data' => $taskData
    ]);
} else {
    echo json_encode([
        'success' => true,
        'message' => 'Event received',
        'data' => $data
    ]);
}
