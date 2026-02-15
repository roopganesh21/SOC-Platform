#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const {
  generateScenario,
  generateNormalWithAnomalies,
} = require('../utils/generators/attackScenarioOrchestrator');

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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeTextFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeJsonFile(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

function parseIntOrUndefined(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}

function normalizeScenarioType(type) {
  if (!type) return null;
  const t = String(type).trim();
  const upper = t.toUpperCase();
  if (SCENARIO_TYPES.includes(upper)) return upper;
  return t; // let orchestrator throw a helpful error
}

function detectionHintsFor(type, metadata) {
  const attackerIps = metadata?.indicators?.attackerIPs || [];
  const endpoints = metadata?.indicators?.endpoints || [];

  switch (type) {
    case 'BRUTE_FORCE':
      return [
        `Look for repeated SSH failures from: ${attackerIps.join(', ') || '<unknown>'}`,
        `Look for repeated 401/403 POSTs to: ${endpoints.join(', ') || '/api/login'}`,
        'Correlate auth.log and access.log within a 2-minute window',
      ];
    case 'ADMIN_ATTACK':
      return [
        `Look for many HTTP 401s to admin paths: ${endpoints.join(', ') || '/admin'}`,
        'Check for sudo violations near the same timeframe',
      ];
    case 'CREDENTIAL_STUFFING':
      return [
        'Same username targeted from multiple IPs',
        `API auth failures around: ${endpoints.join(', ') || '/api/login'}`,
      ];
    case 'MULTI_VECTOR':
      return [
        'Sequence: scan-like requests → admin probing → SSH/API brute force → sudo violations',
        `Primary attacker IP: ${attackerIps.join(', ') || '<unknown>'}`,
      ];
    case 'NORMAL_WITH_ANOMALIES':
      return [
        'Baseline traffic with small bursts of suspicious activity',
        'Hunt for rare anomalies instead of volume',
      ];
    default:
      return ['Review metadata.indicators for attack signals'];
  }
}

async function loadModule(name) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const mod = require(name);
    return mod && mod.default ? mod.default : mod;
  } catch (e) {
    // ESM-only packages (e.g., chalk@5, ora@8)
    // Dynamic import works from CommonJS.
    const imported = await import(name);
    return imported.default || imported;
  }
}

