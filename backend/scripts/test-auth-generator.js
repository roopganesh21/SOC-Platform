const {
  generateBruteForceSequence,
  generateNormalAuthActivity,
} = require('../utils/generators/authLogGenerator');

console.log('=== BRUTE FORCE ===');
console.log(generateBruteForceSequence('45.142.212.61', 'root', 10).join('\n'));

console.log('\n=== NORMAL ACTIVITY ===');
console.log(generateNormalAuthActivity(5).join('\n'));
