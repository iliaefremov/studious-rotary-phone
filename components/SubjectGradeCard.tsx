import React, { useState, useMemo } from 'react';
import type { SubjectGrade } from '../types';
import { ChartIcon } from './icons/Icons';
import { GradeChart } from './GradeChart';

/**
 * Вспомогательная функция для вычисления среднего балла и количества пропусков.
 * @param {SubjectGrade[]} grades - Массив оценок по одному предмету.
 * @returns {{ avg100: string, absences: number }} Объект со средним баллом (строка) и количеством пропусков.
 */
const calculateAverage = (grades: SubjectGrade[]): { avg100: string, absences: number } => {
    // Фильтруем только числовые оценки для расчета среднего.
    const numericScores = grades.map(g => g.score).filter(s => typeof s === 'number') as number[];
    // Считаем количество пропусков ('н').
    const absences = grades.filter(g => g.score === 'н').length;
    
    if (numericScores.length === 0) return { avg100: '0.00', absences };
    
    const sum100 = numericScores.reduce((acc, score) => acc + score, 0);
    const avg100 = (sum100 / numericScores.length);
    return { avg100: avg100.toFixed(2), absences };
};

/**
 * Вспомогательная функция для форматирования даты в локализованный вид.
 * @param {string} dateString - Дата в формате "YYYY-MM-DD".
 * @returns {string} Отформатированная дата (например, "15 сентября 2024 г.").
 */
const formatDate = (dateString: string): string => {
    // Простая проверка формата, чтобы избежать ошибок с невалидными датами.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
    } catch (e) {
        return dateString; // Возвращаем исходную строку в случае ошибки.
    }
};

/**
 * Вспомогательная функция для получения классов Tailwind CSS для цветового кодирования оценок.
 * @param {number | string} score - Оценка.
 * @returns {string} Строка с классами Tailwind.
 */
const getScoreColor = (score: number | string) => {
    if (score === 'зачет') return 'bg-blue-100 text-blue-800';
    if (score === 'н') return 'bg-gray-200 text-gray-700';
    if (typeof score !== 'number') return 'bg-gray-100 text-gray-800';
    if (score >= 86) return 'bg-green-100 text-green-800'; // Отлично
    if (score >= 71) return 'bg-yellow-100 text-yellow-800'; // Хорошо
    if (score >= 56) return 'bg-orange-100 text-orange-800'; // Удовлетворительно
    return 'bg-red-100 text-red-800'; // Неудовлетворительно
};
  
/**
 * Вспомогательная функция для получения классов Tailwind CSS для цветового кодирования среднего балла.
 * @param {number} score - Средний балл.
 * @returns {{ textColor: string, bgColor: string }} Объект с классами для текста и фона.
 */
const get100ScaleColor = (score: number): { textColor: string, bgColor: string } => {
    if (score >= 86) return { textColor: 'text-green-500', bgColor: 'bg-green-500' };
    if (score >= 71) return { textColor: 'text-yellow-500', bgColor: 'bg-yellow-500' };
    if (score >= 56) return { textColor: 'text-orange-500', bgColor: 'bg-orange-500' };
    return { textColor: 'text-red-500', bgColor: 'bg-red-500' };
};

/**
 * Компонент карточки, отображающий все оценки по одному предмету.
 * Включает в себя средний балл, список оценок, информацию о пропусках и график успеваемости.
 */
