import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState, Player, GameChatMessage, TelegramUser, PlayerActions } from '../types';
import { getMafiaHostResponse } from '../services/geminiService';

interface MafiaGameProps {
  initialPlayers: Player[]; // Игроки, пришедшие из лобби.
  onExit: () => void; // Функция для выхода из игры в главное меню.
}

/**
 * Функция для первоначального распределения ролей.
 * @param {Player[]} players - Список игроков.
 * @param {TelegramUser} currentUser - Текущий пользователь.
 * @returns {GameState} Начальное состояние игры.
 */
const assignRolesAndStartGame = (players: Player[], currentUser: TelegramUser): GameState => {
  const mafiaCount = Math.max(1, Math.floor(players.length / 4));
  const roles: ('Mafia' | 'Doctor' | 'Civilian')[] = [
    ...Array(mafiaCount).fill('Mafia'),
    'Doctor',
    ...Array(players.length - mafiaCount - 1).fill('Civilian')
  ];
  
  // Перемешиваем роли для случайного распределения
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  const playersWithRoles = players.map((p, i) => ({ ...p, role: roles[i] }));
  const userPlayer = playersWithRoles.find(p => p.telegramId === currentUser.id);

  const initialNarration = `Добро пожаловать в игру! Город погружается в сумрак, и каждый из вас получает свою тайную роль. Наступает первая ночь. Мафия и Доктор делают свой ход...`;

  return {
    players: playersWithRoles,
    phase: 'night',
    dayNumber: 1,
    log: [
        { type: 'system', text: `Игра началась! Роли распределены.` },
        { type: 'narration', text: `Ваша роль в этой игре: ${userPlayer?.role || 'Неизвестно'}.` }
    ],
    chat: [],
    winner: null,
    narration: initialNarration,
  };
};

/**
 * Компонент игры "Мафия".
 * Управляет состоянием игры, взаимодействует с AI-ведущим и отображает интерфейс.
 */
