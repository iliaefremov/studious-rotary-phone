import type { SubjectGrade } from '../types';

// URL для опубликованной в веб-доступе Google Таблицы в формате CSV.
// Все данные находятся на одном листе, поэтому имя листа не требуется.
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRf6H54cEZ1qHEv6cls6VGdlSm3TsdaMjah9G7FZtnM6caSgF9W0jQiUUyWlKGcNxV2VWG2VJCEJDzy/pub?output=csv';

/**
 * Парсит одну строку CSV, корректно обрабатывая значения в кавычках.
 * @param {string} row - Строка CSV.
 * @returns {string[]} Массив значений ячеек.
 */
const parseCsvRow = (row: string): string[] => {
  const values: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      // Обработка двойных кавычек внутри поля в кавычках.
      if (inQuotes && row[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  values.push(currentVal.trim());
  return values;
};

/**
 * Нормализует различные форматы дат (ДД.ММ.ГГГГ, ДД/ММ/ГГ, ДД.ММ) в стандартный формат YYYY-MM-DD.
 * @param {string} dateStr - Исходная строка с датой из CSV.
 * @returns {string} Дата в формате YYYY-MM-DD или исходная строка, если парсинг не удался.
 */
const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const cleanedDateStr = dateStr.trim();
  const currentYear = new Date().getFullYear();

  // Попытка парсинга ДД.ММ.ГГГГ или ДД/ММ/ГГГГ
  let parts = cleanedDateStr.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (parts) {
    return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }

  // Попытка парсинга ДД.ММ.ГГ или ДД/ММ/ГГ
  parts = cleanedDateStr.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2})$/);
  if (parts) {
    return `20${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  
  // ИСПРАВЛЕНО: Обработка формата ДД.ММ или ДД/ММ с подстановкой текущего года.
  parts = cleanedDateStr.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (parts) {
    return `${currentYear}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  
  // Возвращаем как есть, если формат уже YYYY-MM-DD или неизвестен.
  return cleanedDateStr;
};


/**
 * Загружает и парсит данные об оценках из опубликованной Google Таблицы.
 * @returns {Promise<SubjectGrade[]>} Промис, который разрешается массивом оценок.
 * @throws {Error} Если происходит ошибка сети или парсинга.
 */
export const getGrades = async (): Promise<SubjectGrade[]> => {
  try {
    const response = await fetch(SPREADSHEET_URL);
    if (!response.ok) {
      throw new Error(`Сетевой ответ не был успешным. Статус: ${response.status}`);
    }
    const csvText = await response.text();
    return parseBlockBasedPivotData(csvText);
  } catch (error) {
    console.error(`Ошибка при загрузке или парсинге таблицы:`, error);
    // Пробрасываем ошибку дальше, чтобы UI мог ее обработать (например, показать демо-данные).
    throw new Error('Не удалось загрузить данные из Google Sheets.');
  }
};

/**
 * Парсит CSV-данные со сложной структурой, где предметы организованы в блоки.
 * @param {string} csvText - Исходные CSV-данные в виде строки.
 * @returns {SubjectGrade[]} Отформатированный массив данных об оценках.
 */
const parseBlockBasedPivotData = (csvText: string): SubjectGrade[] => {
  if (!csvText) return [];

  // Удаляем возможный BOM-символ (Byte Order Mark) из начала файла.
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.substring(1);
  }

  const rows = csvText.trim().split(/\r?\n/);
  if (rows.length < 3) {
    // Не бросаем ошибку, а возвращаем пустой массив, если таблица пуста, но валидна.
    console.warn(`CSV файл содержит менее 3 строк. Возможно, он пуст.`);
    return [];
  };

  const grades: SubjectGrade[] = [];
  // Определяем начальные строки для каждого блока с предметом, согласно структуре таблицы.
  const subjectBlockStartRows = [0, 18, 36, 54, 72];

  subjectBlockStartRows.forEach((startRowIndex, blockIndex) => {
    if (startRowIndex >= rows.length) {
      return; // Пропускаем блок, если он не существует в файле.
    }

    // 1. Извлекаем заголовки, специфичные для блока.
    const headerRow = parseCsvRow(rows[startRowIndex]);
    const subjectName = headerRow[0]?.trim(); // Название предмета в колонке A.
    
    if (!subjectName) {
      console.warn(`Название предмета не найдено для блока в строке ${startRowIndex + 1}. Пропускаем.`);
      return;
    }

    const topicRow = parseCsvRow(rows[startRowIndex + 1]); // Темы занятий в следующей строке.

    // 2. Определяем диапазон строк с данными для этого блока.
    const dataStartRowIndex = startRowIndex + 2;
    const nextBlockStart = subjectBlockStartRows[blockIndex + 1] || rows.length;
    const dataRowsForBlock = rows.slice(dataStartRowIndex, nextBlockStart);

    // 3. Обрабатываем каждую строку с данными внутри блока.
    dataRowsForBlock.forEach(rowStr => {
      if (!rowStr.trim()) return; // Пропускаем пустые строки.

      const row = parseCsvRow(rowStr);
      const userId = row[0]?.trim();
      const userName = row[1]?.trim();
      
      if (!userId) return; // Пропускаем строки без ID пользователя.

      // Итерируемся по ячейкам с оценками (справа налево, как в таблице).
      for (let i = row.length - 1; i >= 3; i--) {
        const scoreStr = row[i]?.trim().replace(/"/g, '');
        if (!scoreStr) continue; // Пропускаем пустые ячейки оценок.

        const date = headerRow[i]?.trim(); // Дата из строки заголовка блока.
        const topic = topicRow[i]?.trim() || 'N/A';
        
        if (!date) continue; // Если в заголовке нет даты, это невалидная колонка.

        // Приводим оценку к нужному типу.
        let score: number | 'зачет' | 'н';
        if (scoreStr.toLowerCase() === 'н') {
          score = 'н';
        } else if (!isNaN(parseFloat(scoreStr)) && isFinite(Number(scoreStr))) {
          score = Number(scoreStr);
        } else if (scoreStr.toLowerCase().includes('зачет')) {
            score = 'зачет';
        } else {
            continue; // Пропускаем непонятные значения.
        }

        grades.push({
            user_id: userId,
            user_name: userName,
            subject: subjectName,
            topic: topic,
            date: normalizeDate(date),
            score: score,
        });
      }
    });
  });

  return grades;
};