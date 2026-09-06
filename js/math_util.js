/**
 * Prime Math Utilities for Prime Split Shooter
 * Supports all 25 primes from 2 up to 97!
 */

export const ALL_PRIMES = [
    2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
    31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
    73, 79, 83, 89, 97
];

export const PRIME_TIERS = {
    TIER_1: { name: '個位主力', primes: [2, 3, 5, 7] },
    TIER_2: { name: '十位質數', primes: [11, 13, 17, 19] },
    TIER_3: { name: '二十至四十', primes: [23, 29, 31, 37, 41, 43, 47] },
    TIER_4: { name: '五十至九十', primes: [53, 59, 61, 67, 71, 73, 79, 83, 89, 97] }
};

// Distinct vibrant neon hues mapped across the 25 primes
export const PRIME_COLORS = {
    2: { main: '#00f0ff', glow: 'rgba(0, 240, 255, 0.6)', dark: '#007788', name: '青藍' },
    3: { main: '#00ff88', glow: 'rgba(0, 255, 136, 0.6)', dark: '#008844', name: '翡翠' },
    5: { main: '#ffaa00', glow: 'rgba(255, 170, 0, 0.6)', dark: '#995500', name: '琥珀' },
    7: { main: '#b844ff', glow: 'rgba(184, 68, 255, 0.6)', dark: '#661199', name: '紫晶' },
    11: { main: '#ff2a85', glow: 'rgba(255, 42, 133, 0.6)', dark: '#991144', name: '洋紅' },
    13: { main: '#ffdd00', glow: 'rgba(255, 221, 0, 0.6)', dark: '#887700', name: '純金' },
    17: { main: '#00e1ff', glow: 'rgba(0, 225, 255, 0.6)', dark: '#006688', name: '青空' },
    19: { main: '#ff5533', glow: 'rgba(255, 85, 51, 0.6)', dark: '#992211', name: '赤焰' },
    23: { main: '#e040fb', glow: 'rgba(224, 64, 251, 0.6)', dark: '#7b1fa2', name: '霓紫' },
    29: { main: '#1de9b6', glow: 'rgba(29, 233, 182, 0.6)', dark: '#00796b', name: '碧波' },
    31: { main: '#ff6e40', glow: 'rgba(255, 110, 64, 0.6)', dark: '#d84315', name: '紅橙' },
    37: { main: '#69f0ae', glow: 'rgba(105, 240, 174, 0.6)', dark: '#00c853', name: '薄荷' },
    41: { main: '#40c4ff', glow: 'rgba(64, 196, 255, 0.6)', dark: '#0288d1', name: '天青' },
    43: { main: '#ea80fc', glow: 'rgba(234, 128, 252, 0.6)', dark: '#aa00ff', name: '曜紫' },
    47: { main: '#ffd740', glow: 'rgba(255, 215, 64, 0.6)', dark: '#ffab00', name: '熾黃' },
    53: { main: '#ff5252', glow: 'rgba(255, 82, 82, 0.6)', dark: '#d50000', name: '緋紅' },
    59: { main: '#7c4dff', glow: 'rgba(124, 77, 255, 0.6)', dark: '#6200ea', name: '幽紫' },
    61: { main: '#64ffda', glow: 'rgba(100, 255, 218, 0.6)', dark: '#00bfa5', name: '冰青' },
    67: { main: '#eeff41', glow: 'rgba(238, 255, 65, 0.6)', dark: '#aeea00', name: '螢綠' },
    71: { main: '#ff4081', glow: 'rgba(255, 64, 129, 0.6)', dark: '#c51162', name: '玫紅' },
    73: { main: '#00b0ff', glow: 'rgba(0, 176, 255, 0.6)', dark: '#0091ea', name: '深蔚' },
    79: { main: '#ff9100', glow: 'rgba(255, 145, 0, 0.6)', dark: '#ff6d00', name: '金烏' },
    83: { main: '#b388ff', glow: 'rgba(179, 136, 255, 0.6)', dark: '#7c4dff', name: '薰紫' },
    89: { main: '#00e676', glow: 'rgba(0, 230, 118, 0.6)', dark: '#00c853', name: '電晶' },
    97: { main: '#ff1744', glow: 'rgba(255, 23, 68, 0.7)', dark: '#d50000', name: '極皇' },
    DEFAULT: { main: '#ffffff', glow: 'rgba(255, 255, 255, 0.5)', dark: '#555555', name: '皓白' },
    PRIME_SHIELD: { main: '#ff0055', glow: 'rgba(255, 0, 85, 0.7)', dark: '#880022', name: '質數盾' },
    ITEM_OBSTACLE: { main: '#78909c', glow: 'rgba(120, 144, 156, 0.5)', dark: '#263238', name: '阻礙泡泡' },
    ITEM_CATALYST: { main: '#ffd700', glow: 'rgba(255, 215, 0, 0.8)', dark: '#b8860b', name: '+1催化劑' },
    ITEM_CLOCK: { main: '#00e5ff', glow: 'rgba(0, 229, 255, 0.8)', dark: '#00838f', name: '時空減速' },
    ITEM_SIEVE: { main: '#76ff03', glow: 'rgba(118, 255, 3, 0.8)', dark: '#33691e', name: '埃氏光波' },
    ITEM_BOMB: { main: '#ff3d00', glow: 'rgba(255, 61, 0, 0.8)', dark: '#bf360c', name: '質數炸彈' }
};

