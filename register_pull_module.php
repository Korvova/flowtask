<?php
/**
 * Регистрация модуля telegsarflow для PULL событий
 */

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

use Bitrix\Main\Loader;

if (!Loader::includeModule('pull')) {
    die('Модуль Pull не установлен');
}

// Регистрируем наш модуль в Pull
$moduleId = 'telegsarflow';

// Проверяем зарегистрирован ли модуль
$registered = \Bitrix\Pull\SharedServerTable::getList([
    'filter' => ['MODULE_ID' => $moduleId]
])->fetch();

if ($registered) {
    echo "Модуль '$moduleId' уже зарегистрирован в Pull<br>";
    echo '<pre>' . print_r($registered, true) . '</pre>';
} else {
    echo "Модуль '$moduleId' НЕ зарегистрирован<br>";
    echo "Попробуем зарегистрировать...<br>";
    
    // В Bitrix24 модули регистрируются автоматически при первой отправке
    // Но можно использовать CPullWatch для подписки пользователя
    
    $userId = 1;
    \CPullWatch::Add($userId, 'TELEGSARFLOW_MODULE');
    
    echo "✅ Пользователь $userId подписан на TELEGSARFLOW_MODULE<br>";
}

// Проверим все зарегистрированные модули
echo "<br><h3>Все зарегистрированные модули в Pull:</h3>";
$modules = \Bitrix\Pull\SharedServerTable::getList([])->fetchAll();
if ($modules) {
    echo '<pre>' . print_r($modules, true) . '</pre>';
} else {
    echo "Нет зарегистрированных модулей<br>";
}

// Отправим тестовое событие
echo "<br><h3>Отправляем тестовое событие...</h3>";
\Bitrix\Pull\Event::add(1, [
    'module_id' => 'telegsarflow',
    'command' => 'test_message',
    'params' => [
        'text' => 'Тестовое сообщение от ' . date('H:i:s'),
        'time' => time()
    ]
]);
echo "✅ Событие отправлено для пользователя 1<br>";
echo "Проверь страницу test_pull.php - должно прийти событие!<br>";
