<?php
define("NO_KEEP_STATISTIC", true);
define("NO_AGENT_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);
define('PUBLIC_AJAX_MODE', true);

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");
CJSCore::Init();
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Проверка поля</title>
    <?php $APPLICATION->ShowHead(); ?>
    <script src="//api.bitrix24.com/api/v1/"></script>
    <style>
        body { font-family: Arial; padding: 20px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Проверка пользовательских полей задач</h1>
    <button onclick="checkFields()">Проверить поля</button>
    <div id="result"></div>

    <script>
        function checkFields() {
            BX24.init(function() {
                // Получаем список всех полей задач
                BX24.callMethod('task.item.userfield.getlist', {}, function(result) {
                    const resultDiv = document.getElementById('result');

                    if (result.error()) {
                        resultDiv.innerHTML = '<pre style="color: red;">Ошибка: ' + JSON.stringify(result.error(), null, 2) + '</pre>';
                        return;
                    }

                    const fields = result.data();
                    console.log('Все поля:', fields);

                    // Ищем наше поле
                    const ourField = fields.find(f => f.FIELD_NAME === 'UF_FLOWTASK_PROCESS_ID');

                    if (ourField) {
                        resultDiv.innerHTML = '<h2 style="color: green;">✅ Поле найдено!</h2><pre>' + JSON.stringify(ourField, null, 2) + '</pre>';
                    } else {
                        resultDiv.innerHTML = '<h2 style="color: red;">❌ Поле UF_FLOWTASK_PROCESS_ID не найдено</h2>' +
                            '<h3>Все доступные поля:</h3><pre>' + JSON.stringify(fields, null, 2) + '</pre>';
                    }
                });
            });
        }
    </script>
</body>
</html>
