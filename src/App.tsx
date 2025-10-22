import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import CallSetup from './components/CallSetup';
import TwoUserInterface from './components/TwoUserInterface';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [user1Language, setUser1Language] = useState('English');
  const [user2Language, setUser2Language] = useState('Hindi');

  const handleLogin = (credentials: { email?: string; phone?: string; password: string }) => {
    // In a real app, you would validate credentials with your backend
    console.log('Login credentials:', credentials);
    setIsLoggedIn(true);
  };

  const handleStartCall = (user1Lang: string, user2Lang: string) => {
    setUser1Language(user1Lang);
    setUser2Language(user2Lang);
    setIsCallActive(true);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
      ) : !isCallActive ? (
        <CallSetup
          onStartCall={handleStartCall}
          user1Language={user1Language}
          user2Language={user2Language}
          onUser1LanguageChange={setUser1Language}
          onUser2LanguageChange={setUser2Language}
        />
      ) : (
        <TwoUserInterface
          isCallActive={isCallActive}
          onEndCall={handleEndCall}
          user1Language={user1Language}
          user2Language={user2Language}
        />
      )}
    </div>
  );
}

export default App;