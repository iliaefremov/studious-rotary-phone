import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from './../types';
import { getChat } from '../services/geminiService';
// Переименовываем импортированный тип `Chat`, чтобы избежать конфликта имен с компонентом.
import type { Chat as GeminiChat } from '@google/genai';
import { SendIcon } from './icons/Icons';

// Список всех возможных подсказок-примеров для ассистента.
const ALL_PROMPTS = [
    "Объясни патогенез сахарного диабета 1 типа",
    "Пришли методичку по гистологии",
    "Когда отработка по физиологии?",
    "Где находится деканат?",
    "Составь краткий план для подготовки к коллоквиуму по анатомии ЦНС",
    "Какие мышцы участвуют в сгибании предплечья?",
    "Напиши краткую сводку по теме 'Цикл Кребса'",
    "Как заказать справку об обучении?",
    "Какой график работы у библиотеки?",
    "Помоги решить задачу по биофизике о мембранном потенциале",
    "Кто мой преподаватель по биохимии?",
    "Дай совет, как лучше запоминать латинские названия",
    "Перечисли основные функции печени",
    "Что такое апоптоз и чем он отличается от некроза?",
    "Какие есть кружки по хирургии в университете?"
];

/**
 * Компонент "Ассистент".
 * Предоставляет интерфейс для общения с AI-помощником на базе Gemini.
 * Может помочь с домашним заданием, объяснить сложные темы на основе материалов Университета,
 * а также ответить на организационные вопросы (где находится деканат, как заказать справку,
 * отправить методичку по предмету или сказать, когда отработка по физиологии).
 * Управляет состоянием сообщений, вводом пользователя и процессом отправки/получения.
 */
const Chat: React.FC = () => {
  // Состояние для хранения всех сообщений в чате.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Состояние для хранения текущего текста в поле ввода.
  const [input, setInput] = useState('');
  // Состояние для отслеживания загрузки ответа от AI.
  const [isLoading, setIsLoading] = useState(false);
  // Состояние для хранения динамически выбранных подсказок.
  const [displayedPrompts, setDisplayedPrompts] = useState<string[]>([]);
  // Реф для хранения экземпляра сессии чата Gemini.
  const chatSession = useRef<GeminiChat | null>(null);
  // Реф для автоматической прокрутки к последнему сообщению.
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Инициализация сессии чата и выбор случайных подсказок при первом рендере.
  useEffect(() => {
    chatSession.current = getChat();

    // Функция для перемешивания массива (алгоритм Фишера-Йейтса).
    const shuffleArray = (array: string[]) => {
      let currentIndex = array.length, randomIndex;
      while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
    };

    // Перемешиваем и берем первые 4 подсказки для отображения.
    const selectedPrompts = shuffleArray([...ALL_PROMPTS]).slice(0, 4);
    setDisplayedPrompts(selectedPrompts);
  }, []);
  
  /**
   * Функция для плавной прокрутки контейнера сообщений вниз.
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Вызываем прокрутку каждый раз, когда обновляется список сообщений.
  useEffect(scrollToBottom, [messages]);

  /**
   * Обработчик отправки сообщения.
   * Вызывается при отправке формы (нажатие Enter или кнопки).
   */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    // Игнорируем отправку, если поле ввода пустое или уже идет загрузка.
    if (!input.trim() || isLoading) return;

    // Создаем объект сообщения пользователя.
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    // Добавляем сообщение пользователя в список и очищаем поле ввода.
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatSession.current) {
        throw new Error("Сессия чата не инициализирована");
      }
      
      // Отправляем сообщение в Gemini API.
      // Метод `sendMessage` ожидает объект со свойством `message`.
      const response = await chatSession.current.sendMessage({ message: userMessage.text });
      
      // Создаем объект ответа AI.
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        text: response.text, // Получаем текст напрямую из ответа.
        sender: 'ai',
      };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {
      console.error("Ошибка при отправке сообщения AI:", error);
      // В случае ошибки добавляем сообщение об ошибке в чат.
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        text: 'Произошла ошибка при ответе. Попробуйте снова.',
        sender: 'ai',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] animate-fade-in">
       <h2 className="text-3xl font-bold text-text-primary mb-4 mt-4">Ассистент ✨</h2>

       {/* Приветственная плашка */}
       <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start space-x-4 mb-6">
        <span className="text-3xl mt-1">🧑‍⚕️</span>
        <div>
          <h3 className="font-bold text-blue-800">Ваш личный помощник</h3>
          <p className="text-sm text-blue-700 mt-1">
            Я могу помочь вам с учебой и организационными вопросами. Например, спросите меня:
          </p>
          <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
              {displayedPrompts.map((prompt, index) => (
                <li key={index}>"{prompt}"</li>
              ))}
          </ul>
        </div>
      </div>
       
      {/* Контейнер для сообщений */}
      <div className="flex-grow overflow-y-auto pr-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-md md:max-w-lg p-3 rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-t-2xl rounded-bl-2xl'
                  : 'bg-gray-200 text-text-primary rounded-t-2xl rounded-br-2xl'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {/* Индикатор загрузки ответа AI */}
         {isLoading && (
            <div className="flex items-end gap-2 justify-start">
                 <div className="max-w-md md:max-w-lg p-3 rounded-2xl bg-gray-200 text-text-primary rounded-t-2xl rounded-br-2xl">
                    <div className="flex items-center justify-center space-x-1">
                        <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></span>
                    </div>
                 </div>
            </div>
        )}
        {/* Пустой div для автопрокрутки */}
        <div ref={messagesEndRef} />
      </div>
      {/* Форма для ввода сообщения */}
      <div className="mt-6">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите что-нибудь..."
            className="w-full bg-secondary/80 backdrop-blur-md border border-border-color text-text-primary p-4 pr-12 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent shadow-soft"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors bg-accent text-white hover:bg-accent-hover disabled:bg-highlight disabled:text-text-secondary"
            aria-label="Отправить сообщение"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;