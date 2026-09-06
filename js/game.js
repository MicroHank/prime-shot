/**
 * Prime Split: Factorization Protocol
 * Main Game Engine & Controller - Grid Advancing & 2~97 Prime Selection System
 */

import { MathUtil, ALL_PRIMES, PRIME_TIERS, PRIME_COLORS } from './math_util.js';
import { Physics, Vector2 } from './physics.js';
import { Bullet, Bubble, Particle, FloatingText, LightningArc } from './entities.js';
import { ModeController } from './modes.js';
import { audio } from './audio.js';
import { AIController } from './ai_controller.js';

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.width = 800;
        this.height = 700;

        // Game State
        this.score = 0;
        try {
            this.highScore = parseInt(localStorage.getItem('prime_split_highscore') || '0', 10);
        } catch (e) {
            this.highScore = 0;
        }
        this.stage = 1;
        this.stageTarget = 8;
        this.stageBubblesPopped = 0;
        this.advancingStage = false;
        this.combo = 0;
        this.comboTimer = 0;
        this.clearCombo = 0;
        this.clearComboTimer = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.paused = false;

        // Blitz Mode Tracking
        this.blitzTimer = 60.0;
        this.blitzBubblesPopped = 0;
        this.blitzMaxCombo = 0;
        this.blitzShotsFired = 0;
        this.blitzShotsHit = 0;

        // Mode Manager (Arcade & VS)
        this.modeMgr = new ModeController();

        // Grid Management (Honeycomb Row Advancement)
        this.maxRows = 14;
        this.maxCols = 7;
        this.bubbleRadius = Physics.GRID_RADIUS;
        this.grid = []; // 2D array: grid[row][col]
        this.gridOffsetY = 0;
        this.gridAdvanceSpeed = 0.07;

        // Entities
        this.bullets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.lightningArcs = [];
        this.fallingBubbles = [];

        // Player Turret
        this.turretX = this.width / 2;
        this.turretY = this.height - 42;
        this.aimAngle = -Math.PI / 2;
        this.mousePos = { x: this.width / 2, y: 100 };
        this.hoveredBubble = null;

        // Ammo Selection System (2 ~ 97)
        this.currentPrime = 2;
        this.allPrimes = ALL_PRIMES;
        this.vsSuddenDeathTimer = 600; // 10s countdown (600 frames at 60 FPS)

        this.slowMoTimer = 0;

        this.dangerLineY = this.height - 90;

        // AI Controller for Versus Battle Mode
        this.aiCanvas = document.getElementById('aiCanvas');
        this.aiController = new AIController(this.aiCanvas);

        this.aiController.onAttackOpponent = (count, reason) => {
            if (this.modeMgr.currentMode === 'vs') {
                this.sendAttackFromAIToPlayer(count, reason);
            }
        };

        this.aiController.onLose = () => {
            if (this.modeMgr.currentMode === 'vs' && !this.gameOver && !this.gameWon) {
                this.handleVSPlayerVictory();
            }
        };

        // Bindings
        this.initCanvasSize();
        this.setupInputs();
        this.setupUI();
    }

    initCanvasSize() {
        const resize = () => {
            const isVs = (this.modeMgr && this.modeMgr.currentMode === 'vs');
            const container = document.getElementById('canvas-container');
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const availableHeight = Math.max(640, Math.floor(rect.height));

            if (isVs) {
                const playerBox = document.getElementById('player-arena-box');
                const aiBox = document.getElementById('ai-arena-box');
                const pWidth = playerBox ? Math.floor(playerBox.getBoundingClientRect().width) : 340;
                const aiWidth = aiBox ? Math.floor(aiBox.getBoundingClientRect().width) : 340;

                this.width = Math.max(300, pWidth);
                this.height = availableHeight;
                this.canvas.width = this.width;
                this.canvas.height = this.height;

                this.turretX = this.width / 2;
                this.turretY = this.height - 38;
                this.dangerLineY = this.height - 75;
                this.bubbleRadius = 31;
                this.maxCols = Math.min(5, Math.max(4, Math.floor(this.width / (this.bubbleRadius * 2))));
                this.maxRows = 14;

                if (this.aiController) {
                    this.aiController.setSize(Math.max(300, aiWidth), this.height);
                }
            } else {
                this.width = Math.min(650, Math.floor(rect.width));
                this.height = availableHeight;
                this.canvas.width = this.width;
                this.canvas.height = this.height;

                this.turretX = this.width / 2;
                this.turretY = this.height - 42;
                this.dangerLineY = this.height - 90;
                this.bubbleRadius = Physics.GRID_RADIUS;
                this.maxCols = Math.min(7, Math.max(6, Math.floor(this.width / Physics.getColWidth())));
                this.maxRows = 14;
            }
        };
        window.addEventListener('resize', resize);
        resize();
    }

    setupInputs() {
        const container = document.getElementById('canvas-container') || this.canvas;

        const getCanvasCoords = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            if (!rect || rect.width <= 0 || rect.height <= 0) {
                return { x: this.turretX, y: 100 };
            }
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const updateAim = (clientX, clientY) => {
            const pos = getCanvasCoords(clientX, clientY);
            if (!isFinite(pos.x) || !isFinite(pos.y)) return;
            this.mousePos.x = pos.x;
            this.mousePos.y = pos.y;

            const dx = this.mousePos.x - this.turretX;
            const dy = this.mousePos.y - this.turretY;
            const angle = Math.atan2(Math.min(dy, -15), dx);
            if (isFinite(angle)) {
                this.aimAngle = angle;
            }
            this.updateHoveredBubble();
        };

        // Aim across entire play area container (covers dual arenas, divider, top bar)
        container.addEventListener('mousemove', (e) => {
            updateAim(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e) => {
            // Also update if dragging or aiming towards edges
            if (e.buttons > 0) {
                updateAim(e.clientX, e.clientY);
            }
        });

        // Fire on click within container
        container.addEventListener('mousedown', (e) => {
            if (this.gameOver || this.gameWon) return; // Never shoot or trigger side-effects if round has ended
            if (e.target.closest('button') || e.target.closest('.modal-content')) return;
            audio.init();
            audio.resume();
            updateAim(e.clientX, e.clientY);
            if (e.button === 0) {
                // Left click: shoot
                this.shoot();
            } else if (e.button === 2) {
                // Right click: cycle prime ammo
                e.preventDefault();
                this.cycleAmmo(1);
            }
        });

        container.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse wheel: cycle prime ammo
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            audio.init();
            if (e.deltaY > 0) {
                this.cycleAmmo(1);
            } else {
                this.cycleAmmo(-1);
            }
        }, { passive: false });

        // Touch support across container
        const handleTouch = (e) => {
            if (e.target.closest('button') || e.target.closest('.modal-content')) return;
            audio.init();
            audio.resume();
            if (e.touches && e.touches.length > 0) {
                updateAim(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        container.addEventListener('touchstart', (e) => {
            if (e.target.closest('button') || e.target.closest('.modal-content')) return;
            handleTouch(e);
            this.shoot();
        }, { passive: true });
        container.addEventListener('touchmove', handleTouch, { passive: true });

        // Keyboard shortcuts: Q (previous), W (next), 1-4, Space, Enter
        window.addEventListener('keydown', (e) => {
            audio.init();

            // Quick restart with Space or Enter on game over / won
            if (this.gameOver || this.gameWon) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.hideModal();
                    this.restartCurrentMode();
                    return;
                }
            }

            if (e.code === 'KeyQ' || e.key.toLowerCase() === 'q') {
                e.preventDefault();
                this.cycleAmmo(-1);
            } else if (e.code === 'KeyW' || e.key.toLowerCase() === 'w' || e.code === 'Space') {
                e.preventDefault();
                this.cycleAmmo(1);
            } else if (e.key === '1') {
                this.setAmmo(2);
            } else if (e.key === '2') {
                this.setAmmo(3);
            } else if (e.key === '3') {
                this.setAmmo(5);
            } else if (e.key === '4') {
                this.setAmmo(7);
            } else if (e.key.toLowerCase() === 'p') {
                this.togglePause();
            }
        });
    }

    updateHoveredBubble() {
        let closest = null;
        let minDist = 36;

        const allBubbles = this.getAllGridBubbles();
        for (const b of allBubbles) {
            const dist = Math.hypot(b.x - this.mousePos.x, b.y - this.mousePos.y);
            if (dist < minDist) {
                minDist = dist;
                closest = b;
            }
        }
        this.hoveredBubble = closest;
    }

    setupUI() {
        document.getElementById('high-score-val').innerText = this.highScore;

        // 1. Initial Mode Selection Welcome Modal bindings
        const modeSelectModal = document.getElementById('mode-select-modal');
        const modeCards = document.querySelectorAll('.mode-card');
        const chooseModeBtn = document.getElementById('btn-choose-mode');
        const changeModeModalBtn = document.getElementById('modal-btn-change-mode');

        if (chooseModeBtn) {
            chooseModeBtn.addEventListener('click', () => this.showModeSelectModal());
        }

        if (changeModeModalBtn) {
            changeModeModalBtn.addEventListener('click', () => {
                this.hideModal();
                this.showModeSelectModal();
            });
        }

        // Mode cards click
        modeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Ignore click if clicking directly inside difficulty buttons
                if (e.target.closest('.card-difficulty-select') && !e.target.classList.contains('btn-mode-card')) {
                    return;
                }
                const chosenMode = card.dataset.mode;
                audio.init();
                audio.startBGM();

                // If VS mode, get selected difficulty
                if (chosenMode === 'vs') {
                    const activeDiffBtn = card.querySelector('.diff-btn.active');
                    const diff = activeDiffBtn ? activeDiffBtn.dataset.diff : 'normal';
                    this.setAIDifficulty(diff);
                }

                this.hideModeSelectModal();
                this.startMode(chosenMode);
            });
        });

        // Difficulty buttons inside Mode Select Modal
        const modalDiffBtns = document.querySelectorAll('.modal-diff-group .diff-btn');
        modalDiffBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const diff = btn.dataset.diff;
                this.setAIDifficulty(diff);
            });
        });

        // Difficulty buttons inside Sidebar
        const sidebarDiffBtns = document.querySelectorAll('.sidebar-diff-group .diff-btn');
        sidebarDiffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const diff = btn.dataset.diff;
                this.setAIDifficulty(diff);
            });
        });

        // Mode switch tabs in sidebar
        const modeTabs = document.querySelectorAll('.mode-tab');
        modeTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                audio.init();
                audio.startBGM();
                this.startMode(mode);
            });
        });

        // Restart button
        const restartBtn = document.getElementById('btn-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartCurrentMode());
        }

        // Audio toggle button
        const audioBtn = document.getElementById('btn-audio');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const isMuted = audio.toggleMute();
                audioBtn.innerHTML = isMuted ? '🔇 靜音' : '🔊 音樂開';
            });
        }

        // Build 4-Tier Cyber Palette for all 25 Primes
        this.renderAllPrimesPalette();

        // Modal retry & view toggle
        const modalRetry = document.getElementById('modal-btn-retry');
        if (modalRetry) {
            modalRetry.addEventListener('click', () => {
                this.hideModal();
                this.restartCurrentMode();
            });
        }

        const modalToggle = document.getElementById('modal-btn-toggle-view');
        if (modalToggle) {
            modalToggle.addEventListener('click', () => {
                const modalContent = document.querySelector('.modal-content');
                if (modalContent) {
                    const isMin = modalContent.classList.toggle('minimized');
                    modalToggle.innerText = isMin ? '📋 顯示結果' : '👁️ 檢視盤面';
                }
            });
        }
    }

    setAIDifficulty(level) {
        if (this.aiController) {
            this.aiController.setDifficulty(level);
        }
        // Sync active class on both modal and sidebar diff buttons
        document.querySelectorAll('.diff-btn').forEach(b => {
            if (b.dataset.diff === level) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        const diffNames = { easy: '🟢 簡單 (65%)', normal: '🟡 普通 (85%)', hard: '🔴 困難 (98%)' };
        const name = diffNames[level] || level;
        this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.4, `AI 難度已設為：${name}`, '#ffd700', 20));
    }

    showModeSelectModal() {
        const modal = document.getElementById('mode-select-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
        this.paused = true;
    }

    hideModeSelectModal() {
        const modal = document.getElementById('mode-select-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.paused = false;
    }

    renderAllPrimesPalette() {
        const container = document.getElementById('prime-dock-tiers');
        if (!container) return;
        container.innerHTML = '';

        Object.entries(PRIME_TIERS).forEach(([key, tier]) => {
            const tierBlock = document.createElement('div');
            tierBlock.className = 'palette-tier-block';

            const title = document.createElement('div');
            title.className = 'tier-title';
            title.innerText = tier.name;
            tierBlock.appendChild(title);

            const pills = document.createElement('div');
            pills.className = 'tier-pills';

            tier.primes.forEach(p => {
                const btn = document.createElement('button');
                btn.className = 'prime-pill-btn';
                btn.dataset.prime = p;
                const c = PRIME_COLORS[p] || PRIME_COLORS.DEFAULT;
                btn.style.borderColor = c.dark;

                let keyHint = '';
                if (p === 2) keyHint = '<span class="pill-key-hint">[1]</span> ';
                else if (p === 3) keyHint = '<span class="pill-key-hint">[2]</span> ';
                else if (p === 5) keyHint = '<span class="pill-key-hint">[3]</span> ';
                else if (p === 7) keyHint = '<span class="pill-key-hint">[4]</span> ';

                btn.innerHTML = `${keyHint}<span style="color:${c.main}; font-weight:800">${p}</span>`;
                btn.addEventListener('click', () => {
                    this.setAmmo(p);
                });
                pills.appendChild(btn);
            });

            tierBlock.appendChild(pills);
            container.appendChild(tierBlock);
        });
    }

    startMode(mode) {
        this.modeMgr.setMode(mode);
        this.score = 0;
        this.combo = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.paused = false;
        this.bullets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.lightningArcs = [];
        this.fallingBubbles = [];
        this.slowMoTimer = 0;
        this.gridOffsetY = 0;
        this.hideModal();

        // Sync sidebar active mode tab
        document.querySelectorAll('.mode-tab').forEach(t => {
            if (t.dataset.mode === mode) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Initialize empty grid
        this.grid = [];
        for (let r = 0; r < this.maxRows; r++) {
            this.grid[r] = new Array(this.maxCols).fill(null);
        }

        const aiArenaBox = document.getElementById('ai-arena-box');
        const vsDivider = document.getElementById('vs-arena-divider');
        const layout = document.querySelector('.game-container-layout');
        const mainArea = document.querySelector('.game-main-area');
        const canvasContainer = document.getElementById('canvas-container');
        const vsDiffPanel = document.getElementById('vs-difficulty-panel');
        const stageStatItem = document.getElementById('stage-stat-item');
        const stageProgressBox = document.getElementById('stage-progress-box');
        const blitzTimerStatItem = document.getElementById('blitz-timer-stat-item');

        if (mode === 'vs') {
            if (aiArenaBox) aiArenaBox.style.display = 'flex';
            if (vsDivider) vsDivider.style.display = 'flex';
            if (layout) layout.classList.add('vs-active');
            if (mainArea) mainArea.classList.add('vs-active');
            if (canvasContainer) canvasContainer.classList.add('vs-active');
            if (vsDiffPanel) vsDiffPanel.style.display = 'block';
            if (stageStatItem) stageStatItem.style.display = 'none';
            if (stageProgressBox) stageProgressBox.style.display = 'none';
            if (blitzTimerStatItem) blitzTimerStatItem.style.display = 'none';

            this.initCanvasSize();

            this.stage = 1;
            this.advancingStage = false;
            this.gridAdvanceSpeed = 0; // In VS mode, bubbles advance via opponent attacks
            this.clearCombo = 0;
            this.clearComboTimer = 0;

            // Generate initial 3 rows for player
            for (let r = 0; r < 3; r++) {
                this.fillGridRow(r);
            }
            this.currentPrime = 2;
            this.vsSuddenDeathTimer = 600;

            // Reset AI board
            if (this.aiController) {
                this.aiController.reset(3);
            }
            this.updateVSScoreboard();
        } else if (mode === 'blitz') {
            if (aiArenaBox) aiArenaBox.style.display = 'none';
            if (vsDivider) vsDivider.style.display = 'none';
            if (layout) layout.classList.remove('vs-active');
            if (mainArea) mainArea.classList.remove('vs-active');
            if (canvasContainer) canvasContainer.classList.remove('vs-active');
            if (vsDiffPanel) vsDiffPanel.style.display = 'none';
            if (stageStatItem) stageStatItem.style.display = 'none';
            if (stageProgressBox) stageProgressBox.style.display = 'none';
            if (blitzTimerStatItem) blitzTimerStatItem.style.display = 'flex';

            this.initCanvasSize();

            this.blitzTimer = 60.0;
            this.blitzBubblesPopped = 0;
            this.blitzMaxCombo = 0;
            this.blitzShotsFired = 0;
            this.blitzShotsHit = 0;
            this.gridAdvanceSpeed = 0; // Blitz bubbles replenish dynamically, no crushing push
            this.clearCombo = 0;
            this.clearComboTimer = 0;

            // Spawn initial 4 rows of Blitz targets
            for (let r = 0; r < 4; r++) {
                this.fillGridRow(r);
            }
            this.currentPrime = 2;
        } else {
            // Arcade Survival Mode
            if (aiArenaBox) aiArenaBox.style.display = 'none';
            if (vsDivider) vsDivider.style.display = 'none';
            if (layout) layout.classList.remove('vs-active');
            if (mainArea) mainArea.classList.remove('vs-active');
            if (canvasContainer) canvasContainer.classList.remove('vs-active');
            if (vsDiffPanel) vsDiffPanel.style.display = 'none';
            if (stageStatItem) stageStatItem.style.display = 'flex';
            if (stageProgressBox) stageProgressBox.style.display = 'flex';
            if (blitzTimerStatItem) blitzTimerStatItem.style.display = 'none';

            this.initCanvasSize();

            this.stage = 1;
            this.stageTarget = 8;
            this.stageBubblesPopped = 0;
            this.advancingStage = false;
            this.gridAdvanceSpeed = 0.05;

            // Spawn initial 3 rows of stage 1 bubbles
            for (let r = 0; r < 3; r++) {
                this.fillGridRow(r);
            }
            this.currentPrime = 2;
        }

        this.updateSmartPrimes();
        this.updateHUD();
    }

    restartCurrentMode() {
        this.startMode(this.modeMgr.currentMode);
    }

    fillGridRow(row, isAttackRow = false) {
        for (let col = 0; col < this.maxCols; col++) {
            const b = this.modeMgr.createBubbleForGrid(
                this.modeMgr.currentMode,
                this.stage,
                isAttackRow,
                row,
                col,
                this.bubbleRadius
            );
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

    updateSmartPrimes() {
        const bubbles = this.getAllGridBubbles();
        this.smartPrimes = MathUtil.getSmartActivePrimes(bubbles, 6);
    }

    cycleAmmo(step = 1) {
        const currIdx = this.allPrimes.indexOf(this.currentPrime);
        const nextIdx = (currIdx + step + this.allPrimes.length) % this.allPrimes.length;
        this.setAmmo(this.allPrimes[nextIdx]);
    }

    setAmmo(prime) {
        this.currentPrime = prime;
        audio.playSwitch();
        this.updateHUD();
    }

    shoot() {
        if (this.gameOver || this.gameWon || this.paused) return;

        let primeToShoot = this.currentPrime || 2;
        if (!primeToShoot) return;
        if (!isFinite(this.aimAngle)) this.aimAngle = -Math.PI / 2;

        if (this.modeMgr.currentMode === 'blitz') {
            this.blitzShotsFired++;
        }

        const speed = 16;
        const vx = Math.cos(this.aimAngle) * speed;
        const vy = Math.sin(this.aimAngle) * speed;

        const isPiercing = primeToShoot === 3;
        const bullet = new Bullet(
            this.turretX + Math.cos(this.aimAngle) * 35,
            this.turretY + Math.sin(this.aimAngle) * 35,
            vx, vy, primeToShoot,
            { isPiercing: isPiercing }
        );

        this.bullets.push(bullet);
        audio.playShoot(primeToShoot);

        for (let i = 0; i < 4; i++) {
            const p = new Particle(bullet.x, bullet.y, bullet.colorInfo.main, 'spark');
            p.vx = (Math.random() - 0.5) * 4;
            p.vy = (Math.random() - 0.5) * 4;
            this.particles.push(p);
        }

        this.updateHUD();
    }



    update() {
        if (this.paused) return;

        let speedMultiplier = 1.0;
        if (this.slowMoTimer > 0) {
            this.slowMoTimer--;
            speedMultiplier = 0.45;
        }

        // 1. Update Blitz Mode 60s Timer & Replenishment
        if (this.modeMgr.currentMode === 'blitz' && !this.gameOver && !this.gameWon) {
            this.blitzTimer = Math.max(0, this.blitzTimer - (1 / 60) * speedMultiplier);
            const timerValEl = document.getElementById('blitz-timer-val');
            if (timerValEl) {
                timerValEl.innerText = this.blitzTimer.toFixed(1) + 's';
                if (this.blitzTimer <= 10) {
                    timerValEl.style.color = '#ff0055';
                } else if (this.blitzTimer <= 20) {
                    timerValEl.style.color = '#ffd700';
                } else {
                    timerValEl.style.color = '#00f0ff';
                }
            }

            // Continuous replenishment: if active grid bubbles fall below 12, replenish top row
            const activeCount = this.getAllGridBubbles().length;
            if (activeCount < 12) {
                for (let r = 0; r < 3; r++) {
                    const rowCells = this.grid[r];
                    if (rowCells && rowCells.some(cell => !cell || cell.dead)) {
                        this.fillGridRow(r);
                        this.updateSmartPrimes();
                        break;
                    }
                }
            }

            if (this.blitzTimer <= 0) {
                this.triggerBlitzEnd();
                return;
            }
        }

        // 2. Update AI Controller in VS mode
        if (this.modeMgr.currentMode === 'vs' && this.aiController && !this.gameOver && !this.gameWon) {
            this.aiController.update(speedMultiplier);

            // Sudden Death Mechanism: Add 1 row to BOTH sides every 10 seconds (600 frames)
            this.vsSuddenDeathTimer -= speedMultiplier;

            // Update UI timer badge in the divider
            const timerEl = document.getElementById('vs-sudden-death-timer');
            if (timerEl) {
                const remainingSec = Math.max(0, Math.ceil(this.vsSuddenDeathTimer / 60));
                timerEl.innerText = `⏱️ ${remainingSec}s`;
                if (remainingSec <= 3) {
                    timerEl.style.color = '#ff0055';
                    timerEl.style.borderColor = '#ff0055';
                    timerEl.style.background = 'rgba(255, 0, 85, 0.2)';
                } else {
                    timerEl.style.color = '#ff9800';
                    timerEl.style.borderColor = 'rgba(255, 152, 0, 0.4)';
                    timerEl.style.background = 'rgba(255, 152, 0, 0.15)';
                }
            }

            if (this.vsSuddenDeathTimer <= 0) {
                this.vsSuddenDeathTimer = 600; // Reset to 10 seconds
                this.triggerSuddenDeathWave();
            }
        }

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) {
                this.combo = 0;
                this.updateHUD();
            }
        }

        if (this.clearComboTimer > 0) {
            this.clearComboTimer--;
            if (this.clearComboTimer === 0) {
                this.clearCombo = 0;
            }
        }

        // Honeycomb Grid Downward Advance (Arcade Mode only)
        if (this.modeMgr.currentMode === 'arcade' && !this.gameOver && !this.gameWon) {
            this.gridOffsetY += this.gridAdvanceSpeed * speedMultiplier;
            const rowHeight = Physics.getRowHeight();

            if (this.gridOffsetY >= rowHeight) {
                this.gridOffsetY -= rowHeight;
                // Shift rows downward with safe array copying
                for (let r = this.maxRows - 1; r > 0; r--) {
                    this.grid[r] = this.grid[r - 1] ? [...this.grid[r - 1]] : new Array(this.maxCols).fill(null);
                    for (let c = 0; c < this.maxCols; c++) {
                        if (this.grid[r]?.[c]) {
                            this.grid[r][c].row = r;
                        }
                    }
                }
                // Generate brand new top row
                this.grid[0] = new Array(this.maxCols).fill(null);
                this.fillGridRow(0);
                this.updateSmartPrimes();
            }
        }

        // Update positions of grid bubbles
        for (let r = 0; r < this.maxRows; r++) {
            for (let c = 0; c < this.maxCols; c++) {
                const b = this.grid[r]?.[c];
                if (b && !b.dead && !b.isFalling) {
                    const worldPos = Physics.gridToWorld(r, c, this.gridOffsetY, this.width, this.bubbleRadius);
                    b.x = worldPos.x;
                    b.y = worldPos.y;
                    b.update(this.width, this.height, speedMultiplier);

                    // Danger Line check
                    if (!this.gameOver && !this.gameWon) {
                        if (b.y + b.radius >= this.dangerLineY) {
                            if (this.modeMgr.currentMode === 'vs') {
                                this.modeMgr.vsAiWins = (this.modeMgr.vsAiWins || 0) + 1;
                                this.updateVSScoreboard();
                                this.triggerGameOver(`防線失守！CPU 贏得此回合！ (${this.modeMgr.vsPlayerWins} : ${this.modeMgr.vsAiWins})`);
                            } else if (this.modeMgr.currentMode === 'blitz') {
                                // In Blitz mode, pop frontline bubble touching danger line to prevent premature game over
                                this.popBubble(b, false);
                                this.removeGridBubble(b);
                            } else {
                                this.triggerGameOver("泡泡推進突破警戒線！");
                            }
                        }
                    }
                }
            }
        }

        // Update Bullets
        this.bullets.forEach(b => b.update(this.width, this.height));
        this.bullets = this.bullets.filter(b => b.active);



        // Update Falling/Avalanche Debris Bubbles
        this.fallingBubbles.forEach(b => b.update(this.width, this.height, speedMultiplier));
        this.fallingBubbles = this.fallingBubbles.filter(b => !b.dead);

        // Handle Bullet Collisions with Grid
        this.handleCollisions();

        // Update Particles (capped to 35 max for high FPS)
        if (this.particles.length > 35) {
            this.particles = this.particles.slice(-35);
        }
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.alpha > 0);

        // Update Floating Texts
        this.floatingTexts.forEach(ft => ft.update());
        this.floatingTexts = this.floatingTexts.filter(ft => ft.alpha > 0);

        // Update Lightning Arcs
        this.lightningArcs.forEach(la => la.update());
        this.lightningArcs = this.lightningArcs.filter(la => la.life > 0);

        this.checkModeClearConditions();
    }

    clearAdjacentObstacles(bubble) {
        if (!bubble || bubble.row === undefined || bubble.col === undefined) return;
        const neighbors = Physics.getHexNeighbors(bubble.row, bubble.col, this.maxRows, this.maxCols);
        const obstaclesToPop = [];

        for (const { r: nr, c: nc } of neighbors) {
            const nb = this.grid[nr]?.[nc];
            if (nb && !nb.dead && !nb.isFalling && nb.type === 'obstacle') {
                obstaclesToPop.push(nb);
            }
        }

        if (obstaclesToPop.length > 0) {
            audio.playPop();
            obstaclesToPop.forEach(ob => {
                this.popBubble(ob, false);
                this.removeGridBubble(ob);
                this.addScore(200, ob.x, ob.y, "OBSTACLE BROKEN!");
                this.floatingTexts.push(new FloatingText(ob.x, ob.y - 20, "💥 引爆阻礙！", '#78909c', 16));
            });
        }
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

    processHit(bullet, bubble) {
        const P = bullet.primeValue;

        // 0. Check Obstacle Bubble
        if (bubble.type === 'obstacle') {
            bullet.active = false;
            audio.playBounce();
            this.floatingTexts.push(new FloatingText(bubble.x, bubble.y - 18, "🧱 阻礙泡泡！需消除相鄰泡泡引爆", '#90a4ae', 15));
            return;
        }

        // 1. Check Special Items
        if (bubble.type.startsWith('item_')) {
            if (this.modeMgr.currentMode === 'blitz') this.blitzShotsHit++;
            this.activateItem(bubble);
            this.removeGridBubble(bubble);
            bullet.active = false;
            this.checkAvalanche();
            return;
        }

        // 2. Pure Prime Shield
        if (bubble.type === 'prime_shield') {
            if (P === bubble.value) {
                if (this.modeMgr.currentMode === 'blitz') this.blitzShotsHit++;
                this.popBubble(bubble, true);
                this.clearAdjacentObstacles(bubble);
                this.removeGridBubble(bubble);
                bullet.active = false;
                this.addScore(450, bubble.x, bubble.y, "SHIELD SHATTER!");
                this.recordElimination(bubble.x, bubble.y, true, bubble.value);
                this.checkAvalanche();
            } else {
                // Non-divisible penalty on shield: Add bullet's prime to bubble value!
                bullet.active = false;
                const newV = bubble.value + P;
                bubble.setValue(newV);
                if (!MathUtil.isPrime(newV)) {
                    bubble.type = 'normal';
                }
                audio.playBounce();
                this.resetCombo();
                this.clearCombo = 0;
                this.clearComboTimer = 0;
                this.floatingTexts.push(new FloatingText(bubble.x, bubble.y - 20, `⚠️ 懲罰 +${P} ➜ [${newV}]`, '#ff3366', 17));
                for (let k = 0; k < 4; k++) {
                    this.particles.push(new Particle(bubble.x, bubble.y, '#ff3366', 'spark'));
                }
                this.updateSmartPrimes();
                this.updateHUD();
            }
            return;
        }

        // 3. Normal Factorization & Fission
        const V = bubble.value;

        if (V % P === 0) {
            if (this.modeMgr.currentMode === 'blitz') this.blitzShotsHit++;
            const Q = Math.floor(V / P);
            this.addCombo(bubble.x, bubble.y);

            audio.playFission();
            this.floatingTexts.push(new FloatingText(bubble.x, bubble.y - 15, `÷${P}`, bullet.colorInfo.main, 20));

            // Check Resonance Overload
            this.checkResonanceOverload(P, bubble);

            if (Q === 1) {
                this.popBubble(bubble, false);
                this.clearAdjacentObstacles(bubble);
                this.removeGridBubble(bubble);
                this.addScore(160 * (this.combo + 1), bubble.x, bubble.y, "FACTOR CLEAR!");
                this.recordElimination(bubble.x, bubble.y, false);
                this.checkAvalanche();
            } else {
                // Division in grid
                bubble.setValue(Q);
                this.addScore(60 * (this.combo + 1), bubble.x, bubble.y);

                for (let k = 0; k < 4; k++) {
                    this.particles.push(new Particle(bubble.x, bubble.y, bullet.colorInfo.main, 'spark'));
                }
            }

            if (!bullet.isPiercing) {
                bullet.active = false;
            }
            this.updateSmartPrimes();
            this.updateHUD();
        } else {
            // Non-divisible penalty: Add bullet's prime P to bubble value!
            bullet.active = false;
            const newV = V + P;
            bubble.setValue(newV);
            audio.playBounce();
            this.resetCombo();
            this.clearCombo = 0;
            this.clearComboTimer = 0;
            this.floatingTexts.push(new FloatingText(bubble.x, bubble.y - 18, `⚠️ 懲罰 +${P} ➜ [${newV}]`, '#ff3366', 18));
            for (let k = 0; k < 4; k++) {
                this.particles.push(new Particle(bubble.x, bubble.y, '#ff5533', 'spark'));
            }
            this.updateSmartPrimes();
            this.updateHUD();
        }
    }

    removeGridBubble(bubble) {
        if (bubble.row !== undefined && bubble.col !== undefined) {
            if (this.grid[bubble.row]?.[bubble.col] === bubble) {
                this.grid[bubble.row][bubble.col] = null;
            }
        }
    }

    checkAvalanche() {
        const floating = Physics.findFloatingBubbles(this.grid, this.maxRows, this.maxCols);
        if (floating.length > 0) {
            audio.playPop();
            this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.4, `⚡ 孤立崩塌 x${floating.length}! ⚡`, '#ffd700', 24));

            // Increased threshold: 5 or more falling bubbles to send 1 row
            if (this.modeMgr.currentMode === 'vs' && floating.length >= 5) {
                this.sendAttackFromPlayerToAI(1, `🏔️ 孤立大崩塌 x${floating.length}`);
            }

            floating.forEach(fb => {
                this.removeGridBubble(fb);
                fb.startAvalanche();
                this.fallingBubbles.push(fb);
                this.addScore(120, fb.x, fb.y);

                // Spawn gold coins
                for (let i = 0; i < 3; i++) {
                    this.particles.push(new Particle(fb.x, fb.y, '#ffd700', 'coin'));
                }
            });
            this.updateSmartPrimes();
            this.updateHUD();
        }
    }

    checkResonanceOverload(prime, sourceBubble) {
        const gridBubbles = this.getAllGridBubbles();
        const multiples = gridBubbles.filter(b => b !== sourceBubble && b.value > 1 && b.value % prime === 0);

        if (multiples.length >= 1) {
            audio.playResonance();
            this.floatingTexts.push(new FloatingText(sourceBubble.x, sourceBubble.y - 35, "⚡ 公因數超導共鳴! ⚡", '#00f0ff', 22));

            // Increased threshold: 4 or more multiples to send 1 row
            if (this.modeMgr.currentMode === 'vs' && multiples.length >= 4) {
                this.sendAttackFromPlayerToAI(1, `⚡ 超導大共鳴 x${multiples.length}`);
            }

            multiples.forEach(mb => {
                this.lightningArcs.push(new LightningArc(sourceBubble.x, sourceBubble.y, mb.x, mb.y, PRIME_COLORS[prime]?.main || '#00f0ff'));

                const newQ = Math.floor(mb.value / prime);
                this.floatingTexts.push(new FloatingText(mb.x, mb.y - 15, `÷${prime}`, '#00f0ff', 18));

                if (newQ === 1) {
                    this.popBubble(mb, false);
                    this.clearAdjacentObstacles(mb);
                    this.removeGridBubble(mb);
                    this.addScore(220, mb.x, mb.y, "RESONANCE POP!");
                } else {
                    mb.setValue(newQ);
                }
            });
            this.checkAvalanche();
        }
    }

    activateItem(itemBubble) {
        itemBubble.dead = true;
        const x = itemBubble.x;
        const y = itemBubble.y;

        if (itemBubble.type === 'item_catalyst') {
            audio.playPop();
            this.floatingTexts.push(new FloatingText(x, y - 20, "✨ [+1 催化劑啟動!] ✨", '#ffd700', 20));

            const bubbles = this.getAllGridBubbles();
            for (const b of bubbles) {
                const dist = Math.hypot(b.x - x, b.y - y);
                if (dist < 180 && b.value > 0) {
                    b.setValue(b.value + 1);
                    if (b.type === 'prime_shield') b.type = 'normal';
                    this.floatingTexts.push(new FloatingText(b.x, b.y, `+1 ➜ [${b.value}]`, '#ffd700', 15));
                }
            }
        } else if (itemBubble.type === 'item_clock') {
            audio.playSlowMo();
            this.slowMoTimer = 300;
            this.floatingTexts.push(new FloatingText(x, y - 20, "⏳ 時空減速 5秒! ⏳", '#00e5ff', 20));
        } else if (itemBubble.type === 'item_sieve') {
            audio.playSieveWave();
            this.floatingTexts.push(new FloatingText(this.width / 2, this.height / 2, "🌊 埃氏光波衝擊 🌊", '#76ff03', 24));

            const bubbles = this.getAllGridBubbles();
            for (const b of bubbles) {
                if (b.value > 1) {
                    const sp = MathUtil.getSmallestPrimeFactor(b.value);
                    const nq = Math.floor(b.value / sp);
                    if (nq === 1) {
                        this.popBubble(b, false);
                        this.clearAdjacentObstacles(b);
                        this.removeGridBubble(b);
                    } else {
                        b.setValue(nq);
                        this.floatingTexts.push(new FloatingText(b.x, b.y - 15, `÷${sp}`, '#76ff03', 16));
                    }
                }
            }
        } else if (itemBubble.type === 'item_bomb') {
            audio.playBomb();
            this.floatingTexts.push(new FloatingText(x, y - 20, "💥 質數核爆! 💥", '#ff3d00', 24));

            const bubbles = this.getAllGridBubbles();
            for (const b of bubbles) {
                const dist = Math.hypot(b.x - x, b.y - y);
                if (dist < 160) {
                    this.popBubble(b, false);
                    this.clearAdjacentObstacles(b);
                    this.removeGridBubble(b);
                }
            }
        }

        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y, itemBubble.colorInfo.main, 'spark'));
        }
    }

    popBubble(bubble, isShieldBreak = false) {
        bubble.dead = true;
        audio.playPop();

        const count = isShieldBreak ? 6 : 4;
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(bubble.x, bubble.y, '#ffd700', 'coin'));
            this.particles.push(new Particle(bubble.x, bubble.y, bubble.colorInfo.main, 'spark'));
        }
    }

    addScore(pts, x, y, label = null) {
        this.score += pts;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try {
                localStorage.setItem('prime_split_highscore', this.highScore.toString());
            } catch (e) {}
            const highEl = document.getElementById('high-score-val');
            if (highEl) highEl.innerText = this.highScore;
        }

        if (label) {
            this.floatingTexts.push(new FloatingText(x, y - 25, `${label} +${pts}`, '#fffa65', 18));
        }
        this.updateHUD();
    }

    addCombo(x, y) {
        this.combo++;
        this.comboTimer = 180;
        if (this.combo > 1) {
            this.floatingTexts.push(new FloatingText(x, y - 35, `COMBO x${this.combo}!`, '#ff2a85', 20));
        }
        this.updateHUD();
    }

    resetCombo() {
        this.combo = 0;
        this.comboTimer = 0;
        this.updateHUD();
    }



    checkModeClearConditions() {
        if (this.gameOver || this.gameWon) return;

        if (this.modeMgr.currentMode === 'arcade') {
            const remaining = this.getAllGridBubbles();
            if (remaining.length === 0 && !this.advancingStage) {
                this.advanceArcadeStage(true); // Board clear bonus!
            }
        } else if (this.modeMgr.currentMode === 'vs') {
            const remaining = this.getAllGridBubbles();
            if (remaining.length === 0 && !this.advancingStage) {
                this.advancingStage = true;
                this.sendAttackFromPlayerToAI(2, "🎉 全清獎勵！");
                this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.4, "🎉 完美清盤！對手 +2 列！", '#ffd700', 22));
                setTimeout(() => {
                    if (this.modeMgr.currentMode === 'vs' && !this.gameOver && !this.gameWon) {
                        for (let r = 0; r < 2; r++) {
                            this.fillGridRow(r);
                        }
                        this.updateSmartPrimes();
                        this.advancingStage = false;
                    }
                }, 800);
            }
        }
    }

    advanceArcadeStage(isPerfect = false) {
        if (this.advancingStage || this.gameOver) return;
        this.advancingStage = true;
        this.stage++;
        this.stageBubblesPopped = 0;
        this.stageTarget = 8 + this.stage * 3;
        audio.playResonance();

        const baseBonus = 1500 * (this.stage - 1);
        const bonus = isPerfect ? baseBonus + 2000 : baseBonus;
        const bannerText = isPerfect ? `🎉 完美全消！STAGE ${this.stage - 1} CLEAR!` : `STAGE ${this.stage - 1} CLEAR!`;
        this.addScore(bonus, this.width / 2, this.height * 0.45, bannerText);

        this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.35, `🌟 第 ${this.stage} 關 START! 🌟`, '#00ff88', 28));

        // Speed increases slightly per stage
        this.gridAdvanceSpeed = 0.05 + Math.min(0.08, this.stage * 0.012);
        this.gridOffsetY = 0;

        // Spawn 3 fresh rows for the new stage
        for (let r = 0; r < 3; r++) {
            this.fillGridRow(r);
        }

        this.updateSmartPrimes();
        this.updateHUD();

        setTimeout(() => {
            this.advancingStage = false;
        }, 1200);
    }

    triggerGameOver(msg) {
        this.gameOver = true;
        this.showModal("GAME OVER", msg, false);
    }

    triggerGameWon(msg) {
        this.gameWon = true;
        this.showModal("VICTORY!", msg, true);
    }

    triggerBlitzEnd() {
        this.gameOver = true;
        audio.playPop();

        const acc = this.blitzShotsFired > 0 ? Math.round((this.blitzShotsHit / this.blitzShotsFired) * 100) : 100;
        let grade = 'C';
        let gradeColor = '#94a3b8';
        if (this.score >= 12000) {
            grade = 'S';
            gradeColor = '#ffd700';
        } else if (this.score >= 7500) {
            grade = 'A';
            gradeColor = '#00ff88';
        } else if (this.score >= 3500) {
            grade = 'B';
            gradeColor = '#00f0ff';
        }

        const statsHtml = `
            <div class="stat-cell">
                <span class="stat-cell-label">最終得分</span>
                <span class="stat-cell-value" style="color: #ffd700;">${this.score}</span>
            </div>
            <div class="stat-cell">
                <span class="stat-cell-label">作戰評級</span>
                <span class="stat-cell-value" style="color: ${gradeColor};">${grade} 級</span>
            </div>
            <div class="stat-cell">
                <span class="stat-cell-label">擊破泡泡</span>
                <span class="stat-cell-value">${this.blitzBubblesPopped} 個</span>
            </div>
            <div class="stat-cell">
                <span class="stat-cell-label">最高連擊</span>
                <span class="stat-cell-value">x${this.blitzMaxCombo}</span>
            </div>
            <div class="stat-cell" style="grid-column: span 2;">
                <span class="stat-cell-label">質因數命中率</span>
                <span class="stat-cell-value" style="color: #00ff88;">${acc}% (${this.blitzShotsHit}/${this.blitzShotsFired})</span>
            </div>
        `;

        this.showModal('⏱️ TIME UP!', `60 秒極速競速結束！作戰評級：${grade} 級`, true, statsHtml);
    }

    recordElimination(x, y, isShieldBreak = false, shieldVal = 0) {
        if (this.gameOver || this.gameWon) return;

        // Blitz Mode tracking
        if (this.modeMgr.currentMode === 'blitz') {
            this.blitzBubblesPopped++;
            if (this.combo > this.blitzMaxCombo) {
                this.blitzMaxCombo = this.combo;
            }
            return;
        }

        // Arcade Mode stage progression
        if (this.modeMgr.currentMode === 'arcade') {
            this.stageBubblesPopped++;
            this.updateHUD();
            if (this.stageBubblesPopped >= this.stageTarget && !this.advancingStage) {
                this.advanceArcadeStage(false);
            }
            return;
        }

        // Versus Mode Attack Meter
        if (this.modeMgr.currentMode === 'vs') {
            if (isShieldBreak) {
                // Only high-tier prime shields (>= 23) send a row to opponent
                if (shieldVal >= 23) {
                    this.sendAttackFromPlayerToAI(1, `🛡️ 擊破高階質數盾 [${shieldVal}]`);
                    this.floatingTexts.push(new FloatingText(x, y - 35, `🛡️ 高階破盾！送出 +1 排！`, '#ffd700', 20));
                } else {
                    this.floatingTexts.push(new FloatingText(x, y - 35, `🛡️ 破除質數盾 [${shieldVal}]！`, '#ffd700', 18));
                }
                return;
            }

            this.clearCombo++;
            this.clearComboTimer = 240; // 4s window

            if (this.clearCombo < 4) {
                this.floatingTexts.push(new FloatingText(x, y - 35, `💥 連消進度 ${this.clearCombo}/4`, '#00f0ff', 18));
            } else if (this.clearCombo === 4) {
                this.sendAttackFromPlayerToAI(1, "💥 4連消達成！");
                this.floatingTexts.push(new FloatingText(x, y - 35, `⚔️ 4連消！送出 +1 排！`, '#ff2a85', 22));
                this.clearCombo = 0;
            }
        }
    }

    sendAttackFromPlayerToAI(count, reason) {
        if (this.modeMgr.currentMode !== 'vs' || this.gameOver || this.gameWon) return;
        if (this.aiController) {
            this.aiController.pushRowFromOpponent(count);
        }
        this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.45, `⚔️ 攻擊對手 +${count} 排!`, '#ff2a85', 20));
        const alertEl = document.getElementById('vs-attack-msg');
        if (alertEl) {
            alertEl.innerText = `玩家 ${reason} ➜ CPU +${count} 排!`;
            alertEl.style.color = '#00f0ff';
            clearTimeout(this._vsAlertTimeout);
            this._vsAlertTimeout = setTimeout(() => { if (alertEl) alertEl.innerText = ''; }, 3000);
        }
    }

    sendAttackFromAIToPlayer(count, reason) {
        if (this.modeMgr.currentMode !== 'vs' || this.gameOver || this.gameWon) return;
        this.pushRowFromOpponent(count);
        this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.45, `⚠️ 遭受壓迫 +${count} 排!`, '#ff0055', 20));
        const alertEl = document.getElementById('vs-attack-msg');
        if (alertEl) {
            alertEl.innerText = `CPU ${reason} ➜ 玩家 +${count} 排!`;
            alertEl.style.color = '#ff0055';
            clearTimeout(this._vsAlertTimeout);
            this._vsAlertTimeout = setTimeout(() => { if (alertEl) alertEl.innerText = ''; }, 3000);
        }
    }

    triggerSuddenDeathWave() {
        if (this.modeMgr.currentMode !== 'vs' || this.gameOver || this.gameWon) return;

        audio.playFission();

        // Push 1 row to Player
        this.pushRowFromOpponent(1);

        // Push 1 row to Computer (AI)
        if (this.aiController && !this.aiController.gameOver) {
            this.aiController.pushRowFromOpponent(1);
        }

        // Energetic visual and center HUD alerts
        this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.42, '⏱️ 驟死壓迫！雙方 +1 排！', '#ff9800', 22));

        const alertEl = document.getElementById('vs-attack-msg');
        if (alertEl) {
            alertEl.innerText = '⏱️ 驟死壓迫！雙方 +1 排！';
            alertEl.style.color = '#ff9800';
            clearTimeout(this._vsAlertTimeout);
            this._vsAlertTimeout = setTimeout(() => { if (alertEl) alertEl.innerText = ''; }, 2500);
        }
    }

    pushRowFromOpponent(count = 1) {
        if (this.gameOver || this.gameWon) return;
        audio.playFission();

        for (let k = 0; k < count; k++) {
            // 1. Create fresh 2D array to completely prevent ANY reference sharing
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

            // 4. Fill ONLY row 0 with newly generated attack bubbles! (25% obstacle rate)
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
                        this.particles.push(new Particle(nb.x, nb.y, '#ff0055', 'spark'));
                    }
                }
            }
        }

        // 6. Update world positions for all bubbles immediately so existing bubbles shift down smoothly
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

        // Check if any bubble breached danger line
        let breached = false;
        for (let r = 0; r < this.maxRows; r++) {
            for (let c = 0; c < this.maxCols; c++) {
                const b = this.grid[r]?.[c];
                if (b && !b.dead && !b.isFalling) {
                    if (b.y + this.bubbleRadius >= this.dangerLineY) {
                        breached = true;
                        break;
                    }
                }
            }
            if (breached) break;
        }

        if (breached && !this.gameOver && !this.gameWon) {
            if (this.modeMgr.currentMode === 'vs') {
                this.modeMgr.vsAiWins = (this.modeMgr.vsAiWins || 0) + 1;
                this.updateVSScoreboard();
                this.triggerGameOver(`防線失守！CPU 贏得此回合！ (${this.modeMgr.vsPlayerWins} : ${this.modeMgr.vsAiWins})`);
            } else {
                this.triggerGameOver("泡泡推進突破警戒線！");
            }
        }

        this.updateSmartPrimes();
        this.updateHUD();
    }

    handleVSPlayerVictory() {
        this.modeMgr.vsPlayerWins = (this.modeMgr.vsPlayerWins || 0) + 1;
        this.updateVSScoreboard();
        this.triggerGameWon(`🏆 擊敗 CPU 對手！ (${this.modeMgr.vsPlayerWins} : ${this.modeMgr.vsAiWins})`);
    }

    updateVSScoreboard() {
        const scoreEl = document.getElementById('vs-round-score');
        const scoreText = `${this.modeMgr.vsPlayerWins || 0} : ${this.modeMgr.vsAiWins || 0}`;
        if (scoreEl) {
            scoreEl.innerText = scoreText;
        }
        const topScore = document.getElementById('vs-top-score');
        if (topScore) {
            topScore.innerText = scoreText;
        }
    }

    showModal(title, msg, isWin, extraStatsHtml = null) {
        const modal = document.getElementById('game-modal');
        const modalContent = modal.querySelector('.modal-content');
        const modalTitle = document.getElementById('modal-title');
        const modalMsg = document.getElementById('modal-message');
        const statsBox = document.getElementById('modal-stats-container');
        const toggleBtn = document.getElementById('modal-btn-toggle-view');

        modalTitle.innerText = title;
        const mainColor = isWin ? '#00ff88' : '#ff0055';
        modalTitle.style.color = mainColor;
        if (modalContent) {
            modalContent.classList.remove('minimized');
            modalContent.style.borderColor = mainColor;
            modalContent.style.boxShadow = `0 10px 40px rgba(0, 0, 0, 0.9), 0 0 35px ${isWin ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 0, 85, 0.4)'}`;
        }
        if (toggleBtn) toggleBtn.innerText = '👁️ 檢視盤面';
        modalMsg.innerText = msg;

        if (statsBox) {
            if (extraStatsHtml) {
                statsBox.innerHTML = extraStatsHtml;
                statsBox.style.display = 'grid';
            } else {
                statsBox.innerHTML = '';
                statsBox.style.display = 'none';
            }
        }

        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    hideModal() {
        const modal = document.getElementById('game-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }

    togglePause() {
        this.paused = !this.paused;
        this.floatingTexts.push(new FloatingText(this.width / 2, this.height / 2, this.paused ? "PAUSED" : "RESUMED", '#fff', 24));
    }

    updateHUD() {
        const stageVal = document.getElementById('stage-val');
        if (stageVal) {
            stageVal.innerText = this.stage;
        }

        const scoreEl = document.getElementById('score-val');
        if (scoreEl) scoreEl.innerText = this.score;
        const comboEl = document.getElementById('combo-val');
        if (comboEl) comboEl.innerText = `x${this.combo}`;

        // Update Arcade Stage Target Progress Bar
        const stageProgressVal = document.getElementById('stage-progress-val');
        const stageProgressBar = document.getElementById('stage-progress-bar');
        if (stageProgressVal && stageProgressBar) {
            stageProgressVal.innerText = `${this.stageBubblesPopped || 0} / ${this.stageTarget || 8}`;
            const pct = Math.min(100, Math.round(((this.stageBubblesPopped || 0) / (this.stageTarget || 8)) * 100));
            stageProgressBar.style.width = `${pct}%`;
        }

        // Update Blitz Timer
        const blitzTimerVal = document.getElementById('blitz-timer-val');
        if (blitzTimerVal && this.modeMgr.currentMode === 'blitz') {
            blitzTimerVal.innerText = this.blitzTimer.toFixed(1) + 's';
        }

        // Highlight active button in full palette and scroll into view
        document.querySelectorAll('.prime-pill-btn').forEach(btn => {
            const p = parseInt(btn.dataset.prime, 10);
            if (p === this.currentPrime) {
                btn.classList.add('active');
                btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                btn.classList.remove('active');
            }
        });
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        if (this.modeMgr.currentMode === 'vs' && this.aiController) {
            this.aiController.render();
        }

        this.ctx.save();

        this.drawBackground();
        this.drawDangerLine();
        this.drawAimLine();

        // Draw Honeycomb Grid Bubbles
        for (let r = 0; r < this.maxRows; r++) {
            for (let c = 0; c < this.maxCols; c++) {
                const b = this.grid[r]?.[c];
                if (b && !b.dead && !b.isFalling) {
                    b.draw(this.ctx);
                }
            }
        }

        // Draw Falling/Avalanche Bubbles
        this.fallingBubbles.forEach(fb => fb.draw(this.ctx));

        this.lightningArcs.forEach(la => la.draw(this.ctx));
        this.bullets.forEach(b => b.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));
        this.floatingTexts.forEach(ft => ft.draw(this.ctx));

        // Draw Aiming Crosshair & Hover Tooltip
        this.drawHoverTargetHUD();

        // Draw Player Turret
        this.drawTurret();

        this.ctx.restore();
    }

    drawBackground() {
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        this.ctx.lineWidth = 1;
        const gridSize = 42;
        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        if (this.slowMoTimer > 0) {
            this.ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    drawDangerLine() {
        const time = Date.now() * 0.005;
        const pulse = 0.5 + Math.sin(time) * 0.4;

        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 0, 85, ${pulse})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.setLineDash([12, 8]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.dangerLineY);
        this.ctx.lineTo(this.width, this.dangerLineY);
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(255, 0, 85, 0.85)';
        this.ctx.font = 'bold 11px "Orbitron", sans-serif';
        this.ctx.fillText("⚠️ DANGER LINE 警戒防線 ⚠️", this.width - 120, this.dangerLineY - 6);
        this.ctx.restore();
    }

    drawAimLine() {
        const safeAngle = isFinite(this.aimAngle) ? this.aimAngle : -Math.PI / 2;
        const points = Physics.calculateAimTrajectory(
            this.turretX, this.turretY, safeAngle,
            this.width, this.height, 2, 700
        );

        this.ctx.save();
        const c = PRIME_COLORS[this.currentPrime] || PRIME_COLORS.DEFAULT;
        this.ctx.strokeStyle = c.glow;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 6]);

        this.ctx.beginPath();
        points.forEach((pt, i) => {
            if (i === 0) this.ctx.moveTo(pt.x, pt.y);
            else this.ctx.lineTo(pt.x, pt.y);
        });
        this.ctx.stroke();

        if (points.length > 0) {
            const endPt = points[points.length - 1];
            this.ctx.beginPath();
            this.ctx.arc(endPt.x, endPt.y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = c.main;
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawHoverTargetHUD() {
        if (!this.hoveredBubble || this.hoveredBubble.dead || this.hoveredBubble.value <= 1) return;

        const b = this.hoveredBubble;
        this.ctx.save();

        // Target locking circle (clean neon crosshair reticle, NO factor breakdown shown!)
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, b.radius + 5, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawTurret() {
        this.ctx.save();
        this.ctx.translate(this.turretX, this.turretY);

        this.ctx.beginPath();
        this.ctx.arc(0, 0, 32, 0, Math.PI * 2);
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fill();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.stroke();

        this.ctx.save();
        const safeAngle = isFinite(this.aimAngle) ? this.aimAngle : -Math.PI / 2;
        this.ctx.rotate(safeAngle);

        const c = PRIME_COLORS[this.currentPrime] || PRIME_COLORS.DEFAULT;
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(0, -7, 44, 14);
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = c.main;
        this.ctx.strokeRect(0, -7, 44, 14);

        this.ctx.fillStyle = c.main;
        this.ctx.fillRect(40, -9, 8, 18);

        this.ctx.restore();

        this.ctx.beginPath();
        this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
        this.ctx.fillStyle = c.main;
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.font = `bold ${this.currentPrime >= 10 ? 13 : 15}px "Orbitron", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.currentPrime, 0, 1);

        this.ctx.restore();
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        try {
            this.update();
            this.render();
        } catch (err) {
            console.error("Game loop error:", err);
        }
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    game.startMode('arcade');
    game.showModeSelectModal();
    game.loop();
});
