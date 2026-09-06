/**
 * Game Entities for Prime Split Shooter:
 * Bullet, Bubble (Grid & Falling states), Particle, FloatingText, LightningArc
 */

import { MathUtil, PRIME_COLORS } from './math_util.js';
import { Physics } from './physics.js';

export class Bullet {
    constructor(x, y, vx, vy, primeValue, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.primeValue = primeValue;
        this.radius = options.radius || 14;
        this.isPiercing = options.isPiercing || false;
        this.bouncesRemaining = options.bounces !== undefined ? options.bounces : 2;
        this.colorInfo = PRIME_COLORS[primeValue] || PRIME_COLORS.DEFAULT;
        this.active = true;
        this.trail = [];
        this.hitBubbles = new Set();
    }

    update(width, height) {
        if (!this.active) return;

        this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
        if (this.trail.length > 8) this.trail.shift();
        this.trail.forEach(t => t.alpha *= 0.75);

        this.x += this.vx;
        this.y += this.vy;

        // Side wall bounce
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.vx = -this.vx;
            this.bouncesRemaining--;
        } else if (this.x + this.radius >= width) {
            this.x = width - this.radius;
            this.vx = -this.vx;
            this.bouncesRemaining--;
        }

        // Out of bounds check
        if (this.y < -50 || this.y > height + 80 || this.bouncesRemaining < 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            ctx.save();
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.radius * (0.3 + 0.6 * (i / this.trail.length)), 0, Math.PI * 2);
            ctx.fillStyle = this.colorInfo.glow;
            ctx.globalAlpha = t.alpha * 0.5;
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        const grad = ctx.createRadialGradient(
            this.x - this.radius * 0.3, this.y - this.radius * 0.3, 2,
            this.x, this.y, this.radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, this.colorInfo.main);
        grad.addColorStop(1, this.colorInfo.dark);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        if (this.isPiercing) {
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.max(11, Math.floor(this.radius * 1.05))}px 'Orbitron', 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.primeValue, this.x, this.y + 1);

        ctx.restore();
    }
}

export class Bubble {
    constructor(x, y, value, type = 'normal', row = 0, col = 0, customRadius = null) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.row = row;
        this.col = col;

        this.value = value;
        this.originalValue = value;
        this.type = type; // 'normal', 'obstacle', 'prime_shield', 'item_catalyst', 'item_clock', 'item_sieve', 'item_bomb'

        this.radius = customRadius || Physics.GRID_RADIUS;
        this.targetRadius = this.radius;

        this.wobblePhase = Math.random() * Math.PI * 2;
        this.flashTimer = 0;
        this.dead = false;
        this.isFalling = false; // Avalanche state
        this.fallRot = 0;
        this.fallRotSpeed = (Math.random() - 0.5) * 0.1;

