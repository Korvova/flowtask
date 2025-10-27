<?php
/**
 * Исправление placement - удаляем старый и создаём новый с правильным URL
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_GET['auth'])) {
    echo json_encode(['success' => false, 'error' => 'Auth token required']);
    exit;
}

$auth = $_GET['auth'];
$domain = $_SERVER['HTTP_HOST'];

/**
 * HTTP запрос
 */
function httpRequest($url, $params = [], $method = 'GET') {
    $context = null;

    if ($method === 'POST' && !empty($params)) {
        $postData = http_build_query($params);
        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/x-www-form-urlencoded',
                'content' => $postData,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ];
        $context = stream_context_create($opts);
    } else {
        $opts = [
            'http' => [
                'method' => 'GET',
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ];
        $context = stream_context_create($opts);
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
    }

    return @file_get_contents($url, false, $context);
}

try {
    // 1. Получаем список всех placements
    $listUrl = "https://{$domain}/rest/placement.list";
    $response = httpRequest($listUrl, ['auth' => $auth]);
    $placements = json_decode($response, true);

    $results = ['placements_found' => []];

    if (isset($placements['result'])) {
        foreach ($placements['result'] as $placement) {
            if ($placement['placement'] === 'TASK_VIEW_TAB') {
                $results['placements_found'][] = $placement;

                // Удаляем старый placement
                $unbindUrl = "https://{$domain}/rest/placement.unbind";
                $unbindResponse = httpRequest($unbindUrl, [
                    'auth' => $auth,
                    'PLACEMENT' => 'TASK_VIEW_TAB'
                ], 'POST');

                $results['unbind_response'] = json_decode($unbindResponse, true);
            }
        }
    }

    // 2. Создаём новый placement с правильным URL
    $bindUrl = "https://{$domain}/rest/placement.bind";
    $bindResponse = httpRequest($bindUrl, [
        'auth' => $auth,
        'PLACEMENT' => 'TASK_VIEW_TAB',
        'HANDLER' => "https://{$domain}/telegsarflow/handler.php",
        'LANG_ALL' => [
            'ru' => ['TITLE' => 'Процессы'],
            'en' => ['TITLE' => 'Processes']
        ]
    ], 'POST');

    $results['bind_response'] = json_decode($bindResponse, true);

    echo json_encode([
        'success' => true,
        'message' => 'Placement fixed',
        'results' => $results
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
