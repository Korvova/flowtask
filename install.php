<?php
error_log('Telegsarflow install.php called with params: ' . print_r($_REQUEST, true));

// Если это запрос от Bitrix24 Marketplace для установки
if (isset($_REQUEST['event']) && $_REQUEST['event'] === 'ONAPPINSTALL') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'Application installed successfully'
    ]);
    exit;
}

// Включаем пролог Bitrix для доступа к BX24 API
define("NO_KEEP_STATISTIC", true);
define("NO_AGENT_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);
define('PUBLIC_AJAX_MODE', true);

require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

// Подключаем необходимые расширения
CJSCore::Init();
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Установка Telegsarflow</title>
    <?php $APPLICATION->ShowHead(); ?>
    <script src="//api.bitrix24.com/api/v1/"></script>
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
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 100%;
        }
        h1 { color: #333; margin-bottom: 10px; font-size: 32px; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 16px; }
        .step {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .step h3 { color: #667eea; margin-bottom: 10px; }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s;
        }
        button:hover { transform: translateY(-2px); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        #status {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            display: none;
        }
        #status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        #status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .loader {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .progress {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Telegsarflow</h1>
        <div class="subtitle">Управление процессами в задачах Битрикс24</div>

        <div class="step">
            <h3>Что будет установлено:</h3>
            <ul>
                <li>✅ Вкладка "Процессы" в задачах</li>
                <li>✅ Визуальный редактор процессов</li>
                <li>✅ Автоматизация создания связанных задач</li>
                <li>✅ Сохранение шаблонов процессов</li>
                <li>✅ Подписка на события изменения задач</li>
            </ul>
        </div>

        <button id="installBtn" onclick="installApp()">
            <span id="btnText">Установить приложение</span>
        </button>

        <div id="status"></div>
        <div id="progress" class="progress"></div>
    </div>

    <script>
        let isInstalling = false;

        function showStatus(message, isSuccess) {
            const status = document.getElementById('status');
            status.style.display = 'block';
            status.className = isSuccess ? 'success' : 'error';
            status.innerHTML = message;
        }

        function showProgress(message) {
            const progress = document.getElementById('progress');
            progress.textContent = message;
        }

        function installApp() {
            if (isInstalling) return;
            isInstalling = true;

            const btn = document.getElementById('installBtn');
            const btnText = document.getElementById('btnText');
            btn.disabled = true;
            btnText.innerHTML = '<span class="loader"></span> Установка...';

            BX24.init(function() {
                console.log('✅ BX24 инициализирован');

                // Последовательная установка
                installStep1_UnbindOld();
            });
        }

        // Шаг 1: Удаляем старые placements и webhooks
        function installStep1_UnbindOld() {
            showProgress('Шаг 1/7: Удаление старых регистраций...');
            
            BX24.callMethod('placement.unbind', {
                PLACEMENT: 'TASK_VIEW_TAB'
            }, function(unbindResult) {
                console.log('Старые placements удалены');
                
                BX24.callMethod('event.unbind', {
                    event: 'ONTASKUPDATE',
                    handler: window.location.origin + '/flowtask/task_completion_handler.php'
                }, function() {
                    console.log('Старые webhooks удалены');
                    installStep2_CreateEntities();
                });
            });
        }

        // Шаг 2: Создание Entity Storage
        function installStep2_CreateEntities() {
            showProgress('Шаг 2/7: Создание хранилищ данных...');
            console.log('📦 Создаём хранилища tflow_nodes и tflow_tmpl...');

            // Создаём хранилище для узлов процессов
            BX24.callMethod('entity.add', {
                ENTITY: 'tflow_nodes',
                NAME: 'Flowtask Nodes Storage',
                ACCESS: {
                    AU: 'W'
                }
            }, (result1) => {
                if (result1.error()) {
                    const err = result1.error();
                    // Если уже существует - это нормально
                    if (err && (String(err).includes('ALREADY_EXISTS') || String(err).includes('already exists'))) {
                        console.log('✅ Хранилище tflow_nodes уже существует');
                    } else {
                        console.warn('⚠️ Не удалось создать tflow_nodes:', err);
                    }
                } else {
                    console.log('✅ Хранилище tflow_nodes создано');
                }

                // Создаём хранилище для шаблонов
                BX24.callMethod('entity.add', {
                    ENTITY: 'tflow_tmpl',
                    NAME: 'Flowtask Templates Storage',
                    ACCESS: {
                        AU: 'W'
                    }
                }, (result2) => {
                    if (result2.error()) {
                        const err = result2.error();
                        // Если уже существует - это нормально
                        if (err && (String(err).includes('ALREADY_EXISTS') || String(err).includes('already exists'))) {
                            console.log('✅ Хранилище tflow_tmpl уже существует');
                        } else {
                            console.warn('⚠️ Не удалось создать tflow_tmpl:', err);
                        }
                    } else {
                        console.log('✅ Хранилище tflow_tmpl создано');
                    }

                    // Продолжаем установку
                    installStep3_CreateCustomField();
                });
            });
        }

        // Шаг 3: Создание пользовательского поля для ProcessId
        function installStep3_CreateCustomField() {
            showProgress('Шаг 3/7: Создание пользовательского поля ProcessId...');

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
            }, function(fieldResult) {
                if (fieldResult.error()) {
                    const errorCode = fieldResult.error().ex.error;
                    // Если поле уже существует (ERROR_FIELD_EXISTS) - это не ошибка
                    if (errorCode === 'ERROR_FIELD_EXISTS' || errorCode === 'ERROR_ALREADY_EXISTS') {
                        console.log('✅ Поле UF_FLOWTASK_PROCESS_ID уже существует');
                    } else {
                        console.warn('⚠️ Ошибка создания поля:', fieldResult.error());
                    }
                } else {
                    console.log('✅ Пользовательское поле UF_FLOWTASK_PROCESS_ID создано');
                }
                installStep4_RegisterPlacement();
            });
        }

        // Шаг 4: Регистрация Placement
        function installStep4_RegisterPlacement() {
            showProgress('Шаг 4/7: Регистрация вкладки "Процессы"...');
            
            BX24.callMethod('placement.bind', {
                PLACEMENT: 'TASK_VIEW_TAB',
                HANDLER: 'https://test.test-rms.ru/flowtask/handler.php',
                LANG_ALL: {
                    ru: { TITLE: 'Процессы' },
                    en: { TITLE: 'Processes' }
                }
            }, function(bindResult) {
                if (bindResult.error()) {
                    console.error('❌ Ошибка placement:', bindResult.error());
                    showStatus('❌ Ошибка регистрации placement: ' + JSON.stringify(bindResult.error()), false);
                    resetInstallButton();
                    return;
                }

                console.log('✅ Placement зарегистрирован');
                installStep5_RegisterWebhook();
            });
        }

        // Шаг 5: Регистрация Webhook
        function installStep5_RegisterWebhook() {
            showProgress('Шаг 5/7: Регистрация webhook для real-time обновлений...');

            // Регистрируем webhook для ONTASKUPDATE
            BX24.callMethod('event.bind', {
                event: 'ONTASKUPDATE',
                handler: 'https://test.test-rms.ru/flowtask/task_update_webhook.php'
            }, function(eventResult) {
                if (eventResult.error()) {
                    console.warn('⚠️ Webhook ONTASKUPDATE не зарегистрирован:', eventResult.error());
                } else {
                    console.log('✅ Webhook ONTASKUPDATE зарегистрирован');
                }

                installStep6_Finish();
            });
        }

        // Шаг 6: Завершение
        function installStep6_Finish() {
            showProgress('Шаг 6/7: Завершение установки...');
            
            console.log('✅ Установка завершена');
            showStatus('✅ Приложение успешно установлено!<br><br>Откройте любую задачу и найдите вкладку "Процессы".', true);
            
            const btnText = document.getElementById('btnText');
            btnText.textContent = '✅ Установлено';

            // ВАЖНО: Вызываем installFinish
            BX24.installFinish();

            setTimeout(function() {
                if (typeof BX24.closeApplication === 'function') {
                    BX24.closeApplication();
                }
            }, 2000);
        }

        function resetInstallButton() {
            const btn = document.getElementById('installBtn');
            const btnText = document.getElementById('btnText');
            btn.disabled = false;
            btnText.textContent = 'Попробовать снова';
            isInstalling = false;
        }
    </script>
</body>
</html>
