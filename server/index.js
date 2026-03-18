const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://ultimate-tic-tac-toe-sigma.vercel.app', '*'],
    methods: ["GET", "POST"]

  },
});

// rooms store
const rooms = {}; // code -> { players: [{id,name}], createdAt }

function genCode(len = 5) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('create_room', ({ name }, cb) => {
    let code; let attempts = 0;
    do { code = genCode(); attempts++; if (attempts > 20) break; } while (rooms[code]);
    rooms[code] = { players: [{ id: socket.id, name }], createdAt: Date.now() };
    socket.join(code);
    console.log(`Room ${code} created by ${name}`);
    if (cb) cb({ ok: true, roomCode: code, players: rooms[code].players.map(p => p.name) });
    io.to(code).emit('room_update', rooms[code].players.map(p => p.name));
  });

  socket.on('join_room', ({ roomCode, name }, cb) => {
    const code = String(roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room) { if (cb) cb({ ok: false, error: 'Room not found' }); return; }

    let isNewPlayer = false;
    const existing = room.players.find(p => p.id === socket.id);

    if (!existing) {
      if (room.players.length >= 2) { if (cb) cb({ ok: false, error: 'Room full' }); return; }
      room.players.push({ id: socket.id, name });
      isNewPlayer = true;
    } else {
      // Update name safely
      existing.name = name;
    }

    socket.join(code);
    io.to(code).emit('room_update', room.players.map(p => p.name));
    if (cb) cb({ ok: true, roomCode: code, players: room.players.map(p => p.name) });

    if (room.players.length === 2 && isNewPlayer) {
      const players = room.players.slice();
      const giveXToFirst = Math.random() < 0.5;
      const assignments = {};
      if (giveXToFirst) { assignments[players[0].id] = 'X'; assignments[players[1].id] = 'O'; }
      else { assignments[players[1].id] = 'X'; assignments[players[0].id] = 'O'; }

      room.assignments = assignments; // Persist assignments
      const payload = players.map(p => ({ id: p.id, name: p.name, sign: assignments[p.id] }));
      io.to(code).emit('start_game', { players: payload });
      console.log(`Room ${code} starting game`, payload);
    } else if (room.players.length === 2 && !isNewPlayer && room.assignments) {
      // Repush start_game state to the re-joining player so their UI transitions to the game board
      const payload = room.players.map(p => ({ id: p.id, name: p.name, sign: room.assignments[p.id] }));
      socket.emit('start_game', { players: payload });
    }
  });

  socket.on('leave_room', ({ roomCode }) => {
    const code = String(roomCode || '').toUpperCase();
    const room = rooms[code];
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    socket.leave(code);
    io.to(code).emit('room_update', room.players.map(p => p.name));
    if (room.players.length === 0) delete rooms[code];
  });

  socket.on('make_move', ({ roomCode, move }) => {
    const code = String(roomCode || '').toUpperCase();
    socket.to(code).emit('opponent_move', move);
  });

  socket.on('assign_board', ({ roomCode, choiceIndex }) => {
    const code = String(roomCode || '').toUpperCase();
    socket.to(code).emit('opponent_assigned_board', choiceIndex);
  });

  socket.on('disconnecting', () => {
    const joinedRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    joinedRooms.forEach(code => {
      const room = rooms[code];
      if (!room) return;
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(code).emit('room_update', room.players.map(p => p.name));
      if (room.players.length === 0) delete rooms[code];
    });
  });

  socket.on('disconnect', () => { console.log('socket disconnected', socket.id); });
});

app.get('/', (req, res) => res.send('Ultimate TTT server running'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('Server listening on', PORT));
