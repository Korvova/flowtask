<?php
/**
 * Проверка существования Entity tflow_nodes
 */

// Параметры подключения к Bitrix24
$domain = 'test.test-rms.ru';
$webhookCode = 'YOUR_WEBHOOK_CODE'; // Нужно получить из Bitrix24

// Или используем OAuth токен из GET параметра
if (isset($_GET['auth'])) {
    $auth = $_GET['auth'];
} else {
    die('Нужен параметр ?auth=YOUR_ACCESS_TOKEN или настроить webhook');
}

// Проверяем существование Entity
$url = "https://{$domain}/rest/entity.get.json?auth={$auth}&ENTITY=tflow_nodes";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

header('Content-Type: application/json; charset=utf-8');

echo "=== Проверка Entity tflow_nodes ===\n\n";
echo "HTTP Code: {$httpCode}\n\n";
echo "Response:\n";
echo json_encode(json_decode($response, true), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
echo "\n\n";

// Пробуем создать Entity
echo "\n=== Попытка создать Entity ===\n\n";

$createUrl = "https://{$domain}/rest/entity.add.json";
$postData = [
    'auth' => $auth,
    'ENTITY' => 'tflow_nodes',
    'NAME' => 'Flowtask Nodes Storage',
    'ACCESS' => [
        'AU' => 'W'
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $createUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$createResponse = curl_exec($ch);
$createHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: {$createHttpCode}\n\n";
echo "Response:\n";
echo json_encode(json_decode($createResponse, true), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
