# Log Generator Feature

## Purpose
Auto-generate realistic attack scenarios for testing and demo purposes.

## Usage

Run from the backend folder:

```bash
cd backend

# Interactive menu
npm run generate-logs

# Quick demo
npm run generate-demo

# Default brute-force scenario
npm run generate-attack

# Custom scenarios (direct CLI)
node scripts/generateLogs.js --scenario ADMIN_ATTACK --count 150 --timeline 10
node scripts/generateLogs.js --scenario MULTI_VECTOR --timeline 30
```

## Attack Scenarios
1. **Brute Force Attack** - SSH brute force + API auth failures (coordinated attacker IP)
2. **Admin Panel Attack** - Unauthorized /admin attempts + sudo violations
3. **Privilege Escalation** - Sudo violations (used as a signal in scenarios)
4. **Port Scan Simulation** - Rapid scan-like web requests to suspicious paths
5. **Bot Traffic** - Random 404 patterns / crawler noise
6. **Credential Stuffing** - Same username targeted from multiple IPs + API auth failures
7. **Normal With Anomalies** - Baseline traffic with small suspicious bursts

## Files Generated
- `logs/generated/auth-{timestamp}.log`
- `logs/generated/access-{timestamp}.log`
- `logs/generated/scenario-metadata.json`

The metadata JSON includes the scenario type, severity, time window, indicators (IPs/endpoints/usernames), and detection hints.

## Integration Points
- CLI script for manual generation
- API endpoint for on-demand generation
- Frontend "Generate Attack" button
