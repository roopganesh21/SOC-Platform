const fs = require('fs');
const path = require('path');

const {
  generateScenario,
  generateNormalWithAnomalies,
} = require('../utils/generators/attackScenarioOrchestrator');

const { parseAuthLog } = require('./logParser');
const { analyzeLogs } = require('./ruleEngine');
const { bulkInsertLogs, bulkInsertIncidents } = require('../db/queries');
const { ATTACK_PATTERNS } = require('../config/attackPatterns');

const SCENARIO_TYPES = [
  'BRUTE_FORCE',
  'ADMIN_ATTACK',
  'CREDENTIAL_STUFFING',
  'MULTI_VECTOR',
  'NORMAL_WITH_ANOMALIES',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function safeTimestampForFilename(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}-${pad2(dt.getHours())}${pad2(dt.getMinutes())}${pad2(dt.getSeconds())}`;
}

function toPosixPath(p) {
  return String(p || '').replace(/\\/g, '/');
}

function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildScenarioOptions(scenarioType, count, durationMinutes) {
  const approxCount = Math.max(1, Number(count || 120));
  const duration = Math.max(1, Number(durationMinutes || 10));

  switch (scenarioType) {
    case 'BRUTE_FORCE': {
      const authCount = Math.max(1, Math.round(approxCount * 0.4));
      const accessCount = Math.max(1, Math.round(approxCount * 0.3));
      return {
        durationMinutes: Math.min(duration, 10),
        authCount,
        accessCount,
        endpoint: '/api/login',
      };
    }
    case 'ADMIN_ATTACK': {
      const accessCount = Math.max(1, Math.round(approxCount * 0.5));
      const sudoCount = Math.max(0, Math.round(approxCount / 30));
      return { durationMinutes: Math.min(duration, 15), accessCount, sudoCount };
    }
    case 'CREDENTIAL_STUFFING': {
      const attempts = Math.max(1, Math.round(approxCount * 0.6));
      return {
        durationMinutes: Math.min(duration, 20),
        count: attempts,
        ipCount: 4,
        endpoint: '/api/login',
      };
    }
    case 'MULTI_VECTOR': {
      return {
        durationMinutes: Math.min(Math.max(duration, 10), 60),
        portScanCount: Math.max(1, Math.round(approxCount * 0.2)),
        adminCount: Math.max(1, Math.round(approxCount * 0.2)),
        bruteForceCount: Math.max(1, Math.round(approxCount * 0.15)),
        apiCount: Math.max(1, Math.round(approxCount * 0.15)),
        bot404Count: Math.max(1, Math.round(approxCount * 0.2)),
        normalAccessCount: Math.max(1, Math.round(approxCount * 0.25)),
        normalAuthCount: Math.max(1, Math.round(approxCount * 0.05)),
        sudoCount: 3,
        endpoint: '/api/login',
      };
    }
    case 'NORMAL_WITH_ANOMALIES': {
      const normalCount = Math.max(1, Math.round(approxCount * 0.8));
      const anomalyCount = Math.max(0, Math.round(approxCount * 0.2));
      return {
        durationMinutes: Math.min(duration, 30),
        normalCount,
        anomalyCount,
        endpoint: '/api/login',
      };
    }
    default:
      return { durationMinutes: duration };
  }
}

function listAvailableScenarios() {
  return SCENARIO_TYPES.map((type) => {
    const pattern = ATTACK_PATTERNS[type];
    return {
      type,
      name: pattern?.name || type,
      description: pattern?.description || '',
      defaultLogCount: pattern?.logCount || null,
      defaultDurationSeconds: pattern?.durationSeconds || null,
    };
  });
}

function resolveOutputDir(outputDir) {
  const backendRoot = path.resolve(__dirname, '..');
  const defaultDir = path.join(backendRoot, 'logs', 'generated');

  if (!outputDir) return defaultDir;

  const candidate = path.isAbsolute(outputDir)
    ? path.resolve(outputDir)
    : path.resolve(backendRoot, outputDir);

  // Safety: only allow writing under the backend root.
  const rel = path.relative(backendRoot, candidate);
  const isInside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);

  if (!isInside) {
    throw new Error('Invalid outputDir: must be within backend directory');
  }

  return candidate;
}

function writeFiles({ outputDir, stamp, authLogs, accessLogs, scenarioType, scenarioMetadata, options }) {
  ensureDirSync(outputDir);

  const authFile = path.join(outputDir, `auth-${stamp}.log`);
  const accessFile = path.join(outputDir, `access-${stamp}.log`);
  const metadataFile = path.join(outputDir, 'scenario-metadata.json');

  fs.writeFileSync(authFile, authLogs.join('\n') + (authLogs.length ? '\n' : ''), 'utf8');
  fs.writeFileSync(accessFile, accessLogs.join('\n') + (accessLogs.length ? '\n' : ''), 'utf8');

  const metadata = {
    generatedAt: new Date().toISOString(),
    scenarioType,
    summary: {
      authLogs: authLogs.length,
      accessLogs: accessLogs.length,
      totalLogs: authLogs.length + accessLogs.length,
    },
    files: {
      auth: toPosixPath(path.relative(path.resolve(__dirname, '..'), authFile)),
      access: toPosixPath(path.relative(path.resolve(__dirname, '..'), accessFile)),
      metadata: toPosixPath(path.relative(path.resolve(__dirname, '..'), metadataFile)),
    },
    scenarioMetadata: scenarioMetadata || {},
    options: options || {},
  };

  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

  return { authFile, accessFile, metadataFile, metadata };
}

function mapEventTypeToSeverity(eventType) {
  switch (eventType) {
    case 'ACCEPTED_LOGIN':
      return 'INFO';
    case 'FAILED_LOGIN':
    case 'INVALID_USER':
      return 'WARN';
    case 'SUDO_VIOLATION':
      return 'ERROR';
    default:
      return 'INFO';
  }
}

function incidentToDbRow(incident) {
  const createdAt = incident?.timestamp instanceof Date ? incident.timestamp.toISOString() : new Date().toISOString();
  const title = incident?.type || 'Security Incident';

  const parts = [incident?.description].filter(Boolean);
  if (incident?.affectedUser) parts.push(`affectedUser=${incident.affectedUser}`);
  if (incident?.sourceIP) parts.push(`sourceIP=${incident.sourceIP}`);
  if (typeof incident?.confidence === 'number') parts.push(`confidence=${incident.confidence}`);

  return {
    title,
    description: parts.join(' | '),
    status: 'OPEN',
    severity: incident?.severity || 'Medium',
    created_at: createdAt,
    updated_at: null,
  };
}

function serializeIncident(incident) {
  const ts = incident?.timestamp instanceof Date ? incident.timestamp.toISOString() : null;
  return {
    type: incident?.type || 'SecurityIncident',
    severity: incident?.severity || 'Medium',
    confidence: typeof incident?.confidence === 'number' ? incident.confidence : null,
    description: incident?.description || '',
    affectedUser: incident?.affectedUser || null,
    sourceIP: incident?.sourceIP || null,
    timestamp: ts,
    relatedLogCount: Array.isArray(incident?.relatedLogs) ? incident.relatedLogs.length : 0,
  };
}

async function generateLogsFromScenario(scenarioType, options = {}) {
  const normalizedType = String(scenarioType || '').trim().toUpperCase();
  if (!SCENARIO_TYPES.includes(normalizedType)) {
    throw new Error(`Unknown scenarioType: ${scenarioType}`);
  }

  const count = options.count ?? options.approxCount ?? 120;
  const durationMinutes = options.timelineMinutes ?? options.durationMinutes ?? 10;
  const includeNoise = options.includeNoise !== false;

  const outputDir = resolveOutputDir(options.outputDir);
  const startTime = options.startTime ? new Date(options.startTime) : new Date();
  const stamp = safeTimestampForFilename(startTime);

  const scenarioOptions = buildScenarioOptions(normalizedType, count, durationMinutes);
  scenarioOptions.startTime = startTime;

  let scenario;
  if (normalizedType === 'NORMAL_WITH_ANOMALIES') {
    scenario = generateNormalWithAnomalies(
      scenarioOptions.normalCount,
      scenarioOptions.anomalyCount,
      scenarioOptions
    );
  } else {
    scenario = generateScenario(normalizedType, scenarioOptions);
  }

  let authLogs = [...(scenario.authLogs || [])];
  let accessLogs = [...(scenario.accessLogs || [])];

  if (includeNoise) {
    const noiseCount = Math.max(0, Math.round(Number(count || 120) * 0.25));
    const noise = generateNormalWithAnomalies(noiseCount, 0, {
      startTime,
      durationMinutes: scenarioOptions.durationMinutes || durationMinutes,
    });

    authLogs = [...authLogs, ...(noise.authLogs || [])];
    accessLogs = [...accessLogs, ...(noise.accessLogs || [])];
  }

  const { authFile, accessFile, metadataFile, metadata } = writeFiles({
    outputDir,
    stamp,
    authLogs,
    accessLogs,
    scenarioType: normalizedType,
    scenarioMetadata: scenario.metadata || {},
    options: {
      count,
      durationMinutes,
      outputDir: toPosixPath(path.relative(path.resolve(__dirname, '..'), outputDir)),
      includeNoise,
      scenarioOptions,
    },
  });

  return {
    scenarioType: normalizedType,
    files: {
      authFile,
      accessFile,
      metadataFile,
    },
    metadata,
    counts: {
      authLogs: authLogs.length,
      accessLogs: accessLogs.length,
      totalLogs: authLogs.length + accessLogs.length,
    },
  };
}

async function ingestAndAnalyzeGeneratedAuthLog({ authFilePath, sourceName }) {
  const content = await fs.promises.readFile(authFilePath, 'utf8');
  const parsedEvents = parseAuthLog(content);

  const rows = parsedEvents.map((event) => {
    const severity = mapEventTypeToSeverity(event.eventType);
    const timestampIso = event.timestamp ? event.timestamp.toISOString() : new Date().toISOString();

    const messageParts = [];
    messageParts.push(event.eventType);
    if (event.user) messageParts.push(`user=${event.user}`);
    if (event.ip) messageParts.push(`ip=${event.ip}`);

    return {
      source: sourceName,
      timestamp: timestampIso,
      severity,
      category: 'auth',
      message: messageParts.join(' '),
      raw: event.rawLog,
    };
  });

  const insertResult = bulkInsertLogs(rows);

  const detected = analyzeLogs(parsedEvents);
  const incidentRows = detected.map(incidentToDbRow);
  const incidentInsert = bulkInsertIncidents(incidentRows);

  return {
    parsedCount: parsedEvents.length,
    storedCount: insertResult.changes || 0,
    incidentsDetected: detected.length,
    incidentsStored: incidentInsert.changes || 0,
    incidents: detected.map(serializeIncident),
  };
}

async function generateAndAnalyze(scenarioType, options = {}) {
  const generated = await generateLogsFromScenario(scenarioType, options);

  const sourceName = options.sourceName || path.basename(generated.files.authFile);
  const analysis = await ingestAndAnalyzeGeneratedAuthLog({
    authFilePath: generated.files.authFile,
    sourceName,
  });

  return {
    ...generated,
    analysis,
  };
}

async function getGeneratedLogFiles(options = {}) {
  const outputDir = resolveOutputDir(options.outputDir);
  ensureDirSync(outputDir);

  const entries = await fs.promises.readdir(outputDir, { withFileTypes: true });
  const files = [];

  for (const e of entries) {
    if (!e.isFile()) continue;
    const fullPath = path.join(outputDir, e.name);
    const stat = await fs.promises.stat(fullPath);

    files.push({
      name: e.name,
      path: toPosixPath(path.relative(path.resolve(__dirname, '..'), fullPath)),
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }

  files.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));

  // Best-effort: include latest scenario metadata if present
  let scenarioMetadata = null;
  try {
    const metadataPath = path.join(outputDir, 'scenario-metadata.json');
    const raw = await fs.promises.readFile(metadataPath, 'utf8');
    scenarioMetadata = JSON.parse(raw);
  } catch (e) {
    scenarioMetadata = null;
  }

  return { files, scenarioMetadata };
}

async function deleteGeneratedLogFile(filename, options = {}) {
  const outputDir = resolveOutputDir(options.outputDir);
  const name = String(filename || '').trim();

  // Prevent path traversal / nested paths
  if (!name || name.includes('/') || name.includes('\\')) {
    throw new Error('Invalid filename');
  }

  // Keep deletion scoped to known generated file patterns
  const allowed =
    /^auth-\d{8}-\d{6}\.log$/.test(name) ||
    /^access-\d{8}-\d{6}\.log$/.test(name);

  if (!allowed) {
    throw new Error('Refusing to delete unknown file type');
  }

  const fullPath = path.resolve(outputDir, name);
  const backendRoot = path.resolve(__dirname, '..');
  const rel = path.relative(backendRoot, fullPath);
  const isInside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);

  if (!isInside) {
    throw new Error('Invalid path');
  }

  await fs.promises.unlink(fullPath);
  return { deleted: true, filename: name };
}

module.exports = {
  SCENARIO_TYPES,
  listAvailableScenarios,
  generateLogsFromScenario,
  generateAndAnalyze,
  getGeneratedLogFiles,
  deleteGeneratedLogFile,
};
