const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const words = require('./words.json');

let players = [];
let currentPlayerIndex = -1;

// Pula słów z której będziemy losować (na start kopiujemy wszystko)
let availableWords = [...words]; 

io.on('connection', (socket) => {
  socket.emit('update_players', players);

  socket.on('join_game', (playerName) => {
    players = players.filter(p => p.id !== socket.id);
    players.push({ id: socket.id, name: playerName });
    io.emit('update_players', players);
  });

  socket.on('next_turn', () => {
    if (players.length === 0) return;
    
    currentPlayerIndex++;
    if (currentPlayerIndex >= players.length) {
      currentPlayerIndex = 0;
    }

    // ZABEZPIECZENIE PRZED POWTARZANIEM SŁÓW
    // Jeśli pula słów się skończy, ładujemy ją od nowa
    if (availableWords.length === 0) {
      console.log('Pula słów wyczerpana! Tasuję od nowa...');
      availableWords = [...words];
    }

    // Losujemy indeks z obecnie dostępnej puli
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const randomWord = availableWords[randomIndex];
    
    // Usuwamy wylosowane słowo z puli, żeby nie wypadło ponownie
    availableWords.splice(randomIndex, 1);

    io.emit('turn_data', {
      activePlayerId: players[currentPlayerIndex].id,
      activePlayerName: players[currentPlayerIndex].name,
      word: randomWord.word,
      letter: randomWord.letter
    });
  });

  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    console.log(`Gracz ${socket.id} odłączył się.`);
    io.emit('update_players', players);
  });
});

app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Gra Słów działa na http://localhost:${PORT}`);
});