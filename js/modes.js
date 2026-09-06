/**
 * Game Modes Logic & Configurations
 * 1. Arcade Survival (無盡防守)
 * 2. Blitz Mode (60秒極限競速)
 * 3. VS AI Duel (對戰模式)
 */

import { Bubble } from './entities.js';
import { MathUtil } from './math_util.js';

export class ModeController {
    constructor() {
        this.currentMode = 'arcade'; // 'arcade' | 'blitz' | 'vs'
        this.vsPlayerWins = 0;
        this.vsAiWins = 0;
    }

    setMode(mode) {
        this.currentMode = mode;
    }

    /**
     * Generate appropriate bubble based on game mode and stage
     */
    createBubbleForGrid(mode, stage, isAttackRow, row, col, radius) {
        const rand = Math.random();

        // -------------------------------------------------------------
        // 1. Blitz Mode (60s Time Attack)
        // High item drop rate, rich composite chain targets, 0 obstacles
        // -------------------------------------------------------------
        if (mode === 'blitz') {
            if (rand < 0.04) {
                return new Bubble(0, 0, 0, 'item_bomb', row, col, radius);
            } else if (rand < 0.08) {
                return new Bubble(0, 0, 0, 'item_catalyst', row, col, radius);
            } else if (rand < 0.12) {
                return new Bubble(0, 0, 0, 'item_clock', row, col, radius);
            } else if (rand < 0.15) {
                return new Bubble(0, 0, 0, 'item_sieve', row, col, radius);
            } else if (rand < 0.22) {
                const shields = [11, 13, 17, 19, 23];
                const p = MathUtil.randomChoice(shields);
                return new Bubble(0, 0, p, 'prime_shield', row, col, radius);
            } else {
                const blitzPool = [
                    6, 8, 12, 14, 16, 18, 20, 24, 28, 30, 32, 36, 40,
                    42, 45, 48, 50, 54, 60, 72, 80, 84, 90, 100, 120
                ];
                const val = MathUtil.randomChoice(blitzPool);
                return new Bubble(0, 0, val, 'normal', row, col, radius);
            }
        }

        // -------------------------------------------------------------
        // 2. Versus Mode (VS AI Duel)
        // -------------------------------------------------------------
        if (mode === 'vs') {
            if (isAttackRow) {
                if (rand < 0.25) {
                    return new Bubble(0, 0, 0, 'obstacle', row, col, radius);
                } else if (rand < 0.40) {
                    const shields = [11, 13, 17, 19, 23, 29, 31];
                    const p = MathUtil.randomChoice(shields);
                    return new Bubble(0, 0, p, 'prime_shield', row, col, radius);
                } else {
                    const pool = [4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21, 24, 25, 27, 28, 30, 32, 35, 36, 40, 42, 45, 48, 50, 54, 60];
                    const val = MathUtil.randomChoice(pool);
                    return new Bubble(0, 0, val, 'normal', row, col, radius);
                }
            } else {
                if (rand < 0.02) {
                    return new Bubble(0, 0, 0, 'item_bomb', row, col, radius);
                } else if (rand < 0.04) {
                    return new Bubble(0, 0, 0, 'item_clock', row, col, radius);
                } else if (rand < 0.06) {
                    return new Bubble(0, 0, 0, 'item_sieve', row, col, radius);
                } else if (rand < 0.08) {
                    return new Bubble(0, 0, 0, 'item_catalyst', row, col, radius);
                } else if (rand < 0.14) {
                    return new Bubble(0, 0, 0, 'obstacle', row, col, radius);
                } else if (rand < 0.24) {
                    const shields = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
                    const p = MathUtil.randomChoice(shields);
                    return new Bubble(0, 0, p, 'prime_shield', row, col, radius);
                } else {
                    const pool = [
                        4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30,
                        33, 34, 35, 36, 38, 39, 42, 45, 46, 48, 49, 50, 51, 52, 54, 55, 57,
                        58, 60, 62, 63, 65, 66, 68, 69, 70, 72, 74, 75, 77, 82, 85, 87, 91, 95
                    ];
                    const val = MathUtil.randomChoice(pool);
                    return new Bubble(0, 0, val, 'normal', row, col, radius);
                }
            }
        }

        // -------------------------------------------------------------
        // 3. Arcade Mode (Endless Stage Progression)
        // -------------------------------------------------------------
        const curStage = Math.max(1, stage || 1);

        // Stage 1: Basic introductory composites (No obstacles, no shields)
        if (curStage === 1) {
            if (rand < 0.03) {
                return new Bubble(0, 0, 0, 'item_bomb', row, col, radius);
            } else if (rand < 0.06) {
                return new Bubble(0, 0, 0, 'item_catalyst', row, col, radius);
            }
            const s1Pool = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30];
            const val = MathUtil.randomChoice(s1Pool);
            return new Bubble(0, 0, val, 'normal', row, col, radius);
        }

