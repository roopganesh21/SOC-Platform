// Utility helpers for working with timestamps and time windows

/**
 * Calculate the absolute difference between two dates in minutes.
 * @param {Date} a
 * @param {Date} b
 * @returns {number} difference in minutes
 */
function diffMinutes(a, b) {
  if (!(a instanceof Date) || !(b instanceof Date)) return NaN;
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return diffMs / (60 * 1000);
}

/**
 * Check if two dates fall within X minutes of each other.
 * @param {Date} a
 * @param {Date} b
 * @param {number} minutes
 * @returns {boolean}
 */
function withinMinutes(a, b, minutes) {
  const d = diffMinutes(a, b);
  if (Number.isNaN(d)) return false;
  return d <= minutes;
}

/**
 * Group logs by time windows. Assumes each log has a `timestamp` Date.
 * Returns an array of windows, each being an array of logs where
 * the difference between the first and last timestamp in the window
 * is no more than `windowMinutes`.
 *
 * @param {Array<{ timestamp: Date | null }>} logs
 * @param {number} windowMinutes
 * @returns {Array<Array<any>>}
 */
function groupByTimeWindow(logs, windowMinutes) {
  const valid = logs.filter((l) => l.timestamp instanceof Date).sort((a, b) => a.timestamp - b.timestamp);
  const windows = [];

  let currentWindow = [];

  for (const log of valid) {
    if (currentWindow.length === 0) {
      currentWindow.push(log);
      continue;
    }

    const windowStart = currentWindow[0].timestamp;
    if (withinMinutes(windowStart, log.timestamp, windowMinutes)) {
      currentWindow.push(log);
    } else {
      windows.push(currentWindow);
      currentWindow = [log];
    }
  }

  if (currentWindow.length > 0) {
    windows.push(currentWindow);
  }

  return windows;
}

/**
 * Format a timestamp to ISO string or return null if invalid.
 * @param {Date | null | undefined} date
 * @returns {string | null}
 */
function formatTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

module.exports = {
  diffMinutes,
  withinMinutes,
  groupByTimeWindow,
  formatTimestamp,
};
