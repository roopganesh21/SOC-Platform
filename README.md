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
