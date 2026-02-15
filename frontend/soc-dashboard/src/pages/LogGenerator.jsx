import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, RefreshCw } from 'lucide-react';
import api from '../services/api';
import ScenarioSelector from '../components/ScenarioSelector';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function ScenarioSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="h-[170px] animate-pulse rounded-xl border border-slate-800 bg-slate-900/60"
        />
      ))}
    </div>
  );
}

export default function LogGenerator() {
  const navigate = useNavigate();

  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [logCount, setLogCount] = useState(200);
  const [autoIngest, setAutoIngest] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [scenarioLoadError, setScenarioLoadError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadScenarios = useCallback(async () => {
    setIsLoadingScenarios(true);
    setScenarioLoadError(null);
    try {
      const data = await api.getAvailableScenarios();
      const items = Array.isArray(data?.scenarios) ? data.scenarios : [];
      setScenarios(items);
      setSelectedScenario((prev) => prev || (items[0]?.type || items[0]?.scenarioType || null));
    } catch (err) {
      console.error('Failed to load scenarios', err);
      const msg = err?.response?.data?.error || 'Failed to load scenarios.';
      setScenarioLoadError(msg);
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  // Fetch generated files on mount and after every successful generation
  const refreshGeneratedFiles = async () => {
    try {
      const data = await api.getGeneratedFiles();
      const items = Array.isArray(data?.files) ? data.files : [];
      setGeneratedFiles(items);
    } catch (err) {
      console.error('Failed to load generated files', err);
      // Non-fatal; no explicit user error needed here.
    }
  };

  useEffect(() => {
    refreshGeneratedFiles();
  }, []);

  const selectedScenarioMeta = useMemo(
    () => scenarios.find((s) => (s.type || s.scenarioType) === selectedScenario) || null,
    [scenarios, selectedScenario]
  );

  const handleGenerate = async () => {
    if (!selectedScenario) {
      setError('Please select a scenario first.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsGenerating(true);

    try {
      let data;
      if (autoIngest) {
        data = await api.generateAndAnalyze(selectedScenario, logCount);
      } else {
        data = await api.generateLogs(selectedScenario, logCount, false);
      }

      setGenerationResult(data || null);

      const totalLogs = data?.metadata?.summary?.totalLogs ?? null;
      const incidentsDetected = data?.analysis?.incidentsDetected ?? data?.analysis?.incidents?.length ?? null;

      if (autoIngest) {
        setSuccess(
          `Generated ${totalLogs ?? 'N/A'} logs and ingested them into the platform. Detected ${
            incidentsDetected ?? 0
          } incident(s).`
        );
      } else {
        setSuccess(`Generated ${totalLogs ?? 'N/A'} logs. You can now ingest them via the upload workflow.`);
      }

      await refreshGeneratedFiles();
    } catch (err) {
      console.error('Generation failed', err);
      const msg = err?.response?.data?.error || 'Failed to generate logs. Please try again.';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!filename) return;
    try {
      await api.deleteGeneratedFile(filename);
      setGeneratedFiles((prev) => prev.filter((f) => f.name !== filename));
    } catch (err) {
      console.error('Failed to delete generated file', err);
      const msg = err?.response?.data?.error || 'Failed to delete generated file.';
      setError(msg);
    }
  };

  const handleViewIncidents = () => {
    navigate('/incidents');
  };

  const handleUploadToPlatform = () => {
    navigate('/upload');
  };

  const hasIncidents = Array.isArray(generationResult?.incidents)
    ? generationResult.incidents.length > 0
    : Array.isArray(generationResult?.analysis?.incidents)
      ? generationResult.analysis.incidents.length > 0
      : false;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-50">Attack Scenario Generator</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Use curated attack scenarios to generate realistic auth.log and access.log data. This helps you
          test detection rules, dashboards, and AI explanations in a safe, reproducible way.
        </p>
      </header>

      {/* Scenario selection */}
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-300">
        {isLoadingScenarios ? (
          <ScenarioSkeletonGrid />
        ) : scenarioLoadError ? (
          <div className="space-y-3 rounded-lg border border-red-500/40 bg-red-900/30 p-4 text-sm text-red-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Failed to load scenarios</div>
                <div className="mt-1 text-xs text-red-100/90">{scenarioLoadError}</div>
              </div>
              <button
                type="button"
                onClick={loadScenarios}
                className="inline-flex items-center gap-2 rounded-md bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-50 transition-all duration-300 hover:bg-red-500/30"
                title="Retry loading scenarios"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          </div>
        ) : (
          <ScenarioSelector
            scenarios={scenarios}
            selected={selectedScenario}
            onSelect={setSelectedScenario}
          />
        )}

        {selectedScenarioMeta && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              <span className="font-semibold text-slate-200">Selected:</span>{' '}
              <span>{selectedScenarioMeta.name || selectedScenario}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/60 px-3 py-1 ring-1 ring-slate-800">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Baseline size</span>
              <span className="text-[11px] font-mono text-slate-100">
                ~{selectedScenarioMeta.defaultLogCount || '80'} events
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Configuration */}
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-300">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">Generation Settings</h2>
            <p className="max-w-xl text-xs text-slate-400">
              Adjust the approximate number of log lines and choose whether the generated auth logs
              should be automatically ingested into the detection engine.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Approximate total logs</span>
              <span className="font-mono text-slate-100">{logCount}</span>
            </div>
            <input
              type="range"
              min={10}
              max={1000}
              value={logCount}
              onChange={(e) => setLogCount(Number(e.target.value) || 10)}
              title="Controls the approximate total number of generated log lines"
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>10</span>
              <span>1000</span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 font-medium text-slate-100">
                Auto-ingest into platform
                <span
                  className="inline-flex items-center"
                  title="When enabled, generated auth logs are ingested and detection rules run automatically"
                >
                  <Info className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                </span>
              </span>
              <button
                type="button"
                onClick={() => setAutoIngest((v) => !v)}
                title="Toggle whether generated logs are automatically ingested and analyzed"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                  autoIngest ? 'bg-emerald-500/80' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    autoIngest ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              When enabled, generated auth logs are parsed and stored in the logs table, and detection
              rules are executed immediately.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-400">
            {autoIngest
              ? 'Generation will produce logs, ingest them, and run detection in one step.'
              : 'Generation will only create files; you can upload or ingest them later.'}
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !selectedScenario}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:bg-cyan-400 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <span>Generate Scenario Logs</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Results */}
      {generationResult && (
        <section className="space-y-4 rounded-xl border border-emerald-500/40 bg-emerald-900/10 p-4 transition-all duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" aria-hidden="true" />
                Generation Complete
              </h2>
              {success && <p className="mt-1 text-xs text-emerald-100/90">{success}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-lg bg-slate-950/70 p-3 text-xs text-slate-200 ring-1 ring-emerald-700/60">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                Files Generated
              </h3>
              <ul className="space-y-1">
                {generationResult?.metadata?.files && (
                  <>
                    <li>
                      <span className="font-mono text-[11px] text-slate-100">{generationResult.metadata.files.auth}</span>
                    </li>
                    <li>
                      <span className="font-mono text-[11px] text-slate-100">{generationResult.metadata.files.access}</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-950/70 p-3 text-xs text-slate-200 ring-1 ring-emerald-700/60">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                Summary
              </h3>
              <ul className="space-y-1 text-[11px]">
                <li>
                  Total logs:{' '}
                  <span className="font-mono text-slate-50">
                    {generationResult?.metadata?.summary?.totalLogs ?? 'N/A'}
                  </span>
                </li>
                {autoIngest && (
                  <li>
                    Incidents detected:{' '}
                    <span className="font-mono text-slate-50">
                      {generationResult?.analysis?.incidentsDetected ?? 0}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-950/70 p-3 text-xs text-slate-200 ring-1 ring-emerald-700/60">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                Next Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                {autoIngest && (
                  <button
                    type="button"
                    onClick={handleViewIncidents}
                    className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition-all duration-300 hover:bg-emerald-400"
                  >
                    View Incidents
                  </button>
                )}
                {!autoIngest && (
                  <button
                    type="button"
                    onClick={handleUploadToPlatform}
                    className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition-all duration-300 hover:bg-emerald-400"
                  >
                    Upload to Platform
                  </button>
                )}
              </div>
            </div>
          </div>

          {hasIncidents && autoIngest && (
            <div className="mt-3 text-[11px] text-emerald-100/90">
              A detailed incident list is available on the Incidents page. Use the filters there to
              explore alerts generated from this scenario.
            </div>
          )}
        </section>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-900/40 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {/* History */}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-300">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-200">Recently Generated Files</h2>
          <button
            type="button"
            onClick={refreshGeneratedFiles}
            title="Refresh generated files list"
            className="text-[11px] font-medium text-cyan-300 transition-all duration-300 hover:text-cyan-200"
          >
            Refresh
          </button>
        </div>

        {generatedFiles.length === 0 ? (
          <p className="text-xs text-slate-500">
            No generated logs have been recorded yet. After you generate a scenario, files will appear here
            with basic metadata.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Filename</th>
                  <th className="px-3 py-2 text-left font-medium">Size</th>
                  <th className="px-3 py-2 text-left font-medium">Last Modified</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {generatedFiles.map((file) => (
                  <tr key={file.name} className="hover:bg-slate-900/70">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-100">{file.name}</td>
                    <td className="px-3 py-2 text-slate-300">{formatBytes(file.sizeBytes)}</td>
                    <td className="px-3 py-2 text-slate-400">{formatDate(file.modifiedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.name)}
                        title="Delete this generated file"
                        className="text-[11px] font-medium text-red-300 transition-all duration-300 hover:text-red-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
