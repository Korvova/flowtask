<?php
/**
 * Скрипт для очистки старых Entity Storage
 * Удаляет все хранилища созданные приложением
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
    <title>Очистка Entity Storage</title>
    <script src="//api.bitrix24.com/api/v1/"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .log { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .success { color: green; }
        .error { color: red; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>🗑️ Очистка Entity Storage</h1>
    <p>Этот скрипт удалит все хранилища созданные приложением Flowtask</p>

    <button onclick="cleanupEntities()">Начать очистку</button>

    <div id="log" class="log"></div>

    <script>
        function log(message, isError = false) {
            const logDiv = document.getElementById('log');
            const className = isError ? 'error' : 'success';
            logDiv.innerHTML += `<div class="${className}">${message}</div>`;
            console.log(message);
        }

        function cleanupEntities() {
            BX24.init(function() {
                log('🔍 Получаем список всех Entity Storage...');

                BX24.callMethod('entity.get', {}, function(result) {
                    if (result.error()) {
                        log('❌ Ошибка получения списка: ' + JSON.stringify(result.error()), true);
                        return;
                    }

                    const entities = result.data();
                    log(`📋 Найдено хранилищ: ${entities.length}`);

                    // Фильтруем только наши хранилища
                    const ourEntities = entities.filter(e =>
                        e.ENTITY.startsWith('tflow_') ||
                        e.ENTITY === 'tflow_nodes'
                    );

                    if (ourEntities.length === 0) {
                        log('✅ Хранилищ Flowtask не найдено');
                        return;
                    }

                    log(`🗑️ Будет удалено: ${ourEntities.length} хранилищ`);
                    ourEntities.forEach(e => log(`  - ${e.ENTITY} (${e.NAME})`));

                    // Удаляем по одному
                    let deleted = 0;
                    ourEntities.forEach((entity, index) => {
                        setTimeout(() => {
                            log(`🗑️ Удаляем ${entity.ENTITY}...`);

                            BX24.callMethod('entity.delete', {
                                ENTITY: entity.ENTITY
                            }, function(deleteResult) {
                                if (deleteResult.error()) {
                                    log(`⚠️ Не удалось удалить ${entity.ENTITY}: ${deleteResult.error().ex?.error_description || deleteResult.error()}`, true);
                                } else {
                                    log(`✅ Удалено: ${entity.ENTITY}`);
                                }

                                deleted++;
                                if (deleted === ourEntities.length) {
                                    log('');
                                    log('✅ Очистка завершена!');
                                    log('Теперь можно переустановить приложение');
                                }
                            });
                        }, index * 500); // Задержка между запросами
                    });
                });
            });
        }
    </script>
</body>
</html>
