import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { GRADES_DATA } from '../constants';
import type { SubjectGrade, TelegramUser } from './../types';
import { getGrades } from '../services/googleSheetsService';
import { SubjectGradeCard } from './SubjectGradeCard';

/**
 * Компонент "Оценки".
 * Отвечает за загрузку оценок пользователя из Google Sheets, их обработку,
 * группировку по предметам и отображение в виде информативных карточек.
 * Предоставляет fallback на демонстрационные данные в случае ошибки.
 */
const Grades: React.FC = () => {
  // Состояние для хранения данных пользователя Telegram.
  const [user, setUser] = useState<TelegramUser | null>(null);
  // Состояние для хранения списка оценок пользователя.
  const [userGrades, setUserGrades] = useState<SubjectGrade[]>([]);
  // Состояние для отслеживания процесса загрузки данных.
  const [isLoading, setIsLoading] = useState(true);
  // Состояние для хранения сообщений об ошибках.
  const [error, setError] = useState<string | null>(null);

  /**
   * Асинхронная функция для загрузки и фильтрации оценок.
   * Пытается получить данные из Google Sheets. В случае неудачи
   * использует демонстрационные данные из `constants.ts`.
   */
  const loadGrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const tg = window.Telegram?.WebApp;
    const currentUser = tg?.initDataUnsafe?.user;
    
    // Если мы не можем определить пользователя, прекращаем выполнение и выводим ошибку.
    if (!currentUser) {
        setError("Не удалось определить пользователя Telegram. Пожалуйста, откройте приложение через Telegram.");
        setUserGrades([]);
        setIsLoading(false);
        return;
    }

    const currentUserId = currentUser.id.toString();
    setUser(currentUser); // Сохраняем пользователя в состояние

    try {
      const fetchedGrades = await getGrades();
      
      // Фильтруем оценки, оставляя только те, что принадлежат текущему пользователю.
      const filteredGrades = fetchedGrades.filter(grade => grade.user_id === currentUserId);
      setUserGrades(filteredGrades);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Произошла неизвестная ошибка.";
      setError(`Не удалось подключиться к Google Sheets: "${errorMessage}". Показаны демонстрационные данные.`);
      
      // В случае ошибки используем демонстрационные данные, отфильтрованные для реального пользователя.
      const filteredDemoGrades = GRADES_DATA.filter(grade => grade.user_id === currentUserId);
      setUserGrades(filteredDemoGrades);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Эффект, который запускается один раз при монтировании компонента.
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
    }
    loadGrades();
  }, [loadGrades]);

  /**
   * Мемоизированное значение, которое группирует все оценки по предметам.
   * Пересчитывается только при изменении `userGrades`.
   * @returns {Record<string, SubjectGrade[]>} Объект, где ключ - название предмета,
   * а значение - массив оценок по этому предмету.
   */
  const gradesBySubject = useMemo(() => {
    return userGrades.reduce((acc, grade) => {
      if (!acc[grade.subject]) {
        acc[grade.subject] = [];
      }
      acc[grade.subject].push(grade);
      return acc;
    }, {} as Record<string, SubjectGrade[]>);
  }, [userGrades]);

  // Пытаемся получить имя пользователя из данных таблицы для более персонального приветствия.
  const userNameFromSheet = useMemo(() => {
      if (userGrades.length > 0 && userGrades[0].user_name) {
        return userGrades[0].user_name;
      }
      return null;
  }, [userGrades]);

  // Формируем имя для отображения и приветственное сообщение.
  const displayName = userNameFromSheet || user?.first_name || '';
  const welcomeMessage = displayName ? `Рад снова видеть тебя, ${displayName}! ✨` : 'Добро пожаловать! ✨';

  return (
    <div className="animate-fade-in">
      {/* Заголовок страницы */}
      <div className="flex justify-between items-center mb-6 mt-4">
        <div>
          <h2 className="text-3xl font-bold text-text-primary">{welcomeMessage}</h2>
          <p className="text-sm text-text-secondary mt-2">Вот твой обзор успеваемости. Продолжай в том же духе!</p>
        </div>
        <button onClick={loadGrades} disabled={isLoading} className="bg-highlight text-accent font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center hover:bg-border-color transition-colors disabled:opacity-50 disabled:cursor-wait">
          <span>{isLoading ? 'Обновление...' : 'Обновить'}</span>
        </button>
      </div>

      {/* Информационная плашка о задержке обновления */}
      <div className="my-6 p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center">
        <p className="text-sm text-blue-800">💡 Данные из Google Таблиц могут обновляться с задержкой до 5 минут.</p>
      </div>

      {/* Отображение ошибки, если она есть */}
      {error && (
         <div className="mb-6 p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
           <p className="font-bold text-yellow-800">⚠️ Проблема с подключением</p>
           <p className="text-sm mt-1 text-yellow-700">{error}</p>
         </div>
      )}

      {/* Отображение контента в зависимости от состояния загрузки */}
      {isLoading ? (
        // Прелоадер во время загрузки
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2 text-text-secondary">
            <svg className="animate-spin h-6 w-6 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span className="font-semibold">Загрузка оценок...</span>
          </div>
        </div>
      ) : userGrades.length === 0 && !error ? (
        // Сообщение, если оценки не найдены
         <div className="flex items-center justify-center h-64">
           <div className="text-center p-6 bg-highlight rounded-2xl">
             <p className="font-bold text-text-primary">Оценок пока нет</p>
             <p className="text-text-secondary mt-1">Проверьте ваш ID в таблице или попробуйте обновить.</p>
           </div>
         </div>
      ) : (
       // Рендеринг списка карточек с оценками
       <div className="space-y-6 max-w-3xl mx-auto">
          {Object.entries(gradesBySubject).map(([subject, subjectGrades]) => (
              <SubjectGradeCard key={subject} subject={subject} subjectGrades={subjectGrades} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Grades;