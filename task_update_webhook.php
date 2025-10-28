<?php
/**
 * Webhook обработчик для событий ONTASKUPDATE
 * Получает события изменения задач от Bitrix24 и отправляет Push-уведомления
 */

// Логирование всех входящих запросов
error_log('=== FLOWTASK WEBHOOK CALLED ===');
error_log('REQUEST METHOD: ' . $_SERVER['REQUEST_METHOD']);
error_log('POST DATA: ' . print_r($_POST, true));
error_log('GET DATA: ' . print_r($_GET, true));

// Bitrix24 отправляет данные в POST
$eventData = $_POST;

// Извлекаем данные события
$event = $eventData['event'] ?? '';
$auth = $eventData['auth'] ?? [];
$taskId = $eventData['data']['FIELDS_AFTER']['ID'] ?? $eventData['data']['FIELDS_BEFORE']['ID'] ?? null;
$statusAfter = $eventData['data']['FIELDS_AFTER']['STATUS'] ?? null;
$statusBefore = $eventData['data']['FIELDS_BEFORE']['STATUS'] ?? null;

error_log("Event: $event, TaskID: $taskId, Status: $statusBefore -> $statusAfter");

// Проверяем что это событие обновления задачи
if ($event !== 'ONTASKUPDATE' || !$taskId) {
    error_log('⏭️ Not a task update event or no task ID');
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Not a task update event']);
    exit;
}

// Проверяем что статус действительно изменился
if ($statusBefore === $statusAfter) {
    error_log('⏭️ Status not changed');
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Status not changed']);
    exit;
}

// Подключаем Bitrix API (если приложение на том же сервере)
// Для внешнего приложения используем REST API через BX24.callMethod

try {
    // Получаем domain и access_token из auth данных
    $domain = $auth['domain'] ?? '';
    $accessToken = $auth['access_token'] ?? '';

    if (!$domain || !$accessToken) {
        error_log('❌ No auth data in webhook');
        throw new Exception('No auth data');
    }

    error_log("✅ Auth OK: domain=$domain");

    // Отправляем Push-событие через REST API
    $pushUrl = "https://{$domain}/rest/pull.application.event.add.json";

    $pushData = [
        'auth' => $accessToken,
        'COMMAND' => 'flowtask_task_updated',
        'PARAMS' => [
            'taskId' => $taskId,
            'statusBefore' => $statusBefore,
            'statusAfter' => $statusAfter,
            'timestamp' => time()
        ],
        'MODULE_ID' => 'application',
        'USER_ID' => $auth['user_id'] ?? 0
    ];

    error_log('📤 Sending Push event: ' . json_encode($pushData));

    // Отправляем через curl
    $ch = curl_init($pushUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($pushData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    error_log("📥 Push response (HTTP $httpCode): $response");

    if ($httpCode === 200) {
        error_log('✅ Push event sent successfully');
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'taskId' => $taskId,
            'status' => $statusAfter,
            'pushSent' => true
        ]);
    } else {
        error_log('⚠️ Push event failed');
        http_response_code(200);
        echo json_encode([
            'success' => false,
            'error' => 'Push failed',
            'httpCode' => $httpCode
        ]);
    }

} catch (Exception $e) {
    error_log('❌ Webhook error: ' . $e->getMessage());
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
