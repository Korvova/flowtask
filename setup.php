<?php
/**
 * Telegsarflow - установка через SQL напрямую
 * Для коробочной версии Битрикс24
 */

define('NOT_CHECK_PERMISSIONS', true);
define('NO_AGENT_CHECK', true);
$_SERVER['DOCUMENT_ROOT'] = '/var/www/html';

require($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');

// Проверяем что модуль rest установлен
if (!CModule::IncludeModule('rest')) {
    die('Модуль REST не установлен');
}

$appId = 10; // ID приложения из базы
$placementCode = 'TASK_VIEW_TAB';
$handlerUrl = '/telegsarflow/handler.php';

// Проверяем существует ли уже такой placement
global $DB;
$sql = "SELECT ID FROM b_rest_placement WHERE APP_ID = " . intval($appId) . " AND PLACEMENT = '" . $DB->ForSql($placementCode) . "'";
$res = $DB->Query($sql);

if ($existing = $res->Fetch()) {
    $message = '✅ Placement уже установлен (ID: ' . $existing['ID'] . ')';
    $isNew = false;
} else {
    // Добавляем placement в базу данных
    $sql = "INSERT INTO b_rest_placement (APP_ID, PLACEMENT, HANDLER, TITLE, DESCRIPTION, DATE_CREATE) VALUES (" .
        intval($appId) . ", " .
        "'" . $DB->ForSql($placementCode) . "', " .
        "'" . $DB->ForSql($handlerUrl) . "', " .
        "'" . $DB->ForSql('Процессы') . "', " .
        "'" . $DB->ForSql('Управление процессами задачи') . "', " .
        "NOW())";

    if ($DB->Query($sql)) {
        $placementId = $DB->LastID();

        // Добавляем языковые варианты
        $langs = [
            'ru' => 'Процессы',
            'en' => 'Processes'
        ];

        foreach ($langs as $lang => $title) {
            $sqlLang = "INSERT INTO b_rest_placement_lang (PLACEMENT_ID, LANGUAGE_ID, TITLE) VALUES (" .
                intval($placementId) . ", " .
                "'" . $DB->ForSql($lang) . "', " .
                "'" . $DB->ForSql($title) . "')";
            $DB->Query($sqlLang);
        }

        $message = '✅ Placement успешно установлен! (ID: ' . $placementId . ')';
        $isNew = true;
    } else {
        $message = '❌ Ошибка при установке placement';
        $isNew = false;
    }
}

// Очищаем кеш
BXClearCache(true);

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Установка Telegsarflow</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 50px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 100%;
            text-align: center;
        }
        h1 {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .message {
            font-size: 24px;
            margin: 30px 0;
            padding: 20px;
            border-radius: 10px;
            <?php if ($isNew): ?>
            background: #d4edda;
            color: #155724;
            <?php else: ?>
            background: #d1ecf1;
            color: #0c5460;
            <?php endif; ?>
        }
        .instructions {
            text-align: left;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
        }
        .instructions h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        .instructions ol {
            margin-left: 20px;
        }
        .instructions li {
            margin: 10px 0;
            line-height: 1.6;
        }
        a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀</h1>
        <div class="message">
            <?php echo $message; ?>
        </div>

        <div class="instructions">
            <h3>Что дальше?</h3>
            <ol>
                <li>Откройте <strong>любую задачу</strong> в Битрикс24</li>
                <li>Найдите вкладку <strong>"Процессы"</strong> в карточке задачи</li>
                <li>Кликните на неё и увидите интерфейс управления процессами</li>
            </ol>
        </div>

        <p style="margin-top: 30px; color: #666;">
            <a href="/company/personal/user/1/tasks/">← Перейти к задачам</a>
        </p>
    </div>
</body>
</html>
<?php
require($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/epilog_after.php');
?>
