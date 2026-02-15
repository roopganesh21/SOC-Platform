# SOC Platform – Incident Detection & Security Log Analysis

This project is a Security Operations Center (SOC) platform focused on ingesting, analyzing, and correlating security logs to detect incidents and provide actionable alerts.

## High-Level Goals
- Ingest logs from multiple sources (applications, network devices, security tools).
- Normalize and store logs for search and analytics.
- Apply detection rules to identify suspicious or malicious activity.
- Expose REST APIs for frontend dashboards and integrations.
- Provide a web UI for analysts to triage incidents.

## Project Structure

- backend/ – API, detection engine, data access, background jobs
- frontend/ – Web UI for dashboards, alerts, and rule management
- docs/ – Architecture, API specs, detection rules, and dev log
- tests/ – Automated tests for backend and frontend

See docs/ for detailed plans and ongoing design decisions.

## ✨ New Features

- 🎲 **Attack Scenario Generator**: Create realistic attack logs for demos and detection testing

## 🎲 Attack Scenario Generator

Our platform includes a log generator for creating realistic attack scenarios and optionally running detection immediately.

### Features
- 🎯 **Pre-built Attack Scenarios**: curated scenarios like brute force and admin panel attacks
- 🔄 **Auto-Detection**: generate logs and immediately detect threats (auto-ingest)
- 📊 **Realistic Data**: produces auth.log + access.log style output with metadata
- 🎨 **Easy UI**: one-click scenario generation in the dashboard

### Quick Start

**CLI:**

```bash
# from soc-platform/
cd backend
npm run generate-logs
```

**API:**

> Note: the backend port is configurable via `PORT` in `backend/.env`.

```bash
curl -X POST http://localhost:5100/api/generate/logs \
	-H "Content-Type: application/json" \
	-d '{"scenarioType":"BRUTE_FORCE","count":100,"autoIngest":true}'
```

**Frontend:**

Navigate to `/generator` in the dashboard.

### Available Scenarios
- **BRUTE_FORCE**: repeated failed SSH logins from a single IP (credential guessing)
- **ADMIN_ATTACK**: high-volume unauthorized requests targeting `/admin` paths
- **CREDENTIAL_STUFFING**: same username targeted from many IPs (spraying/stuffing)
- **MULTI_VECTOR**: combined behaviors across multiple log types (demo scenario)
- **NORMAL_WITH_ANOMALIES**: mostly normal traffic with a few injected anomalies (baseline testing)

### Demo Use Cases
- Training SOC analysts on triage workflows
- Testing and tuning detection rules
- Demonstrating platform capabilities end-to-end
- Benchmarking performance and rate limiting

## 🔐 Environment Variables (No Secrets in Git)

This repo does **not** commit real API keys. Local configuration is done via `.env` files that are ignored by git.

- Backend:
	- Copy `backend/.env.example` → `backend/.env`
	- Set `GEMINI_API_KEY=INSERT_YOUR_KEY_HERE` to your real key (optional; only needed for AI explanations)
- Frontend:
	- Copy `frontend/soc-dashboard/.env.example` → `frontend/soc-dashboard/.env`
	- Adjust `REACT_APP_API_BASE_URL` if your backend port differs
