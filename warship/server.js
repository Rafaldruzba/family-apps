const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'client/dist')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const users = new Map();
const rooms = new Map();

const BOARD_SIZE = 10;
const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;

// Oficjalny zestaw statków:
// 1x4, 2x3, 3x2, 4x1
const REQUIRED_FLEET = [
  4,
  3, 3,
  2, 2, 2,
  1, 1, 1, 1
];

/**
 * Sprawdza, czy współrzędna znajduje się na planszy.
 */
const isValidCoordinate = (value) => {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value < BOARD_SIZE
  );
};

/**
 * Sprawdza, czy indeks pola planszy jest poprawny.
 */
const isValidIndex = (index) => {
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < BOARD_CELLS
  );
};

/**
 * Zwraca wszystkie pola zajmowane przez statek.
 *
 * Jeśli statek jest niepoprawny, zwraca null.
 */
const getShipCells = (ship) => {
  if (!ship || typeof ship !== 'object') {
    return null;
  }

  const {
    x,
    y,
    length,
    isVertical
  } = ship;

  if (
    !isValidCoordinate(x) ||
    !isValidCoordinate(y) ||
    !Number.isInteger(length) ||
    !REQUIRED_FLEET.includes(length) ||
    typeof isVertical !== 'boolean'
  ) {
    return null;
  }

  const cells = [];

  for (let i = 0; i < length; i++) {
    const cx = isVertical
      ? x
      : x + i;

    const cy = isVertical
      ? y + i
      : y;

    // Statek wychodzi poza planszę
    if (
      !isValidCoordinate(cx) ||
      !isValidCoordinate(cy)
    ) {
      return null;
    }

    cells.push({
      x: cx,
      y: cy
    });
  }

  return cells;
};

/**
 * Waliduje całą flotę.
 *
 * Sprawdzamy:
 * - dokładnie 10 statków,
 * - poprawne długości,
 * - poprawne współrzędne,
 * - brak wychodzenia poza planszę,
 * - brak nakładania,
 * - brak stykania się statków,
 * - brak stykania po skosie.
 *
 * Dane przychodzące z klienta traktujemy jako NIEZAUFANE.
 */
const checkShipPlacement = (ships) => {
  if (
    !Array.isArray(ships) ||
    ships.length !== REQUIRED_FLEET.length
  ) {
    return false;
  }

  // Sprawdzenie wymaganych długości.
  const lengths = ships
    .map(ship => ship?.length)
    .sort((a, b) => b - a);

  if (
    JSON.stringify(lengths) !==
    JSON.stringify(REQUIRED_FLEET)
  ) {
    return false;
  }

  // 0 = puste
  // 1 = statek
  const board = Array(BOARD_CELLS).fill(0);

  for (const ship of ships) {
    const cells = getShipCells(ship);

    if (!cells) {
      return false;
    }

    /**
     * Sprawdzamy każde pole statku.
     *
     * Dookoła każdego masztu sprawdzamy obszar 3x3.
     * Jeśli znajdziemy inny statek, ustawienie jest niepoprawne.
     */
    for (const { x, y } of cells) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (
            nx >= 0 &&
            nx < BOARD_SIZE &&
            ny >= 0 &&
            ny < BOARD_SIZE
          ) {
            const index =
              ny * BOARD_SIZE + nx;

            if (board[index] === 1) {
              return false;
            }
          }
        }
      }
    }

    // Zapisujemy statek na planszy.
    for (const { x, y } of cells) {
      board[y * BOARD_SIZE + x] = 1;
    }
  }

  return true;
};

/**
 * Buduje planszę 100 pól na podstawie floty.
 */
const buildBoardFromShips = (ships) => {
  const board = Array(BOARD_CELLS).fill(0);

  for (const ship of ships) {
    const cells = getShipCells(ship);

    if (!cells) {
      return null;
    }

    for (const { x, y } of cells) {
      board[y * BOARD_SIZE + x] = 1;
    }
  }

  return board;
};

/**
 * Pobiera użytkownika.
 */
const getUser = (socketId) => {
  return users.get(socketId);
};

/**
 * Pobiera pokój, w którym znajduje się socket.
 */
const getRoomForSocket = (socketId) => {
  const user = getUser(socketId);

  if (!user?.roomId) {
    return null;
  }

  return rooms.get(user.roomId) || null;
};

/**
 * Aktualizacja listy graczy w lobby.
 */
const broadcastLobby = () => {
  const lobbyUsers = Array.from(users.values())
    .filter(user => user.status === 'lobby')
    .map(({ id, name }) => ({
      id,
      name
    }));

  io.emit(
    'lobby_update',
    lobbyUsers
  );
};

