<?php
/**
 * Telegsarflow - Server Install (без curl, используем file_get_contents)
 */

error_reporting(E_ALL);
ini_set('display_errors', 0); // Не показываем ошибки в output

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
header('Content-Type: application/json');

// Получаем данные
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data && !empty($_POST)) {
    $data = $_POST;
}

$auth = $data['auth'] ?? null;
if (!$auth || !isset($auth['access_token'])) {
    echo json_encode([
        'success' => false,
        'error' => 'Auth token required'
    ]);
    exit;
}

$accessToken = $auth['access_token'];
$domain = $auth['domain'] ?? $_SERVER['HTTP_HOST'];

/**
 * HTTP запрос через file_get_contents
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

    $response = @file_get_contents($url, false, $context);
    return $response;
}

/**
 * Создаёт entity через REST API
 */
function createEntity($domain, $accessToken, $entityName, $entityTitle, $properties) {
    // Проверяем существование entity
    $checkUrl = "https://{$domain}/rest/entity.get";
    $response = httpRequest($checkUrl, [
        'auth' => $accessToken,
        'ENTITY' => $entityName
    ]);

    $result = json_decode($response, true);

    if (isset($result['result'])) {
        return ['success' => true, 'message' => "Entity {$entityName} exists", 'existed' => true];
    }

    // Создаём entity
    $addUrl = "https://{$domain}/rest/entity.add";
    $response = httpRequest($addUrl, [
        'auth' => $accessToken,
        'ENTITY' => $entityName,
        'NAME' => $entityTitle,
        'ACCESS' => 'A'
    ], 'POST');

    $result = json_decode($response, true);

    if (isset($result['error'])) {
        return ['success' => false, 'error' => $result['error_description'] ?? $result['error']];
    }

    // Добавляем свойства
    foreach ($properties as $property) {
        $propUrl = "https://{$domain}/rest/entity.item.property.add";
        httpRequest($propUrl, [
            'auth' => $accessToken,
            'ENTITY' => $entityName,
            'PROPERTY' => $property['CODE'],
            'NAME' => $property['NAME'],
            'TYPE' => $property['TYPE'] ?? 'S'
        ], 'POST');
    }

    return ['success' => true, 'message' => "Entity {$entityName} created", 'existed' => false];
}

try {
    $results = [];

    // 1. Entity для процессов
    $results['process'] = createEntity($domain, $accessToken, 'telegsarflow_process', 'Telegsarflow Processes', [
        ['CODE' => 'TASK_ID', 'NAME' => 'Task ID', 'TYPE' => 'N'],
        ['CODE' => 'PROCESS_DATA', 'NAME' => 'Process JSON', 'TYPE' => 'S']
    ]);

    // 2. Entity для шаблонов
    $results['templates'] = createEntity($domain, $accessToken, 'telegsarflow_templates', 'Telegsarflow Templates', [
        ['CODE' => 'TEMPLATE_NAME', 'NAME' => 'Template Name', 'TYPE' => 'S'],
        ['CODE' => 'TEMPLATE_DATA', 'NAME' => 'Template JSON', 'TYPE' => 'S'],
        ['CODE' => 'CREATED_BY', 'NAME' => 'Created By', 'TYPE' => 'N'],
        ['CODE' => 'CREATED_DATE', 'NAME' => 'Created Date', 'TYPE' => 'D']
    ]);

    // 3. Регистрируем placement
    $placementUrl = "https://{$domain}/rest/placement.bind";
    $placementResponse = httpRequest($placementUrl, [
        'auth' => $accessToken,
        'PLACEMENT' => 'TASK_VIEW_TAB',
        'HANDLER' => "https://{$domain}/telegsarflow/handler.php",
        'LANG_ALL' => [
            'ru' => ['TITLE' => 'Процессы'],
            'en' => ['TITLE' => 'Processes']
        ]
    ], 'POST');

    $placementResult = json_decode($placementResponse, true);
    $results['placement'] = $placementResult;

    echo json_encode([
        'success' => true,
        'message' => 'Installation completed successfully',
        'results' => $results
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
