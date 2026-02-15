/**
 * Attack pattern configuration for the Log Generator feature.
 *
 * These values are intentionally "demo-realistic" (not authoritative threat intel)
 * and are designed to generate repeatable test scenarios.
 */

/**
 * @typedef {Object} AttackPattern
 * @property {string} name Human-friendly name.
 * @property {string} description What the scenario simulates.
 * @property {number} logCount Approx number of log lines to generate.
 * @property {number} durationSeconds Approx time window the events span.
 * @property {number} [failureRate] For auth-like patterns, fraction of failed attempts (0..1).
 */

/**
 * Canonical attack pattern definitions.
 * @type {Record<string, AttackPattern>}
 */
const ATTACK_PATTERNS = {
  BRUTE_FORCE: {
    name: 'SSH Brute Force',
    description: 'Repeated failed SSH login attempts from a single IP',
    logCount: 25,
    durationSeconds: 120,
    failureRate: 0.95,
  },

  ADMIN_ATTACK: {
    name: 'Admin Panel Attack',
    description: 'High-volume unauthorized requests targeting /admin paths',
    logCount: 60,
    durationSeconds: 180,
  },

  SUDO_VIOLATION: {
    name: 'Privilege Escalation (Sudo Violations)',
    description: 'Multiple sudo violations (user NOT in sudoers) indicating privilege escalation attempts',
    logCount: 10,
    durationSeconds: 300,
  },

  PORT_SCAN: {
    name: 'Port Scan Simulation',
    description: 'Rapid connection attempts across multiple ports (scan-like activity)',
    logCount: 80,
    durationSeconds: 60,
  },

  BOT_TRAFFIC: {
    name: 'Bot Traffic / 404 Noise',
    description: 'Automated bot-like requests causing random 404 patterns',
    logCount: 70,
    durationSeconds: 240,
  },

  CREDENTIAL_STUFFING: {
    name: 'Credential Stuffing',
    description: 'Same username targeted from many IPs (password spraying / credential stuffing)',
    logCount: 40,
    durationSeconds: 300,
    failureRate: 0.98,
  },
};

/**
 * Sample attacker IPs used for generated scenarios.
 *
 * Notes:
 * - These are just example public IP strings for demo/test logs.
 * - They are NOT guaranteed to represent any real actor or current Tor exit nodes.
 *
 * @type {string[]}
 */
const ATTACKER_IPS = [
  // Suspicious-looking public ranges (examples)
  '45.142.212.61',
  '45.155.204.17',
  '45.67.230.88',
  '91.214.124.73',

  // Commonly cited "high-noise" hosting-style ranges (examples)
  '185.220.101.32',
  '185.156.73.54',
  '185.100.87.202',
  '188.166.12.143',

  // Additional examples
  '103.99.3.101',
  '109.248.206.97',
  '139.59.121.15',
  '194.165.16.12',
];

/**
 * Sample "valid" and "invalid" usernames used for generated auth scenarios.
 *
 * @type {{ invalid: string[], valid: string[] }}
 */
const USERNAMES = {
  invalid: ['admin', 'root', 'test', 'administrator', 'guest', 'oracle'],
  valid: ['john', 'alice', 'bob', 'sarah', 'maria', 'devops'],
};

module.exports = {
  ATTACK_PATTERNS,
  ATTACKER_IPS,
  USERNAMES,
};