const MafiaGame: React.FC<MafiaGameProps> = ({ initialPlayers, onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false); // Состояние для управления видимостью чата
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null); // Реф для поля ввода
  const [playerActions, setPlayerActions] = useState<PlayerActions>({});

  // Эффект №1: Получение данных пользователя.
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        const user = tg.initDataUnsafe?.user;
        if (user) {
            setCurrentUser(user);
        } else {
            console.error("Пользователь Telegram не определен. Игра не может быть инициализирована.");
        }
    }
  }, []);

  // Эффект №2: Инициализация игры.
  useEffect(() => {
    if (initialPlayers.length > 0 && currentUser) {
        setGameState(assignRolesAndStartGame(initialPlayers, currentUser));
    }
  }, [initialPlayers, currentUser]);

  // Эффект для автопрокрутки чата и фокуса на поле ввода.
  useEffect(() => {
    if (isChatExpanded) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        // Небольшая задержка, чтобы DOM успел обновиться перед фокусом.
        setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  }, [isChatExpanded, gameState?.chat, gameState?.log]);

  /**
   * Функция для отправки текущего состояния и действий AI-ведущему.
   */
  const advanceGameState = useCallback(async (actions: PlayerActions) => {
    if (!gameState) return;
    setIsLoadingAI(true);
    
    const response = await getMafiaHostResponse(gameState, actions);

    // Обновляем состояние игры на основе ответа AI.
    setGameState(prev => {
        if (!prev) return null;
        const updatedPlayers = prev.players.map(p => {
            const update = response.players?.find(up => up.telegramId === p.telegramId);
            return update ? { ...p, isAlive: update.isAlive } : p;
        });

        return {
            ...prev,
            players: updatedPlayers,
            phase: response.phase || prev.phase,
            winner: response.winner || prev.winner,
            narration: response.narration || prev.narration,
            log: [...prev.log, ...(response.log || [])],
            dayNumber: (prev.phase === 'night' && response.phase === 'day') ? prev.dayNumber + 1 : prev.dayNumber,
        };
    });

    setPlayerActions({}); // Сбрасываем действия после обработки
    setIsLoadingAI(false);
  }, [gameState]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser || !gameState) return;
    const userPlayer = gameState.players.find(p => p.telegramId === currentUser.id);
    if (!userPlayer) return;
    const newMessage: GameChatMessage = {
      senderId: currentUser.id,
      senderName: currentUser.first_name,
      text: chatInput,
      isGhost: !userPlayer.isAlive,
    };
    setGameState(prev => prev ? { ...prev, chat: [...prev.chat, newMessage] } : null);
    setChatInput('');
  };

  const handleVote = (votedPlayerId: number) => {
    if (!currentUser) return;
    const newActions: PlayerActions = { ...playerActions, votes: { ...playerActions.votes, [currentUser.id]: votedPlayerId }};
    setPlayerActions(newActions);
    advanceGameState(newActions);
    alert(`Вы проголосовали. Ведущий обрабатывает результаты...`);
  };
  
  if (!gameState || !currentUser) {
    return (
        <div className="flex items-center justify-center h-screen">
          <div className="flex items-center space-x-2 text-text-secondary">
            <svg className="animate-spin h-6 w-6 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span className="font-semibold">Минуточку, готовим игру...</span>
          </div>
        </div>
    );
  }
  
  const userPlayer = gameState.players.find(p => p.telegramId === currentUser.id);
  const currentPhaseText = gameState.phase === 'day' ? `День ${gameState.dayNumber}` : `Ночь ${gameState.dayNumber}`;

  return (
    <div className="animate-fade-in">
       <div className="flex flex-wrap justify-between items-center mb-4 mt-4 gap-2">
        <div>
            <h2 className="text-3xl font-bold text-text-primary">Мафия</h2>
            <p className="text-sm text-text-secondary mt-1">{currentPhaseText}</p>
        </div>
        <button onClick={onExit} className="bg-highlight text-text-secondary font-bold py-2 px-4 rounded-xl text-sm hover:bg-border-color transition-colors">Выйти из игры</button>
      </div>

      <div className="bg-secondary p-4 rounded-2xl mb-6 shadow-soft text-center border border-border-color">
        <p className="text-text-primary italic">"{gameState.narration}"</p>
        {isLoadingAI && <p className="text-accent text-sm animate-pulse mt-2">Ведущий размышляет...</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Левая колонка: Чат */}
        <div className={`md:col-span-2 bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5 flex flex-col transition-all duration-300 ease-in-out`} style={{ height: isChatExpanded ? '65vh' : 'auto' }}>
            <h3 className="text-xl font-bold text-text-primary mb-4 flex-shrink-0">Чат</h3>

            {isChatExpanded ? (
                <>
                    {/* Развернутый вид: полный лог, чат и форма ввода */}
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2 hide-scrollbar mb-4 animate-fade-in">
                        {gameState.log.map((entry, index) => (
                          <div key={`log-${index}`} className={`p-3 rounded-lg text-sm ${entry.type === 'system' ? 'bg-blue-500/10 text-blue-800' : 'bg-highlight'}`}>
                            <p>{entry.text}</p>
                          </div>
                        ))}
                        {gameState.chat.map((msg, index) => {
                          const isMyMessage = msg.senderId === currentUser.id;
                          const canBeSeen = userPlayer?.isAlive ? !msg.isGhost : true;
                          if (!canBeSeen) return null;
                          return (
                             <div key={`chat-${index}`} className={`flex items-end gap-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-md p-3 rounded-2xl ${isMyMessage ? 'bg-accent text-white' : 'bg-highlight text-text-primary'} ${msg.isGhost ? 'opacity-60 italic' : ''}`}>
                                  {!isMyMessage && <p className="text-xs font-bold mb-1 opacity-70">{msg.senderName}</p>}
                                  <p className="text-sm leading-relaxed">{msg.text}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="relative mt-auto flex-shrink-0 animate-fade-in">
                        <input ref={chatInputRef} type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={userPlayer?.isAlive ? "Написать в чат..." : "Чат призраков 👻..."} className="w-full bg-highlight border-none text-text-primary p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent" disabled={isLoadingAI}/>
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-accent text-white hover:bg-accent-hover disabled:bg-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </form>
                </>
            ) : (
                <>
                    {/* Свернутый вид: ключевая информация и поле-заглушка для раскрытия */}
                    <div className="space-y-2 animate-fade-in flex-grow">
                         <div className="p-3 rounded-lg bg-blue-500/10 text-blue-800 text-sm">
                            <p><span className="font-bold">Ваша роль:</span> {userPlayer?.role || 'Определяется...'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-highlight text-sm">
                             <p className="font-bold text-text-secondary text-xs mb-1">Ведущий говорит:</p>
                             <p className="text-text-primary italic line-clamp-3">{gameState.narration}</p>
                        </div>
                    </div>
                    <div 
                      onClick={() => setIsChatExpanded(true)}
                      className="mt-4 p-3 w-full bg-highlight rounded-xl text-text-secondary text-left cursor-pointer hover:bg-border-color transition-colors flex-shrink-0"
                    >
                      Написать в чат...
                    </div>
                </>
            )}
        </div>

        {/* Правая колонка: Игроки и Действия */}
        <div className="space-y-4">
          <div className="bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5">
            <h3 className="text-xl font-bold text-text-primary mb-4">🕹️ Игроки</h3>
            <ul className="space-y-2">
              {gameState.players.map(p => (
                <li key={p.telegramId} className={`flex justify-between items-center p-2 rounded-lg transition-all duration-300 ${!p.isAlive ? 'opacity-50 line-through' : ''}`}>
                  <span className="font-semibold">{p.name}{p.telegramId === currentUser.id && ' (Вы)'}</span>
                  <span>{p.isAlive ? '✅' : '💀'}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5">
            <h3 className="text-xl font-bold text-text-primary mb-4">🔴 Действия</h3>
            {isLoadingAI ? <p className="text-sm text-text-secondary text-center">Ведущий обрабатывает ход...</p> :
            (<>
              {gameState.phase === 'day' && userPlayer?.isAlive && (
                <div className="space-y-2">
                  <p className="text-sm text-text-secondary mb-3">Выберите, кого выставить на голосование:</p>
                  {gameState.players.filter(p => p.isAlive && p.telegramId !== currentUser.id).map(p => (
                    <button key={p.telegramId} onClick={() => handleVote(p.telegramId)} className="w-full text-left p-2 bg-highlight rounded-lg hover:bg-border-color transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
               {gameState.phase === 'night' && userPlayer?.isAlive && (
                <div className="text-center p-4 bg-blue-900/10 rounded-lg">
                  <p className="font-semibold text-blue-800">Ночь</p>
                  <p className="text-sm text-blue-700">Игроки с ролями делают свой выбор...</p>
                </div>
               )}
               {gameState.phase === 'ended' && (
                  <div className="text-center">
                      <h3 className="text-2xl font-bold mb-2">Игра окончена!</h3>
                      <p className="text-text-secondary mb-4">Победила команда: {gameState.winner}</p>
                  </div>
               )}
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MafiaGame;