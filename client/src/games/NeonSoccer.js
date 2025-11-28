import Phaser from 'phaser';

const PLAYER_COLORS = [
  0xff00ff, // Magenta
  0x00ff00, // Green
  0xffff00, // Yellow
  0xff0000, // Red
  0x0000ff, // Blue
  0x00ffff, // Cyan
];

export default class NeonSoccer extends Phaser.Scene {
  constructor() {
    super('NeonSoccer');
    this.players = new Map();
    this.score = { left: 0, right: 0 };
    this.gameTime = 300; // 5 minutes
    this.isPaused = true;
    this.timerEvent = null;
    this.playerListText = [];
  }

  create() {
    // --- TEXTURES ---
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Ball (Glowing Orb)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('ball', 32, 32);
    
    // Racer Ship (Arrow/Triangle Shape)
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.beginPath();
    graphics.moveTo(0, 0);
    graphics.lineTo(40, 15); // Nose
    graphics.lineTo(0, 30);
    graphics.lineTo(10, 15); // Indent
    graphics.lineTo(0, 0);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('car', 40, 30);

    // Particle Texture (Trail)
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);

    // --- WORLD ---
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    
    // Goals
    const goalWidth = 60;
    const goalHeight = 200;
    const centerY = this.scale.height / 2;

    this.leftGoal = this.add.rectangle(0, centerY, goalWidth, goalHeight, 0x330000, 0.8);
    this.leftGoal.setStrokeStyle(4, 0xff0000);
    this.physics.add.existing(this.leftGoal, true);
    
    this.rightGoal = this.add.rectangle(this.scale.width, centerY, goalWidth, goalHeight, 0x000033, 0.8);
    this.rightGoal.setStrokeStyle(4, 0x0000ff);
    this.physics.add.existing(this.rightGoal, true);

    // Goal Lines (Thicker)
    const leftLine = this.add.line(0, 0, goalWidth, centerY - goalHeight/2, goalWidth, centerY + goalHeight/2, 0xff0000).setOrigin(0);
    leftLine.setLineWidth(4);
    
    const rightLine = this.add.line(0, 0, this.scale.width - goalWidth, centerY - goalHeight/2, this.scale.width - goalWidth, centerY + goalHeight/2, 0x0000ff).setOrigin(0);
    rightLine.setLineWidth(4);

    // --- OBJECTS ---
    this.ball = this.physics.add.image(this.scale.width / 2, this.scale.height / 2, 'ball');
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(0.9);
    this.ball.setDrag(50);
    this.ball.setCircle(16);
    
    // Ball Glow
    this.ballGlow = this.add.particles(0, 0, 'ball', {
        speed: 0,
        scale: { start: 1, end: 2 },
        alpha: { start: 0.3, end: 0 },
        lifespan: 100,
        blendMode: 'ADD'
    });
    this.ballGlow.startFollow(this.ball);

    // --- UI ---
    // Scoreboard
    this.scoreText = this.add.text(this.scale.width / 2, 60, '0 - 0', {
      fontSize: '80px',
      fontFamily: 'Impact, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Timer
    this.timerText = this.add.text(this.scale.width / 2, 130, '05:00', {
      fontSize: '40px',
      fontFamily: 'Impact, sans-serif',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Pause Overlay
    this.pauseText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'PAUSED', {
      fontSize: '100px',
      fontFamily: 'Impact, sans-serif',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 8,
      fontStyle: 'italic'
    }).setOrigin(0.5).setVisible(true);



    // --- LOGIC ---
    this.physics.add.overlap(this.ball, this.leftGoal, () => this.handleGoal('right'), null, this);
    this.physics.add.overlap(this.ball, this.rightGoal, () => this.handleGoal('left'), null, this);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
      paused: true
    });

    // --- EVENTS ---
    this.game.events.on('PLAYER_JOINED', (player) => this.addPlayer(player.id, player.nickname, player.color));
    this.game.events.on('INPUT', (data) => { if (!this.isPaused) this.handleInput(data); });
    this.game.events.on('PLAYER_LEFT', (data) => this.removePlayer(data.id));
    
    this.game.events.on('START_GAME', () => this.setPaused(false));
    this.game.events.on('PAUSE_GAME', () => this.setPaused(true));
    this.game.events.on('RESTART_GAME', () => this.restartGame());
    this.game.events.on('ADD_TIME', () => { this.gameTime += 60; this.updateTimerDisplay(); });
    this.game.events.on('SUB_TIME', () => { 
        this.gameTime = Math.max(0, this.gameTime - 60); 
        this.updateTimerDisplay(); 
    });
    
    this.physics.pause();
  }

