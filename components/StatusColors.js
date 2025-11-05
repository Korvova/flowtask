/**
 * StatusColors - Утилиты для работы с цветами и названиями статусов Bitrix24
 */
window.StatusColors = {
    /**
     * Получить цвет по коду статуса
     */
    getColor: function(statusCode) {
        const colors = {
            '1': '#e5e7eb',  // Новая - белая
            '2': '#e5e7eb',  // Ждёт выполнения - белая
            '3': '#3b82f6',  // Выполняется - синяя
            '4': '#f59e0b',  // Ждёт контроля (согласование) - оранжевая
            '5': '#10b981',  // Завершена (готово) - зеленая
            '6': '#ef4444',  // Отложена - красная
            '7': '#ef4444'   // Отклонена (отмена) - красная
        };
        return colors[String(statusCode)] || '#9ca3af';
    },

    /**
     * Получить название статуса
     */
    getName: function(statusCode) {
        const names = {
            '1': 'Новая',
            '2': 'Ждёт выполнения',
            '3': 'Выполняется',
            '4': 'Ждёт контроля',
            '5': 'Завершена',
            '6': 'Отложена',
            '7': 'Отклонена'
        };
        return names[String(statusCode)] || 'Неизвестно';
    },

    /**
     * Получить стиль для узла задачи
     */
    getNodeStyle: function(statusCode, isFuture = false) {
        if (isFuture) {
            return {
                backgroundColor: '#4b5563', // Темно-серый для предзадач
                color: '#ffffff',
                border: '2px dashed #9ca3af'
            };
        }

        return {
            backgroundColor: this.getColor(statusCode),
            color: statusCode === '1' || statusCode === '2' ? '#333' : '#fff',
            border: '2px solid ' + this.getColor(statusCode)
        };
    }
};

console.log('✅ StatusColors component loaded');
