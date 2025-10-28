<?php
/**
 * Одноразовый скрипт для создания пользовательского поля UF_FLOWTASK_PROCESS_ID
 * Запустить один раз через браузер
 */

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
    <title>Создание поля ProcessId</title>
    <?php $APPLICATION->ShowHead(); ?>
    <script src="//api.bitrix24.com/api/v1/"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        button {
            background: #4CAF50;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #45a049;
        }
        #result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <h1>Создание пользовательского поля UF_FLOWTASK_PROCESS_ID</h1>
    <p>Этот скрипт создаст пользовательское поле для хранения ProcessId в задачах.</p>
    <button onclick="createField()">Создать поле</button>
    <div id="result"></div>

    <script>
        function createField() {
            BX24.init(function() {
                console.log('BX24 initialized');

                BX24.callMethod('task.item.userfield.add', {
                    fields: {
                        FIELD_NAME: 'UF_FLOWTASK_PROCESS_ID',
                        USER_TYPE_ID: 'string',
                        EDIT_FORM_LABEL: {
                            'ru': 'ID процесса Flowtask',
                            'en': 'Flowtask Process ID'
                        },
                        LIST_COLUMN_LABEL: {
                            'ru': 'Process ID',
                            'en': 'Process ID'
                        },
                        MANDATORY: 'N',
                        SHOW_FILTER: 'N',
                        SHOW_IN_LIST: 'N',
                        EDIT_IN_LIST: 'N',
                        IS_SEARCHABLE: 'N'
                    }
                }, function(result) {
                    const resultDiv = document.getElementById('result');

                    if (result.error()) {
                        const errorCode = result.error().ex ? result.error().ex.error : '';

                        if (errorCode === 'ERROR_FIELD_EXISTS' || errorCode === 'ERROR_ALREADY_EXISTS') {
                            resultDiv.className = 'success';
                            resultDiv.innerHTML = '✅ Поле UF_FLOWTASK_PROCESS_ID уже существует!';
                        } else {
                            resultDiv.className = 'error';
                            resultDiv.innerHTML = '❌ Ошибка: ' + JSON.stringify(result.error());
                        }
                    } else {
                        resultDiv.className = 'success';
                        resultDiv.innerHTML = '✅ Поле UF_FLOWTASK_PROCESS_ID успешно создано!<br><br>ID поля: ' + result.data();
                    }

                    console.log('Result:', result);
                });
            });
        }
    </script>
</body>
</html>
