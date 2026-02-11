# API Specification – SOC Platform (Draft)

This is a first-pass API plan. Endpoints, payloads, and auth mechanisms can be refined as implementation details become clearer.

## 1. Conventions

- Base URL: `/api`
- Format: JSON request/response
- Authentication: `Authorization: Bearer <token>` header (mechanism TBD)
- All timestamps in ISO 8601 (UTC)

---

## 2. Authentication & Users (Optional to start)

### POST /api/auth/login
- **Description:** Authenticate a user and return an access token.
- **Body:** `{ "username": string, "password": string }`
- **Response:** `{ "token": string, "expires_at": string }`

### GET /api/auth/me
- **Description:** Return current user profile.
- **Auth:** Required
- **Response:** `{ "id": string, "username": string, "role": string }`

---

## 3. Log Ingestion

### POST /api/logs
- **Description:** Ingest a batch of log events.
- **Auth:** Required (can be API key or token based)
- **Body (example):**
```json
{
  "source": "app-gateway-1",
  "events": [
    {
      "timestamp": "2025-01-01T12:34:56Z",
      "severity": "INFO",
      "category": "auth",
      "message": "User login successful",
      "raw": { "ip": "1.2.3.4", "user": "alice" }
    }
  ]
}
```
- **Response:** `{ "ingested": number, "failed": number }`

### GET /api/logs
- **Description:** Search and filter logs.
- **Query params (initial draft):**
  - `source` (string)
  - `from` (timestamp)
  - `to` (timestamp)
  - `severity` (string)
  - `query` (free-text or simple field filters)
  - `page`, `pageSize`
- **Response:**
```json
{
  "items": [ { /* LogEvent */ } ],
  "page": 1,
  "pageSize": 50,
  "total": 123
}
```

---

## 4. Detection Rules

### GET /api/rules
- **Description:** List detection rules.
- **Query params:** `enabled` (optional), `severity` (optional)

### POST /api/rules
- **Description:** Create a new detection rule.
- **Body (draft):**
```json
{
  "name": "Multiple failed logins from same IP",
  "description": "Detect brute-force login attempts",
  "enabled": true,
  "severity": "HIGH",
  "condition": {
    "type": "threshold",
    "window_minutes": 5,
    "threshold": 10,
    "filter": "category = 'auth' AND action = 'login_failed' GROUP BY ip"
  },
  "tags": ["auth", "bruteforce"]
}
```

### GET /api/rules/{id}
- **Description:** Get a specific rule.

### PUT /api/rules/{id}
- **Description:** Update an existing rule.

### DELETE /api/rules/{id}
- **Description:** Soft-delete or disable a rule (implementation decision).

---

## 5. Alerts

### GET /api/alerts
- **Description:** List generated alerts.
- **Query params:** `status`, `severity`, `rule_id`, `from`, `to`, `page`, `pageSize`

### GET /api/alerts/{id}
- **Description:** Get alert details, including related log events.

### PATCH /api/alerts/{id}
- **Description:** Update alert status (e.g., `OPEN`, `ACKNOWLEDGED`, `CLOSED`).
- **Body (example):** `{ "status": "ACKNOWLEDGED", "comment": "Investigating" }`

---

## 6. Incidents

### GET /api/incidents
- **Description:** List incidents (grouped alerts/events).

### POST /api/incidents
- **Description:** Create a new incident, optionally attaching alerts.

### GET /api/incidents/{id}
- **Description:** Incident details, timeline, and related alerts/logs.

### PATCH /api/incidents/{id}
- **Description:** Update incident fields (status, owner, title, etc.).

---

## 7. Health & Utilities

### GET /api/health
- **Description:** Basic health check for liveness.
- **Response:** `{ "status": "ok", "timestamp": "..." }

### GET /api/metrics (optional)
- **Description:** Expose metrics (e.g., for Prometheus) if needed.

---

## 8. Next Steps

- Align endpoints with final data model and architecture.
- Define consistent error response format.
- Add pagination, sorting, and filtering rules across list endpoints.
- Decide concrete auth scheme (JWT, API keys, SSO, etc.).
