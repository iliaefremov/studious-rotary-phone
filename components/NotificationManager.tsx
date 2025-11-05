import React, { useEffect, useState, useCallback } from 'react';
import { SCHEDULE_WEEK_1, SCHEDULE_WEEK_2 } from '../constants';
import type { ScheduleItem } from '../types';

const NOTIFICATION_LEAD_TIME_MINUTES = 15; // За сколько минут до начала пары отправлять уведомление.
const CHECK_INTERVAL_MS = 60 * 1000; // Интервал проверки расписания (1 минута).

/**
 * Вспомогательная функция для получения номера недели в году.
 * @param {Date} d - Дата.
 * @returns {number} Номер недели.
 */
const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

/**
 * "Безголовый" компонент для управления браузерными уведомлениями.
 * Он не рендерит UI, а работает в фоновом режиме.
 * Запрашивает разрешение на уведомления, периодически проверяет расписание
 * и отправляет напоминания о предстоящих занятиях.
 */
const NotificationManager: React.FC = () => {
    // Состояние для хранения статуса разрешения на отправку уведомлений.
    const [permission, setPermission] = useState(Notification.permission);

    // Эффект для запроса разрешения при первой загрузке, если статус еще не определен.
    useEffect(() => {
        if (permission === 'default') {
            Notification.requestPermission().then(setPermission);
        }
    }, [permission]);

    /**
     * Отправляет браузерное уведомление для указанного занятия.
     * Использует sessionStorage, чтобы избежать повторной отправки уведомления
     * для одного и того же занятия в рамках одной сессии.
     */
    const sendNotification = useCallback((item: ScheduleItem) => {
        const notificationKey = `notified-${item.id}`;
        if (sessionStorage.getItem(notificationKey)) {
            return; // Уже уведомляли об этом занятии.
        }

        const title = `Скоро начнется: ${item.subject}`;
        const options = {
            body: `Начало в ${item.time.split(' - ')[0]} в ${item.classroom}.`,
            icon: 'https://cdn-icons-png.flaticon.com/512/3239/3239252.png', // Иконка по умолчанию
        };

        new Notification(title, options);
        sessionStorage.setItem(notificationKey, 'true');

    }, []);

    /**
     * Проверяет расписание на наличие предстоящих занятий.
     * Вызывается периодически по таймеру.
     */
    const checkSchedule = useCallback(() => {
        if (permission !== 'granted') {
            return; // Не делаем ничего, если пользователь не разрешил уведомления.
        }
        
        const now = new Date();
        // Определяем тип текущей недели (четная/нечетная) для выбора правильного расписания.
        const currentWeekType = getWeekNumber(now) % 2 === 1 ? 1 : 2;
        const schedule = currentWeekType === 1 ? SCHEDULE_WEEK_1 : SCHEDULE_WEEK_2;
        
        const todayName = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(now).replace(/^\w/, c => c.toUpperCase());
        const todaySchedule = schedule.find(day => day.day === todayName);

        if (!todaySchedule || todaySchedule.classes.length === 0) {
            return; // Сегодня нет занятий.
        }

        todaySchedule.classes.forEach(item => {
            const timeParts = item.time.split(' - ')[0].split(':');
            const hour = parseInt(timeParts[0], 10);
            const minute = parseInt(timeParts[1], 10);

            if (isNaN(hour) || isNaN(minute)) return; // Пропускаем, если время указано неверно.

            const classStartTime = new Date(now);
            classStartTime.setHours(hour, minute, 0, 0);

            const timeDifferenceMs = classStartTime.getTime() - now.getTime();
            
            // Отправляем уведомление, если до занятия осталось от 14 до 15 минут.
            // Это предотвращает многократную отправку из-за минутного интервала проверки.
            if (
                timeDifferenceMs > (NOTIFICATION_LEAD_TIME_MINUTES - 1) * 60 * 1000 &&
                timeDifferenceMs <= NOTIFICATION_LEAD_TIME_MINUTES * 60 * 1000
            ) {
                sendNotification(item);
            }
        });

    }, [permission, sendNotification]);

    // Основной эффект, который запускает и управляет интервалом проверки.
    useEffect(() => {
        // Запускаем проверку один раз сразу после монтирования.
        checkSchedule();
        
        // Устанавливаем интервал для периодических проверок.
        const intervalId = setInterval(checkSchedule, CHECK_INTERVAL_MS);
        
        // Очищаем интервал при размонтировании компонента, чтобы избежать утечек памяти.
        return () => clearInterval(intervalId);
    }, [checkSchedule]);


    return null; // Компонент не рендерит видимых элементов.
};

export default NotificationManager;