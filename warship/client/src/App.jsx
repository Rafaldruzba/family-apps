import React, { useState, useEffect, useMemo } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io();

const FLEET_TEMPLATE = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export default function App() {
  const [view, setView] = useState('login');
  const [myId, setMyId] = useState(null);
  const [myName, setMyName] = useState('');
  const [inputName, setInputName] = useState('');

  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const [turn, setTurn] = useState(null);
  const [winner, setWinner] = useState(null);
  const [myBoard, setMyBoard] = useState(Array(100).fill(0));
  const [enemyBoard, setEnemyBoard] = useState(Array(100).fill(0));
  const [placedShips, setPlacedShips] = useState([]);
  const [history, setHistory] = useState([]);

  // Setup UX:
  // 1st click = start point
  // 2nd click = end point
  // Desktop additionally gets a live ghost preview.
  const [startPoint, setStartPoint] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [currentShipIdx, setCurrentShipIdx] = useState(0);

  useEffect(() => {
    socket.on('login_success', (id) => {
      setMyId(id);
      setView('lobby');
    });

    socket.on('lobby_update', (users) => {
      setLobbyUsers(users.filter(u => u.id !== socket.id));
    });

    socket.on('incoming_challenge', (data) => setIncomingChallenge(data));
    socket.on('challenge_declined', (name) => alert(`Gracz ${name} odrzucił wyzwanie.`));

    socket.on('game_setup_start', () => {
      setMyBoard(Array(100).fill(0));
      setEnemyBoard(Array(100).fill(0));
      setPlacedShips([]);
      setCurrentShipIdx(0);
      setStartPoint(null);
      setHoverCell(null);
      setHistory([]);
      setStatusMsg('Wybierz pole startowe dla pierwszego statku.');
      setView('setup');
    });

    socket.on('opponent_ready', () => setStatusMsg('Przeciwnik jest gotowy!'));

    socket.on('fleet_rejected', (msg) => alert(msg));

    socket.on('fleet_accepted', () => {
  setStatusMsg('Flota zaakceptowana. Czekanie na przeciwnika...');

  setCurrentShipIdx(FLEET_TEMPLATE.length);

  setStartPoint(null);
  setHoverCell(null);
});

    socket.on('game_start', (data) => {
      setView('playing');
      setTurn(data.turn);
      setHistory(data.history);
    });

    socket.on('shot_result', (data) => {
      if (data.shooter === socket.id) {
        setEnemyBoard(prev => {
          const arr = [...prev];
          arr[data.index] = data.isHit ? 3 : 2;
          return arr;
        });
      } else {
        setMyBoard(prev => {
          const arr = [...prev];
          arr[data.index] = data.isHit ? 3 : 2;
          return arr;
        });
      }

      setTurn(data.nextTurn);
      setHistory(data.history);
    });

    socket.on('game_over', (data) => {
      setView('game_over');
      setWinner(data.winner);
    });

    socket.on('opponent_disconnected', () => {
      alert('Przeciwnik wyszedł.');
      setView('lobby');
    });

    return () => socket.removeAllListeners();
  }, []);

  const joinLobby = (e) => {
    e.preventDefault();

    const name = inputName.trim();
    if (name) {
      setMyName(name);
      socket.emit('set_name', name);
    }
  };

  const handleChallenge = (targetId) => socket.emit('challenge_player', targetId);

  const acceptChallenge = () => {
    socket.emit('accept_challenge', incomingChallenge.challengerId);
    setIncomingChallenge(null);
  };

  const declineChallenge = () => {
    socket.emit('decline_challenge', incomingChallenge.challengerId);
    setIncomingChallenge(null);
  };

  const getShipCells = (ship) => {
    return Array.from({ length: ship.length }, (_, i) => ({
      x: ship.isVertical ? ship.x : ship.x + i,
      y: ship.isVertical ? ship.y + i : ship.y
    }));
  };

  const isValidPreview = (x1, y1, x2, y2, requiredLength) => {
    let isVertical;
    let startX = x1;
    let startY = y1;
    let length;

    if (x1 === x2) {
      isVertical = true;
      length = Math.abs(y2 - y1) + 1;
      startY = Math.min(y1, y2);
    } else if (y1 === y2) {
      isVertical = false;
      length = Math.abs(x2 - x1) + 1;
      startX = Math.min(x1, x2);
    } else {
      return { valid: false, cells: [] };
    }

    if (length !== requiredLength) {
      return { valid: false, cells: [] };
    }

    const cells = Array.from({ length }, (_, i) => ({
      x: isVertical ? startX : startX + i,
      y: isVertical ? startY + i : startY
    }));

    // Check collisions against already placed ships + one-cell buffer.
    for (const cell of cells) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;

          if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
            if (myBoard[ny * 10 + nx] === 1) {
              return { valid: false, cells };
            }
          }
        }
      }
    }

    return { valid: true, cells };
  };

  const preview = useMemo(() => {
    if (view !== 'setup' || !startPoint || !hoverCell) {
      return { valid: false, cells: [] };
    }

    return isValidPreview(
      startPoint.x,
      startPoint.y,
      hoverCell.x,
      hoverCell.y,
      FLEET_TEMPLATE[currentShipIdx]
    );
  }, [view, startPoint, hoverCell, currentShipIdx, myBoard]);

  const previewIndexes = useMemo(
    () => new Set(preview.cells.map(({ x, y }) => y * 10 + x)),
    [preview]
  );

  const validateAndAddShip = (x1, y1, x2, y2, requiredLength) => {
    const result = isValidPreview(x1, y1, x2, y2, requiredLength);

    if (x1 !== x2 && y1 !== y2) {
      alert('Statek musi być w jednej linii (pionowo lub poziomo)!');
      return false;
    }

    if (result.cells.length !== requiredLength) {
      alert(`Ten statek musi mieć dokładnie ${requiredLength} maszty!`);
      return false;
    }

    if (!result.valid) {
      alert('Nie można tutaj ustawić statku. Statki nie mogą się stykać ani nakładać.');
      return false;
    }

    const isVertical = x1 === x2;
    const startX = isVertical ? x1 : Math.min(x1, x2);
    const startY = isVertical ? Math.min(y1, y2) : y1;

    const newShip = {
      x: startX,
      y: startY,
      length: requiredLength,
      isVertical
    };

    const updatedPlaced = [...placedShips, newShip];
    const newBoard = [...myBoard];

    result.cells.forEach(({ x, y }) => {
      newBoard[y * 10 + x] = 1;
    });

    setPlacedShips(updatedPlaced);
    setMyBoard(newBoard);
    setStartPoint(null);
    setHoverCell(null);

    const nextIdx = currentShipIdx + 1;

if (nextIdx >= FLEET_TEMPLATE.length) {
  // BLOKUJEMY dalsze ustawianie statków
  setCurrentShipIdx(FLEET_TEMPLATE.length);
  setStartPoint(null);
  setHoverCell(null);

  setStatusMsg(
    'Flota kompletna! 🚢 Czekanie na przeciwnika...'
  );

  socket.emit('submit_fleet', updatedPlaced);
} else {
  setCurrentShipIdx(nextIdx);

  setStatusMsg(
    `Ustaw kolejny statek: ${FLEET_TEMPLATE[nextIdx]}-masztowiec.`
  );
}

    return true;
  };

  const handleSetupClick = (index) => {
  if (
    currentShipIdx >= FLEET_TEMPLATE.length ||
    placedShips.length >= FLEET_TEMPLATE.length
  ) {
    return;
  }

    const x = index % 10;
    const y = Math.floor(index / 10);
    const requiredLength = FLEET_TEMPLATE[currentShipIdx];

    // Single-mast ship: one click.
    if (requiredLength === 1) {
      validateAndAddShip(x, y, x, y, 1);
      return;
    }

    // First click.
    if (!startPoint) {
      setStartPoint({ x, y });
      setHoverCell({ x, y });
      setStatusMsg(
        `Start zaznaczony. Wybierz koniec ${requiredLength}-masztowca.`
      );
      return;
    }

    // Second click.
    validateAndAddShip(
      startPoint.x,
      startPoint.y,
      x,
      y,
      requiredLength
    );
  };

  const handleSetupPointerEnter = (index) => {
    if (view !== 'setup') return;
    setHoverCell({
      x: index % 10,
      y: Math.floor(index / 10)
    });
  };

  const handleSetupPointerLeave = () => {
    if (!startPoint) setHoverCell(null);
  };

  const cancelSelection = () => {
    setStartPoint(null);
    setHoverCell(null);
    setStatusMsg(
      `Wybierz pole startowe dla ${FLEET_TEMPLATE[currentShipIdx]}-masztowca.`
    );
  };

  const undoLastShip = () => {
    if (placedShips.length === 0) return;

    const newShips = placedShips.slice(0, -1);
    const newBoard = Array(100).fill(0);

    newShips.forEach(ship => {
      getShipCells(ship).forEach(({ x, y }) => {
        newBoard[y * 10 + x] = 1;
      });
    });

    const newIndex = newShips.length;

    setPlacedShips(newShips);
    setMyBoard(newBoard);
    setCurrentShipIdx(newIndex);
    setStartPoint(null);
    setHoverCell(null);
    setStatusMsg(
      `Cofnięto statek. Ustaw ${FLEET_TEMPLATE[newIndex]}-masztowiec.`
    );
  };

  const resetFleet = () => {
    setPlacedShips([]);
    setMyBoard(Array(100).fill(0));
    setCurrentShipIdx(0);
    setStartPoint(null);
    setHoverCell(null);
    setStatusMsg('Flota wyczyszczona. Ustaw 4-masztowiec.');
  };

  const handleShoot = (index) => {
    if (view !== 'playing' || turn !== myId || enemyBoard[index] !== 0) {
      return;
    }

    socket.emit('shoot', index);
  };

  const setupProgress = Math.min(placedShips.length, FLEET_TEMPLATE.length);

  return (
    <div className="app-container" onContextMenu={e => e.preventDefault()}>

      {view === 'login' && (
        <div className="login-box card">
          <h1>Battleship Pro 🚢</h1>

          <form onSubmit={joinLobby}>
            <input
              type="text"
              placeholder="Twój nick..."
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              maxLength={15}
              required
            />
            <button type="submit" className="btn-primary">
              Dołącz do gry
            </button>
          </form>
        </div>
      )}

      {view === 'lobby' && (
        <div className="lobby-box card">
          <h2>Cześć, {myName}!</h2>
          <p>Gracze online ({lobbyUsers.length}):</p>

          <ul className="player-list">
            {lobbyUsers.length === 0 && (
              <li className="empty">Nikogo tu nie ma...</li>
            )}

            {lobbyUsers.map(u => (
              <li key={u.id}>
                <span>{u.name}</span>
                <button
                  className="btn-small"
                  onClick={() => handleChallenge(u.id)}
                >
                  Wyzwij ⚔️
                </button>
              </li>
            ))}
          </ul>

          {incomingChallenge && (
            <div className="challenge-modal">
              <p>
                <strong>{incomingChallenge.challengerName}</strong> wyzywa Cię!
              </p>

              <div className="flex-row">
                <button className="btn-accept" onClick={acceptChallenge}>
                  Akceptuj
                </button>
                <button className="btn-decline" onClick={declineChallenge}>
                  Odrzuć
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(view === 'setup' || view === 'playing') && (
        <div className="game-wrapper">

          <div className="game-header card">
            <h3 className={turn === myId ? 'text-green' : 'text-red'}>
              {view === 'playing'
                ? (turn === myId
                    ? 'Twoja tura — Strzelaj!'
                    : 'Tura przeciwnika...')
                : statusMsg}
            </h3>

            {view === 'setup' && (
              <div className="setup-toolbar">
                <div className="fleet-progress">
                  <span>
                    Flota: <strong>{setupProgress}/10</strong>
                  </span>

                  <div className="fleet-progress-bar">
                    <div
                      className="fleet-progress-fill"
                      style={{ width: `${setupProgress * 10}%` }}
                    />
                  </div>
                </div>

                <div className="setup-actions">
                  <button
                    type="button"
                    className="btn-small"
                    onClick={cancelSelection}
                    disabled={!startPoint}
                  >
                    Anuluj wybór
                  </button>

                  <button
                    type="button"
                    className="btn-small"
                    onClick={undoLastShip}
                    disabled={placedShips.length === 0}
                  >
                    ↩ Cofnij
                  </button>

                  <button
                    type="button"
                    className="btn-small"
                    onClick={resetFleet}
                    disabled={placedShips.length === 0}
                  >
                    Wyczyść
                  </button>
                </div>
              </div>
            )}

            {view === 'setup' && (
              <div className="setup-help">
                {startPoint ? (
                  <>
                    <span className="setup-help-dot active" />
                    Start zaznaczony — wybierz koniec statku.
                  </>
                ) : (
                  <>
                    <span className="setup-help-dot" />
                    Kliknij początek, potem koniec statku.
                  </>
                )}
              </div>
            )}
          </div>

          <div className="game-content-flex">
            <div className="boards-layout">

              {/* MOJA FLOTA */}
              <div className="board-section">
                <h3>Moja Flota</h3>

                <div className="board-container-with-labels">
                  <div className="col-labels">
                    {LETTERS.map(l => <span key={l}>{l}</span>)}
                  </div>

                  <div className="row-and-board">
                    <div className="row-labels">
                      {[...Array(10)].map((_, i) => (
                        <span key={i}>{i + 1}</span>
                      ))}
                    </div>

                    <div className={`board setup-board ${view === 'setup' ? 'setup-active' : ''}`}>
                      {myBoard.map((val, index) => {
                        let cls = 'cell ';

                        if (val === 1) cls += 'cell-ship ';
                        if (val === 2) cls += 'cell-miss ';
                        if (val === 3) cls += 'cell-hit ';

                        const isStart =
                          view === 'setup' &&
                          startPoint &&
                          startPoint.x === index % 10 &&
                          startPoint.y === Math.floor(index / 10);

                        const isPreview =
                          view === 'setup' &&
                          startPoint &&
                          previewIndexes.has(index) &&
                          val === 0;

                        if (isStart) cls += 'cell-setup-start ';
                        if (isPreview) {
                          cls += preview.valid
                            ? 'cell-setup-preview-valid '
                            : 'cell-setup-preview-invalid ';
                        }

                        return (
                          <div
                            key={`my-${index}`}
                            className={cls}
                            onClick={() =>
                              view === 'setup' && handleSetupClick(index)
                            }
                            onMouseEnter={() =>
                              handleSetupPointerEnter(index)
                            }
                            onMouseLeave={handleSetupPointerLeave}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* RADAR WROGA */}
              <div className="board-section">
                <h3>Radar (Wróg)</h3>

                <div className="board-container-with-labels">
                  <div className="col-labels">
                    {LETTERS.map(l => <span key={l}>{l}</span>)}
                  </div>

                  <div className="row-and-board">
                    <div className="row-labels">
                      {[...Array(10)].map((_, i) => (
                        <span key={i}>{i + 1}</span>
                      ))}
                    </div>

                    <div
                      className={`board ${
                        view === 'playing' && turn === myId
                          ? 'crosshair'
                          : 'disabled'
                      }`}
                    >
                      {enemyBoard.map((val, index) => {
                        let cls = 'cell ';

                        if (val === 2) cls += 'cell-miss ';
                        if (val === 3) cls += 'cell-hit ';

                        return (
                          <div
                            key={`en-${index}`}
                            className={cls}
                            onClick={() => handleShoot(index)}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL HISTORII RUCHÓW */}
            <div className="history-panel card">
              <h4>📜 Historia Ruchów</h4>

              <ul>
                {history.length === 0 ? (
                  <li>Brak ruchów</li>
                ) : (
                  history.map((h, i) => <li key={i}>{h}</li>)
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {view === 'game_over' && (
        <div className="game-over card">
          <h1>
            {winner === myId ? 'Wygrana! 🏆' : 'Przegrana! 💀'}
          </h1>

          <button
            className="btn-primary"
            onClick={() => setView('lobby')}
          >
            Powrót do Lobby
          </button>
        </div>
      )}
    </div>
  );
}
