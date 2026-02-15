const {
  generateAccessTimestamp,
  generateRandomTimestamp,
} = require('./timestampGenerator');

const { ATTACKER_IPS } = require('../../config/attackPatterns');

function randInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function pick(arr, fallback = null) {
  if (!arr || arr.length === 0) return fallback;
  return arr[randInt(0, arr.length - 1)];
}

function randomPublicLikeIp() {
  return pick(ATTACKER_IPS, '45.142.212.61');
}

function randomPrivateIp() {
  const ranges = [
    () => `10.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
    () => `192.168.${randInt(0, 255)}.${randInt(1, 254)}`,
    () => `172.${randInt(16, 31)}.${randInt(0, 255)}.${randInt(1, 254)}`,
  ];
  return pick(ranges)();
}

const REAL_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
];

const BOT_USER_AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'curl/7.88.1',
  'python-requests/2.31.0',
  'Go-http-client/1.1',
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

const SUSPICIOUS_PATHS = [
  '/admin',
  '/admin/login',
  '/wp-login.php',
  '/wp-admin',
  '/.env',
  '/phpmyadmin',
  '/cgi-bin/',
  '/.git/config',
  '/server-status',
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

/**
 * Generate a single Apache access.log entry (combined format).
 *
 * Example:
 * 192.168.1.50 - - [15/Jan/2025:10:30:15 +0000] "GET /admin HTTP/1.1" 401 500 "-" "Mozilla/5.0..."
 *
 * @param {string} ip
 * @param {string} method
 * @param {string} path
 * @param {number} statusCode
 * @param {number} size
 * @param {Date|string} [timestamp]
 * @param {string} [userAgent]
 * @param {string} [referrer]
 * @returns {string}
 */
function generateAccessEntry(
  ip,
  method,
  path,
  statusCode,
  size,
  timestamp,
  userAgent,
  referrer
) {
  const ts = timestamp
    ? timestamp instanceof Date
      ? generateAccessTimestamp(timestamp)
      : typeof timestamp === 'string'
        ? timestamp
        : generateAccessTimestamp(new Date(timestamp))
    : generateAccessTimestamp(new Date());

  const remoteIp = ip || randomPrivateIp();
  const httpMethod = method || 'GET';
  const requestPath = path || '/';
  const status = Number.isFinite(statusCode) ? statusCode : 200;
  const bytes = Number.isFinite(size) ? size : randInt(150, 4200);
  const ua = userAgent || pick(REAL_USER_AGENTS);
  const ref = referrer || pick(REFERRERS);

  return `${remoteIp} - - ${ts} "${httpMethod} ${requestPath} HTTP/1.1" ${status} ${bytes} "${ref}" "${ua}"`;
}

function addMs(date, ms) {
  return new Date(date.getTime() + ms);
}

/**
 * Generate multiple GET /admin requests that return 401.
 * Sequential timestamps 1-3 seconds apart.
 *
 * @param {string} attackerIP
 * @param {number} count
 * @param {Date} [startTime]
 * @returns {string[]}
 */
function generateAdminAttack(attackerIP, count, startTime = new Date()) {
  const n = Math.max(0, Number(count || 0));
  let cursor = startTime instanceof Date ? startTime : new Date(startTime);

  const lines = [];
  for (let i = 0; i < n; i += 1) {
    cursor = addMs(cursor, randInt(1000, 3000));
    const path = pick(['/admin', '/admin/login', '/admin/dashboard', '/admin/api'], '/admin');
    lines.push(
      generateAccessEntry(
        attackerIP || randomPublicLikeIp(),
        'GET',
        path,
        401,
        randInt(200, 1200),
        cursor,
        pick(BOT_USER_AGENTS),
        '-'
      )
    );
  }

  return lines;
}

/**
 * Generate bot-like random 404 traffic.
 *
 * @param {number} count
 * @returns {string[]}
 */
function generate404BotTraffic(count) {
  const n = Math.max(0, Number(count || 0));
  const now = new Date();
  const start = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  const lines = [];
  for (let i = 0; i < n; i += 1) {
    const t = generateRandomTimestamp({ start, end: now });
    const path = pick(RANDOM_404_PATHS);
    const ip = Math.random() < 0.5 ? randomPublicLikeIp() : randomPrivateIp();

    lines.push(
      generateAccessEntry(ip, 'GET', path, 404, randInt(150, 900), t, pick(BOT_USER_AGENTS), '-')
    );
  }

  return lines;
}

/**
 * Generate rapid scan-like traffic. Note: Apache logs do not directly include destination ports,
 * so this simulates a scan by hitting many suspicious paths quickly.
 *
 * @param {string} attackerIP
 * @param {number} count
 * @param {Date} [startTime]
 * @returns {string[]}
 */
function generatePortScan(attackerIP, count, startTime = new Date()) {
  const n = Math.max(0, Number(count || 0));
  let cursor = startTime instanceof Date ? startTime : new Date(startTime);

  const lines = [];
  for (let i = 0; i < n; i += 1) {
    // < 1 second intervals (0-900ms)
    cursor = addMs(cursor, randInt(0, 900));
    const path = pick(SUSPICIOUS_PATHS);
    const status = pick([400, 404, 401, 502], 404);
    lines.push(
      generateAccessEntry(
        attackerIP || randomPublicLikeIp(),
        pick(['GET', 'HEAD'], 'GET'),
        path,
        status,
        randInt(0, 600),
        cursor,
        pick(BOT_USER_AGENTS),
        '-'
      )
    );
  }

  return lines;
}

/**
 * Generate normal website traffic.
 *
 * @param {number} count
 * @returns {string[]}
 */
function generateNormalWebTraffic(count) {
  const n = Math.max(0, Number(count || 0));
  const now = new Date();
  const start = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const lines = [];
  for (let i = 0; i < n; i += 1) {
    const t = generateRandomTimestamp({ start, end: now });
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

/**
 * Generate an API brute-force style pattern: repeated POSTs to an endpoint returning 401/403.
 *
 * @param {string} attackerIP
 * @param {string} endpoint
 * @param {number} count
 * @param {Date} [startTime]
 * @returns {string[]}
 */
function generateAPIBruteForce(attackerIP, endpoint, count, startTime = new Date()) {
  const n = Math.max(0, Number(count || 0));
  let cursor = startTime instanceof Date ? startTime : new Date(startTime);

  const lines = [];
  const ep = endpoint || '/api/login';

  for (let i = 0; i < n; i += 1) {
    cursor = addMs(cursor, randInt(800, 1800));
    const status = pick([401, 401, 403], 401);
    lines.push(
      generateAccessEntry(
        attackerIP || randomPublicLikeIp(),
        'POST',
        ep,
        status,
        randInt(180, 1200),
        cursor,
        pick(BOT_USER_AGENTS),
        '-'
      )
    );
  }

  return lines;
}

module.exports = {
  generateAccessEntry,
  generateAdminAttack,
  generate404BotTraffic,
  generatePortScan,
  generateNormalWebTraffic,
  generateAPIBruteForce,
};