        // Stage 2: Medium composites, unlock Clock & Bomb
        if (curStage === 2) {
            if (rand < 0.03) {
                return new Bubble(0, 0, 0, 'item_bomb', row, col, radius);
            } else if (rand < 0.06) {
                return new Bubble(0, 0, 0, 'item_clock', row, col, radius);
            } else if (rand < 0.09) {
                return new Bubble(0, 0, 0, 'item_catalyst', row, col, radius);
            }
            const s2Pool = [18, 24, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 60, 63, 70];
            const val = MathUtil.randomChoice(s2Pool);
            return new Bubble(0, 0, val, 'normal', row, col, radius);
        }

        // Stage 3: Prime Shields and Sieve Wave appear
        if (curStage === 3) {
            if (rand < 0.03) {
                return new Bubble(0, 0, 0, 'item_bomb', row, col, radius);
            } else if (rand < 0.06) {
                return new Bubble(0, 0, 0, 'item_sieve', row, col, radius);
            } else if (rand < 0.09) {
                return new Bubble(0, 0, 0, 'item_clock', row, col, radius);
            } else if (rand < 0.17) {
                const shields = [11, 13, 17, 19, 23, 29, 31];
                const p = MathUtil.randomChoice(shields);
                return new Bubble(0, 0, p, 'prime_shield', row, col, radius);
            }
            const s3Pool = [30, 36, 42, 48, 56, 60, 66, 72, 75, 84, 90, 96, 100, 108, 120];
            const val = MathUtil.randomChoice(s3Pool);
            return new Bubble(0, 0, val, 'normal', row, col, radius);
        }

        // Stage 4+: Obstacles appear, high order composites
        if (rand < 0.02) {
            return new Bubble(0, 0, 0, 'item_bomb', row, col, radius);
        } else if (rand < 0.04) {
            return new Bubble(0, 0, 0, 'item_clock', row, col, radius);
        } else if (rand < 0.06) {
            return new Bubble(0, 0, 0, 'item_sieve', row, col, radius);
        } else if (rand < 0.08) {
            return new Bubble(0, 0, 0, 'item_catalyst', row, col, radius);
        } else if (rand < 0.15) {
            return new Bubble(0, 0, 0, 'obstacle', row, col, radius);
        } else if (rand < 0.25) {
            const shields = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];
            const p = MathUtil.randomChoice(shields);
            return new Bubble(0, 0, p, 'prime_shield', row, col, radius);
        } else {
            let pool;
            if (curStage === 4) {
                pool = [36, 48, 60, 72, 84, 90, 100, 108, 120, 140, 150, 168, 180];
            } else {
                pool = [120, 144, 168, 180, 210, 240, 300, 360, 420, 504, 720, 840];
            }
            const val = MathUtil.randomChoice(pool);
            return new Bubble(0, 0, val, 'normal', row, col, radius);
        }
    }
}