export const SubjectGradeCard: React.FC<{ subject: string; subjectGrades: SubjectGrade[] }> = ({ subject, subjectGrades }) => {
    // Состояние для управления видимостью полного списка оценок.
    const [isExpanded, setIsExpanded] = useState(false);
    // Состояние для управления видимостью списка пропусков.
    const [areAbsencesExpanded, setAreAbsencesExpanded] = useState(false);
    // Состояние для управления видимостью графика.
    const [isChartVisible, setIsChartVisible] = useState(false);

    // Мемоизированные вычисления среднего балла и пропусков.
    const { avg100, absences } = useMemo(() => calculateAverage(subjectGrades), [subjectGrades]);
    const { textColor, bgColor } = get100ScaleColor(parseFloat(avg100));

    // По умолчанию показываем только последние 3 оценки.
    const gradesToShow = subjectGrades.slice(0, 3);
    const hiddenGrades = subjectGrades.slice(3);

    return (
        <div className="group bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5 transition-all duration-300 hover:shadow-soft-lg hover:scale-[1.02]">
            {/* Заголовок карточки с названием предмета и средним баллом */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-text-primary">{subject}</h3>
                    <button 
                        onClick={() => setIsChartVisible(prev => !prev)}
                        className={`p-1 rounded-md transition-colors ${isChartVisible ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-highlight'}`}
                        aria-label="Показать график"
                        title="Показать график"
                    >
                        <ChartIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-right">
                    <span className={`font-bold text-3xl ${textColor}`}>{avg100}</span>
                </div>
            </div>

            {/* Контейнер для графика, анимируется при появлении/исчезновении */}
            <div className={`transition-all duration-500 ease-in-out ${isChartVisible ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <GradeChart grades={subjectGrades} />
            </div>
            
            {/* Блок с информацией о пропусках (отображается, если есть пропуски) */}
            {absences > 0 ? (
                <div className="mb-4">
                    <button 
                        onClick={() => setAreAbsencesExpanded(prev => !prev)}
                        className="w-full bg-orange-100 text-orange-800 font-bold text-sm rounded-lg p-2.5 text-center flex justify-between items-center transition-colors hover:bg-orange-200"
                        aria-expanded={areAbsencesExpanded}
                    >
                        <span>⚠️ Отработок: {absences}</span>
                        <svg className={`w-5 h-5 transition-transform ${areAbsencesExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out ${areAbsencesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <ul className="space-y-1 text-sm bg-highlight p-3 rounded-lg mt-2">
                        {subjectGrades.filter(g => g.score === 'н').map((absence, index) => (
                            <li key={`absence-${index}`} className="flex justify-between items-center text-text-secondary py-1">
                                <span>• {absence.topic}</span>
                                <span className="text-xs opacity-75 whitespace-nowrap pl-2">{formatDate(absence.date)}</span>
                            </li>
                        ))}
                        </ul>
                    </div>
                </div>
            ) : (
                // Полоса прогресса, если пропусков нет.
                <div className="w-full bg-highlight rounded-full h-2 mb-4">
                    <div className={`${bgColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${avg100}%` }}></div>
                </div>
            )}

            {/* Список последних оценок */}
            <ul className="space-y-2">
                {gradesToShow.map((grade, index) => (
                    <li key={`last-${index}`} className={`flex justify-between items-center p-2 rounded-lg transition-colors ${index === 0 ? 'bg-accent/10' : 'bg-highlight'}`}>
                        <div className="text-sm">
                            <p className={`font-semibold ${index === 0 ? 'text-accent font-bold' : 'text-text-primary'}`}>{grade.topic}</p>
                            <p className="text-xs text-text-secondary">{formatDate(grade.date)}</p>
                        </div>
                        <span className={`text-sm font-bold w-10 h-10 flex items-center justify-center rounded-full ${getScoreColor(grade.score)}`}>{grade.score}</span>
                    </li>
                ))}
            </ul>

            {/* Скрытый список остальных оценок, который можно раскрыть */}
            <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[9999px] mt-4' : 'max-h-0 overflow-hidden'}`}>
                {hiddenGrades.length > 0 && (
                    <ul className="space-y-2 border-t border-border-color pt-4">
                        {hiddenGrades.map((grade, index) => (
                        <li key={`all-${index}`} className="flex justify-between items-center p-2 bg-highlight rounded-lg">
                            <div className="text-sm">
                                <p className="font-semibold text-text-primary">{grade.topic}</p>
                                <p className="text-xs text-text-secondary">{formatDate(grade.date)}</p>
                            </div>
                            <span className={`text-sm font-bold w-10 h-10 flex items-center justify-center rounded-full ${getScoreColor(grade.score)}`}>{grade.score}</span>
                        </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Кнопка "Показать все" / "Свернуть" */}
            {subjectGrades.length > 3 && (
                <button onClick={() => setIsExpanded(prev => !prev)} className="w-full mt-4 bg-highlight text-accent font-bold py-2 px-3 rounded-lg text-sm hover:bg-border-color transition-colors flex items-center justify-center space-x-2">
                <span>{isExpanded ? 'Свернуть' : 'Показать все'}</span>
                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
            )}
        </div>
    );
};