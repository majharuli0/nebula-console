import Phaser from 'phaser';

const CELL_SIZE = 20;
const GRID_WIDTH = 40; // 800 / 20
const GRID_HEIGHT = 30; // 600 / 20
const UPDATE_INTERVAL = 100; // ms per move

const PLAYER_COLORS = [
  0xff00ff, // Magenta
  0x00ff00, // Green
  0xffff00, // Yellow
  0xff0000, // Red
  0x0000ff, // Blue
  0x00ffff, // Cyan
];

export default class NeonSnake extends Phaser.Scene {
  constructor() {
    super('NeonSnake');
    this.snakes = new Map();
    this.food = null;
    this.lastUpdate = 0;
    this.isPaused = false;
  }

  create() {
    // --- GRAPHICS ---
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Snake Body Segment
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);
    graphics.generateTexture('body', CELL_SIZE, CELL_SIZE);

    // Food (Apple/Orb)
    graphics.clear();
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(CELL_SIZE/2, CELL_SIZE/2, CELL_SIZE/2 - 2);
    graphics.generateTexture('food', CELL_SIZE, CELL_SIZE);

    // --- WORLD ---
    this.cameras.main.setBackgroundColor('#000000');
    
    // Grid Lines (Optional, for visual aid)
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x333333);
    for(let x = 0; x <= this.scale.width; x += CELL_SIZE) {
        gridGraphics.moveTo(x, 0);
        gridGraphics.lineTo(x, this.scale.height);
    }
    for(let y = 0; y <= this.scale.height; y += CELL_SIZE) {
        gridGraphics.moveTo(0, y);
        gridGraphics.lineTo(this.scale.width, y);
    }
    gridGraphics.strokePath();

    // --- FOOD ---
    this.spawnFood();

    // --- EVENTS ---
    this.game.events.on('PLAYER_JOINED', (player) => this.addSnake(player.id, player.nickname, player.color));
    this.game.events.on('PLAYER_LEFT', (data) => this.removeSnake(data.id));
    this.game.events.on('INPUT', (data) => this.handleInput(data));
    this.game.events.on('PAUSE_GAME', () => { this.isPaused = true; });
    this.game.events.on('RESUME_GAME', () => { this.isPaused = false; });
    this.game.events.on('ADD_TIME', () => { this.timeLeft += 60; this.game.events.emit('TIME_UPDATE', this.timeLeft); });
    this.game.events.on('SUB_TIME', () => { this.timeLeft = Math.max(0, this.timeLeft - 60); this.game.events.emit('TIME_UPDATE', this.timeLeft); });
    
    // --- UI ---
    // Removed Phaser UI text in favor of React HUD
    
    // --- TIMER ---
    this.timeLeft = 180; // 3 minutes
    this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: this.updateTimer,
        callbackScope: this,
        loop: true
    });
    this.gameOver = false;
  }

  update(time, delta) {
    if (this.isPaused || this.gameOver) return;

    if (time > this.lastUpdate + UPDATE_INTERVAL) {
        this.moveSnakes();
        this.lastUpdate = time;
    }
  }

  updateTimer() {
    if (this.gameOver) return;
    
    this.timeLeft--;
    this.game.events.emit('TIME_UPDATE', this.timeLeft);

    if (this.timeLeft <= 0) {
        this.endGame();
    }
  }

  endGame() {
    this.gameOver = true;
    this.timerEvent.remove();
    
    const scores = [];
    this.snakes.forEach(snake => {
        scores.push({
            id: snake.id,
            nickname: snake.nickname,
            score: snake.score,
            color: '#' + snake.color.toString(16).padStart(6, '0')
        });
    });
    scores.sort((a, b) => b.score - a.score);
    
    this.game.events.emit('GAME_OVER', scores);
  }

  addSnake(id, nickname, colorHex, initialScore = 0) {
    if (this.snakes.has(id)) return;

    // Random Start Position
    const startX = Math.floor(Math.random() * (this.scale.width / CELL_SIZE));
    const startY = Math.floor(Math.random() * (this.scale.height / CELL_SIZE));

    let color = 0x00ff00;
    if (colorHex) {
        color = typeof colorHex === 'string' ? parseInt(colorHex.replace(/^#/, ''), 16) : colorHex;
    } else {
        color = PLAYER_COLORS[this.snakes.size % PLAYER_COLORS.length];
    }

    const snake = {
        id,
        nickname,
        color,
        body: [{ x: startX, y: startY }, { x: startX, y: startY + 1 }, { x: startX, y: startY + 2 }],
        direction: { x: 0, y: -1 }, // Moving Up
        nextDirection: { x: 0, y: -1 },
        sprites: [],
        alive: true,
        score: initialScore
    };

    // Create Sprites
    snake.body.forEach(segment => {
        const sprite = this.add.image(segment.x * CELL_SIZE + CELL_SIZE/2, segment.y * CELL_SIZE + CELL_SIZE/2, 'body');
        sprite.setTint(color);
        snake.sprites.push(sprite);
    });

    this.snakes.set(id, snake);
    this.emitScoreUpdate();
  }

  removeSnake(id) {
    if (this.snakes.has(id)) {
        const snake = this.snakes.get(id);
        snake.sprites.forEach(s => s.destroy());
        this.snakes.delete(id);
        this.emitScoreUpdate();
    }
  }

  handleInput(data) {
    const snake = this.snakes.get(data.playerId);
    if (!snake || !snake.alive) return;

    if (data.type === 'DPAD') {
        const { direction } = data;
        // Prevent 180 turns
        if (direction === 'UP' && snake.direction.y === 1) return;
        if (direction === 'DOWN' && snake.direction.y === -1) return;
        if (direction === 'LEFT' && snake.direction.x === 1) return;
        if (direction === 'RIGHT' && snake.direction.x === -1) return;

        switch(direction) {
            case 'UP': snake.nextDirection = { x: 0, y: -1 }; break;
            case 'DOWN': snake.nextDirection = { x: 0, y: 1 }; break;
            case 'LEFT': snake.nextDirection = { x: -1, y: 0 }; break;
            case 'RIGHT': snake.nextDirection = { x: 1, y: 0 }; break;
        }
    }
  }

  moveSnakes() {
    if (this.gameOver) return;

    this.snakes.forEach(snake => {
        if (!snake.alive) return;

        snake.direction = snake.nextDirection;
        const head = snake.body[0];
        const newHead = {
            x: head.x + snake.direction.x,
            y: head.y + snake.direction.y
        };

        // Wall Collision
        if (newHead.x < 0 || newHead.x >= this.scale.width / CELL_SIZE ||
            newHead.y < 0 || newHead.y >= this.scale.height / CELL_SIZE) {
            this.killSnake(snake);
            return;
        }

        // Self Collision
        if (snake.body.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
            this.killSnake(snake);
            return;
        }

        // Other Snake Collision
        let crashed = false;
        this.snakes.forEach(other => {
            if (other.id !== snake.id && other.alive) {
                if (other.body.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                    crashed = true;
                }
            }
        });

        if (crashed) {
            this.killSnake(snake);
            return;
        }

        // Move
        snake.body.unshift(newHead);
        
        // Check Food
        if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
            // Eat Food
            snake.score += 10;
            this.emitScoreUpdate();
            this.spawnFood();
            // Don't pop tail (grow)
        } else {
            snake.body.pop();
        }

        // Update Sprites
        this.updateSnakeVisuals(snake);
    });
  }

  emitScoreUpdate() {
    const scores = [];
    this.snakes.forEach(snake => {
        scores.push({
            id: snake.id,
            nickname: snake.nickname,
            score: snake.score,
            color: '#' + snake.color.toString(16).padStart(6, '0')
        });
    });
    // Sort by score desc
    scores.sort((a, b) => b.score - a.score);
    this.game.events.emit('SCORE_UPDATE', scores);
  }

  updateSnakeVisuals(snake) {
    // Add new sprites if needed
    while (snake.sprites.length < snake.body.length) {
        const sprite = this.add.image(0, 0, 'body');
        sprite.setTint(snake.color);
        snake.sprites.push(sprite);
    }
    // Remove extra sprites
    while (snake.sprites.length > snake.body.length) {
        snake.sprites.pop().destroy();
    }

    // Update positions
    snake.body.forEach((segment, index) => {
        const sprite = snake.sprites[index];
        sprite.setPosition(segment.x * CELL_SIZE + CELL_SIZE/2, segment.y * CELL_SIZE + CELL_SIZE/2);
    });
  }

  killSnake(snake) {
    snake.alive = false;
    snake.sprites.forEach(s => s.setAlpha(0.3));
    
    // Respawn after delay
    this.time.delayedCall(2000, () => {
        const currentScore = snake.score;
        this.removeSnake(snake.id);
        this.addSnake(snake.id, snake.nickname, snake.color, currentScore);
    });
  }

  spawnFood() {
    if (this.foodSprite) this.foodSprite.destroy();

    let valid = false;
    let x, y;
    while (!valid) {
        x = Math.floor(Math.random() * (this.scale.width / CELL_SIZE));
        y = Math.floor(Math.random() * (this.scale.height / CELL_SIZE));
        
        valid = true;
        this.snakes.forEach(snake => {
            if (snake.body.some(s => s.x === x && s.y === y)) valid = false;
        });
    }

    this.food = { x, y };
    this.foodSprite = this.add.image(x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2, 'food');
    
    // Pulse Effect
    this.tweens.add({
        targets: this.foodSprite,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
  }
}
