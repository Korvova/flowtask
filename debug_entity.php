<?php
require_once(__DIR__ . '/crest.php');

$taskId = isset($_GET['task']) ? intval($_GET['task']) : 31;
$action = isset($_GET['action']) ? $_GET['action'] : '';

header('Content-Type: text/html; charset=UTF-8');

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Отладка Entity - Telegsarflow</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .buttons {
            margin: 20px 0;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            margin: 5px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .output {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            white-space: pre-wrap;
            max-height: 700px;
            overflow-y: auto;
        }
        .entity-item {
            background: white;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .entity-item h3 {
            margin: 0 0 10px 0;
            color: #667eea;
        }
        .field {
            margin: 5px 0;
            padding: 5px 0;
        }
        .field-name {
            display: inline-block;
            width: 150px;
            font-weight: 600;
            color: #495057;
        }
        .field-value {
            color: #212529;
        }
        .success { color: #28a745; font-weight: bold; }
        .warning { color: #ffc107; font-weight: bold; }
        .error { color: #dc3545; font-weight: bold; }
        .info { color: #17a2b8; }
        .summary {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Отладка Entity данных - Задача #<?php echo $taskId; ?></h1>

        <div class="buttons">
            <a href="?action=futures&task=<?php echo $taskId; ?>" class="btn">📋 Проверить предзадачи</a>
            <a href="?action=connections&task=<?php echo $taskId; ?>" class="btn">🔗 Проверить связи</a>
            <a href="?action=all&task=<?php echo $taskId; ?>" class="btn">🔍 Полная проверка</a>
            <a href="?" class="btn">🔄 Обновить</a>
        </div>

        <div class="output">
<?php

if ($action === 'futures' || $action === 'all') {
    echo "📋 <strong>ПРОВЕРКА ПРЕДЗАДАЧ ДЛЯ ЗАДАЧИ #{$taskId}</strong>\n";
    echo str_repeat("=", 70) . "\n\n";

    try {
        $result = CRest::call('entity.item.get', [
            'ENTITY' => 'tflow_future'
        ]);

        if (isset($result['error'])) {
            echo "<span class='error'>❌ Ошибка: " . print_r($result['error'], true) . "</span>\n";
        } else {
            $items = $result['result'] ?? [];
            echo "📊 Всего предзадач в Entity: <strong>" . count($items) . "</strong>\n\n";

            $foundCount = 0;
            foreach ($items as $item) {
                if (empty($item['DETAIL_TEXT'])) continue;

                $data = json_decode($item['DETAIL_TEXT'], true);
                if (!$data) continue;

                if (isset($data['parentTaskId']) && $data['parentTaskId'] == $taskId) {
                    $foundCount++;

                    echo "<div class='entity-item'>";
                    echo "<h3>Предзадача #{$item['ID']}</h3>";
                    echo "<div class='field'><span class='field-name'>Future ID:</span> <span class='field-value'>{$data['futureId']}</span></div>";
                    echo "<div class='field'><span class='field-name'>Название:</span> <span class='field-value'>{$data['title']}</span></div>";
                    echo "<div class='field'><span class='field-name'>Родитель:</span> <span class='field-value'>task-{$data['parentTaskId']}</span></div>";

                    $isCreated = isset($data['isCreated']) && $data['isCreated'];
                    $statusClass = $isCreated ? 'success' : 'warning';
                    $statusText = $isCreated ? 'true ✅' : 'false ⚠️';
                    echo "<div class='field'><span class='field-name'>⭐ isCreated:</span> <span class='$statusClass'>$statusText</span></div>";

                    $realTaskId = $data['realTaskId'] ?? 'не установлен';
                    $taskClass = ($realTaskId !== 'не установлен') ? 'success' : 'warning';
                    echo "<div class='field'><span class='field-name'>⭐ realTaskId:</span> <span class='$taskClass'>$realTaskId</span></div>";

                    echo "<div class='field'><span class='field-name'>Позиция:</span> <span class='field-value'>({$data['positionX']}, {$data['positionY']})</span></div>";
                    echo "<div class='field'><span class='field-name'>Условие:</span> <span class='field-value'>{$data['conditionType']}</span></div>";
                    echo "<div class='field'><span class='field-name'>Ответственный:</span> <span class='field-value'>{$data['responsibleId']}</span></div>";
                    if (isset($data['groupId'])) {
                        echo "<div class='field'><span class='field-name'>Группа:</span> <span class='field-value'>{$data['groupId']}</span></div>";
                    }
                    echo "</div>\n";
                }
            }

            echo "<div class='summary'>";
            if ($foundCount === 0) {
                echo "<span class='warning'>⚠️  Не найдено предзадач для задачи #{$taskId}</span>";
            } else {
                echo "<span class='success'>✅ Найдено предзадач: {$foundCount}</span>";
            }
            echo "</div>\n";
        }
    } catch (Exception $e) {
        echo "<span class='error'>❌ Исключение: " . $e->getMessage() . "</span>\n";
    }
}

if ($action === 'connections' || $action === 'all') {
    if ($action === 'all') {
        echo "\n\n";
    }

    echo "🔗 <strong>ПРОВЕРКА СВЯЗЕЙ</strong>\n";
    echo str_repeat("=", 70) . "\n\n";

    try {
        $result = CRest::call('entity.item.get', [
            'ENTITY' => 'tflow_conn'
        ]);

        if (isset($result['error'])) {
            echo "<span class='error'>❌ Ошибка: " . print_r($result['error'], true) . "</span>\n";
        } else {
            $connections = $result['result'] ?? [];
            echo "📊 Всего связей в Entity: <strong>" . count($connections) . "</strong>\n\n";

            $foundCount = 0;
            foreach ($connections as $conn) {
                if (empty($conn['DETAIL_TEXT'])) continue;

                $data = json_decode($conn['DETAIL_TEXT'], true);
                if (!$data) continue;

                // Ищем связи связанные с задачей 31 или с предзадачами
                if (strpos($data['sourceId'], (string)$taskId) !== false ||
                    strpos($data['targetId'], (string)$taskId) !== false ||
                    strpos($data['sourceId'], 'future-') !== false ||
                    strpos($data['targetId'], 'future-') !== false) {

                    $foundCount++;

                    echo "<div class='entity-item'>";
                    echo "<h3>Связь #{$conn['ID']}</h3>";
                    echo "<div class='field'><span class='field-name'>Источник:</span> <span class='field-value'>{$data['sourceId']}</span></div>";
                    echo "<div class='field'><span class='field-name'>→ Цель:</span> <span class='field-value'>{$data['targetId']}</span></div>";
                    echo "<div class='field'><span class='field-name'>Тип:</span> <span class='field-value'>{$data['connectionType']}</span></div>";
                    echo "</div>\n";
                }
            }

            echo "<div class='summary'>";
            if ($foundCount === 0) {
                echo "<span class='warning'>⚠️  Не найдено связей для задачи #{$taskId}</span>";
            } else {
                echo "<span class='success'>✅ Найдено связей: {$foundCount}</span>";
            }
            echo "</div>\n";
        }
    } catch (Exception $e) {
        echo "<span class='error'>❌ Исключение: " . $e->getMessage() . "</span>\n";
    }
}

if (empty($action)) {
    echo "👋 Выберите действие выше для начала проверки.\n\n";
    echo "💡 <strong>Как использовать:</strong>\n";
    echo "   1. Нажмите 'Проверить предзадачи' чтобы увидеть все предзадачи для задачи #{$taskId}\n";
    echo "   2. Проверьте флаги isCreated и realTaskId\n";
    echo "   3. Нажмите 'Проверить связи' чтобы увидеть все связи\n";
    echo "   4. После завершения задачи нажмите 'Обновить' и снова проверьте\n\n";
    echo "🎯 <strong>Что искать:</strong>\n";
    echo "   • isCreated должен стать true после завершения родительской задачи\n";
    echo "   • realTaskId должен содержать ID созданной задачи\n";
    echo "   • Должны появиться новые связи от task-31 к task-[новая задача]\n";
}

?>
        </div>
    </div>
</body>
</html>
