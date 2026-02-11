# Architecture – SOC Platform

## 1. High-Level Overview

The platform is designed as a modular, service-oriented web application with a single backend and frontend to start. Over time, parts can be split into separate services if needed.

**Core components (initial plan):**
- **Frontend Web App** (in frontend/)
  - Dashboard for alerts, incidents, and log search
  - Views for detection rules, rule performance, and tuning
- **Backend API** (in backend/)
  - REST API for frontend and integrations
  - Log ingestion endpoints
  - Detection engine (rule evaluation, correlation)
  - Incident and alert management
- **Data Storage Layer**
  - Primary database for:
    - Logs (normalized/structured)
    - Alerts & incidents
    - Detection rules & rule metadata
    - Users and roles (if local auth is used)
- **Background / Batch Processing**
  - Scheduled jobs for:
    - Periodic rule evaluations (if not done synchronously)
    - Aggregations and metrics
    - Cleanup / archival

> Note: Exact technology choices (e.g., PostgreSQL vs. another DB, Node.js vs. Python backend) can be refined as implementation starts.

## 2. Logical Architecture Diagram (Textual)

```text
[Log Sources]  --->  [Backend API: Ingestion Endpoints]
                            |
                            v
                    [Normalization & Enrichment]
                            |
                            v
                      [Data Storage Layer]
                            |
                            v
                    [Detection Engine & Rules]
                            |
                            v
                    [Alerts & Incidents Store]
                            |
                            v
[Frontend Web UI] <---- [Backend API: Query/Manage]
```

## 3. Backend Responsibilities

- Expose REST endpoints for:
  - Log ingestion (e.g., /api/logs)
  - Detected alerts and incidents (e.g., /api/alerts, /api/incidents)
  - Detection rule CRUD (e.g., /api/rules)
  - Authentication/authorization (if implemented in the platform)
- Normalize incoming logs into a common schema.
- Apply detection rules (rule engine) against stored or streaming logs.
- Correlate related events into higher-level incidents.
- Provide search & filter capabilities over logs and alerts.

## 4. Frontend Responsibilities

- Analyst-focused UI:
  - Incident and alert listing, filtering, and detail views
  - Timeline / event views (per incident)
  - Log search interface (simple to start; advanced later)
  - Detection rule management UI
- Communicate with backend via JSON-based REST API.

## 5. Data Model (Initial Draft)

High-level entities (details will be refined in implementation):

- **LogEvent**
  - id, source, timestamp, severity, category, message, raw_data
- **DetectionRule**
  - id, name, description, enabled, severity, query/condition, tags
- **Alert**
  - id, rule_id, first_seen, last_seen, status, severity, count
- **Incident**
  - id, title, description, related_alert_ids, status, owner, created_at
- **User** (optional, if local auth)
  - id, username, role, created_at

## 6. Non-Functional Considerations (for later iterations)

- Scalability: decouple ingestion and detection via message queues.
- Security: authentication, RBAC, audit logging.
- Observability: metrics, logging, tracing for the platform.
- Resilience: retries, dead-letter queues, and backpressure strategies.

## 7. Next Steps

- Finalize technology stack for backend and frontend.
- Refine the data model per chosen database.
- Align API_SPEC.md to the architecture and entities listed here.
