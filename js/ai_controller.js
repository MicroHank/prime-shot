/**
 * AI Opponent Controller for Versus Battle Mode
 * Implements autonomous prime factor calculation, aiming, and attack sending
 */

import { MathUtil, ALL_PRIMES, PRIME_COLORS } from './math_util.js';
import { Physics, Vector2 } from './physics.js';
import { Bullet, Bubble, Particle, FloatingText, LightningArc } from './entities.js';

export class AIController {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.width = canvas.width || 340;
        this.height = canvas.height || 750;

        this.bubbleRadius = 31; // Accommodates 5 bubbles across ~330px width
        this.maxRows = 14;
        this.maxCols = 5;

        this.grid = [];
        this.bullets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.lightningArcs = [];
        this.fallingBubbles = [];

        this.turretX = this.width / 2;
        this.turretY = this.height - 40;
        this.dangerLineY = this.height - 110;
        this.aimAngle = -Math.PI / 2;

        this.currentPrime = 2;
        this.nextPrime = 3;
        this.combo = 0;
        this.comboTimer = 0;
        this.clearCombo = 0;
        this.clearComboTimer = 0;
        this.score = 0;

        this.thinkCooldown = 90;
        this.targetBubble = null;
        this.gameOver = false;

        // Attack callbacks
        this.onAttackOpponent = (count, reason) => {};
        this.onLose = () => {};
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.turretX = width / 2;
        this.turretY = height - 38;
        this.dangerLineY = height - 75;
        this.maxRows = 14;
        this.maxCols = Math.min(5, Math.max(4, Math.floor(width / (this.bubbleRadius * 2))));
        this.lastAttackTime = Date.now();
    }

    reset(initialRows = 3) {
        this.gameOver = false;
        this.combo = 0;
        this.comboTimer = 0;
        this.clearCombo = 0;
        this.clearComboTimer = 0;
        this.score = 0;
        this.bullets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.lightningArcs = [];
        this.lastAttackTime = Date.now();
        this.fallingBubbles = [];
        this.aimAngle = -Math.PI / 2;
        this.thinkCooldown = 90;

        // Initialize empty grid
        this.grid = [];
        for (let r = 0; r < this.maxRows; r++) {
            this.grid[r] = new Array(this.maxCols).fill(null);
        }

        // Fill initial rows
        for (let r = 0; r < initialRows; r++) {
            this.fillGridRow(r);
        }

        this.currentPrime = 2;
        this.nextPrime = 3;
        this.updateHUD();
    }

    fillGridRow(row, isAttackRow = false) {
        for (let col = 0; col < this.maxCols; col++) {
            const rand = Math.random();
            let b = null;
            if (isAttackRow) {
                // In attack rows sent from opponent: 25% chance of obstacle bubble
                if (rand < 0.25) {
                    b = new Bubble(0, 0, 0, 'obstacle', row, col, this.bubbleRadius);
                } else if (rand < 0.38) {
                    const shields = [11, 13, 17, 19, 23, 29, 31];
                    const p = MathUtil.randomChoice(shields);
                    b = new Bubble(0, 0, p, 'prime_shield', row, col, this.bubbleRadius);
                } else {
                    const pool = [4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21, 24, 25, 27, 28, 30, 32, 35, 36, 40, 42, 45, 48, 50, 54, 60];
                    const val = MathUtil.randomChoice(pool);
                    b = new Bubble(0, 0, val, 'normal', row, col, this.bubbleRadius);
                }
            } else {
                if (rand < 0.04) {
                    b = new Bubble(0, 0, 0, 'item_bomb', row, col, this.bubbleRadius);
                } else if (rand < 0.10) {
                    // 6% obstacle bubble
                    b = new Bubble(0, 0, 0, 'obstacle', row, col, this.bubbleRadius);
                } else if (rand < 0.20) {
                    const shields = [11, 13, 17, 19, 23, 29, 31];
                    const p = MathUtil.randomChoice(shields);
                    b = new Bubble(0, 0, p, 'prime_shield', row, col, this.bubbleRadius);
                } else {
                    const pool = [
                        4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21, 24, 25, 27, 28, 30,
                        32, 35, 36, 40, 42, 45, 48, 50, 54, 60, 72, 84
                    ];
                    const val = MathUtil.randomChoice(pool);
                    b = new Bubble(0, 0, val, 'normal', row, col, this.bubbleRadius);
                }
            }
            this.grid[row][col] = b;
        }
    }

    getAllGridBubbles() {
        const list = [];
        for (let r = 0; r < this.maxRows; r++) {
            for (let c = 0; c < this.maxCols; c++) {
                const b = this.grid[r]?.[c];
                if (b && !b.dead && !b.isFalling) {
                    list.push(b);
                }
            }
        }
        return list;
    }

    clearAdjacentObstacles(bubble) {
        if (!bubble || bubble.row === undefined || bubble.col === undefined) return;
        const neighbors = Physics.getHexNeighbors(bubble.row, bubble.col, this.maxRows, this.maxCols);
        for (const { r: nr, c: nc } of neighbors) {
            const nb = this.grid[nr]?.[nc];
            if (nb && !nb.dead && !nb.isFalling && nb.type === 'obstacle') {
                nb.dead = true;
                this.removeGridBubble(nb);
                this.floatingTexts.push(new FloatingText(nb.x, nb.y - 18, "💥 引爆阻礙！", '#78909c', 14));
            }
        }
    }

    removeGridBubble(bubble) {
        if (bubble.row !== undefined && bubble.col !== undefined) {
            if (this.grid[bubble.row]?.[bubble.col] === bubble) {
                this.grid[bubble.row][bubble.col] = null;
            }
        }
    }

    isLineBlockedByObstacle(startX, startY, targetX, targetY, obstacles, toleranceMargin = 4) {
        if (!obstacles || obstacles.length === 0) return false;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return false;

        const bulletRadius = 14;

        for (const obs of obstacles) {
            if (obs.dead || obs.isFalling) continue;

            const ox = obs.x - startX;
            const oy = obs.y - startY;
            const t = (ox * dx + oy * dy) / lenSq;

            // Only check obstacles strictly between shooter and target
            if (t > 0.06 && t < 0.94) {
                const projX = startX + t * dx;
                const projY = startY + t * dy;
                const distSq = (obs.x - projX) * (obs.x - projX) + (obs.y - projY) * (obs.y - projY);
                const collideDist = (obs.radius || this.bubbleRadius || 31) + bulletRadius + toleranceMargin;
                if (distSq <= collideDist * collideDist) {
                    return true;
                }
            }
        }
        return false;
    }

    findClearBounceAngle(target, obstacles) {
        const bulletRadius = 14;
        const wallMargin = bulletRadius;

        // 1. Try Left Wall Bounce (mirrored virtual target)
        const leftVirtualX = 2 * wallMargin - target.x;
        const leftDx = leftVirtualX - this.turretX;
        const leftDy = target.y - this.turretY;
        const leftAngle = Math.atan2(Math.min(leftDy, -15), leftDx);

        if (Math.cos(leftAngle) < -0.01) {
            const tWall = (wallMargin - this.turretX) / Math.cos(leftAngle);
            if (tWall > 0) {
                const wallHitY = this.turretY + tWall * Math.sin(leftAngle);
                const seg1Blocked = this.isLineBlockedByObstacle(this.turretX, this.turretY, wallMargin, wallHitY, obstacles);
                const seg2Blocked = this.isLineBlockedByObstacle(wallMargin, wallHitY, target.x, target.y, obstacles);
                if (!seg1Blocked && !seg2Blocked && wallHitY > target.y && wallHitY < this.turretY) {
                    return leftAngle;
                }
            }
        }

        // 2. Try Right Wall Bounce (mirrored virtual target)
        const rightWallX = this.width - wallMargin;
        const rightVirtualX = 2 * rightWallX - target.x;
        const rightDx = rightVirtualX - this.turretX;
        const rightDy = target.y - this.turretY;
        const rightAngle = Math.atan2(Math.min(rightDy, -15), rightDx);

        if (Math.cos(rightAngle) > 0.01) {
            const tWall = (rightWallX - this.turretX) / Math.cos(rightAngle);
            if (tWall > 0) {
                const wallHitY = this.turretY + tWall * Math.sin(rightAngle);
                const seg1Blocked = this.isLineBlockedByObstacle(this.turretX, this.turretY, rightWallX, wallHitY, obstacles);
                const seg2Blocked = this.isLineBlockedByObstacle(rightWallX, wallHitY, target.x, target.y, obstacles);
                if (!seg1Blocked && !seg2Blocked && wallHitY > target.y && wallHitY < this.turretY) {
                    return rightAngle;
                }
            }
        }

        return null;
    }

    think(speedMultiplier = 1.0) {
        if (this.gameOver) return;

        const allBubbles = this.getAllGridBubbles();
        if (allBubbles.length === 0) {
            // If AI cleared board, send attack with buffer and spawn 2 rows
            this.triggerAttack(1, '🤖 AI 完美全清！送出 1 排！');
            for (let r = 0; r < 2; r++) {
                this.fillGridRow(r);
            }
            return;
        }

        // Filter out obstacle bubbles completely - AI never intentionally targets obstacles
        const nonObstacles = allBubbles.filter(b => b.type !== 'obstacle');
        const obstacles = allBubbles.filter(b => b.type === 'obstacle');

        // Edge case: entire board contains only obstacles
        if (nonObstacles.length === 0) {
            this.targetBubble = null;
            this.aimAngle = -Math.PI * 0.25;
            return;
        }

        // Find the lowest (frontmost) bubble in each column
        const lowestInCol = new Map();
        for (const b of allBubbles) {
            const currentLowest = lowestInCol.get(b.col);
            if (!currentLowest || b.row > currentLowest.row) {
                lowestInCol.set(b.col, b);
            }
        }

        // Score all non-obstacle bubbles to pick the best strategic target
        let bestTarget = null;
        let bestAimAngle = null;
        let bestScore = -Infinity;

        for (const b of nonObstacles) {
            const isDirectBlocked = this.isLineBlockedByObstacle(this.turretX, this.turretY, b.x, b.y, obstacles);
            let candidateAngle = null;
            let pathClear = false;

            if (!isDirectBlocked) {
                const dx = b.x - this.turretX;
                const dy = b.y - this.turretY;
                candidateAngle = Math.atan2(Math.min(dy, -15), dx);
                pathClear = true;
            } else {
                // If direct path is blocked by an obstacle, check if bank shot can bypass it
                const bounceAngle = this.findClearBounceAngle(b, obstacles);
                if (bounceAngle !== null) {
                    candidateAngle = bounceAngle;
                    pathClear = true;
                }
            }

            let score = 0;

            // 1. Threat priority: lower bubbles are closer to the danger line
            score += (b.y / this.height) * 150;

            // 2. Frontline bonus: lowest bubble in its column
            if (lowestInCol.get(b.col) === b) {
                score += 50;
            }

            // 3. Strategic obstacle detonation bonus:
            // Eliminating bubbles adjacent to obstacles detonates those obstacles via clearAdjacentObstacles()!
            const neighbors = Physics.getHexNeighbors(b.row, b.col, this.maxRows, this.maxCols);
            let adjacentObstacles = 0;
            for (const { r, c } of neighbors) {
                const nb = this.grid[r]?.[c];
                if (nb && !nb.dead && !nb.isFalling && nb.type === 'obstacle') {
                    adjacentObstacles++;
                }
            }
            if (adjacentObstacles > 0) {
                score += adjacentObstacles * 80;
            }

            // 4. Quick elimination bonuses
            if (b.type.startsWith('item_')) {
                score += 50;
            } else if (b.type === 'prime_shield') {
                score += 30;
            } else if (b.value > 1 && MathUtil.isPrime(b.value)) {
                score += 40;
            }

            // 5. Obstacle avoidance penalty
            if (pathClear) {
                score += 100;
            } else {
                // Severe penalty if trajectory hits an obstacle
                score -= 1000;
                const dx = b.x - this.turretX;
                const dy = b.y - this.turretY;
                candidateAngle = Math.atan2(Math.min(dy, -15), dx);
            }

            if (score > bestScore) {
                bestScore = score;
                bestTarget = b;
                bestAimAngle = candidateAngle;
            }
        }

        this.targetBubble = bestTarget || nonObstacles[0];

        // Smoothly rotate turret towards the chosen target / aim angle
        if (bestAimAngle !== null) {
            this.aimAngle += (bestAimAngle - this.aimAngle) * 0.18;
        } else if (this.targetBubble) {
            const dx = this.targetBubble.x - this.turretX;
            const dy = this.targetBubble.y - this.turretY;
            const desiredAngle = Math.atan2(Math.min(dy, -15), dx);
            this.aimAngle += (desiredAngle - this.aimAngle) * 0.18;
        }

        // Shoot cooldown management
        this.thinkCooldown -= speedMultiplier;
        if (this.thinkCooldown <= 0) {
            this.thinkCooldown = Math.floor(Math.random() * 40) + 100; // ~1.7s to 2.3s per shot

            // Snap aimAngle to planned angle upon firing to avoid misfiring into obstacles
            if (bestAimAngle !== null) {
                this.aimAngle = bestAimAngle;
            }

            // Decide which prime to shoot
            let primeToShoot = 2;
            const V = this.targetBubble ? this.targetBubble.value : 2;
            const isSmart = Math.random() < 0.85;

            if (this.targetBubble) {
                if (this.targetBubble.type === 'prime_shield') {
                    primeToShoot = isSmart ? V : (V === 2 ? 3 : 2);
                } else if (this.targetBubble.type.startsWith('item_')) {
                    primeToShoot = MathUtil.randomChoice([2, 3, 5, 7]);
                } else if (V > 1) {
                    if (isSmart) {
                        const factors = MathUtil.getPrimeFactors(V);
                        primeToShoot = factors.length > 0 ? MathUtil.randomChoice(factors) : 2;
                    } else {
                        // Blunder: shoot prime that doesn't divide V
                        const wrongPrimes = ALL_PRIMES.filter(p => V % p !== 0);
                        primeToShoot = wrongPrimes.length > 0 ? MathUtil.randomChoice(wrongPrimes.slice(0, 5)) : 5;
                    }
                }
            }

            this.currentPrime = primeToShoot;
            this.shoot(this.currentPrime);
            this.nextPrime = MathUtil.randomChoice([2, 3, 5, 7]);
        }
    }

    shoot(primeValue, isPiercing = false) {
        if (this.gameOver) return;

        const speed = 15;
        const vx = Math.cos(this.aimAngle) * speed;
        const vy = Math.sin(this.aimAngle) * speed;

        const bullet = new Bullet(
            this.turretX + Math.cos(this.aimAngle) * 28,
            this.turretY + Math.sin(this.aimAngle) * 28,
            vx, vy, primeValue,
            { isPiercing: isPiercing }
        );

        this.bullets.push(bullet);

        for (let i = 0; i < 4; i++) {
            const p = new Particle(bullet.x, bullet.y, bullet.colorInfo.main, 'spark');
            p.vx = (Math.random() - 0.5) * 4;
            p.vy = (Math.random() - 0.5) * 4;
            this.particles.push(p);
        }
    }



    update(speedMultiplier = 1.0) {
        if (this.gameOver) return;

        this.think(speedMultiplier);

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.combo = 0;
        }

        if (this.clearComboTimer > 0) {
            this.clearComboTimer--;
            if (this.clearComboTimer === 0) this.clearCombo = 0;
        }

        // Update positions of AI grid bubbles
        for (let r = 0; r < this.maxRows; r++) {
            for (let c = 0; c < this.maxCols; c++) {
                const b = this.grid[r]?.[c];
                if (b && !b.dead && !b.isFalling) {
                    const worldPos = Physics.gridToWorld(r, c, 0, this.width, this.bubbleRadius);
                    b.x = worldPos.x;
                    b.y = worldPos.y;
                    b.update(this.width, this.height, speedMultiplier);

                    // Danger Line check
                    if (b.y + b.radius >= this.dangerLineY) {
                        this.gameOver = true;
                        this.onLose();
                        return;
                    }
                }
            }
        }

        // Update bullets
        this.bullets.forEach(b => b.update(this.width, this.height));
        this.bullets = this.bullets.filter(b => b.active);

        // Update falling bubbles
        this.fallingBubbles.forEach(b => b.update(this.width, this.height, speedMultiplier));
        this.fallingBubbles = this.fallingBubbles.filter(b => !b.dead);

        // Handle collisions
        this.handleCollisions();

        // Update visual fx (capped to 25)
        if (this.particles.length > 25) {
            this.particles = this.particles.slice(-25);
        }
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.alpha > 0);

        this.floatingTexts.forEach(ft => ft.update());
        this.floatingTexts = this.floatingTexts.filter(ft => ft.alpha > 0);

        this.lightningArcs.forEach(la => la.update());
        this.lightningArcs = this.lightningArcs.filter(la => la.life > 0);

        this.updateHUD();
    }

    handleCollisions() {
        const gridBubbles = this.getAllGridBubbles();

        for (const bullet of this.bullets) {
            if (!bullet.active) continue;

            for (const bubble of gridBubbles) {
                if (bubble.dead || bubble.isFalling) continue;

                if (Physics.checkCircleOverlap(bullet, bubble)) {
                    if (bullet.hitBubbles.has(bubble)) continue;
                    bullet.hitBubbles.add(bubble);

                    this.processHit(bullet, bubble);

                    if (!bullet.isPiercing || !bullet.active) {
                        break;
                    }
                }
            }
        }
    }

    recordElimination(x, y, isShieldBreak = false, shieldVal = 0) {
        if (isShieldBreak) {
            // Only high-tier prime shields (>= 23) send a row
            if (shieldVal >= 23) {
                this.onAttackOpponent(1, `🤖 AI 擊破高階質數盾 [${shieldVal}]！送出 1 排！`);
            }
            return;
        }

        this.clearCombo++;
        this.clearComboTimer = 240;

        // Increased threshold: 5-kill streak
        if (this.clearCombo >= 5) {
            this.triggerAttack(1, `🤖 AI 達成 5 連消！送出 1 排！`);
            this.clearCombo = 0;
        }
    }

    processHit(bullet, bubble) {
        const P = bullet.primeValue;

        // Obstacle Bubble
        if (bubble.type === 'obstacle') {
            bullet.active = false;
            return;
        }

        // Special Items
        if (bubble.type.startsWith('item_')) {
            bubble.dead = true;
            this.removeGridBubble(bubble);
            bullet.active = false;
            this.checkAvalanche();
            return;
        }

        // Prime Shield
        if (bubble.type === 'prime_shield') {
            if (P === bubble.value) {
                bubble.dead = true;
                this.clearAdjacentObstacles(bubble);
                this.removeGridBubble(bubble);
                bullet.active = false;
                this.recordElimination(bubble.x, bubble.y, true, bubble.value);
                this.checkAvalanche();
            } else {
                bullet.active = false;
                const newV = bubble.value + P;
                bubble.setValue(newV);
                if (!MathUtil.isPrime(newV)) bubble.type = 'normal';
                this.clearCombo = 0;
                this.clearComboTimer = 0;
                this.floatingTexts.push(new FloatingText(bubble.x, bubble.y - 18, `+${P}`, '#ff3366', 15));
            }
            return;
        }

        // Factorization & Fission
        const V = bubble.value;

        if (V % P === 0) {
            const Q = Math.floor(V / P);
            this.combo++;
            this.comboTimer = 180;

            this.floatingTexts.push(new FloatingText(bubble.x, bubble.y - 15, `÷${P}`, bullet.colorInfo.main, 18));

            // Check Resonance Overload
            this.checkResonanceOverload(P, bubble);

            if (Q === 1) {
                bubble.dead = true;
                this.clearAdjacentObstacles(bubble);
                this.removeGridBubble(bubble);
                this.recordElimination(bubble.x, bubble.y, false);
                this.checkAvalanche();
            } else {
                bubble.setValue(Q);
            }

            if (!bullet.isPiercing) {
                bullet.active = false;
            }
        } else {
            // Penalty: Add P to bubble!
            bullet.active = false;
            const newV = V + P;
            bubble.setValue(newV);
            this.combo = 0;
            this.clearCombo = 0;
            this.clearComboTimer = 0;
            this.floatingTexts.push(new FloatingText(bubble.x, bubble.y - 18, `+${P}`, '#ff3366', 16));
        }
    }

    checkResonanceOverload(prime, sourceBubble) {
        const gridBubbles = this.getAllGridBubbles();
        const multiples = gridBubbles.filter(b => b !== sourceBubble && b.value > 1 && b.value % prime === 0);

        if (multiples.length >= 1) {
            this.floatingTexts.push(new FloatingText(sourceBubble.x, sourceBubble.y - 30, '⚡ 共鳴！', '#00f0ff', 18));

            multiples.forEach(mb => {
                this.lightningArcs.push(new LightningArc(sourceBubble.x, sourceBubble.y, mb.x, mb.y, '#00f0ff'));
                const newQ = Math.floor(mb.value / prime);
                if (newQ === 1) {
                    mb.dead = true;
                    this.clearAdjacentObstacles(mb);
                    this.removeGridBubble(mb);
                } else {
                    mb.setValue(newQ);
                }
            });

            // High threshold: ONLY massive resonance (>= 6 multiples) sends 1 row
            if (multiples.length >= 6) {
                this.triggerAttack(1, `⚡ AI 超導大共鳴 x${multiples.length}！送出 1 排！`);
            }

            this.checkAvalanche();
        }
    }

    checkAvalanche() {
        const floating = Physics.findFloatingBubbles(this.grid, this.maxRows, this.maxCols);
        if (floating.length > 0) {
            floating.forEach(fb => {
                this.removeGridBubble(fb);
                fb.startAvalanche();
                this.fallingBubbles.push(fb);
            });

            // High threshold: 6 or more floating bubbles collapse sends 1 row
            if (floating.length >= 6) {
                this.triggerAttack(1, `🏔️ AI 誘發大崩塌 x${floating.length}！送出 1 排！`);
            }
        }
    }

    triggerAttack(count, reason) {
        const now = Date.now();
        if (this.lastAttackTime && now - this.lastAttackTime < 3500) {
            // Buffer: Prevent rapid attack bursts within 3.5s
            return;
        }
        this.lastAttackTime = now;
        this.onAttackOpponent(count, reason);
    }

    pushRowFromOpponent(count = 1) {
        if (this.gameOver) return;

        this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.45, `⚠️ 受到玩家攻擊 +${count} 排！`, '#ff0055', 20));

        for (let k = 0; k < count; k++) {
            // 1. Create a fresh 2D array to completely prevent ANY reference sharing
            const newGrid = [];
            for (let r = 0; r < this.maxRows; r++) {
                newGrid[r] = new Array(this.maxCols).fill(null);
            }

            // 2. Shift all existing bubbles down exactly by 1 row
            for (let r = 0; r < this.maxRows - 1; r++) {
                for (let c = 0; c < this.maxCols; c++) {
                    const b = this.grid[r]?.[c];
                    if (b && !b.dead && !b.isFalling) {
                        b.row = r + 1;
                        b.col = c;
                        newGrid[r + 1][c] = b;
                    }
                }
            }

            // 3. Assign new shifted grid
            this.grid = newGrid;

            // 4. Fill ONLY row 0 with attack bubbles (25% obstacle rate)
            this.fillGridRow(0, true);

            // 5. Visual highlight and particles on the newly added top row
            for (let c = 0; c < this.maxCols; c++) {
                const nb = this.grid[0]?.[c];
                if (nb) {
                    nb.flashTimer = 14;
                    const pos = Physics.gridToWorld(0, c, 0, this.width, this.bubbleRadius);
                    nb.x = pos.x;
                    nb.y = pos.y;
                    for (let p = 0; p < 3; p++) {
                        this.particles.push(new Particle(nb.x, nb.y, '#00f0ff', 'spark'));
                    }
                }
            }
        }

        // 6. Update world coordinates of all bubbles immediately so existing bubbles shift down smoothly
        for (let r = 0; r < this.maxRows; r++) {
            for (let c = 0; c < this.maxCols; c++) {
                const b = this.grid[r]?.[c];
                if (b && !b.dead && !b.isFalling) {
                    const pos = Physics.gridToWorld(r, c, 0, this.width, this.bubbleRadius);
                    b.x = pos.x;
                    b.y = pos.y;
                }
            }
        }

        // Check if pushed past danger line
        const allBubbles = this.getAllGridBubbles();
        for (const b of allBubbles) {
            if (b.y + this.bubbleRadius >= this.dangerLineY) {
                this.gameOver = true;
                this.onLose();
                break;
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.save();

        // Background grid lines
        this.ctx.strokeStyle = 'rgba(255, 0, 85, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.width; x += 35) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Danger Line
        this.ctx.strokeStyle = '#ff0055';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.dangerLineY);
        this.ctx.lineTo(this.width, this.dangerLineY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = 'rgba(255, 0, 85, 0.7)';
        this.ctx.font = 'bold 10px monospace';
        this.ctx.fillText('CPU DANGER LINE', 8, this.dangerLineY - 4);

        // Draw Aim trajectory
        this.ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.turretX, this.turretY);
        this.ctx.lineTo(
            this.turretX + Math.cos(this.aimAngle) * 200,
            this.turretY + Math.sin(this.aimAngle) * 200
        );
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw Bubbles
        for (let r = 0; r < this.maxRows; r++) {
            for (let c = 0; c < this.maxCols; c++) {
                const b = this.grid[r]?.[c];
                if (b && !b.dead && !b.isFalling) {
                    b.draw(this.ctx);
                }
            }
        }

        // Draw Falling Bubbles
        this.fallingBubbles.forEach(fb => fb.draw(this.ctx));

        // Draw Bullets
        this.bullets.forEach(b => b.draw(this.ctx));

        // Draw Particles
        this.particles.forEach(p => p.draw(this.ctx));

        // Draw Arcs
        this.lightningArcs.forEach(la => la.draw(this.ctx));

        // Draw Floating Texts
        this.floatingTexts.forEach(ft => ft.draw(this.ctx));

        // Draw AI Turret
        this.ctx.save();
        this.ctx.translate(this.turretX, this.turretY);

        // Base
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 18, 0, Math.PI * 2);
        this.ctx.fillStyle = '#1e1b4b';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ff0055';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Barrel
        this.ctx.rotate(this.aimAngle);
        this.ctx.fillStyle = '#ff0055';
        this.ctx.fillRect(0, -5, 26, 10);

        // Next ammo in barrel
        this.ctx.beginPath();
        this.ctx.arc(10, 0, 7, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.restore();

        this.ctx.restore();
    }

    updateHUD() {
        // AI status display removed per UI simplification
    }
}
