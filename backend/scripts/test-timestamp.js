const {
  generateAuthTimestamp,
  generateSequentialTimestamps,
} = require('../utils/generators/timestampGenerator');

console.log('Single timestamp:', generateAuthTimestamp());
console.log('Sequential:', generateSequentialTimestamps(5, new Date(), 2));
