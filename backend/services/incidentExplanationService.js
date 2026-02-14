const { formatTimestamp } = require('../utils/timeUtils');
const { generateIncidentExplanation } = require('./geminiClient');
const {
  getExplanationByIncidentId,
  insertAiExplanation,
} = require('../db/queries');

/**
 * Build a prompt string for the AI model from incident and related logs.
 *
 * @param {object} incident
 * @param {Array<object>} relatedLogs
 */
function buildIncidentPrompt(incident, relatedLogs) {
  const lines = [];

  lines.push('You are given a detected security incident and optional related logs.');
  lines.push('Incident details:');
  lines.push(`- ID: ${incident.id}`);
  lines.push(`- Title: ${incident.title || ''}`);
  lines.push(`- Description: ${incident.description || ''}`);
  lines.push(`- Severity: ${incident.severity || ''}`);
  lines.push(`- Status: ${incident.status || ''}`);
  lines.push(`- Created at: ${incident.created_at || ''}`);

  if (relatedLogs && relatedLogs.length > 0) {
    lines.push('\nRelated log lines (truncated):');
    const maxLogs = 20;
    relatedLogs.slice(0, maxLogs).forEach((log) => {
      const ts = log.timestamp instanceof Date ? log.timestamp.toISOString() : log.timestamp;
      lines.push(`- [${ts || ''}] ${log.rawLog || log.raw || log.message || ''}`);
    });
  } else {
    lines.push('\nNo specific related log lines are available. Focus on the incident metadata.');
  }

  lines.push('\nReturn a JSON explanation as requested.');

  return lines.join('\n');
}

/**
 * Get a cached explanation for an incident, or generate and cache a new one.
 *
 * @param {object} incident - Incident row from DB
 * @param {Array<object>} relatedLogs - Optional related logs (can be empty array)
 */
async function getOrCreateIncidentExplanation(incident, relatedLogs = []) {
  if (!incident || !incident.id) {
    throw new Error('Incident is required to generate explanation');
  }

  // 1. Try cache first
  const existing = getExplanationByIncidentId(incident.id);
  if (existing) {
    return existing;
  }

  // 2. Build prompt
  const promptText = buildIncidentPrompt(incident, relatedLogs);

  // 3. Call Gemini
  const aiResult = await generateIncidentExplanation(promptText);

  if (!aiResult) {
    // Graceful failure: return a generic fallback explanation
    return {
      summary: 'AI explanation is currently unavailable.',
      businessImpact:
        'The system could not retrieve an AI-generated explanation at this time. Analysts should review the incident details and logs manually.',
      technicalAnalysis: '',
      recommendedActions: [],
      severityJustification: '',
    };
  }

  const nowIso = new Date().toISOString();
  const dbRow = {
    incident_id: incident.id,
    summary: aiResult.summary,
    business_impact: aiResult.businessImpact,
    technical_analysis: aiResult.technicalAnalysis,
    recommended_actions: JSON.stringify(aiResult.recommendedActions || []),
    severity_justification: aiResult.severityJustification,
    generated_at: nowIso,
    model_version: 'gemini-2.5-flash',
  };

  insertAiExplanation(dbRow);

  return {
    summary: aiResult.summary,
    businessImpact: aiResult.businessImpact,
    technicalAnalysis: aiResult.technicalAnalysis,
    recommendedActions: aiResult.recommendedActions || [],
    severityJustification: aiResult.severityJustification,
    generatedAt: formatTimestamp(new Date(nowIso)),
    modelVersion: 'gemini-2.5-flash',
  };
}

module.exports = {
  getOrCreateIncidentExplanation,
};
