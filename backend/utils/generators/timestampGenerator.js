/**
 * Timestamp generator utilities for log generation.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Format a Date into auth.log-style timestamp.
 * Example: "Jan 15 08:23:45"
 *
 * @param {Date} [date]
 * @returns {string}
 */
function generateAuthTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);

  const mon = MONTHS[d.getMonth()];
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());

  return `${mon} ${day} ${hh}:${mm}:${ss}`;
}

function formatTimezoneOffset(date) {
  // JS returns minutes *behind* UTC (e.g., IST is -330)
  const offsetMinutes = date.getTimezoneOffset();
  const total = Math.abs(offsetMinutes);
  const sign = offsetMinutes <= 0 ? '+' : '-';
  const hours = pad2(Math.floor(total / 60));
  const mins = pad2(total % 60);
  return `${sign}${hours}${mins}`;
}

/**
 * Format a Date into Apache access-log timestamp.
 * Example: "[15/Jan/2025:10:30:15 +0000]"
 *
 * @param {Date} [date]
 * @returns {string}
 */
function generateAccessTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);

  const day = pad2(d.getDate());
  const mon = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  const tz = formatTimezoneOffset(d);

  return `[${day}/${mon}/${year}:${hh}:${mm}:${ss} ${tz}]`;
}

/**
 * Generate sequential timestamps as Date objects.
 *
 * @param {number} count
 * @param {Date} [startDate]
 * @param {number} [intervalSeconds]
 * @returns {Date[]}
 */
function generateSequentialTimestamps(count, startDate = new Date(), intervalSeconds = 1) {
  const n = Math.max(0, Number(count || 0));
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const stepMs = Number(intervalSeconds) * 1000;

  const result = [];
  for (let i = 0; i < n; i += 1) {
    result.push(new Date(start.getTime() + i * stepMs));
  }

  return result;
}

/**
 * Generate a random timestamp (Date) within a range.
 *
 * Supported inputs:
 * - { start: Date, end: Date }
 * - { from: Date, to: Date }
 * - [startDate, endDate]
 *
 * @param {{start?: Date, end?: Date, from?: Date, to?: Date} | [Date, Date]} dateRange
 * @returns {Date}
 */
function generateRandomTimestamp(dateRange) {
  let start;
  let end;

  if (Array.isArray(dateRange)) {
    [start, end] = dateRange;
  } else if (dateRange && typeof dateRange === 'object') {
    start = dateRange.start || dateRange.from;
    end = dateRange.end || dateRange.to;
  }

  const startDate = start instanceof Date ? start : new Date(start || Date.now() - 3600 * 1000);
  const endDate = end instanceof Date ? end : new Date(end || Date.now());

  const min = Math.min(startDate.getTime(), endDate.getTime());
  const max = Math.max(startDate.getTime(), endDate.getTime());

  const t = min + Math.floor(Math.random() * (max - min + 1));
  return new Date(t);
}

module.exports = {
  generateAuthTimestamp,
  generateAccessTimestamp,
  generateSequentialTimestamps,
  generateRandomTimestamp,
};
