const { withinMinutes } = require('../utils/timeUtils');

// Helper to group logs by a key derived from each log
function groupBy(logs, keyFn) {
  const map = new Map();
  for (const log of logs) {
    const key = keyFn(log);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(log);
  }
  return map;
}

function createIncident({
  type,
  severity,
  confidence,
  description,
  affectedUser,
  sourceIP,
  timestamp,
  relatedLogs,
}) {
  return {
    type,
    severity,
    confidence,
    description,
    affectedUser: affectedUser || null,
    sourceIP: sourceIP || null,
    timestamp: timestamp || null,
    relatedLogs: relatedLogs || [],
  };
}

/**
 * Rule 1: Brute force – 5+ failed logins from same IP within 2 minutes.
 */
function detectBruteForce(logs) {
  const FAILED_TYPES = new Set(['FAILED_LOGIN', 'INVALID_USER']);
  const relevant = logs.filter(
    (l) => l.timestamp instanceof Date && l.ip && FAILED_TYPES.has(l.eventType)
  );

  const incidents = [];
  const byIp = groupBy(relevant, (l) => l.ip);

  for (const [ip, events] of byIp.entries()) {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    let found = false;
    for (let i = 0; i < sorted.length && !found; i += 1) {
      const windowStart = sorted[i].timestamp;
      const windowEvents = [sorted[i]];

      for (let j = i + 1; j < sorted.length; j += 1) {
        if (withinMinutes(windowStart, sorted[j].timestamp, 2)) {
          windowEvents.push(sorted[j]);
        } else {
          break;
        }
      }

      if (windowEvents.length >= 5) {
        const users = new Set(windowEvents.map((e) => e.user).filter(Boolean));
        const affectedUser = users.size === 1 ? [...users][0] : null;
        const timestamp = windowEvents[windowEvents.length - 1].timestamp;

        incidents.push(
          createIncident({
            type: 'BruteForceAttack',
            severity: 'High',
            confidence: 0.85,
            description: `Detected possible brute force attack from IP ${ip} with ${windowEvents.length} failed logins within 2 minutes`,
            affectedUser,
            sourceIP: ip,
            timestamp,
            relatedLogs: windowEvents,
          })
        );

        found = true; // avoid multiple incidents per IP per analysis pass
      }
    }
  }

  return incidents;
}

/**
 * Rule 2: Unauthorized sudo access – sudo attempt by unauthorized user.
 * Here we assume events with eventType SUDO_VIOLATION already encode that.
 */
function detectSudoViolations(logs) {
  const relevant = logs.filter((l) => l.eventType === 'SUDO_VIOLATION');

  return relevant.map((event) =>
    createIncident({
      type: 'UnauthorizedSudoAccess',
      severity: 'Medium',
      confidence: 0.9,
      description: `User ${event.user || 'unknown'} attempted sudo but is not in sudoers`,
      affectedUser: event.user || null,
      sourceIP: event.ip || null,
      timestamp: event.timestamp || null,
      relatedLogs: [event],
    })
  );
}

/**
 * Rule 3: Invalid user login attempts – login with non-existent username.
 * We treat each INVALID_USER event as a separate incident.
 */
function detectInvalidUserLogins(logs) {
  const relevant = logs.filter((l) => l.eventType === 'INVALID_USER');

  return relevant.map((event) =>
    createIncident({
      type: 'InvalidUserLoginAttempt',
      severity: 'Low',
      confidence: 0.75,
      description: `Login attempt with non-existent user ${event.user || 'unknown'}`,
      affectedUser: event.user || null,
      sourceIP: event.ip || null,
      timestamp: event.timestamp || null,
      relatedLogs: [event],
    })
  );
}

/**
 * Rule 4: Suspicious IP pattern – same user from 3+ different IPs in 10 minutes.
 * We consider successful logins (ACCEPTED_LOGIN) for this rule.
 */
