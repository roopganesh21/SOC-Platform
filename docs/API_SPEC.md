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

## Log Generation Endpoints

### POST /api/logs/generate
Generate logs programmatically

**Request:**
```json
{
	"scenarioType": "BRUTE_FORCE",
	"count": 100,
	"autoIngest": true
}
```

**Response:**
```json
{
	"success": true,
	"filesGenerated": {
		"auth": "logs/generated/auth-1234567890.log",
		"access": "logs/generated/access-1234567890.log"
	},
	"metadata": {
		"totalLogs": 150,
		"attackType": "BRUTE_FORCE",
		"incidentsDetected": 3
	}
}
```

### GET /api/logs/scenarios
List available attack scenarios

### POST /api/logs/generate-and-analyze
Generate logs and auto-trigger detection
