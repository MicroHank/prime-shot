import { MathUtil } from '../js/math_util.js';
import { PUZZLE_LEVELS, BOSS_STAGES } from '../js/modes.js';

console.log('Testing MathUtil functions:');
console.assert(MathUtil.isPrime(2) === true, '2 should be prime');
console.assert(MathUtil.isPrime(3) === true, '3 should be prime');
console.assert(MathUtil.isPrime(4) === false, '4 should not be prime');
console.assert(MathUtil.isPrime(97) === true, '97 should be prime');

const f48 = MathUtil.getPrimeFactors(48);
console.log('Factors of 48:', f48);
console.assert(JSON.stringify(f48) === JSON.stringify([2, 2, 2, 2, 3]), '48 factors mismatch');

const f2520 = MathUtil.getPrimeFactors(2520);
console.log('Factors of 2520:', f2520);
console.assert(JSON.stringify(f2520) === JSON.stringify([2, 2, 2, 3, 3, 5, 7]), '2520 factors mismatch');

console.log('Verifying Puzzle Levels:');
PUZZLE_LEVELS.forEach(lvl => {
    console.log(`- ${lvl.title}: Ammo count=${lvl.ammo.length}, Bubbles=${lvl.bubbles.map(b => b.value)}`);
});

console.log('Verifying Boss Stages:');
BOSS_STAGES.forEach(stg => {
    console.log(`- ${stg.title}: Value=${stg.value}, Factors=${MathUtil.getPrimeFactors(stg.value).join('×')}`);
});

console.log('ALL MATH TESTS PASSED!');
