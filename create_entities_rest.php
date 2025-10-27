<?php
/**
 * Создание Entity через REST API напрямую (без BX24.js)
 */
require_once($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');
require_once(__DIR__ . '/crest.php');

header('Content-Type: text/html; charset=UTF-8');

$action = $_GET['action'] ?? '';
$result = '';

if ($action === 'list') {
    $entities = CRest::call('entity.get');
    $result = '<h2>📋 Список всех Entity</h2>';
    $result .= '<p>Найдено: ' . count($entities['result']) . '</p>';
    $result .= '<table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">';
    $result .= '<tr><th>#</th><th>ENTITY</th><th>NAME</th></tr>';
    foreach ($entities['result'] as $i => $e) {
        $result .= '<tr><td>' . ($i + 1) . '</td><td><strong>' . htmlspecialchars($e['ENTITY']) . '</strong></td><td>' . htmlspecialchars($e['NAME']) . '</td></tr>';
    }
    $result .= '</table>';
}

if ($action === 'create') {
    $entities = [
        [
            'ENTITY' => 'tflow_task_pos',
            'NAME' => 'Task Positions',
            'PROPERTY' => [
                'taskId' => ['NAME' => 'Task ID', 'TYPE' => 'S'],
                'positionX' => ['NAME' => 'Position X', 'TYPE' => 'N'],
                'positionY' => ['NAME' => 'Position Y', 'TYPE' => 'N']
            ]
        ],
        [
            'ENTITY' => 'tflow_future_task',
            'NAME' => 'Future Tasks',
            'PROPERTY' => [
                'futureId' => ['NAME' => 'Future ID', 'TYPE' => 'S'],
                'title' => ['NAME' => 'Title', 'TYPE' => 'S'],
                'description' => ['NAME' => 'Description', 'TYPE' => 'S'],
                'groupId' => ['NAME' => 'Group ID', 'TYPE' => 'S'],
                'responsibleId' => ['NAME' => 'Responsible ID', 'TYPE' => 'S'],
                'conditionType' => ['NAME' => 'Condition Type', 'TYPE' => 'S'],
                'delayMinutes' => ['NAME' => 'Delay Minutes', 'TYPE' => 'N'],
                'positionX' => ['NAME' => 'Position X', 'TYPE' => 'N'],
                'positionY' => ['NAME' => 'Position Y', 'TYPE' => 'N'],
                'isCreated' => ['NAME' => 'Is Created', 'TYPE' => 'S'],
                'realTaskId' => ['NAME' => 'Real Task ID', 'TYPE' => 'S']
            ]
        ],
        [
            'ENTITY' => 'tflow_connections',
            'NAME' => 'Task Connections',
            'PROPERTY' => [
                'sourceId' => ['NAME' => 'Source ID', 'TYPE' => 'S'],
                'targetId' => ['NAME' => 'Target ID', 'TYPE' => 'S'],
                'connectionType' => ['NAME' => 'Type', 'TYPE' => 'S']
            ]
        ],
        [
            'ENTITY' => 'tflow_templates',
            'NAME' => 'Process Templates',
            'PROPERTY' => [
                'templateName' => ['NAME' => 'Template Name', 'TYPE' => 'S'],
                'processData' => ['NAME' => 'Process Data', 'TYPE' => 'S'],
                'createdBy' => ['NAME' => 'Created By', 'TYPE' => 'S']
            ]
        ]
    ];

    $result = '<h2>🔧 Создание Entity</h2>';
    $created = 0;
    
    foreach ($entities as $entityData) {
        $response = CRest::call('entity.add', [
            'ENTITY' => $entityData['ENTITY'],
            'NAME' => $entityData['NAME'],
            'PROPERTY' => $entityData['PROPERTY'],
            'ACCESS' => ['X' => []]
        ]);
        
        if (isset($response['error'])) {
            $result .= '<p style="color: orange;">⚠️ ' . $entityData['ENTITY'] . ': ' . $response['error_description'] . '</p>';
        } else {
            $result .= '<p style="color: green;">✅ ' . $entityData['ENTITY'] . ' создан</p>';
            $created++;
        }
    }
    
    $result .= '<p><strong>🎉 Создано ' . $created . ' из ' . count($entities) . ' entity</strong></p>';
}

if ($action === 'delete_old') {
    $entities = CRest::call('entity.get');
    $result = '<h2>🗑️ Удаление старых Entity</h2>';
    $deleted = 0;
    
    foreach ($entities['result'] as $e) {
        if (strpos($e['ENTITY'], 'telegsarflow_') === 0) {
            $response = CRest::call('entity.delete', [
                'ENTITY' => $e['ENTITY']
            ]);
            
            if (isset($response['error'])) {
                $result .= '<p style="color: red;">❌ ' . $e['ENTITY'] . ': ' . $response['error_description'] . '</p>';
            } else {
                $result .= '<p style="color: green;">✅ Удалён: ' . $e['ENTITY'] . '</p>';
                $deleted++;
            }
        }
    }
    
    $result .= '<p><strong>Удалено: ' . $deleted . ' entity</strong></p>';
}

if ($action === 'test') {
    $result = '<h2>🧪 Тест операций с Entity</h2>';
    
    // Тест добавления
    $testAdd = CRest::call('entity.item.add', [
        'ENTITY' => 'tflow_task_pos',
        'NAME' => 'Test Position',
        'PROPERTY_VALUES' => [
            'taskId' => '999',
            'positionX' => '100',
            'positionY' => '200'
        ]
    ]);
    
    if (isset($testAdd['error'])) {
        $result .= '<p style="color: red;">❌ Ошибка добавления: ' . $testAdd['error_description'] . '</p>';
    } else {
        $result .= '<p style="color: green;">✅ Тестовая запись добавлена (ID: ' . $testAdd['result'] . ')</p>';
        
        // Тест получения
        $testGet = CRest::call('entity.item.get', [
            'ENTITY' => 'tflow_task_pos',
            'FILTER' => [
                'PROPERTY_taskId' => '999'
            ]
        ]);
        
        if (isset($testGet['result'][0])) {
            $result .= '<p style="color: green;">✅ Тестовая запись найдена:</p>';
            $result .= '<pre>' . print_r($testGet['result'][0], true) . '</pre>';
            
            // Удаление тестовой записи
            CRest::call('entity.item.delete', [
                'ENTITY' => 'tflow_task_pos',
                'ID' => $testGet['result'][0]['ID']
            ]);
            $result .= '<p style="color: green;">✅ Тестовая запись удалена</p>';
        }
    }
}

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Управление Entity</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 40px;
            background: #f5f7fa;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-bottom: 30px; }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px 5px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn-secondary { background: #6c757d; }
        .btn-danger { background: #dc3545; }
        .btn-success { background: #28a745; }
        .result {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        table { margin-top: 20px; }
        th { background: #667eea; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Управление Entity для Telegsarflow</h1>
        
        <p><strong>Короткие имена (≤20 символов):</strong></p>
        <ul>
            <li><code>tflow_task_pos</code> - позиции задач</li>
            <li><code>tflow_future_task</code> - предзадачи</li>
            <li><code>tflow_connections</code> - связи</li>
            <li><code>tflow_templates</code> - шаблоны</li>
        </ul>
        
        <div style="margin: 30px 0;">
            <a href="?action=list" class="btn">📋 Показать все Entity</a>
            <a href="?action=create" class="btn btn-success">➕ Создать новые Entity</a>
            <a href="?action=delete_old" class="btn btn-danger">🗑️ Удалить старые Entity</a>
            <a href="?action=test" class="btn btn-secondary">🧪 Тест операций</a>
        </div>
        
        <?php if ($result): ?>
        <div class="result">
            <?= $result ?>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>
