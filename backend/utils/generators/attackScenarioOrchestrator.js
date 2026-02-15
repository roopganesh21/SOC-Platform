const { ATTACKER_IPS, USERNAMES, ATTACK_PATTERNS } = require('../../config/attackPatterns');

const {
  generateFailedSSH,
  generateSudoViolation,
  generateBruteForceSequence,
  generateSuccessfulSSH,
} = require('./authLogGenerator');

const {
  generateAccessEntry,
  generateAdminAttack,
  generatePortScan,
  generateAPIBruteForce,
} = require('./accessLogGenerator');

const { generateRandomTimestamp } = require('./timestampGenerator');

function randInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function pick(arr, fallback = null) {
  if (!arr || arr.length === 0) return fallback;
  return arr[randInt(0, arr.length - 1)];
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function ensureDate(d) {
  if (!d) return new Date();
  return d instanceof Date ? d : new Date(d);
}

function addMs(date, ms) {
  return new Date(date.getTime() + ms);
}

function addSeconds(date, seconds) {
  return addMs(date, seconds * 1000);
}

function createWindow(startTime, durationMinutes) {
  const start = ensureDate(startTime);
  const end = addSeconds(start, Math.max(1, Number(durationMinutes || 1)) * 60);
  return { start, end };
}

function randomTimeInWindow(window) {
  return generateRandomTimestamp({ start: window.start, end: window.end });
}

function pickAttackerIp(ip) {
  return ip || pick(ATTACKER_IPS, '45.142.212.61');
}

function pickAttackerIps(count, preferred = []) {
  const preferredList = Array.isArray(preferred) ? preferred : [];
  const pool = uniq(preferredList.concat(ATTACKER_IPS));
  const n = Math.max(1, Number(count || 1));

  const ips = [];
  while (ips.length < n) {
    ips.push(pick(pool));
  }

  return uniq(ips).slice(0, n);
}

const REAL_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
];

const BOT_USER_AGENTS = [
  'curl/7.88.1',
  'python-requests/2.31.0',
  'Go-http-client/1.1',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
];

const LEGIT_PATHS = [
  '/',
  '/index.html',
  '/about',
  '/contact',
  '/assets/app.js',
  '/assets/styles.css',
  '/favicon.ico',
  '/api/health',
  '/api/incidents',
];

const RANDOM_404_PATHS = [
  '/robots.txt',
  '/sitemap.xml',
  '/.well-known/security.txt',
  '/login',
  '/register',
  '/api/v1/login',
  '/config',
  '/backup.zip',
  '/admin.php',
  '/test',
];

const REFERRERS = [
  '-',
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://duckduckgo.com/',
  'https://github.com/',
];