export const MathUtil = {
    isPrime(n) {
        if (n <= 1) return false;
        if (n <= 3) return true;
        if (n % 2 === 0 || n % 3 === 0) return false;
        for (let i = 5; i * i <= n; i += 6) {
            if (n % i === 0 || n % (i + 2) === 0) return false;
        }
        return true;
    },

    getPrimeFactors(n) {
        const factors = [];
        let d = 2;
        let temp = n;
        while (temp >= 2) {
            if (temp % d === 0) {
                factors.push(d);
                temp = Math.floor(temp / d);
            } else {
                d = (d === 2) ? 3 : d + 2;
                if (d * d > temp) {
                    if (temp > 1) factors.push(temp);
                    break;
                }
            }
        }
        return factors;
    },

    getUniqueFactors(n) {
        return [...new Set(this.getPrimeFactors(n))];
    },

    getSmallestPrimeFactor(n) {
        if (n <= 1) return 1;
        if (n % 2 === 0) return 2;
        if (n % 3 === 0) return 3;
        for (let i = 5; i * i <= n; i += 6) {
            if (n % i === 0) return i;
            if (n % (i + 2) === 0) return i + 2;
        }
        return n;
    },

    getColorForNumber(n, isPrimeShield = false) {
        if (isPrimeShield) return PRIME_COLORS.PRIME_SHIELD;
        if (PRIME_COLORS[n]) {
            return PRIME_COLORS[n];
        }
        const smallest = this.getSmallestPrimeFactor(n);
        return PRIME_COLORS[smallest] || PRIME_COLORS.DEFAULT;
    },

    // Scan an array of bubbles and return the most relevant prime factors (top 6)
    getSmartActivePrimes(bubbles, maxCount = 6) {
        const factorCounts = new Map();

        // Always have 2 and 3 as baseline fallback
        factorCounts.set(2, 1);
        factorCounts.set(3, 1);

        bubbles.forEach(b => {
            if (!b || b.dead || b.isFalling) return;
            if (b.type === 'prime_shield' || (b.value > 1 && MathUtil.isPrime(b.value))) {
                factorCounts.set(b.value, (factorCounts.get(b.value) || 0) + 4);
            } else if (b.value > 1) {
                const ufs = MathUtil.getUniqueFactors(b.value);
                ufs.forEach(f => {
                    factorCounts.set(f, (factorCounts.get(f) || 0) + 2);
                });
            }
        });

        // Sort primes by frequency descending, then by value
        const sorted = [...factorCounts.entries()]
            .filter(([p]) => p <= 97)
            .sort((a, b) => b[1] - a[1] || a[0] - b[0])
            .map(([p]) => p);

        // Ensure minimum 4 primes
        const defaults = [2, 3, 5, 7];
        for (const def of defaults) {
            if (!sorted.includes(def)) sorted.push(def);
        }

        return sorted.slice(0, maxCount);
    },

    randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};
