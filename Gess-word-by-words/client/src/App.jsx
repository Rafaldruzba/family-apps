import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io();

function App() {
  const [name, setName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);

  const isAdmin = name === 'Rafal!';

  useEffect(() => {
    socket.on('update_players', (playersList) => setPlayers(playersList));
    socket.on('turn_data', (data) => setCurrentTurn(data));

    return () => {
      socket.off('update_players');
      socket.off('turn_data');
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim()) {
      socket.emit('join_game', name);
      setIsJoined(true);
    }
  };

  const nextTurn = () => {
    socket.emit('next_turn');
  };

  if (!isJoined) {
    return (
      <div className="app-wrapper">
        <div className="container login-container animate-fade-in">
          <div className="logo-box">
            <h1>🏛️ Greckie Słówka</h1>
            <p className="subtitle">Imprezowa gra na all-inclusive 🌴</p>
          </div>
          <div className="card glass-panel">
            <h2 className="join-title">Dołącz do gry</h2>
            <form onSubmit={handleJoin} className="join-form">
              <input 
                type="text" 
                placeholder="Wpisz swoje imię..." 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                maxLength="15"
              />
              <button type="submit" className="btn-3d btn-primary">Wchodzę!</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = currentTurn && currentTurn.activePlayerId === socket.id;

  return (
    <div className="app-wrapper">
      <div className="container game-container animate-fade-in">
        <header className="header glass-panel">
          <h1>🏛️ Greckie Słówka</h1>
          {isAdmin && <span className="admin-badge">👑 Panel Admina</span>}
        </header>
        
        <main className="game-board glass-panel">
          {!currentTurn ? (
            <div className="waiting-area">
              <span className="icon-large">🍹</span>
              <h2>Czekamy na start gry...</h2>
              <p>Zrelaksuj się. Admin zaraz rozpocznie pierwszą rundę.</p>
            </div>
          ) : (
            <div className="turn-area animate-pop">
              {isMyTurn ? (
                <div className="turn-box my-turn">
                  <div className="badge pulse-badge">🎯 TWOJA TURA!</div>
                  <h3 className="hint-text">Twoje hasło do pokazania:</h3>
                  <div className="secret-word-box">
                    <h1 className="secret-word">{currentTurn.word.toUpperCase()}</h1>
                  </div>
                  <div className="rule-box">
                    <p>Podpowiadaj używając TYLKO słów na literę:</p>
                    <div className="letter-circle">{currentTurn.letter.toUpperCase()}</div>
                  </div>
                </div>
              ) : (
                <div className="turn-box others-turn">
                  <div className="badge guess-badge">🤔 ZGADUJECIE!</div>
                  <h3 className="hint-text">Teraz tłumaczy:</h3>
                  <h1 className="active-player-name">{currentTurn.activePlayerName}</h1>
                  <div className="rule-box">
                    <p>Słuchajcie uważnie! Będzie używać tylko słów na literę:</p>
                    <div className="letter-circle">{currentTurn.letter.toUpperCase()}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <div className="actions">
          {isAdmin && (
            <button onClick={nextTurn} disabled={players.length < 2} className="btn-3d btn-admin">
              {currentTurn ? '✅ ZGADNIĘTE! NASTĘPNY' : '▶️ START GRY'}
            </button>
          )}
          {!isAdmin && currentTurn && isMyTurn && (
            <div className="status-bar status-active">Mów! Aż ktoś zgadnie! 🗣️</div>
          )}
          {!isAdmin && currentTurn && !isMyTurn && (
            <div className="status-bar status-waiting">Krzyczcie odpowiedzi! 📣</div>
          )}
        </div>

        <footer className="players-footer glass-panel">
          <div className="players-header">Kolejka graczy ({players.length}):</div>
          <div className="players-list-scroll">
            {players.map((p, index) => (
              <span key={index} className={`player-chip ${currentTurn && currentTurn.activePlayerName === p.name ? 'chip-active' : ''}`}>
                {p.name}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;