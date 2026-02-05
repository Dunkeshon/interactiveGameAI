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

class Heart {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = -Math.random() * 2 - 1;
        this.age = 0;
        this.lifetime = 60; // frames
        this.scale = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.age++;
        
        // Fade out and shrink
        this.scale = 1 - (this.age / this.lifetime);
    }

    draw(ctx) {
        const progress = this.age / this.lifetime;
        const opacity = 1 - progress;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = opacity;
        ctx.scale(this.scale, this.scale);
        
        // Draw pink heart shape
        const size = 8;
        ctx.fillStyle = '#ff6b9d';
        ctx.beginPath();
        
        // Heart shape
        ctx.moveTo(0, -size * 0.5);
        ctx.bezierCurveTo(-size, -size, -size, 0, 0, size * 0.7);
        ctx.bezierCurveTo(size, 0, size, -size, 0, -size * 0.5);
        ctx.closePath();
        
        ctx.fill();
        
        // Add glow
        ctx.strokeStyle = `rgba(255, 107, 157, ${opacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }

    isAlive() {
        return this.age < this.lifetime;
    }
}

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
        
        // Squash and stretch animation
        this.velocityX = 0;
        this.velocityY = 0;
        this.squashX = 1;
        this.squashY = 1;
        
        // Hearts animation
        this.hearts = [];
        this.heartSpawnCounter = 0;
    }
    
    update(direction, canvasWidth, canvasHeight) {
        // Store previous position for velocity calculation
        const prevX = this.x;
        const prevY = this.y;
        
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
        
        // Calculate velocity for squash/stretch
        this.velocityX = this.x - prevX;
        this.velocityY = this.y - prevY;
        
        // Squash and stretch based on velocity
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const maxStretch = 0.1; // Maximum stretch amount
        const stretchFactor = Math.min(speed / 5, maxStretch);
        
        // Calculate stretch direction
        if (speed > 0.5) {
            // Stretch in movement direction, squash perpendicular
            const angle = Math.atan2(this.velocityY, this.velocityX);
            const targetStretchX = 1 + stretchFactor * Math.abs(Math.cos(angle));
            const targetStretchY = 1 + stretchFactor * Math.abs(Math.sin(angle));
            const targetSquashX = 1 - stretchFactor * 0.5 * Math.abs(Math.sin(angle));
            const targetSquashY = 1 - stretchFactor * 0.5 * Math.abs(Math.cos(angle));
            
            // Horizontal movement: stretch X, squash Y
            // Vertical movement: stretch Y, squash X
            if (Math.abs(this.velocityX) > Math.abs(this.velocityY)) {
                this.squashX += (targetStretchX - this.squashX) * 0.3;
                this.squashY += (targetSquashX - this.squashY) * 0.3;
            } else {
                this.squashX += (targetSquashY - this.squashX) * 0.3;
                this.squashY += (targetStretchY - this.squashY) * 0.3;
            }
        } else {
            // Return to normal shape
            this.squashX += (1 - this.squashX) * 0.15;
            this.squashY += (1 - this.squashY) * 0.15;
        }
        
        // Spawn hearts when running
        if (speed > 0.5) {
            this.heartSpawnCounter++;
            if (this.heartSpawnCounter >= 3) {
                // Spawn a heart at a random offset from the cat
                const offsetDistance = this.size * 0.5;
                const offsetAngle = Math.random() * Math.PI * 2;
                const heartX = this.x + Math.cos(offsetAngle) * offsetDistance;
                const heartY = this.y + Math.sin(offsetAngle) * offsetDistance;
                this.hearts.push(new Heart(heartX, heartY));
                this.heartSpawnCounter = 0;
            }
        } else {
            this.heartSpawnCounter = 0;
        }
        
        // Update hearts
        this.hearts = this.hearts.filter(heart => {
            heart.update();
            return heart.isAlive();
        });
        
        // Bobbing animation
        this.bobOffset = Math.sin(Date.now() * this.bobSpeed) * 3;
    }
    
    draw(ctx) {
        // Draw hearts first (behind the cat)
        for (const heart of this.hearts) {
            heart.draw(ctx);
        }
        
        ctx.save();
        ctx.translate(this.x, this.y + this.bobOffset);
        
        // Apply squash and stretch
        ctx.scale(this.squashX, this.squashY);
        
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
    constructor(x, y, index, sprite) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.sprite = sprite;
        this.size = CONFIG.fragmentSize;
        this.collected = false;
        this.pulseOffset = Math.random() * Math.PI * 2;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.glowIntensity = 0;
    }
    
    update(catX, catY, isInteracting) {
        if (this.collected) return;
        
        const dist = Math.hypot(catX - this.x, catY - this.y);
        
        // Increase glow when cat is nearby (bigger detection radius)
        if (dist < CONFIG.interactionRadius * 1.5) {
            this.glowIntensity = Math.min(1, this.glowIntensity + 0.1);
            
            // Collect if interacting (open palm) - bigger collision radius
            if (isInteracting && dist < CONFIG.interactionRadius * 1.2) {
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
        gradient.addColorStop(0, `rgba(251, 191, 36, ${0.2 + this.glowIntensity * 0.2})`);
        gradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.1 + this.glowIntensity * 0.1})`);
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw key sprite
        ctx.scale(pulse, pulse);
        if (this.sprite && this.sprite.complete) {
            const keySize = this.size * 1.2;
            ctx.drawImage(
                this.sprite,
                -keySize / 2,
                -keySize / 2,
                keySize,
                keySize
            );
        } else {
            // Fallback: draw a simple key shape
            ctx.fillStyle = '#ffd56bff';
            ctx.shadowColor = '#ffd56bff';
            ctx.shadowBlur = 15 + this.glowIntensity * 10;
            ctx.font = `${this.size * 0.6}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔑', 0, 0);
        }
        
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
        
        // Draw wall/frame
        const frameWidth = this.width + 40;
        const frameHeight = this.height + 40;
        
        // Wall background with stone texture
        const wallGradient = ctx.createLinearGradient(-frameWidth / 2, -frameHeight / 2, -frameWidth / 2, frameHeight / 2);
        wallGradient.addColorStop(0, '#2a2a3e');
        wallGradient.addColorStop(0.5, '#1f1f2e');
        wallGradient.addColorStop(1, '#2a2a3e');
        ctx.fillStyle = wallGradient;
        ctx.fillRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
        
        // Stone texture pattern
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = -frameWidth / 2; i < frameWidth / 2; i += 15) {
            ctx.beginPath();
            ctx.moveTo(i, -frameHeight / 2);
            ctx.lineTo(i, frameHeight / 2);
            ctx.stroke();
        }
        for (let i = -frameHeight / 2; i < frameHeight / 2; i += 15) {
            ctx.beginPath();
            ctx.moveTo(-frameWidth / 2, i);
            ctx.lineTo(frameWidth / 2, i);
            ctx.stroke();
        }
        
        // Door frame (wooden)
        ctx.fillStyle = '#8b6f47';
        ctx.fillRect(-this.width / 2 - 8, -this.height / 2 - 8, this.width + 16, this.height + 16);
        
        // Door frame shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-this.width / 2 - 8, -this.height / 2 - 8, this.width + 16, 8);
        
        // Door main panel
        const doorColor = this.isUnlocked ? '#d4a574' : '#8b6f47';
        const doorGradient = ctx.createLinearGradient(-this.width / 2, -this.height / 2, this.width / 2, -this.height / 2);
        doorGradient.addColorStop(0, '#6b5835');
        doorGradient.addColorStop(0.5, doorColor);
        doorGradient.addColorStop(1, '#6b5835');
        
        // Animate door opening (swing effect)
        if (this.openProgress > 0) {
            ctx.save();
            ctx.translate(-this.width / 2, 0);
            ctx.scale(1 - this.openProgress * 0.85, 1);
            ctx.translate(this.width / 2, 0);
        }
        
        ctx.fillStyle = doorGradient;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Door panels (detail lines)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        // Vertical panel dividers
        ctx.beginPath();
        ctx.moveTo(-this.width / 4, -this.height / 2 + 10);
        ctx.lineTo(-this.width / 4, this.height / 2 - 10);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.width / 4, -this.height / 2 + 10);
        ctx.lineTo(this.width / 4, this.height / 2 - 10);
        ctx.stroke();
        
        // Horizontal panel dividers
        ctx.beginPath();
        ctx.moveTo(-this.width / 2 + 10, -this.height / 4);
        ctx.lineTo(this.width / 2 - 10, -this.height / 4);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-this.width / 2 + 10, this.height / 4);
        ctx.lineTo(this.width / 2 - 10, this.height / 4);
        ctx.stroke();
        
        // Door handle (brass knob)
        const handleX = this.width / 2 - 20;
        const handleY = 0;
        
        // Handle glow when unlocked
        if (this.isUnlocked) {
            const handleGlow = ctx.createRadialGradient(handleX, handleY, 0, handleX, handleY, 15);
            handleGlow.addColorStop(0, 'rgba(251, 191, 36, 0.6)');
            handleGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.fillStyle = handleGlow;
            ctx.beginPath();
            ctx.arc(handleX, handleY, 15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Handle knob
        const handleGradient = ctx.createRadialGradient(handleX - 3, handleY - 3, 0, handleX, handleY, 8);
        handleGradient.addColorStop(0, '#ffd700');
        handleGradient.addColorStop(0.7, '#daa520');
        handleGradient.addColorStop(1, '#b8860b');
        ctx.fillStyle = handleGradient;
        ctx.beginPath();
        ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Handle shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(handleX + 2, handleY + 2, 6, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.openProgress > 0) {
            ctx.restore();
        }
        
        // Glow when unlocked
        if (this.isUnlocked) {
            ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 * (1 - this.openProgress)})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(-this.width / 2 - 12, -this.height / 2 - 12, this.width + 24, this.height + 24);
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
        
        // Background Music
        this.bgMusic = document.getElementById('bgMusic');
        this.bgMusic.volume = 0.5; // Set volume to 50%
        
        // Win Sound
        this.winSound = document.getElementById('winSound');
        this.winSound.volume = 0.7; // Set volume to 70%
        
        // Bomb Sound
        this.bombSound = document.getElementById('bombSound');
        this.bombSound.volume = 0.6; // Set volume to 60%
        
        // Collect Sound
        this.collectSound = document.getElementById('collectSound');
        this.collectSound.volume = 0.6; // Set volume to 60%
        
        // Load cat sprite
        this.catSprite = new Image();
        this.catSprite.src = 'cat_sprite.png';
        
        // Load bomb sprite
        this.bombSprite = new Image();
        this.bombSprite.src = 'bomb.svg';
        
        // Load key sprite
        this.keySprite = new Image();
        this.keySprite.src = 'Key.svg';
        
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
    
    getRandomPosition(canvasWidth, canvasHeight, usedPositions, minDistance) {
        const margin = 100; // Keep away from edges
        const catSafeZone = 150; // Keep away from cat starting position
        const doorSafeZone = 120; // Keep away from door
        const uiPadding = 30; // Extra padding around UI elements
        
        // Define UI exclusion zones (rectangles)
        // Format: { x, y, width, height } where x,y is top-left corner
        const uiExclusionZones = [
            // Camera panel: top-right, 240x180px, positioned at right:20px, top:20px
            { x: canvasWidth - 260 - uiPadding, y: 0, width: 260 + uiPadding, height: 200 + uiPadding },
            
            // Top-left UI panel (Lives): approximately 150x60px at left:20px, top:20px
            { x: 0, y: 0, width: 170 + uiPadding, height: 80 + uiPadding },
            
            // Top-center UI panel (Keys): approximately 200x60px centered at top:20px
            { x: (canvasWidth - 220) / 2 - uiPadding, y: 0, width: 220 + uiPadding * 2, height: 80 + uiPadding },
            
            // Top-right gesture indicator: 240px wide, positioned below camera at top:220px, right:20px
            { x: canvasWidth - 260 - uiPadding, y: 200, width: 260 + uiPadding, height: 100 + uiPadding },
            
            // Bottom-center instructions panel: approximately 350x80px centered at bottom:20px
            { x: (canvasWidth - 370) / 2 - uiPadding, y: canvasHeight - 100 - uiPadding, width: 370 + uiPadding * 2, height: 100 + uiPadding }
        ];
        
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            const x = margin + Math.random() * (canvasWidth - margin * 2);
            const y = margin + Math.random() * (canvasHeight - margin * 2);
            
            // Check if too close to cat starting position
            const catStartX = canvasWidth * 0.15;
            const catStartY = canvasHeight * 0.5;
            if (Math.hypot(x - catStartX, y - catStartY) < catSafeZone) {
                attempts++;
                continue;
            }
            
            // Check if too close to door
            const doorX = canvasWidth * 0.9;
            const doorY = canvasHeight * 0.5;
            if (Math.hypot(x - doorX, y - doorY) < doorSafeZone) {
                attempts++;
                continue;
            }
            
            // Check if inside any UI exclusion zone
            let insideExclusionZone = false;
            for (const zone of uiExclusionZones) {
                if (x >= zone.x && x <= zone.x + zone.width &&
                    y >= zone.y && y <= zone.y + zone.height) {
                    insideExclusionZone = true;
                    break;
                }
            }
            
            if (insideExclusionZone) {
                attempts++;
                continue;
            }
            
            // Check if too close to other positions
            let tooClose = false;
            for (const pos of usedPositions) {
                if (Math.hypot(x - pos.x, y - pos.y) < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                return { x, y };
            }
            
            attempts++;
        }
        
        // Fallback: return a random position anyway (but still try to avoid UI)
        // Use a position in the center-left area which is typically clear
        return {
            x: canvasWidth * 0.3 + Math.random() * (canvasWidth * 0.3),
            y: canvasHeight * 0.3 + Math.random() * (canvasHeight * 0.4)
        };
    }
    
    startGame() {
        this.setupLevel();
        this.isRunning = true;
        
        // Start background music
        this.bgMusic.play().catch(error => {
            console.log('Could not autoplay music:', error);
        });
        
        this.gameLoop();
    }
    
    setupLevel() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Create cat at center-left
        this.cat = new Cat(w * 0.15, h * 0.5, this.catSprite);
        
        // Create door at right side (moved down)
        this.door = new Door(w * 0.9, h * 0.62);
        
        // Create code fragments at random positions
        this.fragments = [];
        const usedPositions = [];
        
        for (let i = 0; i < CONFIG.totalFragments; i++) {
            const pos = this.getRandomPosition(w, h, usedPositions, 100);
            usedPositions.push(pos);
            this.fragments.push(new CodeFragment(pos.x, pos.y, i, this.keySprite));
        }
        
        // Create bombs at random positions
        this.bombs = [];
        
        for (let i = 0; i < CONFIG.totalBombs; i++) {
            const pos = this.getRandomPosition(w, h, usedPositions, 80);
            usedPositions.push(pos);
            this.bombs.push(new Bomb(pos.x, pos.y, i, this.bombSprite));
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
                
                // Play collect sound
                this.collectSound.currentTime = 0;
                this.collectSound.play().catch(error => {
                    console.log('Could not play collect sound:', error);
                });
                
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
                
                // Play bomb hit sound
                this.bombSound.currentTime = 0;
                this.bombSound.play().catch(error => {
                    console.log('Could not play bomb sound:', error);
                });
                
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
        this.bgMusic.pause();
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
        this.bgMusic.pause();
        
        // Play win sound
        this.winSound.currentTime = 0;
        this.winSound.play().catch(error => {
            console.log('Could not play win sound:', error);
        });
        
        this.victoryScreen.classList.remove('hidden');
    }
    
    restartGame() {
        this.victoryScreen.classList.add('hidden');
        
        // Stop win sound
        this.winSound.pause();
        this.winSound.currentTime = 0;
        
        // Reset and play background music
        this.bgMusic.currentTime = 0;
        this.setupLevel();
        this.isRunning = true;
        
        // Resume music
        this.bgMusic.play().catch(error => {
            console.log('Could not play music:', error);
        });
    }
}

// ===== Start Game on Load =====
window.addEventListener('load', () => {
    new Game();
});
