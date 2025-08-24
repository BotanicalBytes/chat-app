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

// In-memory storage
const chatHistory = {}; // { roomCode: [ { user, text } ] }
const roomUsers = {};   // { roomCode: [username, ...] }

io.on('connection', (socket) => {
  console.log('🟢 New user connected:', socket.id);

  // Handle user joining a room
  socket.on('join room', ({ username, room }) => {
    socket.username = username;
    socket.room = room;

    // Join the socket to the room
    socket.join(room);

    // Initialize history and users if needed
    if (!chatHistory[room]) chatHistory[room] = [];
    if (!roomUsers[room]) roomUsers[room] = [];

    // Add user to the room
    roomUsers[room].push(username);

    // Send existing chat history to this user
    socket.emit('chat history', chatHistory[room]);

    // Notify everyone in the room
    socket.to(room).emit('user joined', username);

    // Send updated user list to all in the room
    io.to(room).emit('room users', roomUsers[room]);

    console.log(`👤 ${username} joined room: ${room}`);
  });

  // Handle incoming message
  socket.on('chat message', (msg) => {
    const room = socket.room;
    const message = { user: socket.username, text: msg };

    // Save message in that room’s history
    if (chatHistory[room]) {
      chatHistory[room].push(message);
    }

    // Broadcast only to users in that room
    io.to(room).emit('chat message', message);
  });

  // Handle user leaving or disconnecting
  socket.on('disconnect', () => {
    const room = socket.room;
    const username = socket.username;

    if (room && username) {
      // Remove user from the room user list
      roomUsers[room] = (roomUsers[room] || []).filter(u => u !== username);

      // Notify others
      socket.to(room).emit('user left', username);
      io.to(room).emit('room users', roomUsers[room]);

      console.log(`🔴 ${username} left room: ${room}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Chat server running at http://localhost:${PORT}`);
});