function randomPrivateIp() {
  const ranges = [
    () => `10.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
    () => `192.168.${randInt(0, 255)}.${randInt(1, 254)}`,
    () => `172.${randInt(16, 31)}.${randInt(0, 255)}.${randInt(1, 254)}`,
  ];
  return pick(ranges)();
}

function generateNormalAccessInWindow(count, window) {
  const n = Math.max(0, Number(count || 0));
  const lines = [];

  for (let i = 0; i < n; i += 1) {
    const t = randomTimeInWindow(window);
    const path = pick(LEGIT_PATHS);
    const method = pick(['GET', 'GET', 'GET', 'POST'], 'GET');
    const status = pick([200, 200, 200, 304, 404], 200);
    const size = status === 304 ? 0 : randInt(200, 9000);

    lines.push(
      generateAccessEntry(
        randomPrivateIp(),
        method,
        path,
        status,
        size,
        t,
        pick(REAL_USER_AGENTS),
        pick(REFERRERS)
      )
    );
  }

  return lines;
}

function generate404BotInWindow(count, window, ip = null) {
  const n = Math.max(0, Number(count || 0));
  const lines = [];

  for (let i = 0; i < n; i += 1) {
    const t = randomTimeInWindow(window);
    lines.push(
      generateAccessEntry(
        ip || pickAttackerIp(),
        'GET',
        pick(RANDOM_404_PATHS),
        404,
        randInt(150, 900),
        t,
        pick(BOT_USER_AGENTS),
        '-'
      )
    );
  }

  return lines;
}

function generateNormalAuthInWindow(count, window) {
  const n = Math.max(0, Number(count || 0));
  const lines = [];

  for (let i = 0; i < n; i += 1) {
    const t = randomTimeInWindow(window);
    const user = pick(USERNAMES.valid, 'john');
    // Keep source IP internal-ish
    lines.push(generateSuccessfulSSH(randomPrivateIp(), user, t));
  }

  return lines;
}

function baseMetadata(type, window, severity, indicators) {
  return {
    attackType: type,
    severity,
    startTime: window.start.toISOString(),
    endTime: window.end.toISOString(),
    durationMinutes: Math.round((window.end.getTime() - window.start.getTime()) / 60000),
    indicators: indicators || {},
  };
}

/**
 * Scenario: SSH brute force + API brute force (2-minute timeline).
 *
 * options:
 * - attackerIP
 * - targetUser
 * - endpoint
 * - authCount
 * - accessCount
 * - startTime
 */
function generateBruteForceScenario(options = {}) {
  const attackerIP = pickAttackerIp(options.attackerIP);
  const targetUser = options.targetUser || pick(USERNAMES.invalid, 'root');
  const endpoint = options.endpoint || '/api/login';

  const durationMinutes = options.durationMinutes || 2;
  const window = createWindow(options.startTime || new Date(), durationMinutes);

  const authCount = Number.isFinite(options.authCount)
    ? Number(options.authCount)
    : ATTACK_PATTERNS.BRUTE_FORCE?.logCount || 25;
  const accessCount = Number.isFinite(options.accessCount) ? Number(options.accessCount) : 20;

  // Start auth brute force near the beginning
  const authStart = addSeconds(window.start, randInt(0, 10));
  const authLogs = generateBruteForceSequence(attackerIP, targetUser, authCount, authStart);

  // API brute force starts shortly after
  const accessStart = addSeconds(window.start, randInt(10, 25));
  const accessLogs = generateAPIBruteForce(attackerIP, endpoint, accessCount, accessStart);

  const metadata = baseMetadata('BRUTE_FORCE', window, 'high', {
    attackerIPs: [attackerIP],
    usernames: [targetUser],
    endpoints: [endpoint],
    patterns: ['SSH_FAILED_PASSWORD', 'API_AUTH_FAILURE'],
  });

  return { authLogs, accessLogs, metadata };
}

/**
 * Scenario: /admin unauthorized attempts + sudo violations (5-minute timeline).
 */
function generateAdminAttackScenario(options = {}) {
  const attackerIP = pickAttackerIp(options.attackerIP);
  const username = options.username || pick(USERNAMES.valid, 'alice');

  const durationMinutes = options.durationMinutes || 5;
  const window = createWindow(options.startTime || new Date(), durationMinutes);

  const accessCount = Number.isFinite(options.accessCount)
    ? Number(options.accessCount)
    : ATTACK_PATTERNS.ADMIN_ATTACK?.logCount || 60;
  const sudoCount = Number.isFinite(options.sudoCount) ? Number(options.sudoCount) : 4;

  const accessStart = addSeconds(window.start, randInt(0, 20));
  const accessLogs = generateAdminAttack(attackerIP, accessCount, accessStart);

  const sudoTimes = Array.from({ length: Math.max(0, sudoCount) }, () => randomTimeInWindow(window))
    .sort((a, b) => a.getTime() - b.getTime());

  const authLogs = sudoTimes.map((t) => generateSudoViolation(username, t));

  const metadata = baseMetadata('ADMIN_ATTACK', window, 'medium', {
    attackerIPs: [attackerIP],
    usernames: [username],
    endpoints: ['/admin', '/admin/login'],
    patterns: ['HTTP_401_ADMIN', 'SUDO_VIOLATION'],
  });

  return { authLogs, accessLogs, metadata };
}

/**
 * Scenario: credential stuffing (same username, multiple IPs) + API auth failures.
 */
function generateCredentialStuffingScenario(options = {}) {
  const username = options.username || pick(USERNAMES.invalid.concat(USERNAMES.valid), 'admin');
  const endpoint = options.endpoint || '/api/login';

  const durationMinutes = options.durationMinutes || 5;
  const window = createWindow(options.startTime || new Date(), durationMinutes);

  const attackerIps = pickAttackerIps(options.ipCount || 4, options.attackerIPs);
  const totalAttempts = Number.isFinite(options.count)
    ? Number(options.count)
    : ATTACK_PATTERNS.CREDENTIAL_STUFFING?.logCount || 40;

  let cursor = addSeconds(window.start, randInt(0, 20));
  const authLogs = [];
  const accessLogs = [];

  for (let i = 0; i < totalAttempts; i += 1) {
    cursor = addSeconds(cursor, randInt(3, 8));
    if (cursor.getTime() > window.end.getTime()) break;

    const ip = attackerIps[i % attackerIps.length];

    // Auth: failed SSH attempts (kept parseable by auth.log parser)
    authLogs.push(generateFailedSSH(ip, username, cursor));

    // Access: API failures aligned closely in time
    const accessTime = addMs(cursor, randInt(50, 400));
    const status = pick([401, 401, 403], 401);
    accessLogs.push(
      generateAccessEntry(
        ip,
        'POST',
        endpoint,
        status,
        randInt(180, 1200),
        accessTime,
        pick(BOT_USER_AGENTS),
        '-'
      )
    );
  }

  const metadata = baseMetadata('CREDENTIAL_STUFFING', window, 'high', {
    attackerIPs: attackerIps,
    usernames: [username],
    endpoints: [endpoint],
    patterns: ['SSH_FAILED_PASSWORD_MULTI_IP', 'API_AUTH_FAILURE_MULTI_IP'],
  });

  return { authLogs, accessLogs, metadata };
}

/**
 * Scenario: multi-vector APT-style simulation (30-minute timeline).
 */
function generateMultiVectorAttack(options = {}) {
  const attackerIP = pickAttackerIp(options.attackerIP);
  const username = options.username || pick(USERNAMES.valid, 'devops');
  const targetUser = options.targetUser || pick(USERNAMES.invalid, 'root');
  const endpoint = options.endpoint || '/api/login';

  const durationMinutes = options.durationMinutes || 30;
  const window = createWindow(options.startTime || new Date(), durationMinutes);

  const authLogs = [];
  const accessLogs = [];

  // Phase 1: recon (port scan) in first 2 minutes
  accessLogs.push(
    ...generatePortScan(attackerIP, options.portScanCount || 40, addSeconds(window.start, 5))
  );

  // Phase 2: bot noise (404s) across the window
  accessLogs.push(...generate404BotInWindow(options.bot404Count || 25, window, attackerIP));

  // Phase 3: admin probing around minute 10
  accessLogs.push(
    ...generateAdminAttack(attackerIP, options.adminCount || 25, addSeconds(window.start, 10 * 60))
  );

  // Phase 4: SSH brute force around minute 15
  authLogs.push(
    ...generateBruteForceSequence(attackerIP, targetUser, options.bruteForceCount || 18, addSeconds(window.start, 15 * 60))
  );

  // Phase 5: API brute force around minute 16
  accessLogs.push(
    ...generateAPIBruteForce(attackerIP, endpoint, options.apiCount || 22, addSeconds(window.start, 16 * 60))
  );

  // Phase 6: privilege escalation signals (sudo violations) late in window
  const sudoTimes = Array.from({ length: Math.max(0, options.sudoCount || 3) }, () =>
    addSeconds(window.start, randInt(20 * 60, 28 * 60))
  ).sort((a, b) => a.getTime() - b.getTime());
  authLogs.push(...sudoTimes.map((t) => generateSudoViolation(username, t)));

  // Background: some normal noise
  accessLogs.push(...generateNormalAccessInWindow(options.normalAccessCount || 30, window));
  authLogs.push(...generateNormalAuthInWindow(options.normalAuthCount || 8, window));

  const metadata = baseMetadata('MULTI_VECTOR', window, 'critical', {
    attackerIPs: [attackerIP],
    usernames: uniq([username, targetUser]),
    endpoints: ['/admin', endpoint],
    patterns: ['PORT_SCAN', 'HTTP_401_ADMIN', 'SSH_FAILED_PASSWORD', 'API_AUTH_FAILURE', 'SUDO_VIOLATION'],
  });

  return { authLogs, accessLogs, metadata };
}

/**
 * Scenario: mostly normal traffic with a handful of anomalies sprinkled in.
 */
function generateNormalWithAnomalies(normalCount, anomalyCount, options = {}) {
  const attackerIP = pickAttackerIp(options.attackerIP);
  const endpoint = options.endpoint || '/api/login';

  const durationMinutes = options.durationMinutes || 15;
  const window = createWindow(options.startTime || new Date(), durationMinutes);

  const normalAccess = generateNormalAccessInWindow(normalCount, window);
  const normalAuth = generateNormalAuthInWindow(Math.max(1, Math.round(normalCount / 6)), window);

  const accessLogs = [...normalAccess];
  const authLogs = [...normalAuth];

  const anomalies = Math.max(0, Number(anomalyCount || 0));
  if (anomalies > 0) {
    // small admin burst
    accessLogs.push(...generateAdminAttack(attackerIP, Math.min(10, anomalies), randomTimeInWindow(window)));

    // a few API brute force attempts
    accessLogs.push(...generateAPIBruteForce(attackerIP, endpoint, Math.min(10, anomalies), randomTimeInWindow(window)));

    // a small brute force sequence
    authLogs.push(
      ...generateBruteForceSequence(attackerIP, pick(USERNAMES.invalid, 'admin'), Math.min(10, anomalies), randomTimeInWindow(window))
    );

    // occasional sudo violation
    if (anomalies >= 3) {
      authLogs.push(generateSudoViolation(pick(USERNAMES.valid, 'alice'), randomTimeInWindow(window)));
    }
  }

  const metadata = baseMetadata('NORMAL_WITH_ANOMALIES', window, 'low', {
    attackerIPs: [attackerIP],
    endpoints: ['/admin', endpoint],
    patterns: ['BASELINE_TRAFFIC', 'ANOMALY_SPRINKLE'],
  });

  return { authLogs, accessLogs, metadata };
}

/**
 * Generate a scenario by type.
 *
 * Supported scenarioType values (case-sensitive):
 * - BRUTE_FORCE
 * - ADMIN_ATTACK
 * - CREDENTIAL_STUFFING
 * - MULTI_VECTOR
 * - NORMAL_WITH_ANOMALIES
 */
function generateScenario(scenarioType, options = {}) {
  switch (scenarioType) {
    case 'BRUTE_FORCE':
      return generateBruteForceScenario(options);
    case 'ADMIN_ATTACK':
      return generateAdminAttackScenario(options);
    case 'CREDENTIAL_STUFFING':
      return generateCredentialStuffingScenario(options);
    case 'MULTI_VECTOR':
      return generateMultiVectorAttack(options);
    case 'NORMAL_WITH_ANOMALIES':
      return generateNormalWithAnomalies(options.normalCount || 50, options.anomalyCount || 8, options);
    default:
      throw new Error(`Unknown scenarioType: ${scenarioType}`);
  }
}

module.exports = {
  generateScenario,
  generateBruteForceScenario,
  generateAdminAttackScenario,
  generateCredentialStuffingScenario,
  generateMultiVectorAttack,
  generateNormalWithAnomalies,
};
