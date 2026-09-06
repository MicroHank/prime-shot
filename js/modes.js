/**
 * Game Modes Logic & Configurations
 * 1. Arcade Survival (無盡防守)
 * 2. VS AI Duel (對戰模式)
 */

import { Bubble } from './entities.js';
import { MathUtil } from './math_util.js';

export class ModeController {
    constructor() {
        this.currentMode = 'arcade'; // 'arcade' or 'vs'
        this.vsPlayerWins = 0;
        this.vsAiWins = 0;
    }

    setMode(mode) {
        this.currentMode = mode;
    }

    // Arcade spawning logic
    generateArcadeBubble(width, score) {
        const x = MathUtil.randomRange(60, width - 60);
        const y = -30;

        // 9% chance for special item
        const randItem = Math.random();
        if (randItem < 0.02) {
            return new Bubble(x, y, 0, 'item_bomb');
        } else if (randItem < 0.04) {
            return new Bubble(x, y, 0, 'item_clock');
        } else if (randItem < 0.06) {
            return new Bubble(x, y, 0, 'item_sieve');
        } else if (randItem < 0.08) {
            return new Bubble(x, y, 0, 'item_catalyst');
        } else if (randItem < 0.12) {
            return new Bubble(x, y, 0, 'obstacle');
        }

        // 8% chance for prime shield
        if (Math.random() < 0.08) {
            const primeShields = [11, 13, 17, 19, 23, 29, 31];
            const p = MathUtil.randomChoice(primeShields);
            return new Bubble(x, y, p, 'prime_shield');
        }

        // Number pool scales with score
        let pool = [];
        if (score < 800) {
            pool = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20];
        } else if (score < 2500) {
            pool = [18, 24, 28, 30, 32, 36, 40, 42, 45, 48, 50, 60];
        } else if (score < 6000) {
            pool = [36, 48, 60, 72, 84, 90, 100, 108, 120, 140, 150];
        } else {
            pool = [120, 144, 168, 180, 210, 240, 300, 360, 420, 840];
        }

        const value = MathUtil.randomChoice(pool);
        return new Bubble(x, y, value, 'normal');
    }
}
