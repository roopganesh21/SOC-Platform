const {
  generateAdminAttack,
  generateNormalWebTraffic,
} = require('../utils/generators/accessLogGenerator');

console.log('=== ADMIN ATTACK ===');
for (const line of generateAdminAttack('45.142.212.61', 10)) {
  console.log(line);
}

console.log('\n=== NORMAL TRAFFIC ===');
for (const line of generateNormalWebTraffic(5)) {
  console.log(line);
}