async function askInteractive({ chalk }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const question = (q) =>
    new Promise((resolve) => {
      rl.question(q, (answer) => resolve(answer));
    });

  try {
    // Scenario selection
    console.log(chalk.cyan('\nSelect a scenario type:'));
    SCENARIO_TYPES.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t}`);
    });

    const typeRaw = (await question(`\nEnter choice (1-${SCENARIO_TYPES.length}) [1]: `)).trim();
    const typeIdx = typeRaw ? Number(typeRaw) : 1;
    const scenarioType =
      Number.isFinite(typeIdx) && typeIdx >= 1 && typeIdx <= SCENARIO_TYPES.length
        ? SCENARIO_TYPES[typeIdx - 1]
        : SCENARIO_TYPES[0];

    const countRaw = (await question('Approx total logs (attack + noise) [120]: ')).trim();
    const approxCount = parseIntOrUndefined(countRaw) ?? 120;

    const durationRaw = (await question('Timeline minutes (scenario window) [10]: ')).trim();
    const durationMinutes = parseIntOrUndefined(durationRaw) ?? 10;

    const outputRaw = (await question('Output directory [logs/generated]: ')).trim();
    const output = outputRaw || 'logs/generated';

    return { scenarioType, approxCount, durationMinutes, output };
  } finally {
    rl.close();
  }
}

function buildScenarioOptions(scenarioType, approxCount, durationMinutes) {
  const count = Math.max(10, Number(approxCount || 120));
  const duration = Math.max(1, Number(durationMinutes || 10));

  switch (scenarioType) {
    case 'BRUTE_FORCE': {
      const authCount = Math.max(10, Math.round(count * 0.4));
      const accessCount = Math.max(10, Math.round(count * 0.3));
      return { durationMinutes: Math.min(duration, 10), authCount, accessCount, endpoint: '/api/login' };
    }
    case 'ADMIN_ATTACK': {
      const accessCount = Math.max(20, Math.round(count * 0.5));
      const sudoCount = Math.max(2, Math.round(count / 30));
      return { durationMinutes: Math.min(duration, 15), accessCount, sudoCount };
    }
    case 'CREDENTIAL_STUFFING': {
      const attempts = Math.max(20, Math.round(count * 0.6));
      return { durationMinutes: Math.min(duration, 20), count: attempts, ipCount: 4, endpoint: '/api/login' };
    }
    case 'MULTI_VECTOR': {
      return {
        durationMinutes: Math.min(Math.max(duration, 10), 60),
        portScanCount: Math.max(30, Math.round(count * 0.2)),
        adminCount: Math.max(20, Math.round(count * 0.2)),
        bruteForceCount: Math.max(15, Math.round(count * 0.15)),
        apiCount: Math.max(15, Math.round(count * 0.15)),
        bot404Count: Math.max(20, Math.round(count * 0.2)),
        normalAccessCount: Math.max(20, Math.round(count * 0.25)),
        normalAuthCount: Math.max(6, Math.round(count * 0.05)),
        sudoCount: 3,
        endpoint: '/api/login',
      };
    }
    case 'NORMAL_WITH_ANOMALIES': {
      const normalCount = Math.max(50, Math.round(count * 0.8));
      const anomalyCount = Math.max(5, Math.round(count * 0.2));
      return { durationMinutes: Math.min(duration, 30), normalCount, anomalyCount, endpoint: '/api/login' };
    }
    default:
      return { durationMinutes: duration };
  }
}

async function main() {
  const chalk = await loadModule('chalk');
  const ora = await loadModule('ora');
  const { Command } = require('commander');

  const program = new Command();
  program
    .name('generateLogs')
    .description('Generate coordinated auth.log + access.log attack scenarios for demos and testing')
    .option('--quick', 'Generate a default scenario quickly (BRUTE_FORCE)')
    .option('--scenario <type>', `Scenario type (${SCENARIO_TYPES.join(' | ')})`)
    .option('--count <n>', 'Approx total logs (attack + noise)', parseInt)
    .option('--timeline <minutes>', 'Scenario timeline window in minutes', parseInt)
    .option('--output <path>', 'Output directory (relative to backend/ or absolute)')
    .addHelpText(
      'after',
      `\nExamples:\n  node scripts/generateLogs.js\n  node scripts/generateLogs.js --quick\n  node scripts/generateLogs.js --scenario BRUTE_FORCE --count 100\n  node scripts/generateLogs.js --scenario MULTI_VECTOR --timeline 30 --output logs/generated\n`
    );

  program.parse(process.argv);
  const opts = program.opts();

  const backendRoot = path.resolve(__dirname, '..');

  let scenarioType;
  let approxCount;
  let durationMinutes;
  let outputDir;

  if (opts.quick) {
    scenarioType = 'BRUTE_FORCE';
    approxCount = Number.isFinite(opts.count) ? opts.count : 120;
    durationMinutes = Number.isFinite(opts.timeline) ? opts.timeline : 10;
    outputDir = opts.output || 'logs/generated';
  } else if (opts.scenario) {
    scenarioType = normalizeScenarioType(opts.scenario);
    approxCount = Number.isFinite(opts.count) ? opts.count : 120;
    durationMinutes = Number.isFinite(opts.timeline) ? opts.timeline : 10;
    outputDir = opts.output || 'logs/generated';
  } else {
    const interactive = await askInteractive({ chalk });
    scenarioType = interactive.scenarioType;
    approxCount = interactive.approxCount;
    durationMinutes = interactive.durationMinutes;
    outputDir = interactive.output;
  }

  const resolvedOutputDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.join(backendRoot, outputDir);

  ensureDir(resolvedOutputDir);

  const spinner = ora({ text: 'Generating scenario...', color: 'cyan' }).start();

  try {
    const startTime = new Date();
    const scenarioOptions = buildScenarioOptions(scenarioType, approxCount, durationMinutes);
    scenarioOptions.startTime = startTime;

    let scenario;
    if (scenarioType === 'NORMAL_WITH_ANOMALIES') {
      scenario = generateNormalWithAnomalies(
        scenarioOptions.normalCount,
        scenarioOptions.anomalyCount,
        scenarioOptions
      );
    } else {
      scenario = generateScenario(scenarioType, scenarioOptions);
    }

    // Add baseline noise to every scenario (kept low; adds realism without burying the attack)
    const noiseCount = Math.max(20, Math.round(Number(approxCount || 120) * 0.25));
    const noise = generateNormalWithAnomalies(noiseCount, 0, {
      startTime,
      durationMinutes: scenarioOptions.durationMinutes || durationMinutes || 10,
    });

    const authLogs = [...(scenario.authLogs || []), ...(noise.authLogs || [])];
    const accessLogs = [...(scenario.accessLogs || []), ...(noise.accessLogs || [])];

    const stamp = safeTimestampForFilename(startTime);
    const authFile = path.join(resolvedOutputDir, `auth-${stamp}.log`);
    const accessFile = path.join(resolvedOutputDir, `access-${stamp}.log`);
    const metadataFile = path.join(resolvedOutputDir, 'scenario-metadata.json');

    writeTextFile(authFile, authLogs.join('\n') + (authLogs.length ? '\n' : ''));
    writeTextFile(accessFile, accessLogs.join('\n') + (accessLogs.length ? '\n' : ''));

    const metadata = {
      generatedAt: new Date().toISOString(),
      scenarioType,
      summary: {
        authLogs: authLogs.length,
        accessLogs: accessLogs.length,
        totalLogs: authLogs.length + accessLogs.length,
      },
      files: {
        auth: authFile,
        access: accessFile,
        metadata: metadataFile,
      },
      scenarioMetadata: scenario.metadata || {},
      detectionHints: detectionHintsFor(scenarioType, scenario.metadata),
      options: {
        approxCount,
        durationMinutes,
        outputDir: resolvedOutputDir,
        scenarioOptions,
      },
    };

    writeJsonFile(metadataFile, metadata);

    spinner.succeed('Logs generated successfully');

    console.log(chalk.green('\nSummary'));
    console.log(`  Scenario: ${chalk.bold(scenarioType)}`);
    console.log(`  Auth logs: ${authLogs.length}`);
    console.log(`  Access logs: ${accessLogs.length}`);
    console.log(`  Total: ${authLogs.length + accessLogs.length}`);

    console.log(chalk.green('\nFiles'));
    console.log(`  ${authFile}`);
    console.log(`  ${accessFile}`);
    console.log(`  ${metadataFile}`);

    console.log(chalk.green('\nDetection hints'));
    for (const hint of metadata.detectionHints) {
      console.log(`  - ${hint}`);
    }

    process.exitCode = 0;
  } catch (err) {
    spinner.fail('Failed to generate logs');
    // eslint-disable-next-line no-console
    console.error(err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();
