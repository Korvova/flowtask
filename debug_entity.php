<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Debug Entity tflow_nodes</title>
    <script src="//api.bitrix24.com/api/v1/"></script>
    <style>
        body {
            font-family: monospace;
            padding: 20px;
            background: #f5f5f5;
        }
        .log {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #2fc6f6;
        }
        .error {
            border-left-color: #ff4757;
            background: #fff5f5;
        }
        .success {
            border-left-color: #2ecc71;
            background: #f0fff4;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <h1>🔍 Проверка Entity Storage: tflow_nodes</h1>
    <div id="logs"></div>

    <script>
        BX24.init(function() {
            const logs = document.getElementById('logs');

            function addLog(message, type = 'log') {
                const div = document.createElement('div');
                div.className = 'log ' + type;
                div.innerHTML = '<strong>' + new Date().toLocaleTimeString() + '</strong><br>' + message;
                logs.appendChild(div);
            }

            addLog('Начинаем проверку...', 'log');

            // Шаг 1: Проверяем существование Entity
            addLog('1️⃣ Проверяем существование Entity tflow_nodes', 'log');

            BX24.callMethod('entity.get', {
                ENTITY: 'tflow_nodes'
            }, function(result) {
                if (result.error()) {
                    const error = result.error();
                    addLog('❌ Entity.get вернул ошибку:<br><pre>' + JSON.stringify(error, null, 2) + '</pre>', 'error');

                    // Пробуем создать
                    addLog('2️⃣ Пробуем создать Entity tflow_nodes', 'log');

                    BX24.callMethod('entity.add', {
                        ENTITY: 'tflow_nodes',
                        NAME: 'Flowtask Nodes Storage',
                        ACCESS: {
                            'AU': 'W'
                        }
                    }, function(addResult) {
                        if (addResult.error()) {
                            const addError = addResult.error();
                            addLog('❌ Entity.add вернул ошибку:<br><pre>' + JSON.stringify(addError, null, 2) + '</pre>', 'error');

                            // Проверяем, может уже существует
                            if (addError.ex && addError.ex.error_description) {
                                if (addError.ex.error_description.includes('already exists') ||
                                    addError.ex.error_description.includes('уже существует')) {
                                    addLog('✅ Entity уже существует (это нормально)', 'success');
                                } else {
                                    addLog('⚠️ Неизвестная ошибка при создании Entity', 'error');
                                }
                            }
                        } else {
                            addLog('✅ Entity создан успешно:<br><pre>' + JSON.stringify(addResult.data(), null, 2) + '</pre>', 'success');
                        }

                        // Проверяем повторно
                        checkEntityItems();
                    });

                } else {
                    addLog('✅ Entity существует:<br><pre>' + JSON.stringify(result.data(), null, 2) + '</pre>', 'success');
                    checkEntityItems();
                }
            });

            // Проверяем записи в Entity
            function checkEntityItems() {
                addLog('3️⃣ Проверяем записи в Entity', 'log');

                BX24.callMethod('entity.item.get', {
                    ENTITY: 'tflow_nodes',
                    FILTER: {
                        '%NAME': 'process_'
                    },
                    start: 0
                }, function(itemsResult) {
                    if (itemsResult.error()) {
                        addLog('❌ Не удалось загрузить записи:<br><pre>' + JSON.stringify(itemsResult.error(), null, 2) + '</pre>', 'error');
                    } else {
                        const items = itemsResult.data();
                        addLog('✅ Найдено записей: ' + items.length + '<br><pre>' + JSON.stringify(items.slice(0, 3), null, 2) + '</pre>', 'success');

                        if (items.length === 0) {
                            addLog('ℹ️ В Entity пока нет записей (это нормально для нового приложения)', 'log');
                        }
                    }
                });
            }
        });
    </script>
</body>
</html>
