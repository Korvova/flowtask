/**
 * CustomEdge - Кастомная связь с кнопкой удаления
 *
 * Использует EdgeLabelRenderer для отображения кнопки удаления над связью
 */
window.CustomEdge = function({ id, source, target, sourceX, sourceY, targetX, targetY, data }) {
    const React = window.React;
    const RF = window.ReactFlow || window.reactflow;

    if (!RF) {
        console.error('ReactFlow не загружен');
        return null;
    }

    const { BaseEdge, EdgeLabelRenderer, getBezierPath } = RF;

    // Вычисляем путь связи
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });

    // Обработчик удаления
    const onDelete = (e) => {
        e.stopPropagation();
        console.log('🗑️ Удаление связи:', id, source, '→', target);

        if (data && data.onDelete) {
            data.onDelete(source, target);
        }
    };

    return React.createElement(React.Fragment, null,
        // Базовая линия связи
        React.createElement(BaseEdge, {
            id: id,
            path: edgePath,
            style: {
                stroke: '#667eea',
                strokeWidth: 2
            }
        }),

        // Кнопка удаления
        React.createElement(EdgeLabelRenderer, null,
            React.createElement('div', {
                style: {
                    position: 'absolute',
                    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    pointerEvents: 'all',
                    opacity: 0, // Скрыта по умолчанию
                    transition: 'opacity 0.2s'
                },
                className: 'nodrag nopan custom-edge-button',
                onMouseEnter: function(e) {
                    e.currentTarget.style.opacity = 1;
                },
                onMouseLeave: function(e) {
                    e.currentTarget.style.opacity = 0;
                }
            },
                React.createElement('button', {
                    onClick: onDelete,
                    style: {
                        width: '24px',
                        height: '24px',
                        background: '#ef4444',
                        border: '2px solid white',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        color: 'white',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s'
                    },
                    onMouseEnter: function(e) {
                        e.currentTarget.style.background = '#dc2626';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    },
                    onMouseLeave: function(e) {
                        e.currentTarget.style.background = '#ef4444';
                        e.currentTarget.style.transform = 'scale(1)';
                    },
                    title: 'Удалить связь'
                }, '×')
            )
        )
    );
};

// Добавляем CSS для показа кнопки при наведении на линию
const style = document.createElement('style');
style.textContent = `
    .react-flow__edge:hover + div .custom-edge-button {
        opacity: 1 !important;
    }
    .react-flow__edge-path:hover ~ div .custom-edge-button {
        opacity: 1 !important;
    }
    /* Показываем кнопку при наведении на саму кнопку */
    .custom-edge-button:hover {
        opacity: 1 !important;
    }
`;
document.head.appendChild(style);

console.log('✅ CustomEdge component loaded');
