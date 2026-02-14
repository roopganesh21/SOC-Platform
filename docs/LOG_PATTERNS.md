# Log Patterns – SOC Platform

This document describes the initial log formats and event types the platform parses from Linux `auth.log`-style logs.

## 1. Target Log Source

- Linux authentication logs (`/var/log/auth.log` or equivalent).
- Sample entries (see `tests/sample-logs/auth.log`):
  - `Failed password for invalid user ...`
  - `Failed password for ...`
  - `Accepted password for ...`
  - `sudo: <user> : user NOT in sudoers ...`

## 2. Event Types (Initial)

The parser detects the following high-level event types:

- `FAILED_LOGIN`
  - Failed SSH password attempts.
- `ACCEPTED_LOGIN`
  - Successful SSH password logins.
- `SUDO_VIOLATION`
  - Sudo usage where the user is not in `sudoers`.
- `INVALID_USER`
  - Login attempts for invalid/non-existent users.

These map directly to detection rules in `DETECTION_RULES.md` (e.g., brute-force detection based on repeated `FAILED_LOGIN` or `INVALID_USER` events).

## 3. General Log Format (auth.log)

Typical structure:

```text
<month> <day> <time> <host> <process>[pid]: <message>
```

Example:

```text
Jan 15 08:23:45 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100 port 22 ssh2
```

## 4. Parsed Fields

Each parsed event will produce an object with:

- `timestamp` – JavaScript `Date` (year inferred, e.g., current year).
- `ip` – Remote IP address when present.
- `user` – Username involved in the event when present.
- `eventType` – One of: `FAILED_LOGIN`, `ACCEPTED_LOGIN`, `SUDO_VIOLATION`, `INVALID_USER`.
- `status` – High-level outcome, e.g., `FAIL`, `SUCCESS`, `DENIED`.
- `rawLog` – Original log line.

## 5. Pattern Summaries

- **SSH failed password**
  - Matches lines containing `Failed password for`.
  - If `invalid user` substring is present, the event type is `INVALID_USER`.
  - Otherwise, event type is `FAILED_LOGIN`.
- **SSH accepted password**
  - Matches lines containing `Accepted password for`.
  - Event type is `ACCEPTED_LOGIN`.
- **Sudo violations**
  - Matches lines like `sudo: <user> : user NOT in sudoers`.
  - Event type is `SUDO_VIOLATION`.

## 6. Future Extensions

- Additional auth-related events (e.g., public key auth, PAM errors).
- Non-auth logs (web server access logs, system logs, etc.).
- Configurable/custom patterns per deployment.
