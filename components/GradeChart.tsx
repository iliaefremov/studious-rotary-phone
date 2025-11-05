import React, { useMemo, useState } from 'react';
import type { SubjectGrade } from '../types';

interface GradeChartProps {
  grades: SubjectGrade[]; // Оценки по одному предмету
}

interface Point {
  x: number; // Координата X
  y: number; // Координата Y
  original: SubjectGrade; // Исходный объект оценки
}

/**
 * Вспомогательная функция для форматирования даты в короткий вид (например, "15 сен").
 * @param {string} dateString - Дата в формате "YYYY-MM-DD".
 * @returns {string} Кратко отформатированная дата.
 */
const formatDate = (dateString: string): string => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
    } catch (e) {
        return dateString;
    }
};

/**
 * Компонент для отображения линейного графика успеваемости с использованием SVG.
 */
export const GradeChart: React.FC<GradeChartProps> = ({ grades }) => {
  // Состояние для отслеживания активной точки, на которую наведен курсор.
  const [activePoint, setActivePoint] = useState<Point | null>(null);
  
  // Константы для размеров и отступов SVG-холста.
  const WIDTH = 500;
  const HEIGHT = 200;
  const PADDING = { top: 20, right: 20, bottom: 30, left: 30 };

  // Мемоизация расчетов данных для графика.
  // Пересчет происходит только при изменении массива `grades`.
  const chartData = useMemo(() => {
    // 1. Фильтруем и сортируем оценки: оставляем только числовые и с датой, сортируем по дате.
    const numericGrades = grades
      .filter(g => typeof g.score === 'number' && g.date)
      .map(g => ({ ...g, dateObj: new Date(g.date) }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Для построения линии нужно как минимум 2 точки.
    if (numericGrades.length < 2) return null;

    const dates = numericGrades.map(g => g.dateObj.getTime());
    const scores = numericGrades.map(g => g.score as number);

    // 2. Находим минимальные и максимальные значения для осей.
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    // Ось Y всегда от 0 до 100 для наглядности.
    const minScore = 0; 
    const maxScore = 100;

    // 3. Преобразуем данные оценок в координатные точки на SVG-холсте.
    const points = numericGrades.map(grade => {
      const dateX = ((new Date(grade.date).getTime() - minDate) / (maxDate - minDate)) * (WIDTH - PADDING.left - PADDING.right) + PADDING.left;
      const scoreY = HEIGHT - PADDING.bottom - (((grade.score as number) - minScore) / (maxScore - minScore)) * (HEIGHT - PADDING.top - PADDING.bottom);
      return { x: dateX, y: scoreY, original: grade };
    });

    // 4. Создаем SVG path string (строку для атрибута 'd' тега <path>).
    const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');

    return { points, path, minDate, maxDate };
  }, [grades]);

  // Если данных для графика недостаточно.
  if (!chartData) {
    return (
      <div className="h-48 flex items-center justify-center bg-highlight rounded-xl text-sm text-text-secondary">
        Недостаточно данных для построения графика.
      </div>
    );
  }
  
  // Метки для оси Y.
  const yAxisLabels = [0, 25, 50, 75, 100];

  return (
    <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" onMouseLeave={() => setActivePoint(null)}>
            <title>График успеваемости</title>
            <desc>Линейный график, показывающий изменение оценок по предмету с течением времени.</desc>
            {/* Метки и сетка для оси Y */}
            {yAxisLabels.map(label => {
                const y = HEIGHT - PADDING.bottom - (label / 100) * (HEIGHT - PADDING.top - PADDING.bottom);
                return (
                    <g key={label} className="text-xs text-text-secondary">
                        <text x={PADDING.left - 8} y={y + 3} textAnchor="end" fill="currentColor">{label}</text>
                        <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} stroke="rgba(0,0,0,0.05)" />
                    </g>
                );
            })}

            {/* Метки для оси X (первая и последняя дата) */}
            <g className="text-xs text-text-secondary">
                <text x={PADDING.left} y={HEIGHT - PADDING.bottom + 15} textAnchor="start" fill="currentColor">
                    {formatDate(new Date(chartData.minDate).toISOString().split('T')[0])}
                </text>
                 <text x={WIDTH - PADDING.right} y={HEIGHT - PADDING.bottom + 15} textAnchor="end" fill="currentColor">
                    {formatDate(new Date(chartData.maxDate).toISOString().split('T')[0])}
                </text>
            </g>

            {/* Линия графика */}
            <path d={chartData.path} fill="none" stroke="#3879E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Невидимые круги для удобства наведения курсора */}
            {chartData.points.map((point, index) => (
                <circle 
                    key={index}
                    cx={point.x} 
                    cy={point.y} 
                    r="8" 
                    fill="transparent"
                    onMouseEnter={() => setActivePoint(point)}
                    aria-label={`Оценка: ${point.original.score}, Тема: ${point.original.topic}`}
                />
            ))}
            {/* Видимые точки на графике */}
             {chartData.points.map((point, index) => (
                <circle 
                    key={`dot-${index}`}
                    cx={point.x} 
                    cy={point.y} 
                    r="3" 
                    fill="#3879E8"
                    className="pointer-events-none" // Чтобы не перехватывали события мыши
                />
            ))}

            {/* Всплывающая подсказка (Tooltip) */}
            {activePoint && (
                 <g transform={`translate(${activePoint.x}, ${activePoint.y})`} className="pointer-events-none">
                    {/* Треугольный указатель внизу подсказки */}
                    <path d="M-5 -12 L5 -12 L0 -5 Z" fill="rgba(0,0,0,0.7)" transform="translate(0, -10)" />
                    {/* Прямоугольная основа подсказки */}
                    <rect x="-60" y="-60" width="120" height="45" rx="8" fill="rgba(0,0,0,0.7)" transform="translate(0, -10)" />
                    {/* Текст внутри подсказки */}
                    <text x="0" y="-45" textAnchor="middle" fill="white" className="text-sm font-bold" transform="translate(0, -10)">
                        {activePoint.original.score}
                    </text>
                    <text x="0" y="-30" textAnchor="middle" fill="white" className="text-xs" transform="translate(0, -10)">
                        {activePoint.original.topic.length > 15 ? activePoint.original.topic.substring(0, 14) + '…' : activePoint.original.topic}
                    </text>
                 </g>
            )}
        </svg>
    </div>
  );
};