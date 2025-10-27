<?php
/**
 * API для получения списка групп (проектов) Bitrix24
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_GET['auth'])) {
    echo json_encode(['success' => false, 'error' => 'Auth token required']);
    exit;
}

$auth = $_GET['auth'];
$domain = $_SERVER['HTTP_HOST'];

// Получаем список всех рабочих групп через REST API
$url = "https://{$domain}/rest/sonet_group.get";
$params = [
    'auth' => $auth,
    'FILTER' => [
        'ACTIVE' => 'Y' // Только активные группы
    ],
    'SELECT' => ['ID', 'NAME', 'DESCRIPTION']
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode != 200) {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch groups',
        'http_code' => $httpCode
    ]);
    exit;
}

$data = json_decode($response, true);

if (isset($data['error'])) {
    echo json_encode([
        'success' => false,
        'error' => $data['error_description'] ?? $data['error']
    ]);
    exit;
}

// Форматируем группы для фронтенда
$groups = [];
if (isset($data['result']) && is_array($data['result'])) {
    foreach ($data['result'] as $group) {
        $groups[] = [
            'id' => $group['ID'],
            'name' => $group['NAME'],
            'description' => $group['DESCRIPTION'] ?? ''
        ];
    }
}

echo json_encode([
    'success' => true,
    'groups' => $groups,
    'count' => count($groups)
]);
