// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory chat history
let chatHistory = [];

io.on('connection', (socket) => {
  console.log('🟢 New user connected:', socket.id);

  // Handle user joining with username
  socket.on('join', (username) => {
    socket.username = username;
    socket.broadcast.emit('user joined', username);
    socket.emit('chat history', chatHistory);
  });

  // Receive message from a client
  socket.on('chat message', (msg) => {
    const message = { user: socket.username, text: msg };
    chatHistory.push(message);
    io.emit('chat message', message); // broadcast to all
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('user left', socket.username);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Chat server running at http://localhost:${PORT}`);
});
