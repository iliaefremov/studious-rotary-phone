import React, { useState } from 'react';
import Schedule from './components/Schedule';
import Grades from './components/Grades';
import Chat from './components/Chat';
import Games from './components/Games';
import NotificationManager from './components/NotificationManager';
import { ScheduleIcon, GradesIcon, AssistantIcon, GamesIcon } from './components/icons/Icons';

/**
 * Основной компонент приложения "Student Hub".
 * Отвечает за управление активными вкладками и рендеринг соответствующего контента.
 * Включает в себя нижнюю навигационную панель.
 */
const App: React.FC = () => {
  // Состояние для отслеживания активной вкладки. По умолчанию открываются "Оценки".
  const [activeTab, setActiveTab] = useState('grades');

  /**
   * Рендерит компонент в зависимости от активной вкладки.
   * @returns {React.ReactElement} Компонент для отображения.
   */
  const renderContent = () => {
    switch (activeTab) {
      case 'schedule':
        return <Schedule />;
      case 'grades':
        return <Grades />;
      case 'chat':
        return <Chat />;
      case 'games':
        return <Games />;
      default:
        return <Grades />;
    }
  };

  // Конфигурация элементов навигационной панели.
  const navItems = [
    { id: 'schedule', label: 'Расписание', icon: ScheduleIcon },
    { id: 'grades', label: 'Оценки', icon: GradesIcon },
    { id: 'chat', label: 'Ассистент', icon: AssistantIcon },
    { id: 'games', label: 'Игры', icon: GamesIcon },
  ];

  return (
    <div className="bg-primary min-h-screen flex flex-col text-text-primary font-sans">
      {/* Компонент для управления уведомлениями (невидимый) */}
      <NotificationManager />
      
      {/* Основной контент страницы */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-28">
        {renderContent()}
      </main>

      {/* Нижняя навигационная панель в стиле "Liquid Glass" */}
      <footer className="fixed bottom-4 inset-x-4 z-50">
        <nav className="mx-auto max-w-sm bg-white/20 backdrop-blur-lg border border-white/30 rounded-2xl shadow-lg">
          <div className="flex justify-around items-center px-2 py-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group flex flex-col items-center justify-center space-y-1 p-2 rounded-lg transition-all duration-200 ease-out w-20 transform active:scale-95 focus:outline-none ${activeTab === item.id ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                <div className="relative">
                  <item.icon className={`w-6 h-6 transition-transform duration-200 ease-out ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </footer>
    </div>
  );
};

export default App;