const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Twój JSON z wyzwaniami
const challenges = require('./challanges.json');

let players = [];

io.on('connection', (socket) => {
  socket.emit('update_players', players);

  socket.on('join_game', (playerName) => {
    // Zapobiegaj duplikatom id na wypadek odświeżenia
    players = players.filter(p => p.id !== socket.id);
    players.push({ id: socket.id, name: playerName });
    io.emit('update_players', players);
  });

  socket.on('spin_roulette', () => {
    if (players.length === 0) return;
    
    // Losowanie gracza i wyzwania
    const winnerIndex = Math.floor(Math.random() * players.length);
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    
    // Wysyłamy informację do wszystkich (kto wygrał, jaki index na ruletce, jakie zadanie)
    io.emit('roulette_result', {
      winnerIndex,
      winnerName: players[winnerIndex].name,
      challenge: randomChallenge
    });
  });

  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit('update_players', players);
  });
});

app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Grecka ruletka działa na http://localhost:${PORT}`);
});