/**
 * SubscriptionManager - Управление подпиской
 *
 * Триал: 30 дней бесплатно
 * После триала: 500₽/месяц
 */
window.SubscriptionManager = {

    TRIAL_DAYS: 30,
    SUBSCRIPTION_PRICE: 500, // рублей в месяц

    subscriptionStatus: null,

    /**
     * Проверить статус подписки
     */
    checkSubscription: function() {
        return new Promise((resolve, reject) => {
            console.log('🔍 Проверяем статус подписки...');

            // Получаем информацию о приложении через app.info
            BX24.callMethod('app.info', {}, (result) => {
                if (result.error()) {
                    console.error('❌ Ошибка получения app.info:', result.error());
                    reject(result.error());
                    return;
                }

                const appInfo = result.data();
                console.log('📱 App Info:', appInfo);

                // Проверяем статус подписки
                // STATUS может быть: T (триал), A (активна), S (приостановлена), F (бесплатная)
                const status = appInfo.STATUS || 'T';
                const license = appInfo.LICENSE || 'unknown';

                // Дата установки приложения
                const installDate = appInfo.DATE_INSTALL ? new Date(appInfo.DATE_INSTALL) : new Date();
                const now = new Date();
                const daysSinceInstall = Math.floor((now - installDate) / (1000 * 60 * 60 * 24));

                const subscriptionData = {
                    status: status,
                    license: license,
                    installDate: installDate,
                    daysSinceInstall: daysSinceInstall,
                    trialDaysLeft: Math.max(0, this.TRIAL_DAYS - daysSinceInstall),
                    isActive: status === 'A' || status === 'T' || (status === 'T' && daysSinceInstall < this.TRIAL_DAYS),
                    isTrial: status === 'T' && daysSinceInstall < this.TRIAL_DAYS,
                    isExpired: status === 'S' || (status === 'T' && daysSinceInstall >= this.TRIAL_DAYS)
                };

                this.subscriptionStatus = subscriptionData;

                console.log('✅ Статус подписки:', subscriptionData);

                resolve(subscriptionData);
            });
        });
    },

    /**
     * Показать уведомление о триале
     */
    showTrialNotice: function(daysLeft) {
        const notice = document.createElement('div');
        notice.id = 'trialNotice';
        notice.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            max-width: 350px;
            animation: slideIn 0.5s ease-out;
        `;

        notice.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="font-size: 20px;">🎉</span>
                <strong style="font-size: 16px;">Пробный период</strong>
            </div>
            <div style="font-size: 14px; opacity: 0.95; line-height: 1.5;">
                Осталось <strong>${daysLeft}</strong> ${this.getDaysWord(daysLeft)} триала.<br>
                После окончания: ${this.SUBSCRIPTION_PRICE}₽/месяц
            </div>
        `;

        document.body.appendChild(notice);

        // Автоматически скрыть через 5 секунд
        setTimeout(() => {
            notice.style.animation = 'slideOut 0.5s ease-out';
            setTimeout(() => notice.remove(), 500);
        }, 5000);

        // Добавить анимации
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Показать экран истекшей подписки
     */
    showExpiredScreen: function() {
        const overlay = document.createElement('div');
        overlay.id = 'expiredOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        `;

        overlay.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <div style="font-size: 60px; margin-bottom: 20px;">⏰</div>
                <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 28px;">Пробный период завершен</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    Спасибо, что пользовались Flowtask! Чтобы продолжить использование всех возможностей,
                    необходимо оформить подписку.
                </p>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Стоимость подписки</div>
                    <div style="font-size: 36px; font-weight: bold;">${this.SUBSCRIPTION_PRICE}₽</div>
                    <div style="font-size: 14px; opacity: 0.9;">в месяц</div>
                </div>
                <button onclick="window.SubscriptionManager.openPayment()" style="
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    transition: all 0.3s;
                    width: 100%;
                ">
                    Оформить подписку
                </button>
                <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                    Автоматическое продление • Отмена в любое время
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    /**
     * Открыть окно оплаты
     */
    openPayment: function() {
        console.log('💳 Открываем окно оплаты...');

        // Для Bitrix24 маркетплейса используем payment.order
        BX24.callMethod('payment.order', {
            AMOUNT: this.SUBSCRIPTION_PRICE,
            CURRENCY: 'RUB',
            DESCRIPTION: 'Подписка на Flowtask - месяц',
            RECURRENT: 'Y' // Ежемесячное автоматическое списание
        }, (result) => {
            if (result.error()) {
                console.error('❌ Ошибка оплаты:', result.error());
                alert('Ошибка оформления подписки: ' + result.error());
            } else {
                console.log('✅ Платеж инициирован:', result.data());

                // После успешной оплаты перезагружаем страницу
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        });
    },

    /**
     * Вспомогательная функция для склонения слова "день"
     */
    getDaysWord: function(days) {
        if (days % 10 === 1 && days % 100 !== 11) return 'день';
        if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) return 'дня';
        return 'дней';
    },

    /**
     * Инициализация при загрузке приложения
     */
    init: async function() {
        try {
            const subscription = await this.checkSubscription();

            if (subscription.isExpired) {
                console.log('❌ Подписка истекла');
                this.showExpiredScreen();
                return false;
            }

            if (subscription.isTrial && subscription.trialDaysLeft <= 7) {
                console.log('⚠️ Триал заканчивается через', subscription.trialDaysLeft, 'дней');
                this.showTrialNotice(subscription.trialDaysLeft);
            }

            return true;

        } catch (error) {
            console.error('❌ Ошибка проверки подписки:', error);
            // В случае ошибки разрешаем использование (чтобы не блокировать пользователей)
            return true;
        }
    }
};

console.log('✅ SubscriptionManager loaded');