/**
 * Zwalnia graczy z pokoju.
 */
const releaseRoomPlayers = (room) => {
  for (const playerId of room.players) {
    const player = users.get(playerId);

    if (player) {
      player.status = 'lobby';
      player.roomId = null;
    }
  }
};

/**
 * Usuwa pokój i przywraca graczy do lobby.
 */
const cleanupRoom = (roomId) => {
  const room = rooms.get(roomId);

  if (!room) {
    return;
  }

  releaseRoomPlayers(room);

  rooms.delete(roomId);

  broadcastLobby();
};

io.on('connection', (socket) => {

  /**
   * =========================
   * LOGOWANIE
   * =========================
   */
  socket.on('set_name', (rawName) => {
    if (typeof rawName !== 'string') {
      return;
    }

    const name = rawName
      .trim()
      .slice(0, 15);

    if (!name) {
      socket.emit(
        'login_error',
        'Nick nie może być pusty.'
      );

      return;
    }

    /**
     * Nie pozwalamy na dwóch graczy
     * z takim samym nickiem.
     */
    const duplicate = Array.from(users.values())
      .some(
        user =>
          user.name.toLowerCase() ===
          name.toLowerCase()
      );

    if (duplicate) {
      socket.emit(
        'login_error',
        'Ten nick jest już zajęty.'
      );

      return;
    }

    users.set(socket.id, {
      id: socket.id,
      name,
      status: 'lobby',
      roomId: null
    });

    socket.emit(
      'login_success',
      socket.id
    );

    broadcastLobby();
  });

  /**
   * =========================
   * WYZWANIE GRACZA
   * =========================
   */
  socket.on('challenge_player', (targetId) => {
    if (typeof targetId !== 'string') {
      return;
    }

    const me = getUser(socket.id);
    const targetUser = users.get(targetId);

    if (
      !me ||
      !targetUser ||
      me.id === targetId ||
      me.status !== 'lobby' ||
      targetUser.status !== 'lobby'
    ) {
      return;
    }

    io.to(targetId).emit(
      'incoming_challenge',
      {
        challengerId: me.id,
        challengerName: me.name
      }
    );
  });

  /**
   * =========================
   * AKCEPTACJA WYZWANIA
   * =========================
   */
  socket.on(
    'accept_challenge',
    (challengerId) => {
      if (typeof challengerId !== 'string') {
        return;
      }

      const p1 = users.get(challengerId);
      const p2 = users.get(socket.id);

      if (
        !p1 ||
        !p2 ||
        p1.id === p2.id ||
        p1.status !== 'lobby' ||
        p2.status !== 'lobby'
      ) {
        return;
      }

      const roomId =
        crypto.randomUUID();

      p1.status = 'playing';
      p1.roomId = roomId;

      p2.status = 'playing';
      p2.roomId = roomId;

      const room = {
        id: roomId,

        players: [
          p1.id,
          p2.id
        ],

        boards: {
          [p1.id]: null,
          [p2.id]: null
        },

        turn: null,

        status: 'setup',

        history: [],

        /**
         * Set pozwala sprawdzić,
         * czy gracz już wysłał flotę.
         */
        submitted: new Set()
      };

      rooms.set(
        roomId,
        room
      );

      const challengerSocket =
        io.sockets.sockets.get(p1.id);

      if (challengerSocket) {
        challengerSocket.join(roomId);
      }

      socket.join(roomId);

      io
        .to(roomId)
        .emit('game_setup_start');

      broadcastLobby();
    }
  );

  /**
   * =========================
   * ODRZUCENIE WYZWANIA
   * =========================
   */
  socket.on(
    'decline_challenge',
    (challengerId) => {
      if (
        typeof challengerId !==
        'string'
      ) {
        return;
      }

      const me =
        getUser(socket.id);

      if (
        me &&
        users.has(challengerId)
      ) {
        io
          .to(challengerId)
          .emit(
            'challenge_declined',
            me.name
          );
      }
    }
  );

  /**
   * =========================
   * USTAWIANIE FLOTY
   * =========================
   */
  socket.on(
    'submit_fleet',
    (ships) => {
      const me =
        getUser(socket.id);

      const room =
        getRoomForSocket(socket.id);

      if (
        !me ||
        !room ||
        room.status !== 'setup'
      ) {
        return;
      }

      /**
       * Nie można wysłać floty
       * drugi raz.
       */
      if (
        room.submitted.has(socket.id)
      ) {
        return;
      }

      /**
       * Najważniejsze:
       * walidujemy wszystko ponownie
       * po stronie serwera.
       */
      if (
        !checkShipPlacement(ships)
      ) {
        socket.emit(
          'fleet_rejected',
          'Niepoprawna flota! Sprawdź długości, położenie i odstępy między statkami.'
        );

        return;
      }

      const board =
        buildBoardFromShips(ships);

      if (!board) {
        socket.emit(
          'fleet_rejected',
          'Nie udało się utworzyć planszy.'
        );

        return;
      }

      room.boards[socket.id] =
        board;

      room.submitted.add(
        socket.id
      );

      socket.emit(
        'fleet_accepted'
      );

      const [
        id1,
        id2
      ] = room.players;

      /**
       * Obaj gracze ustawili flotę.
       */
      if (
        room.boards[id1] &&
        room.boards[id2]
      ) {
        room.status =
          'playing';

        /**
         * Pierwszy gracz zaczyna.
         */
        room.turn =
          room.players[0];

        io
          .to(room.id)
          .emit(
            'game_start',
            {
              turn: room.turn,
              history: room.history
            }
          );
      } else {
        socket
          .broadcast
          .to(room.id)
          .emit(
            'opponent_ready'
          );
      }
    }
  );

  /**
   * =========================
   * STRZAŁ
   * =========================
   */
  socket.on(
    'shoot',
    (rawIndex) => {
      const me =
        getUser(socket.id);

      const room =
        getRoomForSocket(socket.id);

      if (
        !me ||
        !room ||
        room.status !== 'playing'
      ) {
        return;
      }

      /**
       * Wszystko przychodzące od klienta
       * trzeba sprawdzić.
       */
      const index =
        Number(rawIndex);

      if (
        !isValidIndex(index)
      ) {
        return;
      }

      /**
       * Tylko gracz,
       * którego jest kolej,
       * może strzelać.
       */
      if (
        room.turn !== socket.id
      ) {
        return;
      }

      const enemyId =
        room.players.find(
          id => id !== socket.id
        );

      const enemyBoard =
        room.boards[enemyId];

      if (!enemyBoard) {
        return;
      }

      /**
       * Nie można strzelić
       * drugi raz w to samo pole.
       */
      if (
        enemyBoard[index] === 2 ||
        enemyBoard[index] === 3
      ) {
        return;
      }

      const isHit =
        enemyBoard[index] === 1;

      /**
       * 1 = statek
       * 2 = pudło
       * 3 = trafienie
       */
      enemyBoard[index] =
        isHit ? 3 : 2;

      const letters =
        'ABCDEFGHIJ';

      const col =
        letters[
          index % BOARD_SIZE
        ];

      const row =
        Math.floor(
          index / BOARD_SIZE
        ) + 1;

      const shooterName =
        users.get(socket.id)?.name ||
        'Gracz';

      const logEntry =
        `${shooterName} strzelił w ${col}${row} — ` +
        `${
          isHit
            ? 'Trafiony! 🔥'
            : 'Pudło 🌊'
        }`;

      room.history.unshift(
        logEntry
      );

      /**
       * Trafienie:
       * gracz strzela ponownie.
       *
       * Pudło:
       * zmieniamy turę.
       */
      if (!isHit) {
        room.turn =
          enemyId;
      }

      /**
       * Jeśli na planszy przeciwnika
       * nie ma już żadnego pola statku,
       * gra się kończy.
       */
      const isGameOver =
        !enemyBoard.includes(1);

      io
        .to(room.id)
        .emit(
          'shot_result',
          {
            index,
            isHit,
            shooter: socket.id,
            nextTurn: room.turn,
            history: room.history
          }
        );

      if (isGameOver) {
        room.status =
          'finished';

        io
          .to(room.id)
          .emit(
            'game_over',
            {
              winner: socket.id
            }
          );

        cleanupRoom(
          room.id
        );
      }
    }
  );

  /**
   * =========================
   * ROZŁĄCZENIE
   * =========================
   */
  socket.on(
    'disconnect',
    () => {
      const me =
        getUser(socket.id);

      if (!me) {
        return;
      }

      if (me.roomId) {
        const room =
          rooms.get(me.roomId);

        if (room) {
          io
            .to(room.id)
            .emit(
              'opponent_disconnected'
            );

          cleanupRoom(
            room.id
          );
        }
      }

      users.delete(
        socket.id
      );

      broadcastLobby();
    }
  );
});

/**
 * =========================
 * FRONTEND
 * =========================
 */
app.get(
  '*',
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        'client/dist',
        'index.html'
      )
    );
  }
);

/**
 * =========================
 * START SERWERA
 * =========================
 */
const PORT =
  process.env.PORT || 3000;

server.listen(
  PORT,
  () => {
    console.log(
      `🚀 Serwer gotowy na porcie ${PORT}`
    );
  }
);