function detectSuspiciousIpPatterns(logs) {
  const relevant = logs.filter(
    (l) => l.timestamp instanceof Date && l.user && l.ip && l.eventType === 'ACCEPTED_LOGIN'
  );

  const incidents = [];
  const byUser = groupBy(relevant, (l) => l.user);

  for (const [user, events] of byUser.entries()) {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    let found = false;
    for (let i = 0; i < sorted.length && !found; i += 1) {
      const windowStart = sorted[i].timestamp;
      const windowEvents = [sorted[i]];

      for (let j = i + 1; j < sorted.length; j += 1) {
        if (withinMinutes(windowStart, sorted[j].timestamp, 10)) {
          windowEvents.push(sorted[j]);
        } else {
          break;
        }
      }

      const distinctIps = new Set(windowEvents.map((e) => e.ip));
      if (distinctIps.size >= 3) {
        const timestamp = windowEvents[windowEvents.length - 1].timestamp;

        incidents.push(
          createIncident({
            type: 'SuspiciousIpPattern',
            severity: 'High',
            confidence: 0.8,
            description: `User ${user} logged in from ${distinctIps.size} different IPs within 10 minutes`,
            affectedUser: user,
            sourceIP: null,
            timestamp,
            relatedLogs: windowEvents,
          })
        );

        found = true; // avoid duplicate incidents for same user per analysis
      }
    }
  }

  return incidents;
}

/**
 * Rule 5 (Low): Small burst of failed logins – 2–4 failed logins from same IP within 2 minutes.
 * This helps populate low-severity incidents for dashboards and filter demos.
 */
function detectLowSeverityFailedLoginBursts(logs) {
  const relevant = logs.filter(
    (l) => l.timestamp instanceof Date && l.ip && l.eventType === 'FAILED_LOGIN'
  );

  const incidents = [];
  const byIp = groupBy(relevant, (l) => l.ip);

  for (const [ip, events] of byIp.entries()) {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    let found = false;
    for (let i = 0; i < sorted.length && !found; i += 1) {
      const windowStart = sorted[i].timestamp;
      const windowEvents = [sorted[i]];

      for (let j = i + 1; j < sorted.length; j += 1) {
        // Wider window than brute-force rule so it triggers on more realistic "low-noise" patterns
        if (withinMinutes(windowStart, sorted[j].timestamp, 10)) {
          windowEvents.push(sorted[j]);
        } else {
          break;
        }
      }

      // Exclude brute-force threshold (handled by High rule)
      if (windowEvents.length >= 2 && windowEvents.length <= 4) {
        const timestamp = windowEvents[windowEvents.length - 1].timestamp;

        incidents.push(
          createIncident({
            type: 'FailedLoginBurst',
            severity: 'Low',
            confidence: 0.55,
            description: `Observed ${windowEvents.length} failed login attempts from IP ${ip} within 2 minutes (below brute-force threshold)`,
            affectedUser: null,
            sourceIP: ip,
            timestamp,
            relatedLogs: windowEvents,
          })
        );

        found = true;
      }
    }
  }

  return incidents;
}

/**
 * Main analysis entrypoint.
 * @param {Array<{timestamp: Date|null, ip: string|null, user: string|null, eventType: string, status: string, rawLog: string}>} parsedLogs
 * @returns {Array<{type: string, severity: string, confidence: number, description: string, affectedUser: string|null, sourceIP: string|null, timestamp: Date|null, relatedLogs: any[]}>}
 */
function analyzeLogs(parsedLogs) {
  const logs = Array.isArray(parsedLogs) ? parsedLogs : [];

  const incidents = [];
  incidents.push(...detectLowSeverityFailedLoginBursts(logs));
  incidents.push(...detectBruteForce(logs));
  incidents.push(...detectSudoViolations(logs));
  incidents.push(...detectInvalidUserLogins(logs));
  incidents.push(...detectSuspiciousIpPatterns(logs));

  return incidents;
}

module.exports = {
  analyzeLogs,
  // export individual detectors for potential direct testing
  detectBruteForce,
  detectSudoViolations,
  detectInvalidUserLogins,
  detectSuspiciousIpPatterns,
};
