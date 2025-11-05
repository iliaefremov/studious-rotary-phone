import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SCHEDULE_WEEK_1, SCHEDULE_WEEK_2 } from '../constants';
import type { ScheduleItem, DaySchedule, TelegramUser } from './../types';
import { generateHomeworkHelp } from '../services/geminiService';

// Константы для упрощения работы с днями недели и административными правами.
const DAYS_OF_WEEK = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
const EMPTY_SCHEDULE_ITEM: Omit<ScheduleItem, 'id'> = { subject: '', time: '', classroom: '', teacher: '', homework: '', isImportant: false };
const ADMIN_TELEGRAM_ID = '1276188185';

/**
 * Вспомогательная функция для получения номера недели в году.
 * Используется для определения, является ли неделя четной или нечетной.
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
 * Проверяет, находится ли текущее время в заданном временном диапазоне.
 * @param {string} timeString - Строка времени в формате "ЧЧ:ММ - ЧЧ:ММ".
 * @returns {boolean} `true`, если текущее время попадает в диапазон.
 */
const isCurrentTimeInRange = (timeString: string): boolean => {
    try {
        const now = new Date();
        const [startTimeStr, endTimeStr] = timeString.split(' - ');
        if (!startTimeStr || !endTimeStr) return false;

        const [startHour, startMinute] = startTimeStr.split(':').map(Number);
        const [endHour, endMinute] = endTimeStr.split(':').map(Number);

        if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) return false;

        const classStartTime = new Date(now);
        classStartTime.setHours(startHour, startMinute, 0, 0);

        const classEndTime = new Date(now);
        classEndTime.setHours(endHour, endMinute, 0, 0);

        return now >= classStartTime && now < classEndTime;
    } catch (e) {
        console.error("Ошибка при парсинге строки времени:", timeString, e);
        return false;
    }
};

/**
 * Возвращает дату понедельника для недели, к которой относится указанная дата.
 * @param {Date} date - Дата.
 * @returns {Date} Объект Date, представляющий понедельник.
 */
const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Коррекция для воскресенья
    return new Date(d.setDate(diff));
};


/**
 * Компонент "Расписание".
 * Отображает расписание занятий по неделям, позволяет редактировать его (в режиме администратора),
 * а также использовать AI-помощника для получения объяснений и составления планов.
 */
