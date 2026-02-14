const {
  SSH_FAILED_PASSWORD,
  SSH_ACCEPTED_PASSWORD,
  SUDO_VIOLATION,
  parseTimestamp,
} = require('../utils/logPatterns');

// Map event types to generic status labels
function getStatusForEventType(eventType) {
  switch (eventType) {
    case 'ACCEPTED_LOGIN':
      return 'SUCCESS';
    case 'FAILED_LOGIN':
    case 'INVALID_USER':
      return 'FAIL';
    case 'SUDO_VIOLATION':
      return 'DENIED';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Parse Linux auth.log-style content into structured log events.
 *
 * @param {string} content - Raw log file content.
 * @returns {Array<{timestamp: Date|null, ip: string|null, user: string|null, eventType: string, status: string, rawLog: string}>}
 */
function parseAuthLog(content) {
  const lines = content.split(/\r?\n/);
  const events = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const timestamp = parseTimestamp(trimmed);

    let eventType = null;
    let ip = null;
    let user = null;

    // SSH failed password (including invalid user)
    const failedMatch = trimmed.match(SSH_FAILED_PASSWORD);
    if (failedMatch) {
      const isInvalidUser = Boolean(failedMatch[1]);
      const groups = failedMatch.groups || {};

      user = groups.user || null;
      ip = groups.ip || null;
      eventType = isInvalidUser ? 'INVALID_USER' : 'FAILED_LOGIN';
    }

    // SSH accepted password
    if (!eventType) {
      const acceptedMatch = trimmed.match(SSH_ACCEPTED_PASSWORD);
      if (acceptedMatch) {
        const groups = acceptedMatch.groups || {};
        user = groups.user || null;
        ip = groups.ip || null;
        eventType = 'ACCEPTED_LOGIN';
      }
    }

    // Sudo violation
    if (!eventType) {
      const sudoMatch = trimmed.match(SUDO_VIOLATION);
      if (sudoMatch) {
        const groups = sudoMatch.groups || {};
        user = groups.user || null;
        eventType = 'SUDO_VIOLATION';
      }
    }

    if (!eventType) {
      // Unrecognized or unsupported line – skip but do not crash
      continue;
    }

    const status = getStatusForEventType(eventType);

    events.push({
      timestamp: timestamp || null,
      ip,
      user,
      eventType,
      status,
      rawLog: trimmed,
    });
  }

  return events;
}

module.exports = {
  parseAuthLog,
};
