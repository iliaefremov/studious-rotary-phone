import React from 'react';

/**
 * Минимальная версия компонента приложения "Student Hub" для проверки рендеринга React на iOS.
 */
const App: React.FC = () => {
  console.log("Minimal App component rendered.");

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', color: 'black' }}>
      <h1>Hello, iOS!</h1>
      <p>If you can see this, React is working.</p>
    </div>
  );
};

export default App;