markdown
# API Endpoints

## Logs
- POST /api/logs/upload - Upload log file
- GET /api/logs - Get all parsed logs

## Incidents
- GET /api/incidents - Get all incidents (filters: severity, status, limit)
- GET /api/incidents/:id - Get incident details
- POST /api/incidents/:id/explain - Generate AI explanation
- PATCH /api/incidents/:id/status - Update status
- GET /api/incidents/stats - Get statistics

## Health
- GET /api/health - API health check
