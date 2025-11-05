import React, { useState, useEffect } from 'react';
import MafiaGame from './MafiaGame';
import type { Player, TelegramUser } from '../types';

// Минимальное количество игроков для начала игры.
const MIN_PLAYERS_TO_START = 5;

// Массив эмодзи для динамической анимации в заголовке.
const EMOJI_CYCLE = ['🎭', '🕵️', '🧑‍⚕️', '🧌', '👷‍♂️'];

/**
 * Компонент "Игры".
 * Служит в качестве лобби для многопользовательской игры "Мафия".
 * В данный момент функционал находится в разработке, кнопки неактивны.
 */
const Games: React.FC = () => {
    // Состояние для отслеживания, активна ли игра в данный момент.
    const [isGameActive, setIsGameActive] = useState(false);
    // Состояние для хранения списка игроков в лобби (симуляция).
    const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
     // Состояние для хранения финального списка игроков (с ботами или без) для передачи в компонент игры.
    const [finalGamePlayers, setFinalGamePlayers] = useState<Player[]>([]);
    // Состояние для хранения данных текущего пользователя.
    const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
    // Состояние для индекса активного эмодзи в анимации.
    const [activeEmojiIndex, setActiveEmojiIndex] = useState(0);

    // Эффект для плавной смены эмодзи в карточке.
    useEffect(() => {
        const interval = setInterval(() => {
            // Циклически переключаем индекс на следующий в массиве EMOJI_CYCLE.
            setActiveEmojiIndex(prevIndex => (prevIndex + 1) % EMOJI_CYCLE.length);
        }, 2500); // Смена эмодзи каждые 2.5 секунды.
        return () => clearInterval(interval);
    }, []);


    // Эффект для получения данных пользователя при монтировании компонента.
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            // Устанавливаем пользователя, если он есть, иначе null.
            setCurrentUser(tg.initDataUnsafe?.user || null);
        }
    }, []);

    // Рендерим либо лобби, либо саму игру.
    // Поскольку isGameActive всегда false, игра не запустится.
    if (isGameActive) {
        return <MafiaGame initialPlayers={finalGamePlayers} onExit={() => setIsGameActive(false)} />;
    } else {
        return (
            <div className="animate-fade-in">
                 {/* Заголовок страницы */}
                <h2 className="text-3xl font-bold text-text-primary mb-6 mt-4">Мафия</h2>

                {/* Карточка с анимацией */}
                <div className="relative bg-secondary p-6 rounded-3xl shadow-soft border border-border-color text-center mb-8">
                     {/* Контейнер для анимированных эмодзи */}
                     <div className="relative w-12 h-12 mx-auto mb-4">
                        {EMOJI_CYCLE.map((emoji, index) => (
                            <span
                                key={emoji}
                                className={`absolute top-0 left-0 text-5xl transition-all duration-500 ease-in-out ${
                                    activeEmojiIndex === index ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-180'
                                }`}
                                aria-hidden={activeEmojiIndex !== index}
                            >
                                {emoji}
                            </span>
                        ))}
                    </div>
                    <p className="text-text-secondary max-w-xs mx-auto">
                        Собери команду, чтобы начать. Нужно минимум {MIN_PLAYERS_TO_START} человек.
                    </p>
                </div>
                
                {/* Секция с лобби */}
                <div className="max-w-md mx-auto bg-secondary p-6 rounded-3xl shadow-soft border border-border-color">
                    <h3 className="text-xl font-bold text-text-primary mb-4">Лобби</h3>
                    <div className="space-y-2 mb-6 min-h-[120px]">
                        {lobbyPlayers.length > 0 ? (
                            lobbyPlayers.map(player => (
                                <div key={player.telegramId} className="bg-highlight p-2.5 rounded-lg text-left animate-fade-in flex items-center space-x-2">
                                    <span className="text-lg">👤</span>
                                    <span className="font-semibold">{player.name}</span>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full pt-8 text-text-secondary">
                                <p>В лобби пока никого нет...</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Кнопки действий */}
                    <div className="space-y-3">
                        <button
                            disabled
                            className="w-full border-2 border-slate-300 text-slate-400 font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 ease-out cursor-not-allowed"
                        >
                            Присоединиться
                        </button>
                        
                        <button
                            disabled
                            className="w-full bg-slate-300 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 ease-out shadow-none cursor-not-allowed"
                        >
                           Начать с ботами
                        </button>

                        <button
                            disabled
                            className="w-full bg-slate-300 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 ease-out shadow-none cursor-not-allowed"
                        >
                            Начать игру (0/{MIN_PLAYERS_TO_START})
                        </button>
                    </div>
                     <p className="text-center text-text-secondary text-sm mt-4">
                        Раздел "Игры" находится в разработке и скоро будет доступен!
                    </p>
                </div>
            </div>
        );
    }
};

export default Games;