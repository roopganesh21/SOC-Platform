import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

const STATUS_OPTIONS = ['OPEN', 'ACKNOWLEDGED', 'CLOSED'];

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusValue, setStatusValue] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [explanation, setExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState(null);

  const loadIncident = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentById(id);
      if (!data || !data.incident) {
        setError('Incident not found.');
        setIncident(null);
      } else {
        setIncident(data.incident);
        setStatusValue(data.incident.status || 'OPEN');
      }
    } catch (err) {
      console.error('Failed to load incident:', err);
      if (err.response && err.response.status === 404) {
        setError('Incident not found.');
      } else {
        setError('Failed to load incident details.');
      }
      setIncident(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadIncident();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBack = () => {
    navigate('/incidents');
  };

  const handleStatusChange = async (nextStatus) => {
    if (!incident || !nextStatus || nextStatus === incident.status) return;
    setStatusUpdating(true);
    setError(null);
    try {
      const data = await api.updateStatus(incident.id, nextStatus);
      if (data && data.incident) {
        setIncident(data.incident);
        setStatusValue(data.incident.status || nextStatus);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update incident status.');
      setStatusValue(incident.status || statusValue);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleGenerateExplanation = async () => {
    if (!incident) return;
    setExplanationLoading(true);
    setExplanationError(null);
    try {
      const data = await api.generateExplanation(incident.id);
      if (data && data.explanation) {
        setExplanation(data.explanation);
      } else {
        setExplanationError('Explanation not available.');
      }
    } catch (err) {
      console.error('Failed to generate explanation:', err);
      setExplanationError('Failed to generate AI explanation.');
    } finally {
      setExplanationLoading(false);
    }
  };

  const createdAt = incident?.created_at
    ? new Date(incident.created_at).toLocaleString()
    : 'Unknown';
  const updatedAt = incident?.updated_at
    ? new Date(incident.updated_at).toLocaleString()
    : 'Never';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
        >
          ← Back to Incidents
        </button>
        {incident && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>ID: {incident.id}</span>
            <span className="h-4 w-px bg-slate-700" />
            <span>Created: {createdAt}</span>
            <span className="h-4 w-px bg-slate-700" />
            <span>Updated: {updatedAt}</span>
          </div>
        )}
      </div>

      <header>
        <h1 className="text-2xl font-semibold text-slate-100">
          {incident ? incident.title : `Incident #${id}`}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Detailed incident view, status, and AI analysis.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-900/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {loading && !incident && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
          Loading incident details...
        </div>
      )}

      {!loading && !incident && !error && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
          Incident not found.
        </div>
      )}

      {incident && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Overview card */}
          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Overview
            </h2>
            <p className="text-sm text-slate-300">{incident.description || 'No description provided.'}</p>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-400">Severity</dt>
                <dd className="mt-1">
                  <SeverityBadge severity={incident.severity} />
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Status</dt>
                <dd className="mt-1">
                  <select
                    value={statusValue}
                    disabled={statusUpdating}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Created at</dt>
                <dd className="mt-1 text-slate-200">{createdAt}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Last updated</dt>
                <dd className="mt-1 text-slate-200">{updatedAt}</dd>
              </div>
            </dl>
          </section>

          {/* Source information */}
          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Source Information
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-400">Source IP</dt>
                <dd className="mt-0.5 text-slate-200">
                  {incident.source_ip || 'Not available in this demo.'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">User</dt>
                <dd className="mt-0.5 text-slate-200">
                  {incident.user || 'Not available in this demo.'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Raw context</dt>
                <dd className="mt-0.5 text-xs text-slate-400">
                  IP and user attribution can be inferred from underlying logs
                  and detection rules; this demo incident only stores high-level
                  metadata.
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {incident && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Timeline / related logs placeholder */}
          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Timeline
            </h2>
            <p className="text-xs text-slate-400">
              In a production deployment this section would show a timeline of
              log events correlated to this incident. The current demo backend
              does not yet persist explicit log-to-incident links.
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li className="flex items-baseline gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                <span>
                  Incident created at <span className="font-medium">{createdAt}</span>
                </span>
              </li>
              {updatedAt !== 'Never' && (
                <li className="flex items-baseline gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>
                    Status updated to{' '}
                    <span className="font-medium">{incident.status}</span> at{' '}
                    <span className="font-medium">{updatedAt}</span>
                  </span>
                </li>
              )}
            </ul>
          </section>

          {/* AI Explanation */}
          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                AI Explanation
              </h2>
              <button
                type="button"
                onClick={handleGenerateExplanation}
                disabled={explanationLoading}
                className="inline-flex items-center rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-teal-500 disabled:opacity-60"
              >
                {explanationLoading ? 'Generating…' : 'Generate Explanation'}
              </button>
            </div>

            {explanationError && (
              <p className="text-xs text-red-300">{explanationError}</p>
            )}

            {!explanation && !explanationLoading && !explanationError && (
              <p className="text-xs text-slate-400">
                Click "Generate Explanation" to ask the AI to summarise this
                incident, analyse impact, and suggest actions.
              </p>
            )}

            {explanation && (
              <div className="space-y-3 text-xs text-slate-200">
                <div>
                  <h3 className="font-semibold text-slate-100">Summary</h3>
                  <p className="mt-1 text-slate-200">{explanation.summary}</p>
                </div>
                {explanation.businessImpact && (
                  <div>
                    <h3 className="font-semibold text-slate-100">Business Impact</h3>
                    <p className="mt-1 text-slate-200">{explanation.businessImpact}</p>
                  </div>
                )}
                {explanation.technicalAnalysis && (
                  <div>
                    <h3 className="font-semibold text-slate-100">Technical Analysis</h3>
                    <p className="mt-1 whitespace-pre-line text-slate-200">
                      {explanation.technicalAnalysis}
                    </p>
                  </div>
                )}
                {explanation.recommendedActions &&
                  explanation.recommendedActions.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-100">Recommended Actions</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-200">
                        {explanation.recommendedActions.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {explanation.severityJustification && (
                  <div>
                    <h3 className="font-semibold text-slate-100">Severity Justification</h3>
                    <p className="mt-1 text-slate-200">
                      {explanation.severityJustification}
                    </p>
                  </div>
                )}
                <div className="pt-2 text-[0.65rem] text-slate-400">
                  {explanation.generatedAt && (
                    <div>Generated at: {explanation.generatedAt}</div>
                  )}
                  {explanation.modelVersion && (
                    <div>Model: {explanation.modelVersion}</div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
