<?php
/**
 * API для получения списка пользователей через Bitrix24 REST API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Только GET запросы
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Получаем AUTH токен из параметров (передаётся из handler.php)
    $auth = $_GET['auth'] ?? null;
    
    if (!$auth) {
        // Если AUTH не передан, пытаемся получить из родительского окна через BX24
        echo json_encode([
            'success' => false,
            'error' => 'AUTH token required',
            'hint' => 'Pass auth token as GET parameter'
        ]);
        exit;
    }

    // Делаем REST запрос к Bitrix24 API
    $domain = $_SERVER['HTTP_HOST'];
    $restUrl = "https://{$domain}/rest/user.get";
    
    // Параметры запроса
    $params = [
        'auth' => $auth,
        'filter' => ['ACTIVE' => true],
        'select' => ['ID', 'NAME', 'LAST_NAME', 'EMAIL', 'LOGIN']
    ];

    // cURL запрос
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $restUrl . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception('REST API request failed: HTTP ' . $httpCode);
    }

    $data = json_decode($response, true);

    if (!isset($data['result'])) {
        throw new Exception('Invalid REST API response: ' . ($data['error_description'] ?? 'Unknown error'));
    }

    // Форматируем пользователей
    $users = [];
    foreach ($data['result'] as $user) {
        $fullName = trim(($user['NAME'] ?? '') . ' ' . ($user['LAST_NAME'] ?? ''));
        if (empty($fullName)) {
            $fullName = $user['LOGIN'] ?? $user['EMAIL'] ?? 'User ' . $user['ID'];
        }

        $users[] = [
            'id' => $user['ID'],
            'name' => $fullName,
            'email' => $user['EMAIL'] ?? '',
            'login' => $user['LOGIN'] ?? ''
        ];
    }

    echo json_encode([
        'success' => true,
        'users' => $users,
        'count' => count($users)
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
