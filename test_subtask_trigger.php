<?php
/**
 * Test Subtask Creation Trigger
 * Симулирует изменение статуса задачи для проверки автоматического создания подзадач
 */

require_once($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');

use Bitrix\Main\Loader;

header('Content-Type: text/html; charset=utf-8');

if (!Loader::includeModule('tasks')) {
    echo "❌ Tasks module not found\n";
    exit;
}

$taskId = isset($_GET['taskId']) ? (int)$_GET['taskId'] : 8;

echo "<h1>🧪 Тест создания подзадач</h1>\n";
echo "<p>Тестируем задачу #$taskId</p>\n";

// Получаем текущую задачу
$task = \CTasks::GetByID($taskId, false);
if (!$taskData = $task->Fetch()) {
    echo "❌ Задача #$taskId не найдена\n";
    exit;
}

echo "<h2>📋 Текущая задача:</h2>\n";
echo "<ul>\n";
echo "<li><strong>ID:</strong> {$taskData['ID']}</li>\n";
echo "<li><strong>Название:</strong> {$taskData['TITLE']}</li>\n";
echo "<li><strong>Текущий статус:</strong> {$taskData['STATUS']}</li>\n";
echo "<li><strong>Ответственный:</strong> {$taskData['RESPONSIBLE_ID']}</li>\n";
echo "</ul>\n";

// Проверяем, есть ли сохранённый процесс
global $DB;
$query = "SELECT process_data FROM telegsarflow_processes WHERE task_id = " . intval($taskId);
$result = $DB->Query($query);

if (!$row = $result->Fetch()) {
    echo "<p>⚠️ Нет сохранённого процесса для этой задачи</p>\n";
    exit;
}

$processData = json_decode($row['process_data'], true);

echo "<h2>📊 Данные процесса:</h2>\n";
echo "<pre>" . json_encode($processData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "</pre>\n";

// Считаем будущие задачи
$futureTasksCount = 0;
foreach ($processData['nodes'] as $node) {
    if (isset($node['data']['id']) && $node['data']['id'] === 'new') {
        $futureTasksCount++;
        echo "<div style='background: #fef3c7; padding: 15px; margin: 10px 0; border-left: 4px solid #f59e0b;'>\n";
        echo "<strong>🔮 Будущая задача:</strong><br>\n";
        echo "ID узла: {$node['id']}<br>\n";
        echo "Название: {$node['data']['title']}<br>\n";
        echo "Условие: {$node['data']['condition']}<br>\n";
        echo "</div>\n";
    }
}

if ($futureTasksCount === 0) {
    echo "<p>⚠️ Нет будущих задач в процессе (все задачи уже созданы)</p>\n";
}

// Форма для изменения статуса
echo "<h2>🎮 Изменить статус задачи:</h2>\n";
echo "<form method='POST' action=''>\n";
echo "<input type='hidden' name='taskId' value='$taskId'>\n";
echo "<select name='newStatus'>\n";
echo "<option value='1'>1 - Новая</option>\n";
echo "<option value='2'>2 - Ждёт выполнения</option>\n";
echo "<option value='3' " . ($taskData['STATUS'] == 3 ? 'selected' : '') . ">3 - Выполняется</option>\n";
echo "<option value='4'>4 - Ждёт контроля</option>\n";
echo "<option value='5'>5 - Завершена</option>\n";
echo "<option value='6'>6 - Отложена</option>\n";
echo "<option value='7'>7 - Отклонена</option>\n";
echo "</select>\n";
echo "<button type='submit' name='action' value='update' style='margin-left: 10px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;'>Изменить статус</button>\n";
echo "</form>\n";

// Обработка изменения статуса
if ($_POST['action'] === 'update' && isset($_POST['newStatus'])) {
    $newStatus = (int)$_POST['newStatus'];

    echo "<div style='background: #e0f2fe; padding: 15px; margin: 20px 0; border-left: 4px solid #0284c7;'>\n";
    echo "<strong>🔄 Изменяем статус задачи...</strong><br>\n";

    $taskObject = new \CTasks();
    $updateResult = $taskObject->Update($taskId, [
        'STATUS' => $newStatus
    ], ['REGISTER_SONET_EVENT' => 'Y']);

    if ($updateResult) {
        echo "✅ Статус изменён на $newStatus<br>\n";
        echo "⏳ Ожидаем создание подзадачи...<br>\n";

        // Подождём секунду, чтобы событие обработалось
        sleep(1);

        // Проверяем, создалась ли подзадача
        $checkQuery = "SELECT process_data FROM telegsarflow_processes WHERE task_id = " . intval($taskId);
        $checkResult = $DB->Query($checkQuery);
        $updatedRow = $checkResult->Fetch();
        $updatedProcess = json_decode($updatedRow['process_data'], true);

        $newTaskCreated = false;
        foreach ($updatedProcess['nodes'] as $node) {
            if (isset($node['data']['id']) && $node['data']['id'] !== 'new' && !isset($processData['nodes'][array_search($node, $updatedProcess['nodes'])]['data']['id'])) {
                $newTaskCreated = true;
                echo "✅ <strong>ПОДЗАДАЧА СОЗДАНА!</strong><br>\n";
                echo "Новая задача ID: {$node['data']['id']}<br>\n";
                echo "Название: {$node['data']['title']}<br>\n";
            }
        }

        if (!$newTaskCreated) {
            echo "⚠️ Подзадача не была создана. Возможные причины:<br>\n";
            echo "- Условие не выполнено для выбранного статуса<br>\n";
            echo "- Ошибка в обработчике события<br>\n";
            echo "- Проверьте логи: <code>tail -f /var/log/php8.3-fpm.log | grep Telegsarflow</code><br>\n";
        }
    } else {
        echo "❌ Ошибка при изменении статуса<br>\n";
    }

    echo "</div>\n";

    echo "<p><a href='?taskId=$taskId' style='padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;'>Обновить страницу</a></p>\n";
}

echo "<hr>\n";
echo "<p><small>💡 Совет: откройте терминал и запустите <code>tail -f /var/log/php8.3-fpm.log | grep Telegsarflow</code> чтобы видеть логи в реальном времени</small></p>\n";
