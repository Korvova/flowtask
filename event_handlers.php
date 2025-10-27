<?php
/**
 * Обработчики событий для модуля Telegsarflow
 * Этот файл подключается автоматически при установке приложения
 */

use Bitrix\Main\Loader;
use Bitrix\Pull\Event;

// Функция проверки и создания предзадач
function telegsarflow_CheckAndCreateSubtasks($taskId, $arFields)
{
    global $DB;

    error_log("Telegsarflow: CheckAndCreateSubtasks called for task #{$taskId}");

    // Загружаем процесс для этой задачи
    $query = "SELECT process_data FROM telegsarflow_processes WHERE task_id = " . intval($taskId);
    $result = $DB->Query($query);

    if (!$row = $result->Fetch()) {
        error_log("Telegsarflow: No saved process found for task #{$taskId}");
        return; // Нет сохранённого процесса
    }

    $processData = json_decode($row['process_data'], true);
    if (!$processData || empty($processData['edges'])) {
        error_log("Telegsarflow: No edges found in process for task #{$taskId}");
        return; // Нет связей между задачами
    }

    $newStatus = isset($arFields['STATUS']) ? (int)$arFields['STATUS'] : null;
    if (!$newStatus) {
        error_log("Telegsarflow: No status change detected for task #{$taskId}");
        return; // Статус не изменился
    }

    error_log("Telegsarflow: Task #{$taskId} changed to status {$newStatus}, checking for subtasks to create");

    // Ищем все предзадачи текущей задачи
    foreach ($processData['edges'] as $edge) {
        if ($edge['source'] === 'task-' . $taskId) {
            // Это связь от текущей задачи к предзадаче
            $targetNodeId = $edge['target'];

            // Находим данные предзадачи
            $targetNode = null;
            foreach ($processData['nodes'] as $node) {
                if ($node['id'] === $targetNodeId) {
                    $targetNode = $node;
                    break;
                }
            }

            if (!$targetNode || $targetNode['data']['id'] !== 'new') {
                continue; // Это не будущая задача или уже создана
            }

            // Проверяем условие создания
            $condition = $targetNode['data']['condition'] ?? null;
            $shouldCreate = false;

            if ($condition === 'immediately' || $condition === '➡️ Сразу') {
                $shouldCreate = true;
            } elseif ($condition === 'on_complete' || $condition === '✅ При завершении' || strpos($condition, 'завершени') !== false) {
                $shouldCreate = ($newStatus == 5); // Статус "Завершена"
            } elseif ($condition === 'on_approve' || strpos($condition, 'одобрени') !== false) {
                $shouldCreate = ($newStatus == 4); // Статус "Ждёт контроля"
            }

            if ($shouldCreate) {
                error_log("Telegsarflow: Condition met! Creating subtask from node {$targetNodeId}");

                // Создаём реальную задачу!
                $newTaskId = telegsarflow_CreateTask($targetNode['data'], $taskId);

                if ($newTaskId) {
                    error_log("Telegsarflow: Successfully created task #{$newTaskId}");
                    // Обновляем граф: меняем id с 'new' на реальный ID
                    telegsarflow_UpdateProcessNode($taskId, $targetNodeId, $newTaskId);
                } else {
                    error_log("Telegsarflow: Failed to create task from node {$targetNodeId}");
                }
            }
        }
    }
}

// Функция создания задачи
function telegsarflow_CreateTask($nodeData, $parentTaskId)
{
    // Получаем данные родительской задачи
    $parentTask = \CTasks::GetByID($parentTaskId, false);
    if (!$parentTaskData = $parentTask->Fetch()) {
        return false;
    }

    // Формируем данные новой задачи
    $taskFields = [
        'TITLE' => $nodeData['title'] ?? 'Новая задача',
        'DESCRIPTION' => $nodeData['description'] ?? '',
        'RESPONSIBLE_ID' => $nodeData['responsibleId'] ?? $parentTaskData['RESPONSIBLE_ID'],
        'CREATED_BY' => $parentTaskData['RESPONSIBLE_ID'], // Создатель - ответственный родительской
        'PARENT_ID' => $parentTaskId, // Связь с родительской задачей
        'GROUP_ID' => $parentTaskData['GROUP_ID'] ?? 0,
    ];

    // Создаём задачу
    $newTask = new \CTasks();
    $newTaskId = $newTask->Add($taskFields, ['REGISTER_SONET_EVENT' => 'Y']);

    if ($newTaskId) {
        error_log("Telegsarflow: Created task #{$newTaskId} from node, parent #{$parentTaskId}");
        return $newTaskId;
    }

    return false;
}