        this.updateColor();
    }

    updateColor() {
        if (this.type === 'obstacle') {
            this.colorInfo = PRIME_COLORS.ITEM_OBSTACLE || { main: '#78909c', glow: 'rgba(120, 144, 156, 0.5)', dark: '#263238', name: '阻礙泡泡' };
        } else if (this.type === 'item_catalyst') {
            this.colorInfo = PRIME_COLORS.ITEM_CATALYST;
        } else if (this.type === 'item_clock') {
            this.colorInfo = PRIME_COLORS.ITEM_CLOCK;
        } else if (this.type === 'item_sieve') {
            this.colorInfo = PRIME_COLORS.ITEM_SIEVE;
        } else if (this.type === 'item_bomb') {
            this.colorInfo = PRIME_COLORS.ITEM_BOMB;
        } else if (this.type === 'prime_shield') {
            this.colorInfo = PRIME_COLORS.PRIME_SHIELD;
        } else {
            this.colorInfo = MathUtil.getColorForNumber(this.value);
        }
    }

    setValue(newVal) {
        this.value = newVal;
        this.flashTimer = 8;
        this.updateColor();
    }

    startAvalanche() {
        this.isFalling = true;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = Math.random() * 2 + 1;
    }

    update(width, height, speedMultiplier = 1.0) {
        this.wobblePhase += 0.04;
        if (this.flashTimer > 0) this.flashTimer--;

        if (this.isFalling) {
            // Drop with gravity
            this.vy += 0.35 * speedMultiplier;
            this.x += this.vx * speedMultiplier;
            this.y += this.vy * speedMultiplier;
            this.fallRot += this.fallRotSpeed;

            if (this.y > height + 60) {
                this.dead = true;
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;

        ctx.save();

        if (this.isFalling) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.fallRot);
            ctx.translate(-this.x, -this.y);
        }

        const isFlashing = this.flashTimer > 0;
        const currentR = this.radius;

        // High-contrast, glare-free bubble rendering
        if (isFlashing) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentR, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        } else if (this.type === 'obstacle') {
            const grad = ctx.createRadialGradient(
                this.x, this.y, currentR * 0.15,
                this.x, this.y, currentR
            );
            grad.addColorStop(0, '#455a64');
            grad.addColorStop(0.7, '#263238');
            grad.addColorStop(1, '#0f171c');

            ctx.beginPath();
            ctx.arc(this.x, this.y, currentR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.lineWidth = 3;
            ctx.strokeStyle = '#90a4ae';
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const obstacleEmojiSize = Math.round(26 * (currentR / 36));
            ctx.font = `${obstacleEmojiSize}px sans-serif`;
            ctx.fillText('🧱', this.x, this.y + 2);

            ctx.restore();
            return;
        } else {
            // Concentric gradient: dark center for maximum number contrast, glowing neon perimeter
            const grad = ctx.createRadialGradient(
                this.x, this.y, currentR * 0.15,
                this.x, this.y, currentR
            );
            grad.addColorStop(0, 'rgba(10, 15, 26, 0.94)');
            grad.addColorStop(0.65, this.colorInfo.dark || '#1e293b');
            grad.addColorStop(1, this.colorInfo.main);

            ctx.beginPath();
            ctx.arc(this.x, this.y, currentR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Crisp neon rim (matches bubble type)
        ctx.lineWidth = (this.type === 'prime_shield') ? 3.5 : 2.5;
        ctx.strokeStyle = (this.type === 'prime_shield') ? '#ff1744' : this.colorInfo.main;
        ctx.stroke();

        // Special icon or number rendering
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const iconScale = currentR / 36;
        if (this.type === 'item_catalyst') {
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            const catFont = Math.round(25 * iconScale);
            ctx.font = `bold ${catFont}px "Orbitron", sans-serif`;
            ctx.strokeText('+1', this.x, this.y + 1);
            ctx.fillText('+1', this.x, this.y + 1);
        } else if (this.type === 'item_clock') {
            ctx.font = `${Math.round(27 * iconScale)}px sans-serif`;
            ctx.fillText('⏳', this.x, this.y + 1);
        } else if (this.type === 'item_sieve') {
            ctx.font = `${Math.round(27 * iconScale)}px sans-serif`;
            ctx.fillText('⚡', this.x, this.y + 1);
        } else if (this.type === 'item_bomb') {
            ctx.font = `${Math.round(27 * iconScale)}px sans-serif`;
            ctx.fillText('💣', this.x, this.y + 1);
        } else {
            // Number Bubble - razor-sharp high contrast text with dark outline
            const displayVal = this.value;
            let baseSize = 29;
            if (displayVal >= 1000) baseSize = 19;
            else if (displayVal >= 100) baseSize = 22;
            else if (displayVal >= 10) baseSize = 25;
            const fontSize = Math.max(14, Math.round(baseSize * iconScale));

            ctx.font = `900 ${fontSize}px 'Orbitron', 'Inter', monospace`;
            ctx.lineWidth = Math.max(2.5, 3.5 * iconScale);
            ctx.strokeStyle = '#050a14';
            ctx.strokeText(displayVal, this.x, this.y + 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayVal, this.x, this.y + 1);

            // Prime Shield badge indicator without factor breakdown
            if (this.type === 'prime_shield') {
                ctx.fillStyle = '#ff8099';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                const shieldFont = Math.max(9, Math.round(10 * iconScale));
                ctx.font = `bold ${shieldFont}px sans-serif`;
                ctx.strokeText('🛡️質數盾', this.x, this.y + currentR * 0.62);
                ctx.fillText('🛡️質數盾', this.x, this.y + currentR * 0.62);
            }
        }

        ctx.restore();
    }
}

export class Particle {
    constructor(x, y, color = '#00f0ff', type = 'spark') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;

        const angle = Math.random() * Math.PI * 2;
        const speed = type === 'coin' ? Math.random() * 4 + 2 : Math.random() * 6 + 1.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - (type === 'coin' ? 3 : 0);

        this.radius = type === 'coin' ? 4 : Math.random() * 2.5 + 1.2;
        this.alpha = 1.0;
        this.decay = type === 'coin' ? 0.022 : Math.random() * 0.04 + 0.025;
        this.gravity = type === 'coin' ? 0.18 : 0.04;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.97;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);

        if (this.type === 'coin') {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

export class FloatingText {
    constructor(x, y, text, color = '#ffffff', size = 18) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.alpha = 1.0;
        this.vy = -1.6;
        this.decay = 0.022;
    }

    update() {
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px 'Orbitron', 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#050a14';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

export class LightningArc {
    constructor(x1, y1, x2, y2, color = '#00f0ff') {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.color = color;
        this.life = 10;
        this.maxLife = 10;
        this.segments = this.generateSegments();
    }

    generateSegments() {
        const segs = [];
        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(3, Math.floor(dist / 25));

        let currX = this.x1;
        let currY = this.y1;

        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const targetX = this.x1 + dx * progress;
            const targetY = this.y1 + dy * progress;

            if (i < steps) {
                const perpX = -dy / dist;
                const perpY = dx / dist;
                const offset = (Math.random() - 0.5) * 22;
                const nextX = targetX + perpX * offset;
                const nextY = targetY + perpY * offset;
                segs.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
                currX = nextX;
                currY = nextY;
            } else {
                segs.push({ x1: currX, y1: currY, x2: this.x2, y2: this.y2 });
            }
        }
        return segs;
    }

    update() {
        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        this.segments.forEach((s, idx) => {
            if (idx === 0) ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
        });
        ctx.stroke();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.restore();
    }
}

