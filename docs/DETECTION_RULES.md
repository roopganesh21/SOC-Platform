# Detection Rules – SOC Platform

This document defines how detection rules are modeled and provides examples of security detections the platform should support.

## 1. Rule Model (Conceptual)

Each detection rule should, at minimum, contain:

- `id`: Unique identifier
- `name`: Human-readable name
- `description`: What the rule detects
- `enabled`: Boolean
- `severity`: e.g., LOW, MEDIUM, HIGH, CRITICAL
- `condition`: Machine-readable definition of the pattern/logic
- `tags`: List of labels for grouping/search
- `metadata` (optional): e.g., references (CVE, MITRE ATT&CK), owner, version

The `condition` may be backed by:
- Query DSL over normalized logs (e.g., SQL-like, Lucene-like, or custom)
- Threshold / aggregation logic (count, distinct count, rate, etc.)
- Time windows (e.g., N events in X minutes)

## 2. Example Rule Categories

- **Authentication & Access**
  - Multiple failed logins from same IP
  - Successful login from unusual geo-location
  - Privilege escalation or role changes
- **Endpoint & Malware**
  - Repeated process creation for suspicious binaries
  - Execution from temp or user-writable directories
- **Network & Perimeter**
  - Port scanning patterns
  - Large data transfer to external IPs
- **Configuration & Policy**
  - Changes to firewall rules or security groups
  - Disabling of security controls (e.g., AV, logging)

## 3. Sample Rules (Drafts)

> These are conceptual examples. Exact syntax will depend on the selected rule engine/query language.

### 3.1 Multiple Failed Logins from Same IP

- **Goal:** Detect potential brute-force against authentication.
- **Severity:** HIGH
- **Logic (pseudo):**
  - IF count of events where `category = 'auth'` AND `action = 'login_failed'`
  - GROUP BY `ip`
  - OVER window of 5 minutes
  - IS >= 10
  - THEN create alert per offending IP.

### 3.2 Successful Login after Multiple Failures

- **Goal:** Flag suspicious successful logins following failed attempts.
- **Severity:** HIGH
- **Logic (pseudo):**
  - Detect sequence for same `user` and `ip`:
    - >= 5 `login_failed` events
    - followed by `login_success` within 10 minutes.

### 3.3 New Admin User Created

- **Goal:** Track privilege escalation.
- **Severity:** CRITICAL
- **Logic (pseudo):**
  - Event where `category = 'iam'` AND `action = 'user_created'` AND `role = 'admin'`.

## 4. Rule Lifecycle & Management

- Draft → Reviewed → Approved → Enabled
- Rule changes should be versioned (track who changed what and when).
- Rules should track:
  - False positive rate (later iteration)
  - Last triggered time
  - Number of alerts generated in a period

## 5. Next Steps

- Choose or design a concrete rule definition format (YAML/JSON/DSL).
- Implement schema for rules in backend.
- Wire rules into the detection engine and API endpoints.
