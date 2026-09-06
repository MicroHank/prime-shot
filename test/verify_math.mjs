import { MathUtil, ALL_PRIMES } from '../js/math_util.js';

console.log('Testing MathUtil functions:');
console.assert(MathUtil.isPrime(2) === true, '2 should be prime');
console.assert(MathUtil.isPrime(3) === true, '3 should be prime');
console.assert(MathUtil.isPrime(4) === false, '4 should not be prime');
console.assert(MathUtil.isPrime(97) === true, '97 should be prime');
console.assert(ALL_PRIMES.length === 25, 'Should have exactly 25 primes <= 97');

const f48 = MathUtil.getPrimeFactors(48);
console.log('Factors of 48:', f48);
console.assert(JSON.stringify(f48) === JSON.stringify([2, 2, 2, 2, 3]), '48 factors mismatch');

const f2520 = MathUtil.getPrimeFactors(2520);
console.log('Factors of 2520:', f2520);
console.assert(JSON.stringify(f2520) === JSON.stringify([2, 2, 2, 3, 3, 5, 7]), '2520 factors mismatch');

console.assert(JSON.stringify(MathUtil.getUniqueFactors(48)) === JSON.stringify([2, 3]), 'Unique factors mismatch');
console.assert(MathUtil.getSmallestPrimeFactor(49) === 7, 'Smallest factor of 49 should be 7');
console.assert(MathUtil.getSmallestPrimeFactor(77) === 7, 'Smallest factor of 77 should be 7');

console.log('ALL MATH TESTS PASSED (PUZZLE & BOSS REMOVED)!');
