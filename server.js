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

// Serve static files from /public
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

    socket.join(room);

    // Initialize storage
    if (!chatHistory[room]) chatHistory[room] = [];
    if (!roomUsers[room]) roomUsers[room] = [];

    // Add user
    roomUsers[room].push(username);

    // Send data
    socket.emit('chat history', chatHistory[room]);
    socket.to(room).emit('user joined', username);
    io.to(room).emit('room users', roomUsers[room]);

    console.log(`👤 ${username} joined room: ${room}`);
  });

  // Handle chat message
  socket.on('chat message', (msg) => {
    const room = socket.room;
    const message = { user: socket.username, text: msg };

    if (chatHistory[room]) chatHistory[room].push(message);

    io.to(room).emit('chat message', message);
  });

  // === WebRTC Signaling ===

  socket.on('offer', ({ offer, room }) => {
    socket.to(room).emit('offer', { offer });
  });

  socket.on('answer', ({ answer, room }) => {
    socket.to(room).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ candidate, room }) => {
    socket.to(room).emit('ice-candidate', { candidate });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const room = socket.room;
    const username = socket.username;

    if (room && username) {
      // Remove user from room list
      roomUsers[room] = (roomUsers[room] || []).filter(u => u !== username);

      // Notify others
      socket.to(room).emit('user left', username);
      io.to(room).emit('room users', roomUsers[room]);

      console.log(`🔴 ${username} left room: ${room}`);

      // Clean up room if empty
      if (roomUsers[room].length === 0) {
        delete roomUsers[room];
        delete chatHistory[room];
        console.log(`🧹 Room "${room}" cleaned up`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Chat server running at http://localhost:${PORT}`);
});
