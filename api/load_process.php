<?php
/**
 * API для загрузки процесса задачи через REST Entity Storage
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Только GET запросы
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Получаем параметры
    $taskId = isset($_GET['taskId']) ? (int)$_GET['taskId'] : 0;
    $auth = $_GET['auth'] ?? null;

    if (!$taskId) {
        echo json_encode(['success' => false, 'error' => 'Task ID not provided']);
        exit;
    }

    if (!$auth) {
        echo json_encode(['success' => false, 'error' => 'AUTH token required']);
        exit;
    }

    $domain = $_SERVER['HTTP_HOST'];

    // Загружаем процесс через REST Entity
    $url = "https://{$domain}/rest/entity.item.get";
    $params = [
        'auth' => $auth,
        'ENTITY' => 'telegsarflow_process',
        'FILTER' => ['PROPERTY_TASK_ID' => $taskId]
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);

    if (isset($data['result'][0])) {
        $processJson = $data['result'][0]['PROPERTY_VALUES']['PROCESS_DATA'] ?? null;
        $processData = $processJson ? json_decode($processJson, true) : null;

        echo json_encode([
            'success' => true,
            'processData' => $processData,
            'id' => $data['result'][0]['ID']
        ]);
    } else {
        // Процесс не найден - это нормально для новой задачи
        echo json_encode([
            'success' => true,
            'processData' => null,
            'message' => 'No process found for this task'
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
