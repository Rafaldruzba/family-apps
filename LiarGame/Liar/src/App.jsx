import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Users, ShieldAlert, Play, RotateCcw, Eye, EyeOff, Sparkles } from 'lucide-react';

// ZMIEŃ TO NA IP SWOJEGO KOMPUTERA W SIECI LOKALNEJ!
const SERVER_IP = ''; 

// const socket = io(SERVER_IP, { autoConnect: false });
const socket = io();

export default function App() {
  const [joined, setJoined] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState({ players: [], status: 'LOBBY' });
  const [myRoleData, setMyRoleData] = useState(null);
  const [liarsCount, setLiarsCount] = useState(1);
  const [showSecret, setShowSecret] = useState(false);

  const me = gameState.players.find(p => p.id === socket.id);
  const isHost = me?.isHost || false;

  useEffect(() => {
    socket.connect();

    socket.on('game_state_update', (state) => {
      setGameState(state);
    });

    socket.on('your_role', (data) => {
      setMyRoleData(data);
    });

    return () => {
      socket.off('game_state_update');
      socket.off('your_role');
      socket.disconnect();
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    socket.emit('join_game', { name: playerName.trim() });
    setJoined(true);
  };

  const handleStartGame = () => {
    socket.emit('start_game', { liarsCount: Number(liarsCount) });
  };

  const handleResetGame = () => {
    socket.emit('reset_game');
    setMyRoleData(null);
    setShowSecret(false);
  };

  // EKRAN 1: Ekran Dołączania
  if (!joined) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <form onSubmit={handleJoin} className="bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4 border border-slate-700">
          <h1 className="text-2xl font-bold text-center text-indigo-400 flex items-center justify-center gap-2">
            <ShieldAlert className="w-8 h-8" /> Gra: Kłamca
          </h1>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Twój Nick</label>
            <input
              type="text"
              placeholder="np. Janek"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold transition shadow-lg"
          >
            Dołącz do Poczekalni
          </button>
        </form>
      </div>
    );
  }

  // EKRAN 2: Poczekalnia (Lobby)
  if (gameState.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4 max-w-md mx-auto flex flex-col justify-between">
        <div className="space-y-6">
          <header className="text-center pt-6">
            <h1 className="text-3xl font-extrabold text-indigo-400">Poczekalnia</h1>
            <p className="text-slate-400 text-sm mt-1">Czekamy na resztę graczy...</p>
          </header>

          {/* Lista Graczy */}
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Gracze w pokoju</span>
              <span>{gameState.players.length}</span>
            </div>
            <div className="divide-y divide-slate-700">
              {gameState.players.map((player) => (
                <div key={player.id} className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold">{player.name} {player.id === socket.id && "(Ty)"}</span>
                  {player.isHost && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panel Hosta */}
          {isHost && (
            <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-500/30 space-y-4">
              <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">Ustawienia gry (Host)</h3>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Liczba Kłamców:</label>
                <select
                  value={liarsCount}
                  onChange={(e) => setLiarsCount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm font-medium"
                >
                  {Array.from({ length: Math.max(1, gameState.players.length - 1) }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Kłamca' : 'Kłamców'}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Przycisk startu dla Hosta */}
        <div className="py-6">
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 3}
              className="w-full bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> Start Rundy
            </button>
          ) : (
            <p className="text-center text-slate-500 text-sm italic">Czekaj, aż Host rozpocznie grę...</p>
          )}
        </div>
      </div>
    );
  }

  // EKRAN 3: Runda w toku (PLAYING)
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 max-w-md mx-auto flex flex-col justify-between">
      <header className="text-center pt-4">
        <span className="text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
          Runda w toku
        </span>
      </header>

      {/* Ekran odkrywania słowa */}
      <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 text-center space-y-6 shadow-2xl my-auto">
        <p className="text-slate-400 text-sm">Dotknij i przytrzymaj, aby zobaczyć swoją rolę:</p>

        <div className="min-h-[160px] flex items-center justify-center">
          {showSecret ? (
            <div className="space-y-3 animate-fade-in w-full">
              {myRoleData?.role === 'LIAR' ? (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-3xl font-black text-rose-500 tracking-wider">JESTEŚ KŁAMCĄ!</h2>
                    <p className="text-xs text-slate-400 mt-1">Słuchaj uważnie innych i ściemniaj!</p>
                  </div>
                  
                  <div className="bg-slate-900/80 p-3 rounded-2xl border border-rose-500/30 text-left space-y-1">
                    
                    {/* <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Kategoria:</span>
                      <span className="font-bold text-slate-200">{gameState.currentCategory}</span>
                    </div> */}
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <Sparkles className="w-3 h-3" /> Podpowiedź:
                      </span>
                      <span className="font-bold text-amber-300 uppercase tracking-wide">{gameState.currentHint}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs uppercase text-slate-400 font-bold tracking-widest">Tajne słowo:</span>
                  <h2 className="text-4xl font-black text-indigo-400">{myRoleData?.word}</h2>
                  <p className="text-xs text-slate-500">Kategoria: {gameState.currentCategory}</p>
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-600 font-bold text-lg">*** UKRYTE ***</span>
          )}
        </div>

        <button
          onMouseDown={() => setShowSecret(true)}
          onMouseUp={() => setShowSecret(false)}
          onTouchStart={() => setShowSecret(true)}
          onTouchEnd={() => setShowSecret(false)}
          className="w-full bg-slate-700 hover:bg-slate-600 active:bg-indigo-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition select-none"
        >
          {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          {showSecret ? 'Puść, aby ukryć' : 'Odkryj moją rolę'}
        </button>
      </div>

      {/* Akcje Hosta */}
      <div className="py-4 space-y-2">
        {isHost && (
          <button
            onClick={handleResetGame}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg"
          >
            <RotateCcw className="w-5 h-5" /> Zakończ Rundę i Wróć do Lobby
          </button>
        )}
      </div>
    </div>
  );
}