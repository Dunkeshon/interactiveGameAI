/**
 * Cat Code Quest - Game Engine
 * A gesture-controlled 2D game
 */

// ===== Game Configuration =====
const CONFIG = {
    catSpeed: 2,
    catSize: 80,
    fragmentSize: 40,
    doorWidth: 80,
    doorHeight: 120,
    interactionRadius: 100,
    totalFragments: 5,
    bombSize: 50,
    totalBombs: 8,
    maxLives: 3
};

// ===== Game Classes =====

class Cat {
    constructor(x, y, sprite) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.sprite = sprite;
        this.size = CONFIG.catSize;
        this.facingRight = true;
        this.bobOffset = 0;
        this.bobSpeed = 0.05;
    }
    
    update(direction, canvasWidth, canvasHeight) {
        // Update target based on gesture direction
        if (direction.x !== 0 || direction.y !== 0) {
            this.targetX += direction.x * CONFIG.catSpeed * 2;
            this.targetY += direction.y * CONFIG.catSpeed * 2;
            
            // Update facing direction
            if (direction.x !== 0) {
                this.facingRight = direction.x > 0;
            }
        }
        
        // Clamp to bounds
        const halfSize = this.size / 2;
        this.targetX = Math.max(halfSize, Math.min(canvasWidth - halfSize, this.targetX));
        this.targetY = Math.max(halfSize, Math.min(canvasHeight - halfSize, this.targetY));
        
        // Smooth movement
        this.x += (this.targetX - this.x) * 0.1;
        this.y += (this.targetY - this.y) * 0.1;
        
        // Bobbing animation
        this.bobOffset = Math.sin(Date.now() * this.bobSpeed) * 3;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + this.bobOffset);
        
        // Flip sprite if facing left
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }
        
        // Draw cat sprite
        if (this.sprite && this.sprite.complete) {
            ctx.drawImage(
                this.sprite,
                -this.size / 2,
                -this.size / 2,
                this.size,
                this.size
            );
        } else {
            // Fallback circle
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ff9ebc';
            ctx.fill();
        }
        
        ctx.restore();
    }
}