  addPlayer(id, nickname, colorHex) {
    if (this.players.has(id)) return;

    const x = Math.random() * this.scale.width;
    const y = Math.random() * this.scale.height;
    const player = this.physics.add.image(x, y, 'car');
    player.setCollideWorldBounds(true);
    player.setDrag(800);
    player.setAngularDrag(800);
    player.setMaxVelocity(500);
    player.inputState = { x: 0, y: 0 };
    player.powerShotAvailable = false;
    player.lastTouchedBall = false; // Track last touch for goal credit
    
    // Color
    let color = 0xffffff;
    if (colorHex) {
        color = parseInt(colorHex.replace(/^#/, ''), 16);
    } else {
        color = PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];
    }
    
    player.setTint(color);
    player.assignedColor = color;

    // Trail Particles
    const particles = this.add.particles(0, 0, 'particle', {
        speed: 50,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 400,
        blendMode: 'ADD',
        tint: color
    });
    particles.startFollow(player);
    player.particles = particles;

    this.players.set(id, player);
    
    // Ball Collision - Track last touch
    this.physics.add.collider(player, this.ball, () => {
        this.players.forEach(p => p.lastTouchedBall = false);
        player.lastTouchedBall = true;
    });

    this.players.forEach((other, otherId) => {
      if (id !== otherId) this.physics.add.collider(player, other);
    });
  }

  removePlayer(id) {
    if (this.players.has(id)) {
      const player = this.players.get(id);
      if (player.particles) player.particles.destroy();
      player.destroy();
      this.players.delete(id);
    }
  }

  handleInput(data) {
    const player = this.players.get(data.playerId);
    if (!player) return;

    if (data.type === 'JOYSTICK') {
      player.inputState.x = data.x;
      player.inputState.y = data.y;
    } else if (data.type === 'BUTTON_DOWN') {
      if (data.button === 'A') {
        // Normal Boost
        this.physics.velocityFromRotation(player.rotation, 800, player.body.acceleration);
        this.createBoostEffect(player, 1, 20);
        
        this.time.delayedCall(200, () => {
            if (player.body) player.body.setAcceleration(0);
        });
      } else if (data.button === 'POWER') {
        // Power Shot
        if (player.powerShotAvailable) {
            // Consume Power Shot
            player.powerShotAvailable = false;
            this.game.events.emit('POWER_SHOT_STATUS', { playerId: data.playerId, available: false });

            // Massive Boost
            this.physics.velocityFromRotation(player.rotation, 2000, player.body.acceleration);
            this.createBoostEffect(player, 2, 50); // Larger effect

            // Visual Flare
            const flare = this.add.circle(player.x, player.y, 100, 0xffff00, 0.8);
            this.tweens.add({
                targets: flare,
                scale: 3,
                alpha: 0,
                duration: 500,
                onComplete: () => flare.destroy()
            });

            this.time.delayedCall(400, () => {
                if (player.body) player.body.setAcceleration(0);
            });
        }
      }
    }
  }

  createBoostEffect(player, scaleMultiplier, particleCount) {
    const boostEmitter = this.add.particles(0, 0, 'particle', {
        x: player.x,
        y: player.y,
        speed: 100 * scaleMultiplier,
        lifespan: 500,
        blendMode: 'ADD',
        scale: { start: 1 * scaleMultiplier, end: 0 },
        tint: player.tintTopLeft,
        emitting: false
    });
    boostEmitter.explode(particleCount);
  }

  update() {
    this.players.forEach((player) => {
        const { x, y } = player.inputState;
        if (x !== 0 || y !== 0) {
            const angle = Math.atan2(y, x);
            player.setRotation(angle);
            const speed = Math.sqrt(x*x + y*y) * 400;
            this.physics.velocityFromRotation(angle, speed, player.body.velocity);
        }
    });
  }

  updateTimer() {
    if (this.gameTime > 0) {
      this.gameTime--;
      this.updateTimerDisplay();
    } else {
      this.setPaused(true);
      let message = "DRAW";
      let color = '#ffffff';
      
      if (this.score.left > this.score.right) {
          message = "RED WINS!";
          color = '#ff0000';
      } else if (this.score.right > this.score.left) {
          message = "BLUE WINS!";
          color = '#0000ff';
      }
      
      this.pauseText.setText(message).setColor(color).setVisible(true);
    }
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = this.gameTime % 60;
    this.timerText.setText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  }

  setPaused(paused) {
    this.isPaused = paused;
    this.timerEvent.paused = paused;
    if (paused) {
      this.physics.pause();
      this.pauseText.setText("PAUSED").setVisible(true);
    } else {
      this.physics.resume();
      this.pauseText.setVisible(false);
    }
  }

  restartGame() {
    this.score = { left: 0, right: 0 };
    this.scoreText.setText('0 - 0');
    this.gameTime = 300;
    this.updateTimerDisplay();
    this.setPaused(true);
    this.ball.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.ball.setVelocity(0, 0);
    this.ball.setAngularVelocity(0);
    this.players.forEach(player => {
      player.setPosition(Math.random() * this.scale.width, Math.random() * this.scale.height);
      player.setVelocity(0, 0);
      player.setAcceleration(0);
      player.powerShotAvailable = false;
      player.lastTouchedBall = false;
      // Reset controller state
      // Note: We can't easily reset controller state from here without emitting an event for each player
      // But since we track it server/client side, it should sync on next goal
    });
  }

  handleGoal(scoringTeam) {
    if (this.resetting) return;
    this.resetting = true;
    if (scoringTeam === 'left') this.score.left++;
    else this.score.right++;
    this.scoreText.setText(`${this.score.left} - ${this.score.right}`);
    
    // Identify Scorer (Last player to touch ball)
    let scorerId = null;
    this.players.forEach((player, id) => {
        if (player.lastTouchedBall) {
            scorerId = id;
            // Unlock Power Shot
            player.powerShotAvailable = true;
            this.game.events.emit('POWER_SHOT_STATUS', { playerId: id, available: true });
            
            // Visual Feedback for Scorer
            const text = this.add.text(player.x, player.y - 50, "POWER SHOT UNLOCKED!", {
                fontSize: '24px',
                fontFamily: 'Impact',
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: text,
                y: player.y - 100,
                alpha: 0,
                duration: 2000,
                onComplete: () => text.destroy()
            });
        }
    });

    const r = scoringTeam === 'left' ? 0 : 255;
    const b = scoringTeam === 'left' ? 255 : 0;
    this.cameras.main.flash(500, r, 0, b);

    this.time.delayedCall(1000, () => {
      this.ball.setPosition(this.scale.width / 2, this.scale.height / 2);
      this.ball.setVelocity(0, 0);
      this.ball.setAngularVelocity(0);
      this.resetting = false;
      // Reset last touched
      this.players.forEach(p => p.lastTouchedBall = false);
    });
  }
}
