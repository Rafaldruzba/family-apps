import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io();

function App() {
  const [name, setName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  
  // Stan ruletki i wyzwań
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Sprawdzanie czy użytkownik to Admin (według Twojego życzenia)
  const isAdmin = name === 'adminRafal';

  useEffect(() => {
    socket.on('update_players', (playersList) => setPlayers(playersList));

    socket.on('roulette_result', (data) => {
      const { winnerIndex, winnerName, challenge } = data;
      const numPlayers = players.length || 1;
      const segmentAngle = 360 / numPlayers;
      
      // Obliczanie kąta, by koło zatrzymało się równo na wylosowanej osobie (strzałka na górze)
      // Dodajemy 5 pełnych obrotów (1800 stopni) dla efektu animacji
      const targetRotation = 360 - (winnerIndex * segmentAngle) - (segmentAngle / 2);
      const newRotation = rotation + 1800 + targetRotation - (rotation % 360);

      setRotation(newRotation);
      setIsSpinning(true);
      setShowModal(false);

      // Po 4 sekundach (czas trwania animacji CSS) pokaż zadanie
      setTimeout(() => {
        setIsSpinning(false);
        setCurrentResult({ winnerName, challenge });
        setShowModal(true);
      }, 4000);
    });

    return () => {
      socket.off('update_players');
      socket.off('roulette_result');
    };
  }, [rotation, players]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim()) {
      socket.emit('join_game', name);
      setIsJoined(true);
    }
  };

  const spin = () => {
    if (!isSpinning) socket.emit('spin_roulette');
  };

  // Generowanie segmentów (tła) dla ruletki
  const generateConicGradient = () => {
    if (players.length === 0) return 'conic-gradient(#0D5EAF 100%, #1572C6 100%)';
    const angle = 100 / players.length;
    return `conic-gradient(${players.map((_, i) => 
      `${i % 2 === 0 ? '#0D5EAF' : '#1572C6'} ${i * angle}% ${(i + 1) * angle}%`
    ).join(', ')})`;
  };

  if (!isJoined) {
    return (
      <div className="container greek-theme">
        <h1 className="title">🏛️ Creta Shot-Game 🌴</h1>
        <div className="card">
          <h2>Wpisz swoje imię</h2>
          <form onSubmit={handleJoin} className="join-form">
            <input 
              type="text" 
              placeholder="np. adminRafal" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
            <button type="submit" className="btn-greek">Wejdź do Gry</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container greek-theme">
      <header className="header">
        <h1>🏛️ OPA! Ruletka 🇬🇷</h1>
        {isAdmin && <span className="admin-badge">👑 Jesteś Adminem</span>}
      </header>
      
      {/* RUETKA */}
      <div className="roulette-wrapper">
        <div className="pointer">▼</div>
        <div 
          className="roulette-wheel" 
          style={{ 
            background: generateConicGradient(),
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 4s cubic-bezier(0.14, 0.77, 0.22, 0.98)'
          }}
        >
          {players.map((p, i) => (
            <div 
              key={p.id} 
              className="roulette-segment"
              style={{ transform: `rotate(${(i * 360) / players.length + (180 / players.length)}deg)` }}
            >
              <span className="segment-text">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Przyciski Akcji */}
      <div className="actions">
        {isAdmin ? (
          <button onClick={spin} disabled={isSpinning || players.length < 2} className="btn-greek btn-admin">
            {isSpinning ? 'LOSOWANIE...' : 'ZAKRĘĆ RULETKĄ (Admin)'}
          </button>
        ) : (
          <p className="wait-text">
            {isSpinning ? 'Koło się kręci...' : 'Czekaj aż admin zakręci kołem...'}
          </p>
        )}
      </div>

      {/* Wynik Losowania (Modal) */}
      {showModal && currentResult && (
        <div className="result-modal">
          <div className="modal-content">
            <span className="kategoria-tag">{currentResult.challenge.kategoria.toUpperCase()}</span>
            <h2>{currentResult.winnerName} - {currentResult.challenge.typ.toUpperCase()}</h2>
            <p className="tresc">{currentResult.challenge.tresc}</p>
            <h1 className="albo-pij">...ALBO PIJ! 🥃</h1>
            
            {isAdmin && (
              <button onClick={spin} className="btn-greek btn-admin mt-15">
                🔄 LOSUJ PONOWNIE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista graczy na dole */}
      <div className="players-list">
        <h3>Pijący ({players.length}):</h3>
        <p>{players.map(p => p.name).join(', ')}</p>
      </div>
    </div>
  );
}

export default App;