class CodeFragment {
    constructor(x, y, index) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.size = CONFIG.fragmentSize;
        this.collected = false;
        this.pulseOffset = Math.random() * Math.PI * 2;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.glowIntensity = 0;
    }
    
    update(catX, catY, isInteracting) {
        if (this.collected) return;
        
        const dist = Math.hypot(catX - this.x, catY - this.y);
        
        // Increase glow when cat is nearby
        if (dist < CONFIG.interactionRadius) {
            this.glowIntensity = Math.min(1, this.glowIntensity + 0.1);
            
            // Collect if interacting (open palm)
            if (isInteracting && dist < CONFIG.interactionRadius * 0.7) {
                this.collected = true;
                return true;
            }
        } else {
            this.glowIntensity = Math.max(0, this.glowIntensity - 0.05);
        }
        
        return false;
    }
    
    draw(ctx) {
        if (this.collected) return;
        
        const time = Date.now() * 0.003;
        const pulse = 1 + Math.sin(time + this.pulseOffset) * 0.1;
        const float = Math.sin(time * 0.5 + this.floatOffset) * 5;
        
        ctx.save();
        ctx.translate(this.x, this.y + float);
        
        // Draw glow
        const glowSize = this.size * pulse * (1 + this.glowIntensity * 0.5);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        gradient.addColorStop(0, `rgba(34, 211, 238, ${0.4 + this.glowIntensity * 0.4})`);
        gradient.addColorStop(0.5, `rgba(168, 85, 247, ${0.2 + this.glowIntensity * 0.2})`);
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw code fragment icon
        const iconSize = this.size * 0.6 * pulse;
        ctx.font = `${iconSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 15 + this.glowIntensity * 10;
        ctx.fillText('{ }', 0, 0);
        
        ctx.restore();
    }
}

class Door {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.doorWidth;
        this.height = CONFIG.doorHeight;
        this.isUnlocked = false;
        this.isOpen = false;
        this.openProgress = 0;
    }
    
    unlock() {
        this.isUnlocked = true;
    }
    
    update(catX, catY) {
        if (!this.isUnlocked) return false;
        
        // Check if cat is at the door
        const dist = Math.hypot(catX - this.x, catY - this.y);
        if (dist < this.width) {
            this.isOpen = true;
        }
        
        // Animate door opening
        if (this.isOpen && this.openProgress < 1) {
            this.openProgress += 0.02;
        }
        
        return this.isOpen && this.openProgress >= 1;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw door frame
        const frameWidth = this.width + 20;
        const frameHeight = this.height + 20;
        
        ctx.fillStyle = '#3f3f5a';
        ctx.fillRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
        
        // Draw door
        const doorColor = this.isUnlocked ? '#fbbf24' : '#6b7280';
        const glow = this.isUnlocked ? 'rgba(251, 191, 36, 0.5)' : 'transparent';
        
        ctx.shadowColor = glow;
        ctx.shadowBlur = 20;
        
        // Animate door opening (swing effect)
        if (this.openProgress > 0) {
            ctx.save();
            ctx.translate(-this.width / 2, 0);
            ctx.scale(1 - this.openProgress * 0.8, 1);
            ctx.translate(this.width / 2, 0);
        }
        
        ctx.fillStyle = doorColor;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Draw lock/unlock indicator
        const indicatorY = 0;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.isUnlocked ? '#1a1a2e' : '#9ca3af';
        ctx.fillText(this.isUnlocked ? '🔓' : '🔒', 0, indicatorY);
        
        if (this.openProgress > 0) {
            ctx.restore();
        }
        
        ctx.restore();
    }
}

class Bomb {
    constructor(x, y, index, sprite) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.sprite = sprite;
        this.size = CONFIG.bombSize;
        this.touched = false;
        this.pulseOffset = Math.random() * Math.PI * 2;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.warningIntensity = 0;
    }
    
    update(catX, catY) {
        if (this.touched) return false;
        
        const dist = Math.hypot(catX - this.x, catY - this.y);
        
        // Check collision with cat
        if (dist < this.size * 1.5) {
            this.touched = true;
            return true; // Signal collision
        }
        
        // Increase warning glow when cat is nearby
        if (dist < CONFIG.interactionRadius * 1.5) {
            this.warningIntensity = Math.min(1, this.warningIntensity + 0.1);
        } else {
            this.warningIntensity = Math.max(0, this.warningIntensity - 0.05);
        }
        
        return false;
    }
    
    draw(ctx) {
        if (this.touched) return;
        
        const time = Date.now() * 0.003;
        const pulse = 1 + Math.sin(time + this.pulseOffset) * 0.08;
        const float = Math.sin(time * 0.5 + this.floatOffset) * 4;
        
        ctx.save();
        ctx.translate(this.x, this.y + float);
        
        // Draw warning glow around bomb
        if (this.warningIntensity > 0.2) {
            const glowSize = this.size * 0.8 * (1 + this.warningIntensity * 0.6);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            gradient.addColorStop(0, `rgba(239, 68, 68, ${0.3 + this.warningIntensity * 0.3})`);
            gradient.addColorStop(0.5, `rgba(220, 38, 38, ${0.1 + this.warningIntensity * 0.2})`);
            gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
            
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        // Draw SVG bomb sprite with pulse animation
        ctx.scale(pulse, pulse);
        if (this.sprite && this.sprite.complete) {
            ctx.drawImage(
                this.sprite,
                -this.size / 2,
                -this.size / 2,
                this.size,
                this.size
            );
        } else {
            // Fallback if sprite not loaded
            ctx.fillStyle = '#384C59';
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.time = 0;
        this.duration = 0.5; // seconds
    }
    
    update() {
        this.time += 1 / 60; // Assume 60 FPS
        return this.time >= this.duration;
    }
    
    draw(ctx) {
        const progress = this.time / this.duration;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Outer blast wave
        const outerRadius = 150 * progress;
        const outerAlpha = Math.max(0, 1 - progress);
        
        const outerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
        outerGradient.addColorStop(0, `rgba(251, 191, 36, ${outerAlpha * 0.6})`);
        outerGradient.addColorStop(0.5, `rgba(239, 68, 68, ${outerAlpha * 0.4})`);
        outerGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = outerGradient;
        ctx.fill();
        
        // Inner flame burst
        const innerRadius = 80 * (1 - progress);
        const innerAlpha = Math.max(0, 1 - progress * 1.5);
        
        ctx.fillStyle = `rgba(255, 107, 157, ${innerAlpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Spark particles
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const distance = 120 * progress;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            const sparkSize = 8 * (1 - progress);
            ctx.fillStyle = `rgba(251, 191, 36, ${(1 - progress) * 0.7})`;
            ctx.beginPath();
            ctx.arc(x, y, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}


class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mediapipe = new MediaPipeHandler();
        
        this.cat = null;
        this.fragments = [];
        this.bombs = [];
        this.explosions = [];
        this.door = null;
        this.collectedCount = 0;
        this.lives = CONFIG.maxLives;
        this.gameWon = false;
        this.gameLost = false;
        
        this.isRunning = false;
        
        // UI Elements
        this.fragmentCountEl = document.getElementById('fragmentCount');
        this.gestureStatusEl = document.getElementById('gestureStatus');
        this.victoryScreen = document.getElementById('victoryScreen');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.restartBtn = document.getElementById('restartBtn');
        this.livesEl = document.getElementById('lives');
        
        // Load cat sprite
        this.catSprite = new Image();
        this.catSprite.src = 'dunkeshon_simle_2d_cat_caracter_--ar_43_--profile_rj7bfu1_--v_a1df40df-3922-4cdb-8b19-c3b01efaebfa_2.png';
        
        // Load bomb sprite
        this.bombSprite = new Image();
        this.bombSprite.src = 'bomb.svg';
        
        this.init();
    }
    
    async init() {
        // Setup canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize MediaPipe
        const videoElement = document.getElementById('webcam');
        const handCanvas = document.getElementById('handCanvas');
        
        try {
            await this.mediapipe.initialize(videoElement, handCanvas, () => {
                this.loadingScreen.classList.add('hidden');
                this.startGame();
            });
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
            this.loadingScreen.querySelector('.loading-text').textContent = 'Camera access denied';
            this.loadingScreen.querySelector('.loading-subtext').textContent = 'Please allow camera access and refresh';
        }
        
        // Restart button
        this.restartBtn.addEventListener('click', () => this.restartGame());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    startGame() {
        this.setupLevel();
        this.isRunning = true;
        this.gameLoop();
    }
    
    setupLevel() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Create cat at center-left
        this.cat = new Cat(w * 0.15, h * 0.5, this.catSprite);
        
        // Create door at right side
        this.door = new Door(w * 0.9, h * 0.5);
        
        // Create code fragments scattered around
        this.fragments = [];
        const fragmentPositions = [
            { x: w * 0.3, y: h * 0.3 },
            { x: w * 0.5, y: h * 0.7 },
            { x: w * 0.4, y: h * 0.5 },
            { x: w * 0.7, y: h * 0.35 },
            { x: w * 0.65, y: h * 0.65 }
        ];
        
        for (let i = 0; i < CONFIG.totalFragments; i++) {
            this.fragments.push(new CodeFragment(
                fragmentPositions[i].x,
                fragmentPositions[i].y,
                i
            ));
        }
        
        // Create bombs scattered around
        this.bombs = [];
        const bombPositions = [
            { x: w * 0.25, y: h * 0.3 },
            { x: w * 0.75, y: h * 0.25 },
            { x: w * 0.55, y: h * 0.4 },
            { x: w * 0.3, y: h * 0.65 },
            { x: w * 0.85, y: h * 0.7 },
            { x: w * 0.65, y: h * 0.75 },
            { x: w * 0.4, y: h * 0.2 },
            { x: w * 0.7, y: h * 0.55 }
        ];
        
        for (let i = 0; i < CONFIG.totalBombs; i++) {
            this.bombs.push(new Bomb(
                bombPositions[i].x,
                bombPositions[i].y,
                i,
                this.bombSprite
            ));
        }
        
        this.explosions = [];
        this.collectedCount = 0;
        this.lives = CONFIG.maxLives;
        this.gameWon = false;
        this.gameLost = false;
        this.updateUI();
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        if (this.gameWon || this.gameLost) return;
        
        const gesture = this.mediapipe.getGestureState();
        
        // Update gesture UI
        this.updateGestureUI(gesture);
        
        // Update cat (stop movement when interacting or no hand detected)
        const shouldMove = gesture.handDetected && !gesture.isInteracting;
        const moveDirection = shouldMove ? gesture.direction : { x: 0, y: 0 };
        this.cat.update(moveDirection, this.canvas.width, this.canvas.height);
        
        // Update fragments
        for (const fragment of this.fragments) {
            if (fragment.update(this.cat.x, this.cat.y, gesture.isInteracting)) {
                this.collectedCount++;
                this.updateUI();
                
                // Check if all fragments collected
                if (this.collectedCount >= CONFIG.totalFragments) {
                    this.door.unlock();
                }
            }
        }
        
        // Update bombs and check collisions
        for (const bomb of this.bombs) {
            if (bomb.update(this.cat.x, this.cat.y)) {
                // Bomb touched!
                this.explosions.push(new Explosion(bomb.x, bomb.y));
                this.lives--;
                this.updateUI();
                
                if (this.lives <= 0) {
                    this.loseGame();
                }
            }
        }
        
        // Update explosions
        this.explosions = this.explosions.filter(explosion => !explosion.update());
        
        // Update door
        if (this.door.update(this.cat.x, this.cat.y)) {
            this.winGame();
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background gradient
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
        );
        gradient.addColorStop(0, '#1a1a3a');
        gradient.addColorStop(1, '#0a0a1a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw subtle grid
        this.drawGrid();
        
        // Draw door
        this.door.draw(this.ctx);
        
        // Draw fragments
        for (const fragment of this.fragments) {
            fragment.draw(this.ctx);
        }
        
        // Draw bombs
        for (const bomb of this.bombs) {
            bomb.draw(this.ctx);
        }
        
        // Draw explosions
        for (const explosion of this.explosions) {
            explosion.draw(this.ctx);
        }
        
        // Draw cat
        this.cat.draw(this.ctx);
    }
    
    drawGrid() {
        const gridSize = 80;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    updateUI() {
        this.fragmentCountEl.textContent = `${this.collectedCount} / ${CONFIG.totalFragments}`;
        
        // Update lives display
        if (this.livesEl) {
            let heartsHTML = '';
            for (let i = 0; i < CONFIG.maxLives; i++) {
                if (i < this.lives) {
                    heartsHTML += '<span class="heart">❤️</span>';
                } else {
                    heartsHTML += '<span class="heart empty">🖤</span>';
                }
            }
            this.livesEl.innerHTML = heartsHTML;
        }
    }
    
    updateGestureUI(gesture) {
        this.gestureStatusEl.classList.remove('active', 'interacting');
        
        if (!gesture.handDetected) {
            this.gestureStatusEl.innerHTML = `
                <span class="gesture-icon">✋</span>
                <span class="gesture-text">Show your hand</span>
            `;
        } else if (gesture.isInteracting) {
            this.gestureStatusEl.classList.add('active', 'interacting');
            this.gestureStatusEl.innerHTML = `
                <span class="gesture-icon">🖐️</span>
                <span class="gesture-text">Interacting!</span>
            `;
        } else {
            this.gestureStatusEl.classList.add('active');
            const dirText = this.getDirectionText(gesture.direction);
            this.gestureStatusEl.innerHTML = `
                <span class="gesture-icon">👆</span>
                <span class="gesture-text">${dirText}</span>
            `;
        }
    }
    
    getDirectionText(dir) {
        if (Math.abs(dir.x) < 0.3 && Math.abs(dir.y) < 0.3) return 'Point to move';
        
        let text = '';
        if (dir.y < -0.3) text += 'Up';
        else if (dir.y > 0.3) text += 'Down';
        
        if (dir.x < -0.3) text += text ? '-Left' : 'Left';
        else if (dir.x > 0.3) text += text ? '-Right' : 'Right';
        
        return text || 'Moving';
    }
    
    loseGame() {
        this.gameLost = true;
        const lossScreen = document.getElementById('victoryScreen');
        lossScreen.classList.remove('hidden');
        lossScreen.innerHTML = `
            <div class="victory-content">
                <h1 class="victory-title">💥 Game Over!</h1>
                <p class="victory-text">The cat hit all the bombs!</p>
                <p class="victory-subtext">Try again and avoid the explosions</p>
                <button id="restartBtn" class="restart-btn">Play Again</button>
            </div>
        `;
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
    }
    
    winGame() {
        this.gameWon = true;
        this.victoryScreen.classList.remove('hidden');
    }
    
    restartGame() {
        this.victoryScreen.classList.add('hidden');
        this.setupLevel();
    }
}

// ===== Start Game on Load =====
window.addEventListener('load', () => {
    new Game();
});