const Schedule: React.FC = () => {
  // Состояния для хранения расписания на обе недели.
  const [scheduleWeek1, setScheduleWeek1] = useState<DaySchedule[]>(SCHEDULE_WEEK_1);
  const [scheduleWeek2, setScheduleWeek2] = useState<DaySchedule[]>(SCHEDULE_WEEK_2);
  
  // Определяем, какая неделя является текущей (1-я или 2-я), на основе номера недели в году.
  const currentCalendarWeek = useMemo(() => getWeekNumber(new Date()) % 2 === 1 ? 1 : 2, []);
  // Состояние для активной (выбранной пользователем) недели.
  const [activeWeek, setActiveWeek] = useState<1 | 2>(currentCalendarWeek);

  // Состояние для данных пользователя Telegram.
  const [user, setUser] = useState<TelegramUser | null>(null);
  // Проверка, является ли пользователь администратором.
  const isAdminMode = user?.id.toString() === ADMIN_TELEGRAM_ID;
  
  // Состояния для модального окна редактирования.
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{item: ScheduleItem | Omit<ScheduleItem, 'id'>, day: string, week: 1 | 2} | null>(null);

  // Состояния для модальных окон AI-помощника.
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ScheduleItem | null>(null);
  
  // Состояния для ответов, загрузки и ошибок AI-помощника.
  const [aiHelpResponse, setAiHelpResponse] = useState('');
  const [isHelpLoading, setIsHelpLoading] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  const [aiPlanResponse, setAiPlanResponse] = useState('');
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [aiSummaryResponse, setAiSummaryResponse] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Рефы для DOM-элементов дней недели для плавной прокрутки.
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Эффект для инициализации Telegram Web App и получения данных пользователя.
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        setUser(tg.initDataUnsafe?.user || null);
    }
  }, []);

  // Мемоизированные значения для текущей даты и дня недели для прокрутки.
  const today = useMemo(() => new Date(), []);
  const scrollToDayName = useMemo(() => {
    const dayIndex = today.getDay(); // 0 (Вс) - 6 (Сб)
    if (dayIndex > 0 && dayIndex < 6) { // Будний день
      return DAYS_OF_WEEK[dayIndex - 1];
    }
    return 'Понедельник'; // По умолчанию в выходные
  }, [today]);

  // Форматированная дата для отображения в заголовке.
  const todayDateFormatted = useMemo(() => (new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })).format(today), [today]);

  // Вычисляем дату понедельника для активной недели, чтобы корректно отображать даты.
  const activeWeekMonday = useMemo(() => {
    const monday = getMonday(new Date());
    if (activeWeek !== currentCalendarWeek) {
        const weekDifference = (currentCalendarWeek === 1 && activeWeek === 2) ? 7 : (currentCalendarWeek === 2 && activeWeek === 1) ? -7 : 0;
        monday.setDate(monday.getDate() + weekDifference);
    }
    return monday;
  }, [activeWeek, currentCalendarWeek]);
  
  // --- Обработчики для CRUD операций с расписанием ---

  const handleOpenEditModal = useCallback((item: ScheduleItem | null, day: string, week: 1 | 2) => {
    setEditingItem({ item: item || EMPTY_SCHEDULE_ITEM, day, week });
    setIsEditModalOpen(true);
  }, []);
  
  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleSaveItem = useCallback((itemToSave: ScheduleItem | Omit<ScheduleItem, 'id'>, day: string, week: 1 | 2) => {
    const setSchedule = week === 1 ? setScheduleWeek1 : setScheduleWeek2;
    
    setSchedule(prevSchedule => {
        const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
        let daySchedule = newSchedule.find((d: DaySchedule) => d.day === day);

        if (!daySchedule) {
            daySchedule = { day, classes: [] };
            newSchedule.push(daySchedule);
        }
        
        if ('id' in itemToSave) { // Редактирование существующего
             const classIndex = daySchedule.classes.findIndex((c: ScheduleItem) => c.id === itemToSave.id);
             if (classIndex !== -1) {
                daySchedule.classes[classIndex] = itemToSave;
             }
        } else { // Добавление нового
            const newItem = { ...itemToSave, id: Date.now() }; // Генерация уникального ID
            daySchedule.classes.push(newItem);
        }
        
        // Сортируем дни по порядку недели
        return newSchedule.sort((a, b) => DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day));
    });

    handleCloseEditModal();
  }, [handleCloseEditModal]);
  
  const handleDeleteItem = useCallback((itemId: number, day: string, week: 1 | 2) => {
    if (window.confirm('Вы уверены, что хотите удалить это занятие?')) {
      const setSchedule = week === 1 ? setScheduleWeek1 : setScheduleWeek2;
      setSchedule(prevSchedule =>
        prevSchedule.map(d =>
          d.day === day
            ? { ...d, classes: d.classes.filter(c => c.id !== itemId) }
            : d
        )
      );
    }
  }, []);

  // --- Обработчики для AI-помощника ---

  const handleGetHelpClick = (item: ScheduleItem) => {
    setModalContent(item);
    setIsHelpModalOpen(true);
    setAiHelpResponse('');
    setHelpError(null);
  };
  const closeHelpModal = () => setIsHelpModalOpen(false);

  const fetchAiHelp = useCallback(async () => {
    if (!modalContent) return;
    setIsHelpLoading(true);
    setHelpError(null);
    try {
      const prompt = `Объясни следующую тему или задачу простыми словами, как если бы ты был опытным наставником. Дай ключевые моменты и, возможно, простой пример. Задача: "${modalContent.homework}" по предмету "${modalContent.subject}".`;
      const response = await generateHomeworkHelp(prompt);
      setAiHelpResponse(response);
    } catch (err) {
      setHelpError('Ой, не удалось получить ответ от AI. Попробуйте чуть позже.');
    } finally {
      setIsHelpLoading(false);
    }
  }, [modalContent]);
  
  // Получаем данные расписания для активной недели.
  const activeWeekScheduleData = useMemo(() => (
    activeWeek === 1 ? scheduleWeek1 : scheduleWeek2
  ), [activeWeek, scheduleWeek1, scheduleWeek2]);

  // Функции для модальных окон плана и сводки.
  const openPlanModal = () => { setAiPlanResponse(''); setPlanError(null); setIsPlanModalOpen(true); };
  const closePlanModal = () => setIsPlanModalOpen(false);

  const fetchStudyPlan = useCallback(async () => {
    setIsPlanLoading(true);
    setPlanError(null);
    const importantTasks = activeWeekScheduleData.flatMap(day => day.classes).filter(item => item.isImportant).map(item => `- ${item.subject}: ${item.homework}`).join('\n');
    const scheduleSummary = activeWeekScheduleData.map(day => `${day.day}:\n${day.classes.map(c => `  - ${c.time}: ${c.subject}`).join('\n') || '  - Свободный день'}`).join('\n\n');
    const prompt = `Я студент, и мне нужна помощь в организации учебного времени на неделю. Вот мое расписание на выбранную неделю: ---\n${scheduleSummary}\n---\nА вот мои важные задания: ---\n${importantTasks.length > 0 ? importantTasks : 'Важных заданий нет.'}\n---\nСоздай для меня детальный учебный план. Предложи, когда лучше заниматься каждым заданием, разбей большие задачи на шаги. Учитывай мое расписание. Оформи план по дням. Будь мотивирующим и дружелюбным.`;
    try {
        const response = await generateHomeworkHelp(prompt);
        setAiPlanResponse(response);
    } catch (err) {
        setPlanError('Не удалось сгенерировать план. Попробуйте позже.');
    } finally {
        setIsPlanLoading(false);
    }
  }, [activeWeekScheduleData]);

  const openSummaryModal = () => { setAiSummaryResponse(''); setSummaryError(null); setIsSummaryModalOpen(true); };
  const closeSummaryModal = () => setIsSummaryModalOpen(false);

  const fetchWeekSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    const importantTasks = activeWeekScheduleData.flatMap(d => d.classes).filter(i => i.isImportant).map(i => `- ${i.subject}: ${i.homework}`).join('\n');
    const scheduleSummary = activeWeekScheduleData.map(d => `${d.day}:\n${d.classes.map(c => `  - ${c.time}: ${c.subject}`).join('\n') || '  - Свободный день'}`).join('\n\n');
    const prompt = `Проанализируй мое расписание и важные задачи на выбранную неделю.\nРасписание:\n---\n${scheduleSummary}\n---\nВажные задачи:\n---\n${importantTasks.length > 0 ? importantTasks : 'Важных заданий нет.'}\n---\nСоздай краткую и четкую сводку на неделю. Выдели 2-3 самых ключевых момента. Ответ должен быть коротким, в виде маркированного списка. Сделай его ободряющим.`;
    try {
        const response = await generateHomeworkHelp(prompt);
        setAiSummaryResponse(response);
    } catch (err) {
        setSummaryError('Не удалось сгенерировать сводку. Попробуйте позже.');
    } finally {
        setIsSummaryLoading(false);
    }
  }, [activeWeekScheduleData]);
  
  // Расписание для отображения, всегда отсортированное по дням недели.
  const displayedSchedule = useMemo(() => {
    const scheduleData = activeWeek === 1 ? scheduleWeek1 : scheduleWeek2;
    return [...scheduleData].sort((a, b) => DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day));
  }, [activeWeek, scheduleWeek1, scheduleWeek2]);

  // Эффект для автоматической прокрутки к текущему дню при загрузке.
  useEffect(() => {
    if (activeWeek === currentCalendarWeek && scrollToDayName) {
      const dayElement = dayRefs.current[scrollToDayName];
      if (dayElement) {
        // Небольшая задержка, чтобы DOM успел стабилизироваться.
        const timer = setTimeout(() => {
          dayElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [activeWeek, currentCalendarWeek, scrollToDayName, displayedSchedule]);

  /**
   * Внутренний компонент для отображения карточки одного дня.
   */
  const DayCard: React.FC<{ dayData: DaySchedule, weekNumber: 1 | 2, date: Date }> = ({ dayData, weekNumber, date }) => {
    const { day: dayName, classes } = dayData;
    const isToday = currentCalendarWeek === weekNumber && date.toDateString() === new Date().toDateString();
    const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    return (
        <div className={`flex-shrink-0 w-full flex flex-col p-4 rounded-2xl transition-all duration-300 ${isToday ? 'bg-accent/5 border-2 border-accent/30 shadow-soft-lg' : 'bg-secondary border border-border-color shadow-soft'}`}>
            <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-bold ${isToday ? 'text-accent' : 'text-text-primary'}`}>{dayName}</h3>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${isToday ? 'bg-accent/10 text-accent' : 'bg-highlight text-text-secondary'}`}>{formattedDate}</span>
            </div>
            <div className="space-y-3">
            {classes.length > 0 ? classes.map((item) => {
                const isNow = isToday && isCurrentTimeInRange(item.time);
                return (
                <div key={item.id} className={`group bg-secondary rounded-2xl p-3 flex flex-col text-sm transition-all duration-300 ease-in-out border ${isNow ? 'scale-105 ring-2 ring-accent shadow-glow-accent border-transparent' : 'shadow-soft-subtle border-border-color hover:scale-[1.02] hover:shadow-soft'}`}>
                    <div className="flex-grow">
                        <div className="flex justify-between items-start mb-2"><p className="font-bold text-text-primary pr-2 leading-tight">{item.subject}</p>{item.isImportant && <span className="text-base" title="Важное">⭐</span>}</div>
                        <div className="space-y-1 text-text-secondary text-xs mb-3"><p className="flex items-center"><span className="opacity-75 mr-2">⏰</span><span className="font-medium">{item.time}</span></p><p className="flex items-start"><span className="opacity-75 mr-2 pt-0.5">📍</span><span>{item.classroom} / {item.teacher}</span></p></div>
                        <div className="text-xs"><p className="text-text-secondary font-medium mb-1">📝 Домашнее задание:</p><p className="text-text-primary break-words leading-snug">{item.homework}</p></div>
                    </div>
                    {isAdminMode ? (
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-color">
                            <button onClick={() => handleGetHelpClick(item)} className="bg-accent/10 text-accent font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-2 hover:bg-accent/20 transition-colors">✨ AI</button>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleOpenEditModal(item, dayName, weekNumber)} className="text-text-secondary hover:text-accent transition-colors">✏️</button>
                                <button onClick={() => handleDeleteItem(item.id, dayName, weekNumber)} className="text-text-secondary hover:text-red-500 transition-colors">🗑️</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => handleGetHelpClick(item)} className="mt-3 w-full bg-accent/10 text-accent font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-2 hover:bg-accent/20 transition-colors"><span>✨</span><span>AI Помощник</span></button>
                    )}
                </div>
            );
            }) : (
                <div className={`rounded-2xl text-center text-text-secondary flex items-center justify-center border-2 border-dashed border-highlight p-4 min-h-[100px]`}>
                <p className="text-sm">Пар нет, можно отдохнуть!</p>
                </div>
            )}
            {isAdminMode && (<button onClick={() => handleOpenEditModal(null, dayName, weekNumber)} className="w-full bg-highlight text-text-secondary font-bold py-2 px-3 rounded-xl text-sm hover:bg-border-color transition-colors mt-3">+ Добавить пару</button>)}
            </div>
        </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Заголовок страницы */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2 mt-4">
        <div>
          <h2 className="text-3xl font-bold text-text-primary">Расписание</h2>
          <p className="text-sm text-text-secondary mt-1">Сегодня: {todayDateFormatted}</p>
        </div>
      </div>
       {/* Кнопки AI-инструментов */}
       <div className="flex flex-wrap items-center justify-start gap-2 mb-6">
          <button onClick={openSummaryModal} className="bg-accent/10 text-accent font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 hover:bg-accent/20 transition-colors"><span>📊</span><span>Сводка недели</span></button>
          <button onClick={openPlanModal} className="bg-accent/10 text-accent font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 hover:bg-accent/20 transition-colors"><span>📝</span><span>План на неделю</span></button>
        </div>

      {/* Переключатели недель */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveWeek(1)}
          className={`w-1/2 p-2 rounded-xl text-sm font-bold transition-all duration-300 backdrop-blur-sm border border-white/40 ${activeWeek === 1 ? 'bg-white/70 text-accent shadow-soft' : 'bg-white/30 text-text-secondary hover:bg-white/50'}`}
        >
          Первая неделя {currentCalendarWeek === 1 && <span className="text-xs">(текущая)</span>}
        </button>
        <button
          onClick={() => setActiveWeek(2)}
          className={`w-1/2 p-2 rounded-xl text-sm font-bold transition-all duration-300 backdrop-blur-sm border border-white/40 ${activeWeek === 2 ? 'bg-white/70 text-accent shadow-soft' : 'bg-white/30 text-text-secondary hover:bg-white/50'}`}
        >
          Вторая неделя {currentCalendarWeek === 2 && <span className="text-xs">(текущая)</span>}
        </button>
      </div>
      
      {/* Список дней недели */}
      <div className="space-y-6">
        {displayedSchedule.map((dayData, index) => {
            const dayDate = new Date(activeWeekMonday);
            dayDate.setDate(dayDate.getDate() + index);
            return (
                <div key={`w${activeWeek}-${dayData.day}`} ref={el => { dayRefs.current[dayData.day] = el; }}>
                    <DayCard dayData={dayData} weekNumber={activeWeek} date={dayDate} />
                </div>
            );
        })}
      </div>

      {/* Модальные окна */}
      {isEditModalOpen && editingItem && <ScheduleEditModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSave={handleSaveItem} itemData={editingItem} />}
      {isHelpModalOpen && modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in"><div className="bg-secondary rounded-3xl shadow-soft-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-zoom-in border border-border-color"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-accent">✨ AI Помощник</h3><button onClick={closeHelpModal} className="text-text-secondary hover:text-accent text-2xl">❌</button></div><div className="mb-4"><p className="font-semibold text-text-secondary">Ваш вопрос по предмету "{modalContent.subject}":</p><p className="p-3 bg-highlight rounded-xl mt-2 text-text-primary">{modalContent.homework}</p></div><button onClick={fetchAiHelp} disabled={isHelpLoading} className="w-full bg-accent text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-accent-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">{isHelpLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Думаю...</span></>) : (<><span className="text-lg">💡</span><span>Получить объяснение</span></>)}</button>{helpError && <p className="text-red-500 mt-4 text-center">{helpError}</p>}{aiHelpResponse && <div className="mt-6 p-4 bg-highlight rounded-xl"><h4 className="text-lg font-semibold text-accent mb-2">Ответ AI:</h4><div className="text-text-primary whitespace-pre-wrap">{aiHelpResponse}</div></div>}</div></div>
      )}
       {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in"><div className="bg-secondary rounded-3xl shadow-soft-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-zoom-in border border-border-color"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-accent">📝 AI Планировщик Учебы</h3><button onClick={closePlanModal} className="text-text-secondary hover:text-accent text-2xl">❌</button></div><div className="mb-4"><p className="font-semibold text-text-secondary">AI создаст план на основе важных задач на выбранной неделе:</p><ul className="list-disc pl-5 p-3 bg-highlight rounded-xl mt-2 text-text-primary">{activeWeekScheduleData.flatMap(d => d.classes).filter(i => i.isImportant).length > 0 ? (activeWeekScheduleData.flatMap(d => d.classes).filter(i => i.isImportant).map((item) => (<li key={item.id}><strong>{item.subject}:</strong> {item.homework}</li>))) : (<li>На этой неделе нет важных заданий. Отличное время для повторения!</li>)}</ul></div><button onClick={fetchStudyPlan} disabled={isPlanLoading} className="w-full bg-accent text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-accent-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">{isPlanLoading ? (<><span>Составляю план...</span></>) : (<><span className="text-lg">🧠</span><span>Создать учебный план</span></>)}</button>{planError && <p className="text-red-500 mt-4 text-center">{planError}</p>}{aiPlanResponse && <div className="mt-6 p-4 bg-highlight rounded-xl"><h4 className="text-lg font-semibold text-accent mb-2">Ваш персональный план:</h4><div className="text-text-primary whitespace-pre-wrap prose prose-sm max-w-none">{aiPlanResponse}</div></div>}</div></div>
      )}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in"><div className="bg-secondary rounded-3xl shadow-soft-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-zoom-in border border-border-color"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-accent">📊 Сводка на неделю</h3><button onClick={closeSummaryModal} className="text-text-secondary hover:text-accent text-2xl">❌</button></div><p className="mb-4 text-text-secondary">AI проанализирует ваше расписание и выделит самое главное для выбранной недели.</p><button onClick={fetchWeekSummary} disabled={isSummaryLoading} className="w-full bg-accent text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-accent-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">{isSummaryLoading ? (<><span>Генерирую сводку...</span></>) : (<><span className="text-lg">💡</span><span>Получить сводку</span></>)}</button>{summaryError && <p className="text-red-500 mt-4 text-center">{summaryError}</p>}{aiSummaryResponse && <div className="mt-6 p-4 bg-highlight rounded-xl"><h4 className="text-lg font-semibold text-accent mb-2">Ключевые моменты недели:</h4><div className="text-text-primary whitespace-pre-wrap prose prose-sm max-w-none">{aiSummaryResponse}</div></div>}</div></div>
      )}
    </div>
  );
};