// Функция обновления узла в графе
function telegsarflow_UpdateProcessNode($taskId, $oldNodeId, $newTaskId)
{
    global $DB;

    // Загружаем процесс
    $query = "SELECT process_data FROM telegsarflow_processes WHERE task_id = " . intval($taskId);
    $result = $DB->Query($query);

    if (!$row = $result->Fetch()) {
        return;
    }

    $processData = json_decode($row['process_data'], true);

    // Обновляем узел: меняем id с 'new' на реальный
    foreach ($processData['nodes'] as &$node) {
        if ($node['id'] === $oldNodeId) {
            $node['id'] = 'task-' . $newTaskId;
            $node['data']['id'] = $newTaskId;
            $node['data']['isFuture'] = false;
            break;
        }
    }

    // Обновляем связи
    foreach ($processData['edges'] as &$edge) {
        if ($edge['source'] === $oldNodeId) {
            $edge['source'] = 'task-' . $newTaskId;
        }
        if ($edge['target'] === $oldNodeId) {
            $edge['target'] = 'task-' . $newTaskId;
        }
    }

    // Сохраняем обновлённый процесс
    $processJson = $DB->ForSql(json_encode($processData, JSON_UNESCAPED_UNICODE));
    $updateQuery = "UPDATE telegsarflow_processes SET process_data = '{$processJson}' WHERE task_id = " . intval($taskId);
    $DB->Query($updateQuery);

    error_log("Telegsarflow: Updated node {$oldNodeId} -> task-{$newTaskId} in process graph");
}

// Обработчик события изменения задачи
function telegsarflow_OnTaskUpdate($taskId, $arFields)
{
    // Загружаем необходимые модули
    if (!Loader::includeModule('pull')) {
        return;
    }

    if (!Loader::includeModule('tasks')) {
        return;
    }

    // 1. Проверяем и создаём предзадачи если нужно
    telegsarflow_CheckAndCreateSubtasks($taskId, $arFields);

    // 2. Получаем ID всех пользователей, которые работают с этой задачей
    $userIds = [];
    
    if (!empty($arFields['CREATED_BY'])) {
        $userIds[] = (int)$arFields['CREATED_BY'];
    }
    
    if (!empty($arFields['RESPONSIBLE_ID'])) {
        $userIds[] = (int)$arFields['RESPONSIBLE_ID'];
    }
    
    if (!empty($arFields['ACCOMPLICES']) && is_array($arFields['ACCOMPLICES'])) {
        $userIds = array_merge($userIds, array_map('intval', $arFields['ACCOMPLICES']));
    }
    
    if (!empty($arFields['AUDITORS']) && is_array($arFields['AUDITORS'])) {
        $userIds = array_merge($userIds, array_map('intval', $arFields['AUDITORS']));
    }
    
    // Убираем дубли
    $userIds = array_unique($userIds);

    // Отправляем PULL событие всем заинтересованным пользователям
    foreach ($userIds as $userId) {
        if ($userId > 0) {
            // Используем встроенный механизм PULL Bitrix24
            // Работает и в облаке, и в коробке без дополнительных настроек
            Event::add($userId, [
                'module_id' => 'telegsarflow',
                'command' => 'task_status_changed',
                'params' => [
                    'TASK_ID' => (int)$taskId,
                    'STATUS' => isset($arFields['STATUS']) ? (int)$arFields['STATUS'] : null,
                    'TITLE' => isset($arFields['TITLE']) ? $arFields['TITLE'] : null,
                    'RESPONSIBLE_ID' => isset($arFields['RESPONSIBLE_ID']) ? (int)$arFields['RESPONSIBLE_ID'] : null,
                    'CHANGED_DATE' => time()
                ]
            ]);
        }
    }
}

// Регистрируем обработчик события
AddEventHandler('tasks', 'OnTaskUpdate', 'telegsarflow_OnTaskUpdate');
