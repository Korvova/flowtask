<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Процессы - Telegsarflow</title>
    <script src="//api.bitrix24.com/api/v1/"></script>
    <!-- Pull библиотека загружается динамически после получения домена портала -->

    <script src="assets/js/react.min.js"></script>
    <script src="assets/js/react-dom.min.js"></script>
    <script src="assets/js/reactflow.min.js"></script>
    <link rel="stylesheet" href="assets/css/reactflow.css">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
            height: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: #f5f7fa;
        }
        #root {
            width: 100%;
            height: 100%;
            min-height: 800px;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-size: 24px;
            color: #666;
        }
        #debugPanel {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
        }
        #debugPanel button {
            padding: 10px 15px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-left: 5px;
        }
        #debugPanel button:hover {
            background: #5568d3;
        }
        #debugModal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            align-items: center;
            justify-content: center;
        }
        #debugModal.show {
            display: flex;
        }
        .debug-content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .debug-result {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 12px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">⏳ Загрузка...</div>
    </div>

    <!-- Debug Panel -->
    <div id="debugPanel">
        <button onclick="showDebugModal()">🔧 Отладка Entity (автодеплой работает!)</button>
    </div>

    <!-- Debug Modal -->
    <div id="debugModal">
        <div class="debug-content">
            <h2>🔍 Отладка Entity</h2>
            <div>
                <button onclick="listAllEntities()">📋 Список Entity</button>
                <button onclick="listAllPositions()" style="background: #17a2b8;">📍 Список позиций</button>
                <button onclick="listAllConnections()" style="background: #ff9800;">🔗 Список связей</button>
                <button onclick="listAllFutureTasks()" style="background: #9c27b0;">🎯 Список предзадач</button>
                <button onclick="createProcessIdField()" style="background: #673ab7;">🔧 Создать поле ProcessID</button>
                <button onclick="createAllEntities()" style="background: #28a745;">➕ Создать Entity</button>
                <button onclick="clearAllData()" style="background: #ff5722;">🧹 Очистить данные</button>
                <button onclick="deleteOldEntities()" style="background: #dc3545;">🗑️ Удалить старые Entity</button>
                <button onclick="hideDebugModal()" style="background: #ccc; color: #333;">Закрыть</button>
            </div>
            <div id="debugResult" class="debug-result">Нажмите кнопку для проверки...</div>
        </div>
    </div>

    <script src="components/StatusColors.js?v=1761656300000"></script>
    <script src="components/PullSubscription.js?v=1761656300000"></script>
    <script src="components/TaskCreator.js?v=1761656300000"></script>
    <script src="components/TaskNode.js?v=1761656300000"></script>
    <script src="components/TaskModal.js?v=1761656300000"></script>
    <script src="components/FlowCanvas.js?v=1761656300000"></script>

    <script>
        // Debug functions
        function showDebugModal() {
            document.getElementById("debugModal").classList.add("show");
        }

        function hideDebugModal() {
            document.getElementById("debugModal").classList.remove("show");
        }

        function debugLog(message) {
            const result = document.getElementById("debugResult");
            result.textContent += message + "\n";
            console.log(message);
        }

        function clearDebugLog() {
            document.getElementById("debugResult").textContent = "";
        }

        function listAllEntities() {
            clearDebugLog();
            debugLog("📋 Получение списка всех Entity...\n");

            BX24.callMethod("entity.get", {}, function(result) {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + JSON.stringify(result.error(), null, 2));
                } else {
                    const entities = result.data();
                    debugLog("✅ Найдено Entity: " + entities.length + "\n");

                    entities.forEach((entity, index) => {
                        debugLog("━━━━━━━━━━━━━━━━━━━━");
                        debugLog((index + 1) + ". ENTITY: " + entity.ENTITY);
                        debugLog("   NAME: " + entity.NAME);
                    });

                    if (entities.length === 0) {
                        debugLog("\n⚠️ Entity НЕ НАЙДЕНЫ!");
                        debugLog("Нужно переустановить приложение!");
                    }
                }
            });
        }

        function listAllPositions() {
            clearDebugLog();
            debugLog("📍 Все сохранённые позиции в tflow_pos...\n");

            BX24.callMethod("entity.item.get", {
                ENTITY: "tflow_pos"
            }, function(result) {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + JSON.stringify(result.error(), null, 2));
                } else {
                    const items = result.data();
                    debugLog("✅ Найдено позиций: " + items.length + "\n");

                    if (items.length === 0) {
                        debugLog("⚠️ Entity tflow_pos пустая!\n");
                        debugLog("Позиции не сохраняются или не были созданы.");
                        return;
                    }

                    items.forEach((item, index) => {
                        debugLog("━━━━━━━━━━━━━━━━━━━━");
                        debugLog((index + 1) + ". ID: " + item.ID);
                        debugLog("   NAME: " + item.NAME);

                        if (item.DETAIL_TEXT) {
                            try {
                                const data = JSON.parse(item.DETAIL_TEXT);
                                debugLog("   taskId: " + data.taskId);
                                debugLog("   positionX: " + data.positionX);
                                debugLog("   positionY: " + data.positionY);
                            } catch (e) {
                                debugLog("   ❌ Ошибка парсинга JSON");
                            }
                        } else {
                            debugLog("   (нет DETAIL_TEXT)");
                        }
                    });
                }
            });
        }

        function listAllConnections() {
            clearDebugLog();
            debugLog("🔗 Все связи в tflow_conn...\n");

            BX24.callMethod("entity.item.get", {
                ENTITY: "tflow_conn"
            }, function(result) {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + JSON.stringify(result.error(), null, 2));
                } else {
                    const items = result.data();
                    debugLog("✅ Найдено связей: " + items.length + "\n");

                    if (items.length === 0) {
                        debugLog("⚠️ Entity tflow_conn пустая!\n");
                        debugLog("Связи не сохраняются или не были созданы.");
                        return;
                    }

                    items.forEach((item, index) => {
                        debugLog("━━━━━━━━━━━━━━━━━━━━");
                        debugLog((index + 1) + ". ID: " + item.ID);
                        debugLog("   NAME: " + item.NAME);

                        if (item.DETAIL_TEXT) {
                            try {
                                const data = JSON.parse(item.DETAIL_TEXT);
                                debugLog("   sourceId: " + data.sourceId);
                                debugLog("   targetId: " + data.targetId);
                                debugLog("   connectionType: " + data.connectionType);
                            } catch (e) {
                                debugLog("   ❌ Ошибка парсинга JSON");
                                debugLog("   DETAIL_TEXT: " + item.DETAIL_TEXT);
                            }
                        } else {
                            debugLog("   (нет DETAIL_TEXT)");
                        }
                    });
                }
            });
        }

        function listAllFutureTasks() {
            clearDebugLog();
            debugLog("🎯 Все предзадачи в tflow_future...\n");

            BX24.callMethod("entity.item.get", {
                ENTITY: "tflow_future"
            }, function(result) {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + JSON.stringify(result.error(), null, 2));
                } else {
                    const items = result.data();
                    debugLog("✅ Найдено предзадач: " + items.length + "\n");

                    if (items.length === 0) {
                        debugLog("⚠️ Entity tflow_future пустая!\n");
                        debugLog("Предзадачи не были созданы.");
                        return;
                    }

                    items.forEach((item, index) => {
                        debugLog("━━━━━━━━━━━━━━━━━━━━");
                        debugLog((index + 1) + ". ID: " + item.ID);
                        debugLog("   NAME: " + item.NAME);

                        if (item.DETAIL_TEXT) {
                            try {
                                const data = JSON.parse(item.DETAIL_TEXT);
                                debugLog("   futureId: " + data.futureId);
                                debugLog("   title: " + data.title);
                                debugLog("   parentTaskId: " + data.parentTaskId);
                                debugLog("   isCreated: " + data.isCreated);
                                debugLog("   realTaskId: " + (data.realTaskId || 'null'));
                                debugLog("   conditionType: " + data.conditionType);
                            } catch (e) {
                                debugLog("   ❌ Ошибка парсинга JSON");
                                debugLog("   DETAIL_TEXT: " + item.DETAIL_TEXT);
                            }
                        } else {
                            debugLog("   (нет DETAIL_TEXT)");
                        }
                    });
                }
            });
        }


        function createProcessIdField() {
            clearDebugLog();
            debugLog("🔧 Создание пользовательского поля UF_FLOWTASK_PROCESS_ID...\n");

            BX24.callMethod("task.item.userfield.add", {
                fields: {
                    FIELD_NAME: "UF_FLOWTASK_PROCESS_ID",
                    USER_TYPE_ID: "string",
                    LABEL: "Flowtask Process ID",
                    MANDATORY: "N",
                    SHOW_FILTER: "Y",
                    SHOW_IN_LIST: "Y",
                    EDIT_IN_LIST: "Y"
                }
            }, (result) => {
                if (result.error()) {
                    debugLog("❌ ОШИБКА: " + JSON.stringify(result.error(), null, 2));

                    // Проверяем, может поле уже существует
                    debugLog("\n🔍 Проверяем существующие поля...");
                    BX24.callMethod("task.item.userfield.getlist", {}, (listResult) => {
                        if (listResult.error()) {
                            debugLog("❌ Ошибка получения списка полей: " + JSON.stringify(listResult.error()));
                        } else {
                            const fields = listResult.data();
                            const processField = fields.find(f => f.FIELD_NAME === "UF_FLOWTASK_PROCESS_ID");

                            if (processField) {
                                debugLog("\n✅ Поле УЖЕ СУЩЕСТВУЕТ!");
                                debugLog("ID: " + processField.ID);
                                debugLog("Название: " + processField.FIELD_NAME);
                                debugLog("Тип: " + processField.USER_TYPE_ID);
                                debugLog("Метка: " + processField.LABEL);
                            } else {
                                debugLog("\n⚠️ Поле не найдено в списке существующих полей");
                            }
                        }
                    });
                } else {
                    debugLog("✅ УСПЕШНО СОЗДАНО!");
                    debugLog("\nДанные поля:");
                    debugLog("ID: " + result.data().ID);
                    debugLog("Название: UF_FLOWTASK_PROCESS_ID");
                    debugLog("Тип: string");
                    debugLog("\n🎉 Теперь можно использовать processId для группировки задач!");
                }
            });
        }

        function createAllEntities() {
            clearDebugLog();
            debugLog("🔧 Создаём Entity с короткими именами...\n");

            const entities = [
                {
                    ENTITY: "tflow_pos",
                    NAME: "Task Pos",
                    PROPERTY: {
                        taskId: { NAME: "Task ID", TYPE: "S" },
                        positionX: { NAME: "Position X", TYPE: "N" },
                        positionY: { NAME: "Position Y", TYPE: "N" }
                    }
                },
                {
                    ENTITY: "tflow_future",
                    NAME: "Future Tasks",
                    PROPERTY: {
                        futureId: { NAME: "Future ID", TYPE: "S" },
                        title: { NAME: "Title", TYPE: "S" },
                        description: { NAME: "Description", TYPE: "S" },
                        groupId: { NAME: "Group ID", TYPE: "S" },
                        responsibleId: { NAME: "Responsible ID", TYPE: "S" },
                        conditionType: { NAME: "Condition Type", TYPE: "S" },
                        delayMinutes: { NAME: "Delay Minutes", TYPE: "N" },
                        positionX: { NAME: "Position X", TYPE: "N" },
                        positionY: { NAME: "Position Y", TYPE: "N" },
                        isCreated: { NAME: "Is Created", TYPE: "S" },
                        realTaskId: { NAME: "Real Task ID", TYPE: "S" }
                    }
                },
                {
                    ENTITY: "tflow_conn",
                    NAME: "Connections",
                    PROPERTY: {
                        sourceId: { NAME: "Source ID", TYPE: "S" },
                        targetId: { NAME: "Target ID", TYPE: "S" },
                        connectionType: { NAME: "Type", TYPE: "S" }
                    }
                },
                {
                    ENTITY: "tflow_tmpl",
                    NAME: "Templates",
                    PROPERTY: {
                        templateName: { NAME: "Template Name", TYPE: "S" },
                        processData: { NAME: "Process Data", TYPE: "S" },
                        createdBy: { NAME: "Created By", TYPE: "S" }
                    }
                }
            ];

            let created = 0;
            entities.forEach((entityData, index) => {
                setTimeout(() => {
                    BX24.callMethod("entity.add", {
                        ENTITY: entityData.ENTITY,
                        NAME: entityData.NAME,
                        PROPERTY: entityData.PROPERTY,
                        ACCESS: { X: {} }
                    }, (result) => {
                        if (result.error()) {
                            debugLog("❌ " + entityData.ENTITY + ": " + result.error());
                        } else {
                            debugLog("✅ " + entityData.ENTITY + " создан");
                            created++;
                        }

                        if (index === entities.length - 1) {
                            setTimeout(() => {
                                debugLog("\n🎉 Создано " + created + " из " + entities.length + " entity");
                            }, 500);
                        }
                    });
                }, index * 500);
            });
        }

        function clearAllData() {
            clearDebugLog();

            if (!confirm("⚠️ ВНИМАНИЕ!\n\nЭто удалит ВСЕ данные из:\n• tflow_pos (позиции)\n• tflow_conn (связи)\n• tflow_future (предзадачи)\n\nПродолжить?")) {
                debugLog("❌ Отменено пользователем");
                return;
            }

            debugLog("🧹 Очистка всех данных из tflow_*...\n");

            const entities = ['tflow_pos', 'tflow_conn', 'tflow_future'];
            let totalDeleted = 0;
            let processed = 0;

            entities.forEach((entityName) => {
                debugLog("━━━━━━━━━━━━━━━━━━━━");
                debugLog("🗑️ Очищаем " + entityName + "...");

                BX24.callMethod("entity.item.get", {
                    ENTITY: entityName
                }, (result) => {
                    if (result.error()) {
                        debugLog("❌ Ошибка загрузки " + entityName + ": " + result.error());
                        processed++;
                        return;
                    }

                    const items = result.data();
                    debugLog("📊 Найдено записей: " + items.length);

                    if (items.length === 0) {
                        debugLog("✅ " + entityName + " уже пуста");
                        processed++;
                        return;
                    }

                    let deleted = 0;
                    items.forEach((item, index) => {
                        setTimeout(() => {
                            BX24.callMethod("entity.item.delete", {
                                ENTITY: entityName,
                                ID: item.ID
                            }, (delResult) => {
                                if (delResult.error()) {
                                    debugLog("  ❌ ID " + item.ID + ": " + delResult.error());
                                } else {
                                    deleted++;
                                    totalDeleted++;
                                    if (deleted % 10 === 0 || deleted === items.length) {
                                        debugLog("  ✅ Удалено: " + deleted + "/" + items.length);
                                    }
                                }

                                if (index === items.length - 1) {
                                    debugLog("✅ " + entityName + " очищен (" + deleted + " записей)");
                                    processed++;

                                    if (processed === entities.length) {
                                        debugLog("\n━━━━━━━━━━━━━━━━━━━━");
                                        debugLog("🎉 ОЧИСТКА ЗАВЕРШЕНА!");
                                        debugLog("Всего удалено записей: " + totalDeleted);
                                    }
                                }
                            });
                        }, index * 100); // 100ms между удалениями
                    });
                });
            });
        }

        function deleteOldEntities() {
            clearDebugLog();
            debugLog("🗑️ Удаление старых Entity (telegsarflow_*)...\n");

            BX24.callMethod("entity.get", {}, (result) => {
                if (result.error()) {
                    debugLog("❌ Ошибка: " + result.error());
                    return;
                }

                const entities = result.data();
                const toDelete = entities.filter(e => e.ENTITY.startsWith("telegsarflow_"));

                debugLog("Найдено " + toDelete.length + " старых entity\n");

                if (toDelete.length === 0) {
                    debugLog("✅ Старых entity не найдено");
                    return;
                }

                toDelete.forEach((e, index) => {
                    setTimeout(() => {
                        BX24.callMethod("entity.delete", {
                            ENTITY: e.ENTITY
                        }, (delResult) => {
                            if (delResult.error()) {
                                debugLog("❌ " + e.ENTITY + ": " + delResult.error());
                            } else {
                                debugLog("✅ Удалён: " + e.ENTITY);
                            }
                        });
                    }, index * 300);
                });
            });
        }

        // Main app initialization
        function showInstallPage() {
            document.getElementById("root").innerHTML = `
                <div style="max-width: 800px; margin: 50px auto; padding: 40px; background: white; border-radius: 15px;">
                    <h1>🚀 Telegsarflow</h1>
                    <p>Приложение установлено!</p>
                </div>
            `;
            BX24.fitWindow();
        }

        // === ЗАГРУЗКА BITRIX CORE (необходим для Pull) ===
        function loadBitrixCore(domain) {
            return new Promise((resolve, reject) => {
                const corePaths = [
                    `/bitrix/js/main/core/core.min.js`,
                    `/bitrix/js/main/core/core.js`
                ];

                let loaded = false;
                let index = 0;

                function tryLoadCore() {
                    if (loaded || index >= corePaths.length) {
                        if (!loaded) reject(new Error('Bitrix core not found'));
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = 'https://' + domain + corePaths[index];
                    console.log('⏳ Попытка загрузить core:', script.src);
                    script.onload = () => {
                        loaded = true;
                        console.log('✅ Bitrix core загружен:', corePaths[index]);
                        resolve();
                    };
                    script.onerror = (err) => {
                        console.warn('⚠️ Не удалось загрузить core:', corePaths[index], err);
                        index++;
                        tryLoadCore();
                    };
                    document.head.appendChild(script);
                }

                tryLoadCore();
            });
        }

        // === ДИНАМИЧЕСКАЯ ЗАГРУЗКА PULL БИБЛИОТЕКИ ===
        function loadPullLibrary(domain) {
            return new Promise((resolve, reject) => {
                const paths = [
                    `/bitrix/js/pull/client/pull.client.min.js`,  // ✅ ПРАВИЛЬНЫЙ ПУТЬ!
                    `/bitrix/js/pull/client/pull.client.js`,
                    `/bitrix/js/pull/pull.min.js`,
                    `/bitrix/js/pull/pull.bundle.js`,
                    `/bitrix/js/pull/pull.js`
                ];

                let loaded = false;
                let index = 0;

                function tryLoad() {
                    if (loaded || index >= paths.length) {
                        if (!loaded) reject(new Error('Pull library not found'));
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = 'https://' + domain + paths[index];
                    console.log('⏳ Попытка загрузить:', script.src);
                    script.onload = () => {
                        loaded = true;
                        console.log('✅ Pull библиотека загружена:', paths[index]);
                        resolve();
                    };
                    script.onerror = (err) => {
                        console.warn('⚠️ Не удалось загрузить:', paths[index], err);
                        index++;
                        tryLoad();
                    };
                    document.head.appendChild(script);
                }

                tryLoad();
            });
        }

        BX24.init(function() {
            console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-size: 16px;');
            console.log('%c🚀 FLOWTASK ЗАГРУЖЕН! Версия: v=1761656300000', 'color: #00ff00; font-size: 20px; font-weight: bold;');
            console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-size: 16px;');

            const auth = BX24.getAuth();
            const bitrixDomain = auth.domain;
            console.log('🌐 Домен портала Bitrix24:', bitrixDomain);

            const placement = BX24.placement.info();
            console.log('%c📍 Placement Info:', 'color: #2196f3; font-weight: bold;', placement);

            if (placement?.placement === "DEFAULT") {
                showInstallPage();
                return;
            }

            const taskId = placement?.options?.taskId || placement?.options?.ID;

            if (!taskId) {
                document.getElementById("root").innerHTML =
                    "<div class=\"loading\">❌ Не удалось определить ID задачи</div>";
                return;
            }

            // === REAL-TIME UPDATES: Загружаем Bitrix core и Pull библиотеку ===
            console.log('📡 Загружаем Bitrix core...');

            loadBitrixCore(bitrixDomain)
                .then(() => {
                    console.log('📡 Загружаем Pull библиотеку...');
                    return loadPullLibrary(bitrixDomain);
                })
                .then(() => {
                    console.log('✅ Pull библиотека загружена');
                    console.log('🔍 Проверка доступных объектов:');
                    console.log('  - typeof BX:', typeof BX);
                    console.log('  - typeof BX.PullClient:', typeof BX !== 'undefined' ? typeof BX.PullClient : 'BX undefined');
                    console.log('  - typeof window.BXPullClient:', typeof window.BXPullClient);
                    console.log('  - BX keys:', typeof BX !== 'undefined' ? Object.keys(BX).slice(0, 20) : 'none');

                    // Даём время на инициализацию BX объектов
                    setTimeout(() => {
                        console.log('🔍 Проверка после 500ms:');
                        console.log('  - typeof BX.PullClient:', typeof BX !== 'undefined' ? typeof BX.PullClient : 'BX undefined');
                        // Инициализируем PullSubscription с BX.PullClient
                        if (window.PullSubscription && window.PullSubscription.initPullClient) {
                            window.PullSubscription.initPullClient()
                                .then(() => {
                                    console.log('✅ PullSubscription инициализирован через BX.PullClient');
                                })
                                .catch((err) => {
                                    console.warn('⚠️ BX.PullClient не удалось инициализировать, используем polling:', err);
                                });
                        }
                    }, 500); // Задержка для полной загрузки BX
                })
                .catch((err) => {
                    console.error('❌ Bitrix core или Pull библиотека недоступны, используем polling:', err);
                    console.log('📡 Fallback: polling режим для внешнего iframe');
                });

            BX24.callMethod("tasks.task.get", { taskId: taskId }, function(result) {
                if (result.error()) {
                    console.error('%c❌ ОШИБКА загрузки задачи:', 'color: #f44336; font-weight: bold;', result.error());
                    document.getElementById("root").innerHTML =
                        "<div class=\"loading\">❌ Ошибка загрузки задачи</div>";
                    return;
                }

                const task = result.data().task;
                console.log('%c✅ Задача загружена:', 'color: #4caf50; font-weight: bold;', task);
                console.log('%c  • ID:', 'color: #2196f3;', task.id);
                console.log('%c  • Название:', 'color: #2196f3;', task.title);
                console.log('%c  • Статус:', 'color: #2196f3;', task.status);

                if (typeof window.FlowCanvas !== "undefined") {
                    window.FlowCanvas.render(task);
                } else {
                    console.error("FlowCanvas not loaded");
                }
            });

            // Увеличиваем высоту iframe для больше пространства
            setTimeout(() => {
                BX24.resizeWindow(window.innerWidth, Math.max(window.innerHeight, 1200));
            }, 500);
        });
    </script>
</body>
</html>
