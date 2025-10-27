<?php
/**
 * Создание entity схем для Telegsarflow через REST API
 * Вызывается при установке приложения
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_POST['auth']) && !isset($_GET['auth'])) {
    echo json_encode(['success' => false, 'error' => 'Auth token required']);
    exit;
}

$auth = $_POST['auth'] ?? $_GET['auth'];
$domain = $_SERVER['HTTP_HOST'];

/**
 * Создаёт или обновляет entity
 */
function createEntity($domain, $auth, $entityName, $fields) {
    // Сначала проверяем, существует ли entity
    $checkUrl = "https://{$domain}/rest/entity.get";
    $checkParams = [
        'auth' => $auth,
        'ENTITY' => $entityName
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $checkUrl . '?' . http_build_query($checkParams));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $exists = false;
    if ($httpCode == 200) {
        $data = json_decode($response, true);
        if (isset($data['result'])) {
            $exists = true;
        }
    }

    if ($exists) {
        // Entity уже существует
        return ['success' => true, 'message' => "Entity {$entityName} already exists", 'existed' => true];
    }

    // Создаём новый entity
    $addUrl = "https://{$domain}/rest/entity.add";
    $addParams = [
        'auth' => $auth,
        'ENTITY' => $entityName,
        'NAME' => $fields['NAME'],
        'ACCESS' => $fields['ACCESS'] ?? 'A' // A = всем, W = только владельцу
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

    if (isset($result['error'])) {
        return ['success' => false, 'error' => $result['error_description'] ?? $result['error']];
    }

    // Теперь добавляем свойства (поля)
    if (isset($fields['PROPERTIES'])) {
        foreach ($fields['PROPERTIES'] as $property) {
            $propUrl = "https://{$domain}/rest/entity.item.property.add";
            $propParams = [
                'auth' => $auth,
                'ENTITY' => $entityName,
                'PROPERTY' => $property['CODE'],
                'NAME' => $property['NAME'],
                'TYPE' => $property['TYPE'] ?? 'S' // S=строка, N=число, D=дата
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $propUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($propParams));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            curl_exec($ch);
            curl_close($ch);
        }
    }

    return ['success' => true, 'message' => "Entity {$entityName} created", 'existed' => false];
}

try {
    $results = [];

    // 1. Entity для хранения процессов задач
    $processEntity = createEntity($domain, $auth, 'telegsarflow_process', [
        'NAME' => 'Telegsarflow Process Data',
        'ACCESS' => 'A',
        'PROPERTIES' => [
            [
                'CODE' => 'TASK_ID',
                'NAME' => 'Task ID',
                'TYPE' => 'N'
            ],
            [
                'CODE' => 'PROCESS_DATA',
                'NAME' => 'Process JSON Data',
                'TYPE' => 'S'
            ]
        ]
    ]);
    $results['process_entity'] = $processEntity;

    // 2. Entity для хранения шаблонов процессов
    $templateEntity = createEntity($domain, $auth, 'telegsarflow_templates', [
        'NAME' => 'Telegsarflow Process Templates',
        'ACCESS' => 'A', // Доступно всем пользователям портала
        'PROPERTIES' => [
            [
                'CODE' => 'TEMPLATE_NAME',
                'NAME' => 'Template Name',
                'TYPE' => 'S'
            ],
            [
                'CODE' => 'TEMPLATE_DATA',
                'NAME' => 'Template JSON Data',
                'TYPE' => 'S'
            ],
            [
                'CODE' => 'CREATED_BY',
                'NAME' => 'Created By User ID',
                'TYPE' => 'N'
            ],
            [
                'CODE' => 'CREATED_DATE',
                'NAME' => 'Created Date',
                'TYPE' => 'D'
            ]
        ]
    ]);
    $results['template_entity'] = $templateEntity;

    // 3. Entity для хранения информации о подписках (опционально)
    $subscriptionEntity = createEntity($domain, $auth, 'telegsarflow_subscriptions', [
        'NAME' => 'Telegsarflow Subscriptions',
        'ACCESS' => 'A',
        'PROPERTIES' => [
            [
                'CODE' => 'PORTAL_DOMAIN',
                'NAME' => 'Portal Domain',
                'TYPE' => 'S'
            ],
            [
                'CODE' => 'SUBSCRIPTION_TYPE',
                'NAME' => 'Subscription Type (monthly/per_process)',
                'TYPE' => 'S'
            ],
            [
                'CODE' => 'EXPIRY_DATE',
                'NAME' => 'Expiry Date',
                'TYPE' => 'D'
            ],
            [
                'CODE' => 'IS_ACTIVE',
                'NAME' => 'Is Active',
                'TYPE' => 'S'
            ]
        ]
    ]);
    $results['subscription_entity'] = $subscriptionEntity;

    echo json_encode([
        'success' => true,
        'message' => 'All entities created/verified successfully',
        'results' => $results
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
