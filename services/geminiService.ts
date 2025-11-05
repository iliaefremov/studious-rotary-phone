// import { GoogleGenAI, Chat, Type } from "@google/genai"; // ВРЕМЕННО ОТКЛЮЧЕНО
import type { GameState, PlayerActions } from "../types";

// ВРЕМЕННО ОТКЛЮЧЕНО: Инициализация клиента Google GenAI.
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Генерирует текстовый контент. ВЕРСИЯ-ЗАГЛУШКА ДЛЯ ДИАГНОСТИКИ.
 * @param {string} prompt - Текстовый промпт для модели.
 * @returns {Promise<string>} Статический текстовый ответ.
 */
export const generateHomeworkHelp = async (prompt: string): Promise<string> => {
  console.log("Вызов Gemini (generateHomeworkHelp) отключен для диагностики.");
  return Promise.resolve("AI-помощник временно отключен для диагностики. Если вы видите это сообщение, значит, основное приложение работает корректно. Проблема в API-ключе Gemini.");
};

/**
 * Создает мок-объект чата. ВЕРСИЯ-ЗАГЛУШКА ДЛЯ ДИАГНОСТИКИ.
 * @returns {any} Мок-объект сессии чата.
 */
export const getChat = (): any => {
  console.log("Вызов Gemini (getChat) отключен для диагностики.");
  return {
    sendMessage: async (request: { message: string }): Promise<{ text: string }> => {
      return { text: "AI-ассистент временно отключен для диагностики. Если вы видите это, значит, приложение работает. Проверьте API-ключ Gemini в настройках Vercel." };
    }
  };
};

/**
 * Возвращает мок-ответ от AI-ведущего. ВЕРСИЯ-ЗАГЛУШКА ДЛЯ ДИАГНОСТИКИ.
 * @param {GameState} gameState - Текущее состояние игры.
 * @param {PlayerActions} playerActions - Действия, совершенные игроками.
 * @returns {Promise<Partial<GameState>>} Промис с мок-объектом изменений.
 */
export const getMafiaHostResponse = async (gameState: GameState, playerActions: PlayerActions): Promise<Partial<GameState>> => {
  console.log("Вызов Gemini (getMafiaHostResponse) отключен для диагностики.");
  return Promise.resolve({
    narration: "AI-ведущий временно отключен для диагностики. Игра не может продолжаться.",
    log: [{ type: 'system', text: "Ошибка: AI-ведущий недоступен. Проверьте API-ключ Gemini." }],
    phase: 'ended',
    winner: null
  });
};
