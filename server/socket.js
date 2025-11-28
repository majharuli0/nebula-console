const roomManager = require('./roomManager');
const { EVENTS } = require('./constants');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Host creates a room
    socket.on(EVENTS.CREATE_ROOM, () => {
      const roomCode = roomManager.createRoom(socket.id);
      socket.join(roomCode);
      socket.emit(EVENTS.ROOM_CREATED, roomCode);
      console.log(`Room created: ${roomCode} by Host ${socket.id}`);
    });

    // Player joins a room
    socket.on(EVENTS.JOIN_ROOM, ({ code, nickname }) => {
      const room = roomManager.joinRoom(code, socket.id, nickname);
      if (room) {
        socket.join(code);
        // Notify Host
        io.to(room.hostId).emit(EVENTS.PLAYER_JOINED, { id: socket.id, nickname });
        // Notify Player
        socket.emit('JOIN_SUCCESS', { code, nickname, gameId: room.gameId });
        console.log(`Player ${nickname} (${socket.id}) joined room ${code}`);
      } else {
        socket.emit('ERROR', { message: 'Invalid Room Code' });
      }
    });

    // Input from Controller
    socket.on(EVENTS.INPUT, (data) => {
      // data: { roomCode, type, ...payload }
      // We need to know which room this player is in.
      // Optimization: Client sends roomCode with input, or we look it up.
      // Sending roomCode is faster than lookup.
      const { roomCode, ...payload } = data;
      if (roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (room) {
          // Forward to Host
          // Using volatile for low latency (UDP-like behavior), drop if congested
          io.to(room.hostId).volatile.emit(EVENTS.INPUT, { playerId: socket.id, ...payload });
        }
      }
    });

    // Host changes game
    socket.on('SELECT_GAME', ({ roomCode, gameId }) => {
      // Verify host? For now just trust the roomCode check
      if (roomCode) {
        roomManager.setGame(roomCode, gameId);
        io.to(roomCode).emit('GAME_CHANGED', gameId);
        console.log(`Room ${roomCode} switched to game: ${gameId}`);
      }
    });

    // Client requests game state
    socket.on('GET_GAME_STATE', ({ roomCode }) => {
      console.log(`Received GET_GAME_STATE for room ${roomCode}`);
      if (roomCode) {
        const room = roomManager.getRoom(roomCode);
        const gameId = (room && room.gameId) ? room.gameId : 'SOCCER';
        socket.emit('GAME_STATE', gameId);
        console.log(`Sent GAME_STATE ${gameId} to ${socket.id}`);
      }
    });

    // Host requests player list (re-sync)
    socket.on('GET_PLAYERS', ({ roomCode }) => {
      if (roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (room && room.players) {
          socket.emit('PLAYER_LIST', room.players);
        }
      }
    });

    // Host updates Power Shot Status
    socket.on('POWER_SHOT_STATUS', ({ roomCode, playerId, available }) => {
        if (roomCode && playerId) {
            io.to(playerId).emit('POWER_SHOT_STATUS', { available });
        }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Check if Host
      const hostRoomCode = roomManager.getHostRoom(socket.id);
      if (hostRoomCode) {
        // Host left, destroy room
        roomManager.removeRoom(hostRoomCode);
        io.to(hostRoomCode).emit('ROOM_CLOSED'); // Notify players
        console.log(`Room ${hostRoomCode} closed (Host left)`);
      } else {
        // Check if Player
        const result = roomManager.removePlayer(socket.id);
        if (result) {
          const { code, room } = result;
          io.to(room.hostId).emit('PLAYER_LEFT', { id: socket.id });
          console.log(`Player left room ${code}`);
        }
      }
    });
  });
};
