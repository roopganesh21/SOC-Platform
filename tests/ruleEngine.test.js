// Manual test harness for the rule engine.
// Run with: node tests/ruleEngine.test.js

const { analyzeLogs } = require('../backend/services/ruleEngine');

function minutesFrom(base, offsetMinutes) {
  return new Date(base.getTime() + offsetMinutes * 60 * 1000);
}

function buildSampleLogs() {
  const base = new Date();

  const logs = [];

  // Brute force: 5+ failed logins from same IP within 2 minutes
  for (let i = 0; i < 5; i += 1) {
    logs.push({
      timestamp: minutesFrom(base, i * 0.3),
      ip: '192.168.1.100',
      user: 'admin',
      eventType: 'FAILED_LOGIN',
      status: 'FAIL',
      rawLog: `FAILED_LOGIN attempt ${i + 1} from 192.168.1.100`,
    });
  }

  // Sudo violation
  logs.push({
    timestamp: minutesFrom(base, 3),
    ip: '10.0.0.5',
    user: 'alice',
    eventType: 'SUDO_VIOLATION',
    status: 'DENIED',
    rawLog: 'alice : user NOT in sudoers',
  });

  // Invalid user login
  logs.push({
    timestamp: minutesFrom(base, 4),
    ip: '192.168.1.200',
    user: 'nonexistent',
    eventType: 'INVALID_USER',
    status: 'FAIL',
    rawLog: 'Failed password for invalid user nonexistent',
  });

  // Suspicious IP pattern: same user from 3+ IPs within 10 minutes
  logs.push(
    {
      timestamp: minutesFrom(base, 10),
      ip: '1.1.1.1',
      user: 'bob',
      eventType: 'ACCEPTED_LOGIN',
      status: 'SUCCESS',
      rawLog: 'Accepted password for bob from 1.1.1.1',
    },
    {
      timestamp: minutesFrom(base, 15),
      ip: '2.2.2.2',
      user: 'bob',
      eventType: 'ACCEPTED_LOGIN',
      status: 'SUCCESS',
      rawLog: 'Accepted password for bob from 2.2.2.2',
    },
    {
      timestamp: minutesFrom(base, 18),
      ip: '3.3.3.3',
      user: 'bob',
      eventType: 'ACCEPTED_LOGIN',
      status: 'SUCCESS',
      rawLog: 'Accepted password for bob from 3.3.3.3',
    }
  );

  return logs;
}

function runRuleEngineTests() {
  const logs = buildSampleLogs();
  const incidents = analyzeLogs(logs);

  console.log('Total incidents detected:', incidents.length);
  for (const incident of incidents) {
    console.log('---');
    console.log('Type:       ', incident.type);
    console.log('Severity:   ', incident.severity);
    console.log('Confidence: ', incident.confidence);
    console.log('User:       ', incident.affectedUser);
    console.log('Source IP:  ', incident.sourceIP);
    console.log('Timestamp:  ', incident.timestamp);
    console.log('Related logs:', incident.relatedLogs.length);
    console.log('Description:', incident.description);
  }
}

if (require.main === module) {
  runRuleEngineTests();
}

module.exports = {
  runRuleEngineTests,
};
