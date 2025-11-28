class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> { hostId, players: [], gameState: {} }
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostId) {
    const code = this.generateCode();
    this.rooms.set(code, {
      hostId,
      players: [],
      gameState: null
    });
    return code;
  }

  joinRoom(code, playerId, nickname) {
    const room = this.rooms.get(code);
    if (!room) return null;
    
    // Check if player already in room (reconnect?) - for now just add
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (!existingPlayer) {
      room.players.push({ id: playerId, nickname });
    }
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  removeRoom(code) {
    this.rooms.delete(code);
  }

  removePlayer(playerId) {
    // Find room with this player
    for (const [code, room] of this.rooms.entries()) {
      const index = room.players.findIndex(p => p.id === playerId);
      if (index !== -1) {
        room.players.splice(index, 1);
        return { code, room };
      }
    }
    return null;
  }

  getHostRoom(hostId) {
    for (const [code, room] of this.rooms.entries()) {
      if (room.hostId === hostId) return code;
    }
    return null;
  }

  setGame(code, gameId) {
    const room = this.rooms.get(code);
    if (room) {
      room.gameId = gameId;
    }
  }
}

module.exports = new RoomManager();