/**
 * Компонент модального окна для редактирования/добавления элемента расписания.
 */
const ScheduleEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ScheduleItem | Omit<ScheduleItem, 'id'>, day: string, week: 1 | 2) => void;
  itemData: { item: ScheduleItem | Omit<ScheduleItem, 'id'>, day: string, week: 1 | 2 };
}> = ({ isOpen, onClose, onSave, itemData }) => {
  const [formData, setFormData] = useState(itemData.item);
  const isNew = !('id' in formData);

  // Обновляем состояние формы, если изменился редактируемый элемент.
  useEffect(() => {
    setFormData(itemData.item);
  }, [itemData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormData(prev => ({...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, itemData.day, itemData.week);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in"><div className="bg-secondary rounded-3xl shadow-soft-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-zoom-in border border-border-color"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-accent">{isNew ? 'Добавить пару' : 'Редактировать пару'}</h3><button onClick={onClose} className="text-text-secondary hover:text-accent text-2xl">❌</button></div><form onSubmit={handleSubmit} className="space-y-4"><div><label className="text-sm font-bold text-text-secondary">Предмет</label><input type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required /></div><div><label className="text-sm font-bold text-text-secondary">Время (напр. 9:00 - 10:30)</label><input type="text" name="time" value={formData.time} onChange={handleChange} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required /></div><div><label className="text-sm font-bold text-text-secondary">Аудитория</label><input type="text" name="classroom" value={formData.classroom} onChange={handleChange} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required /></div><div><label className="text-sm font-bold text-text-secondary">Преподаватель</label><input type="text" name="teacher" value={formData.teacher} onChange={handleChange} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required /></div><div><label className="text-sm font-bold text-text-secondary">Домашнее задание</label><textarea name="homework" value={formData.homework} onChange={handleChange} rows={3} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required ></textarea></div><div className="flex items-center"><input type="checkbox" name="isImportant" id="isImportant" checked={formData.isImportant} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" /><label htmlFor="isImportant" className="ml-2 text-sm text-text-primary">Это важное задание</label></div><button type="submit" className="w-full bg-accent text-white font-bold py-3 px-4 rounded-xl hover:bg-accent-hover transition-colors shadow-soft">Сохранить</button></form></div></div>
  )
};
export default Schedule;