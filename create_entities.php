<?php
/**
 * Создание Entity с короткими именами (≤20 символов)
 */
require_once($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Создание Entity</title>
    <script src="//api.bitrix24.com/api/v1/"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 40px;
            background: #f5f7fa;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-bottom: 30px; }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px 5px;
        }
        .btn:hover { transform: translateY(-2px); }
        #log {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            font-family: monospace;
            white-space: pre-wrap;
            max-height: 500px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Создание Entity для Telegsarflow</h1>
        
        <button class="btn" onclick="createAllEntities()">Создать все Entity</button>
        <button class="btn" onclick="listEntities()">Показать существующие</button>
        <button class="btn" onclick="deleteOldEntities()">Удалить старые Entity</button>
        
        <div id="log"></div>
    </div>

    <script>
        function log(msg) {
            const logEl = document.getElementById('log');
            logEl.textContent += msg + '\n';
            logEl.scrollTop = logEl.scrollHeight;
        }

        function clearLog() {
            document.getElementById('log').textContent = '';
        }

        BX24.init(function() {
            log('✅ BX24 инициализирован\n');
        });

        function createAllEntities() {
            clearLog();
            log('🔧 Создаём Entity с короткими именами...\n');

            const entities = [
                {
                    ENTITY: 'tflow_task_pos',
                    NAME: 'Task Positions',
                    PROPERTY: {
                        taskId: { NAME: 'Task ID', TYPE: 'S' },
                        positionX: { NAME: 'Position X', TYPE: 'N' },
                        positionY: { NAME: 'Position Y', TYPE: 'N' }
                    }
                },
                {
                    ENTITY: 'tflow_future_task',
                    NAME: 'Future Tasks',
                    PROPERTY: {
                        futureId: { NAME: 'Future ID', TYPE: 'S' },
                        title: { NAME: 'Title', TYPE: 'S' },
                        description: { NAME: 'Description', TYPE: 'S' },
                        groupId: { NAME: 'Group ID', TYPE: 'S' },
                        responsibleId: { NAME: 'Responsible ID', TYPE: 'S' },
                        conditionType: { NAME: 'Condition Type', TYPE: 'S' },
                        delayMinutes: { NAME: 'Delay Minutes', TYPE: 'N' },
                        positionX: { NAME: 'Position X', TYPE: 'N' },
                        positionY: { NAME: 'Position Y', TYPE: 'N' },
                        isCreated: { NAME: 'Is Created', TYPE: 'S' },
                        realTaskId: { NAME: 'Real Task ID', TYPE: 'S' }
                    }
                },
                {
                    ENTITY: 'tflow_connections',
                    NAME: 'Task Connections',
                    PROPERTY: {
                        sourceId: { NAME: 'Source ID', TYPE: 'S' },
                        targetId: { NAME: 'Target ID', TYPE: 'S' },
                        connectionType: { NAME: 'Type', TYPE: 'S' }
                    }
                },
                {
                    ENTITY: 'tflow_templates',
                    NAME: 'Process Templates',
                    PROPERTY: {
                        templateName: { NAME: 'Template Name', TYPE: 'S' },
                        processData: { NAME: 'Process Data', TYPE: 'S' },
                        createdBy: { NAME: 'Created By', TYPE: 'S' }
                    }
                }
            ];

            let created = 0;
            entities.forEach((entityData, index) => {
                setTimeout(() => {
                    BX24.callMethod('entity.add', {
                        ENTITY: entityData.ENTITY,
                        NAME: entityData.NAME,
                        PROPERTY: entityData.PROPERTY,
                        ACCESS: { X: {} }
                    }, (result) => {
                        if (result.error()) {
                            log('❌ ' + entityData.ENTITY + ': ' + result.error());
                        } else {
                            log('✅ ' + entityData.ENTITY + ' создан');
                            created++;
                        }

                        if (index === entities.length - 1) {
                            log('\n🎉 Создано ' + created + ' из ' + entities.length + ' entity');
                        }
                    });
                }, index * 500);
            });
        }

        function listEntities() {
            clearLog();
            log('📋 Список всех Entity:\n');

            BX24.callMethod('entity.get', {}, (result) => {
                if (result.error()) {
                    log('❌ Ошибка: ' + result.error());
                    return;
                }

                const entities = result.data();
                log('Найдено ' + entities.length + ' entity:\n');

                entities.forEach((e, i) => {
                    log((i + 1) + '. ENTITY: ' + e.ENTITY + ', NAME: ' + e.NAME);
                });
            });
        }

        function deleteOldEntities() {
            clearLog();
            log('🗑️ Удаление старых Entity (telegsarflow_*)...\n');

            BX24.callMethod('entity.get', {}, (result) => {
                if (result.error()) {
                    log('❌ Ошибка: ' + result.error());
                    return;
                }

                const entities = result.data();
                const toDelete = entities.filter(e => e.ENTITY.startsWith('telegsarflow_'));

                log('Найдено ' + toDelete.length + ' старых entity для удаления:\n');

                toDelete.forEach((e, index) => {
                    setTimeout(() => {
                        BX24.callMethod('entity.delete', {
                            ENTITY: e.ENTITY
                        }, (delResult) => {
                            if (delResult.error()) {
                                log('❌ ' + e.ENTITY + ': ' + delResult.error());
                            } else {
                                log('✅ Удалён: ' + e.ENTITY);
                            }
                        });
                    }, index * 300);
                });
            });
        }
    </script>
</body>
</html>
