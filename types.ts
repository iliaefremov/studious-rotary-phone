/**
 * Описывает один элемент расписания (одно занятие).
 */
export interface ScheduleItem {
  id: number; // Уникальный идентификатор
  subject: string; // Название предмета
  time: string; // Время проведения (например, "10:00 - 11:35")
  classroom: string; // Аудитория или место проведения
  teacher: string; // Имя преподавателя
  homework: string; // Домашнее задание
  isImportant: boolean; // Флаг, указывающий на важность задания
}

/**
 * Описывает расписание на один день.
 */
export interface DaySchedule {
  day: string; // Название дня недели (например, "Понедельник")
  classes: ScheduleItem[]; // Список занятий на этот день
}

/**
 * Описывает одну оценку по конкретному предмету.
 */
export interface SubjectGrade {
  user_id: string; // ID пользователя в Telegram
  user_name?: string; // Имя пользователя из таблицы
  subject: string; // Название предмета
  topic: string; // Тема, за которую получена оценка
  date: string; // Дата получения оценки (в формате YYYY-MM-DD)
  score: number | 'зачет' | 'н'; // Оценка (число, "зачет" или "н" - неявка)
}

/**
 * Описывает одно достижение (ачивку).
 */
export interface Achievement {
  id: string; // Уникальный идентификатор достижения
  title: string; // Название
  description: string; // Описание
  emoji: string; // Эмодзи для визуального представления
  points: number; // Количество очков за достижение
  unlocked: boolean; // Флаг, открыто ли достижение
}

/**
 * Описывает одно сообщение в AI чате.
 */
export interface ChatMessage {
    id: string; // Уникальный идентификатор сообщения
    text: string; // Текст сообщения
    sender: 'user' | 'ai'; // Отправитель: пользователь или AI
}

// --- Типы для игры "Мафия" с AI-ведущим ---

/**
 * Описывает игрока в игре "Мафия".
 */
export interface Player {
  telegramId: number; // Уникальный идентификатор (из Telegram для людей, отрицательный для ботов)
  name: string; // Имя игрока
  role: 'Mafia' | 'Doctor' | 'Civilian' | null; // Роль в игре (null до начала)
  isAlive: boolean; // Статус: жив или мертв
  isBot: boolean; // `true`, если игрок - бот
}

/**
 * Описывает одно сообщение во внутриигровом чате "Мафии".
 */
export interface GameChatMessage {
  senderId: number; // ID отправителя
  senderName: string; // Имя отправителя
  text: string; // Текст сообщения
  isGhost: boolean; // `true`, если сообщение от выбывшего игрока
}

/**
 * Определяет возможные фазы игры "Мафия".
 */
export type GamePhase = 'lobby' | 'day' | 'night' | 'ended';

/**
 * Описывает полное состояние игры "Мафия".
 * Это состояние управляется AI-ведущим и обновляется на клиенте.
 */
export interface GameState {
  players: Player[]; // Список всех игроков
  phase: GamePhase; // Текущая фаза игры
  dayNumber: number; // Номер текущего игрового дня
  log: { type: 'narration' | 'vote' | 'system', text: string }[]; // Лог системных событий игры
  chat: GameChatMessage[]; // Сообщения внутриигрового чата
  winner: 'Mafia' | 'Civilians' | null; // Победитель, если игра окончена
  narration: string; // Текущее повествование от AI-ведущего
}

/**
 * Описывает действия игроков, которые отправляются AI-ведущему для обработки.
 */
export interface PlayerActions {
    votes?: { [voterId: number]: number }; // Ключ - ID голосующего, значение - ID того, за кого проголосовали
    nightActions?: {
        mafiaTarget?: number; // ID цели мафии
        doctorTarget?: number; // ID цели доктора
    };
}


// --- Типы для Telegram Mini App ---

/**
 * Описывает пользователя Telegram согласно документации Web App.
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Описывает объект WebApp, предоставляемый Telegram.
 */
export interface TelegramWebApp {
  initDataUnsafe: {
    user?: TelegramUser;
  };
  ready: () => void;
  // Здесь можно добавить другие свойства и методы по мере необходимости
}

/**
 * Расширяет глобальный объект Window для добавления поддержки Telegram WebApp.
 */
declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}