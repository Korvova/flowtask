/**
 * TaskNode - Компонент карточки задачи для React Flow
 */
window.TaskNode = function({ id, data, selected }) {
    const React = window.React;
    const { Handle, NodeToolbar, Position } = window.ReactFlow || window.reactflow || {};

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
        border: borderStyle,
        borderRadius: '10px',
        padding: '14px',
        minWidth: '220px',
        maxWidth: '280px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
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
        if (data.onDelete) {
            data.onDelete();
        }
    };

    // Обработчик открытия для редактирования (для предзадач)
    const handleEdit = (e) => {
        e.stopPropagation();
        console.log('✏️ Редактируем предзадачу:', id);
        if (data.onEdit) {
            data.onEdit(data);
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

    // Стиль кнопки в тулбаре
    const toolbarButtonStyle = {
        padding: '8px 16px',
        background: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
        marginRight: '4px'
    };

    const deleteToolbarButtonStyle = {
        ...toolbarButtonStyle,
        background: '#ef4444'
    };

    return React.createElement(React.Fragment, null,
        // NodeToolbar - появляется при выборе узла
        NodeToolbar && React.createElement(NodeToolbar, {
            isVisible: selected,
            position: Position.Top
        },
            // Кнопка редактирования для предзадач
            isFuture && React.createElement('button', {
                style: toolbarButtonStyle,
                onClick: handleEdit,
                onMouseEnter: (e) => { e.target.style.background = '#5568d3'; },
                onMouseLeave: (e) => { e.target.style.background = '#667eea'; }
            }, '✏️ Редактировать'),

            // Кнопка открытия для реальных задач
            isRealTask && React.createElement('button', {
                style: toolbarButtonStyle,
                onClick: handleOpen,
                onMouseEnter: (e) => { e.target.style.background = '#5568d3'; },
                onMouseLeave: (e) => { e.target.style.background = '#667eea'; }
            }, '📂 Открыть'),

            // Кнопка удаления для предзадач
            isFuture && React.createElement('button', {
                style: deleteToolbarButtonStyle,
                onClick: handleDelete,
                onMouseEnter: (e) => { e.target.style.background = '#dc2626'; },
                onMouseLeave: (e) => { e.target.style.background = '#ef4444'; }
            }, '🗑️ Удалить')
        ),

        // Сама карточка
        React.createElement('div', { style: nodeStyle },
        // Handle для входящих связей (слева)
        React.createElement(Handle, {
            type: 'target',
            position: 'left',
            style: {
                background: isFuture ? '#9ca3af' : '#667eea',
                width: '12px',
                height: '12px',
                border: '2px solid white'
            }
        }),

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
            position: 'right',
            style: {
                background: isFuture ? '#9ca3af' : '#667eea',
                width: '12px',
                height: '12px',
                border: '2px solid white'
            }
        })
        ) // закрываем div карточки
    ); // закрываем React.Fragment
};

console.log('✅ TaskNode component loaded with NodeToolbar buttons');
