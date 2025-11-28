
import Phaser from 'phaser';

export default class SiegeTanks extends Phaser.Scene {
  constructor() {
    super('SiegeTanks');
    this.players = new Map();
    this.currentPlayerId = null;
    this.turnOrder = [];
    this.turnIndex = 0;
    this.isProjectileFlying = false;
  }

  preload() {
    // Generate textures
  }

  create() {
    // Create textures
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Tank texture
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('tank', 32, 32);

    // Projectile texture
    graphics.clear();
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture('projectile', 10, 10);

    // Terrain
    graphics.clear();
    graphics.fillStyle(0x555555, 1);
    graphics.fillRect(0, 0, 800, 50);
    graphics.generateTexture('ground', 800, 50);

    // Setup Matter Physics
    this.matter.world.setBounds(0, 0, this.scale.width, this.scale.height);
    
    // Ground
    this.matter.add.rectangle(this.scale.width / 2, this.scale.height - 25, this.scale.width, 50, { isStatic: true });

    this.game.events.on('PLAYER_JOINED', (player) => {
      this.addPlayer(player.id, player.nickname);
    });

    this.game.events.on('INPUT', (data) => {
      this.handleInput(data);
    });

    this.game.events.on('PLAYER_LEFT', (data) => {
      this.removePlayer(data.id);
    });

    // Add existing players
    const socket = this.registry.get('socket');
    // In a real app, we'd sync existing players from server state
    
    this.addText = this.add.text(16, 16, 'Waiting for players...', { fontSize: '32px', fill: '#fff' });
  }

  addPlayer(id, nickname) {
    if (this.players.has(id)) return;

    const x = 100 + (this.players.size * 200);
    const y = this.scale.height - 100;
    
    const tank = this.matter.add.image(x, y, 'tank');
    tank.setRectangle(32, 32);
    tank.setStatic(false);
    tank.setDensity(0.5);
    tank.setFriction(0.5);

    this.players.set(id, { sprite: tank, nickname });
    this.turnOrder.push(id);

    if (this.turnOrder.length === 1) {
      this.turnIndex = 0;
      this.updateTurnText();
    }
  }

  handleInput(data) {
    if (data.type === 'FIRE_SHOT') {
      const currentId = this.turnOrder[this.turnIndex];
      if (data.playerId !== currentId) return; // Not your turn
      if (this.isProjectileFlying) return;

      this.fireProjectile(currentId, data.angle, data.power);
    }
  }

  fireProjectile(playerId, angle, power) {
    const player = this.players.get(playerId);
    const startX = player.sprite.x;
    const startY = player.sprite.y - 40;

    const projectile = this.matter.add.image(startX, startY, 'projectile');
    projectile.setCircle(5);
    projectile.setDensity(0.01);
    projectile.setBounce(0.5);

    // Calculate velocity vector
    // Angle is in radians, power is 0-100
    const velocityX = Math.cos(angle) * (power * 0.5);
    const velocityY = Math.sin(angle) * (power * 0.5);

    projectile.setVelocity(velocityX, velocityY);

    this.isProjectileFlying = true;

    // Simple turn switching after delay (replace with collision detection later)
    this.time.delayedCall(3000, () => {
      projectile.destroy();
      this.isProjectileFlying = false;
      this.nextTurn();
    });
  }

  nextTurn() {
    this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
    this.updateTurnText();
  }

  updateTurnText() {
    if (this.turnOrder.length > 0) {
      const currentId = this.turnOrder[this.turnIndex];
      const player = this.players.get(currentId);
      this.addText.setText(`Turn: ${player.nickname}`);
    }
  }
}
