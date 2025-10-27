<?php
require($_SERVER["DOCUMENT_ROOT"]."/bitrix/header.php");
$APPLICATION->SetTitle("Тест API tasks.task.get");

use Bitrix\Main\Loader;

Loader::includeModule('tasks');

$taskId = intval($_GET['taskId'] ?? 2);

// Получаем задачу через PHP API
$task = \CTasks::GetByID($taskId, false);
if ($taskData = $task->Fetch()) {
    echo '<h1>Задача ID: ' . $taskId . '</h1>';
    echo '<div style="padding: 20px; background: #f5f5f5; border-radius: 8px;">';
    echo '<h2>Данные задачи (через CTasks::GetByID):</h2>';
    echo '<pre style="font-size: 12px; max-height: 600px; overflow: auto;">';
    echo htmlspecialchars(print_r($taskData, true));
    echo '</pre>';
    echo '</div>';

    // Пробуем разные поля
    echo '<div style="margin-top: 20px; padding: 20px; background: #e3f2fd; border-radius: 8px;">';
    echo '<h2>Проверяем разные поля:</h2>';
    echo '<p><strong>ID:</strong> ' . ($taskData['ID'] ?? 'нет') . '</p>';
    echo '<p><strong>TITLE:</strong> ' . ($taskData['TITLE'] ?? 'нет') . '</p>';
    echo '<p><strong>title:</strong> ' . ($taskData['title'] ?? 'нет') . '</p>';
    echo '<p><strong>STATUS:</strong> ' . ($taskData['STATUS'] ?? 'нет') . '</p>';
    echo '<p><strong>status:</strong> ' . ($taskData['status'] ?? 'нет') . '</p>';
    echo '<p><strong>REAL_STATUS:</strong> ' . ($taskData['REAL_STATUS'] ?? 'нет') . '</p>';
    echo '</div>';

} else {
    echo '<h1 style="color: red;">Задача не найдена</h1>';
}

require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php");
?>
