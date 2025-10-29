/**
 * TaskNode - Компонент карточки задачи для React Flow
 */
window.TaskNode = function({ id, data, selected }) {
    const React = window.React;
    const { Handle, Position } = window.ReactFlow || window.reactflow || {};

    if (!Handle) {
        console.error('Handle не найден в ReactFlow');
        return null;
    }

    // Определяем тип карточки
    const isFuture = data.isFuture === true;
    const isRealTask = !isFuture;

    // Получаем цвет фона
    const getBackgroundColor = () => {
        if (isFuture) {
            // Предзадача - темно-серый
            return '#4b5563';
        }

        if (isRealTask && data.statusCode) {
            // Реальная задача - цвет по статусу
            return window.StatusColors.getColor(data.statusCode);
        }

        // По умолчанию - светло-серый
        return '#e5e7eb';
    };

    // Иконка
    const icon = isFuture ? '🎯' : '📋';

    // Стиль рамки
    const borderStyle = isFuture ? '2px dashed #9ca3af' : '1px solid #d1d5db';

    // Цвет текста
    const textColor = isFuture ? '#ffffff' : '#1f2937';

    // Стиль узла
    const nodeStyle = {
        background: getBackgroundColor(),
        border: selected ? '2px solid #667eea' : borderStyle,
        borderRadius: '10px',
        padding: '14px',
        paddingTop: '32px', // Больше отступ сверху для кнопок
        minWidth: '220px',
        maxWidth: '280px',
        boxShadow: selected ? '0 8px 16px rgba(0, 0, 0, 0.2)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: textColor,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        transition: 'all 0.3s ease',
        position: 'relative'
    };

    // Стиль заголовка
    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        fontSize: '18px'
    };

    // Стиль названия
    const titleStyle = {
        fontWeight: '600',
        fontSize: '14px',
        marginBottom: '6px',
        lineHeight: '1.4',
        wordBreak: 'break-word'
    };

    // Стиль бейджа
    const badgeStyle = {
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500',
        background: isFuture ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
        marginTop: '6px'
    };

    // Стиль описания статуса
    const statusStyle = {
        fontSize: '12px',
        opacity: 0.9,
        marginTop: '4px'
    };

    // Стиль кнопки редактирования (слева вверху)
    const editButtonStyle = {
        position: 'absolute',
        top: '6px',
        left: '8px',
        background: 'rgba(102, 126, 234, 0.9)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        width: '24px',
        height: '24px',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        zIndex: 10
    };

    // Стиль кнопки удаления (справа вверху)
    const deleteButtonStyle = {
        position: 'absolute',
        top: '6px',
        right: '8px',
        background: 'rgba(239, 68, 68, 0.9)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        width: '24px',
        height: '24px',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        zIndex: 10
    };

    // Стиль кнопки открытия (для реальных задач)
    const openButtonStyle = {
        position: 'absolute',
        top: '6px',
        right: '8px',
        background: 'rgba(102, 126, 234, 0.9)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        width: '24px',
        height: '24px',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        zIndex: 10
    };

    // Получаем название условия создания
    const getConditionName = (conditionType) => {
        const conditions = {
            'immediately': '⚡ Сразу',
            'delay': '⏰ С задержкой',
            'ifCancel_cancel': '❌ Отменить',
            'ifCancel_create': '✅ При отмене'
        };
        return conditions[conditionType] || '';
    };

    // Обработчик удаления
    const handleDelete = (e) => {
        e.stopPropagation();
        console.log('🔴 handleDelete вызван в TaskNode, id:', id);
        if (data.onDelete) {
            console.log('🔴 Вызываем data.onDelete()');
            data.onDelete();
        } else {
            console.warn('⚠️ data.onDelete не определён!');
        }
    };

    // Обработчик редактирования
    const handleEdit = (e) => {
        e.stopPropagation();
        console.log('✏️ handleEdit вызван в TaskNode, id:', id);
        if (data.onEdit) {
            console.log('✏️ Вызываем data.onEdit()');
            data.onEdit(data);
        } else {
            console.warn('⚠️ data.onEdit не определён!');
        }
    };

    // Обработчик открытия задачи в Bitrix24 (для реальных задач)
    const handleOpen = (e) => {
        e.stopPropagation();
        const taskId = typeof data.id === 'string' ? data.id.replace('task-', '') : data.id;
        console.log('📂 Открываем задачу Bitrix24:', taskId);

        if (typeof BX24 !== 'undefined' && BX24.openPath) {
            BX24.openPath('/company/personal/user/1/tasks/task/view/' + taskId + '/');
        } else {
            console.warn('BX24.openPath недоступен');
        }
    };

    return React.createElement('div', { style: nodeStyle },
        // Handle для входящих связей (слева)
        React.createElement(Handle, {
            type: 'target',
            position: Position.Left,
            style: {
                background: isFuture ? '#9ca3af' : '#667eea',
                width: '12px',
                height: '12px',
                border: '2px solid white'
            }
        }),

        // Кнопка редактирования (только для предзадач, слева вверху)
        isFuture && React.createElement('button', {
            style: editButtonStyle,
            onClick: handleEdit,
            onMouseEnter: (e) => {
                e.target.style.background = 'rgba(85, 104, 211, 1)';
                e.target.style.transform = 'scale(1.1)';
            },
            onMouseLeave: (e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.9)';
                e.target.style.transform = 'scale(1)';
            },
            title: 'Редактировать предзадачу'
        }, '✏️'),

        // Кнопка удаления (только для предзадач, справа вверху)
        isFuture && React.createElement('button', {
            style: deleteButtonStyle,
            onClick: handleDelete,
            onMouseEnter: (e) => {
                e.target.style.background = 'rgba(220, 38, 38, 1)';
                e.target.style.transform = 'scale(1.1)';
            },
            onMouseLeave: (e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.9)';
                e.target.style.transform = 'scale(1)';
            },
            title: 'Удалить предзадачу'
        }, '🗑️'),

        // Кнопка открытия (только для реальных задач, справа вверху)
        isRealTask && React.createElement('button', {
            style: openButtonStyle,
            onClick: handleOpen,
            onMouseEnter: (e) => {
                e.target.style.background = 'rgba(85, 104, 211, 1)';
                e.target.style.transform = 'scale(1.1)';
            },
            onMouseLeave: (e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.9)';
                e.target.style.transform = 'scale(1)';
            },
            title: 'Открыть задачу в Bitrix24'
        }, '📂'),

        // Заголовок с иконкой
        React.createElement('div', { style: headerStyle },
            React.createElement('span', null, icon),
            isFuture && React.createElement('span', {
                style: { fontSize: '12px', opacity: 0.9 }
            }, 'Предзадача')
        ),

        // Название задачи
        React.createElement('div', { style: titleStyle }, data.title),

        // Статус для реальных задач
        !isFuture && data.statusCode && React.createElement('div', { style: statusStyle },
            window.StatusColors.getName(data.statusCode)
        ),

        // Условие создания для предзадач
        isFuture && data.conditionType && React.createElement('div', { style: badgeStyle },
            getConditionName(data.conditionType),
            data.conditionType === 'delay' && data.delayMinutes &&
                ` (${data.delayMinutes} мин)`
        ),

        // Handle для исходящих связей (справа)
        React.createElement(Handle, {
            type: 'source',
            position: Position.Right,
            style: {
                background: isFuture ? '#9ca3af' : '#667eea',
                width: '12px',
                height: '12px',
                border: '2px solid white'
            }
        })
    );
};

console.log('✅ TaskNode component loaded with buttons inside card');
