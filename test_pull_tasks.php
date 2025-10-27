<?php
require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

use Bitrix\Main\Loader;
use Bitrix\Pull\Event;

if (!Loader::includeModule('pull')) {
    die('Pull module not loaded');
}

// Отправляем событие как модуль tasks (стандартный)
Event::add(1, [
    'module_id' => 'tasks',
    'command' => 'comment_add',  // Стандартная команда tasks
    'params' => [
        'TEST' => 'Тестовое сообщение от telegsarflow',
        'time' => time()
    ]
]);

echo "✅ Событие отправлено как модуль 'tasks'<br>";
echo "Проверь консоль браузера - должно прийти событие onPullEvent-tasks!";
