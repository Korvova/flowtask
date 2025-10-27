<?php
/**
 * API для сохранения процесса задачи через REST Entity Storage
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Только POST запросы
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Получаем данные из POST
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['taskId']) || !isset($input['processData']) || !isset($input['auth'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields (taskId, processData, auth)']);
        exit;
    }

    $taskId = (int)$input['taskId'];
    $processData = $input['processData'];
    $auth = $input['auth'];
    $domain = $_SERVER['HTTP_HOST'];

    // Сначала пытаемся найти существующую запись
    $findUrl = "https://{$domain}/rest/entity.item.get";
    $findParams = [
        'auth' => $auth,
        'ENTITY' => 'telegsarflow_process',
        'FILTER' => ['PROPERTY_TASK_ID' => $taskId]
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $findUrl . '?' . http_build_query($findParams));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    curl_close($ch);

    $findData = json_decode($response, true);
    $existingId = null;

    if (isset($findData['result'][0]['ID'])) {
        $existingId = $findData['result'][0]['ID'];
    }

    // Если запись существует - обновляем, иначе создаём
    if ($existingId) {
        // UPDATE
        $updateUrl = "https://{$domain}/rest/entity.item.update";
        $updateParams = [
            'auth' => $auth,
            'ENTITY' => 'telegsarflow_process',
            'ID' => $existingId,
            'PROPERTY_VALUES' => [
                'TASK_ID' => $taskId,
                'PROCESS_DATA' => json_encode($processData)
            ]
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $updateUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($updateParams));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        curl_close($ch);

        $result = json_decode($response, true);
        
        echo json_encode([
            'success' => true,
            'message' => 'Process updated',
            'id' => $existingId,
            'taskId' => $taskId
        ]);
    } else {
        // INSERT
        $addUrl = "https://{$domain}/rest/entity.item.add";
        $addParams = [
            'auth' => $auth,
            'ENTITY' => 'telegsarflow_process',
            'PROPERTY_VALUES' => [
                'TASK_ID' => $taskId,
                'PROCESS_DATA' => json_encode($processData)
            ]
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $addUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($addParams));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        curl_close($ch);

        $result = json_decode($response, true);
        
        echo json_encode([
            'success' => true,
            'message' => 'Process created',
            'id' => $result['result'] ?? null,
            'taskId' => $taskId
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
