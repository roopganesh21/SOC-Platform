import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

export default function QuickGenerateWidget({ onGenerate }) {
  const [scenarios, setScenarios] = useState([]);
  const [selected, setSelected] = useState('');
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadScenarios() {
      setLoadingScenarios(true);
      try {
        const data = await api.getAvailableScenarios();
        const items = Array.isArray(data?.scenarios) ? data.scenarios : [];
        if (cancelled) return;
        setScenarios(items);
        setSelected((prev) => prev || items[0]?.type || items[0]?.scenarioType || '');
      } catch (err) {
        if (cancelled) return;
        console.error('QuickGenerateWidget: failed to load scenarios', err);
        const msg = err?.response?.data?.error || 'Failed to load scenarios.';
        setToast({ kind: 'error', message: msg });
      } finally {
        if (!cancelled) setLoadingScenarios(false);
      }
    }

    loadScenarios();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const selectedMeta = useMemo(
    () => scenarios.find((s) => (s.type || s.scenarioType) === selected) || null,
    [scenarios, selected]
  );

  const handleGenerate = async () => {
    if (!selected) {
      setToast({ kind: 'error', message: 'Select a scenario first.' });
      return;
    }

    const count = Number.isFinite(selectedMeta?.defaultLogCount)
      ? selectedMeta.defaultLogCount
      : 200;

    setSubmitting(true);
    try {
      const data = await api.generateAndAnalyze(selected, count);
      const totalLogs = data?.metadata?.summary?.totalLogs ?? count;
      const incidentsDetected =
        data?.analysis?.incidentsDetected ?? data?.analysis?.incidents?.length ?? 0;

      setToast({
        kind: 'success',
        message: `Generated ${totalLogs} logs • ${incidentsDetected} incident(s) detected`,
      });

      if (typeof onGenerate === 'function') {
        await onGenerate(data);
      }
    } catch (err) {
      console.error('QuickGenerateWidget: generation failed', err);
      const msg = err?.response?.data?.error || 'Generate & analyze failed.';
      setToast({ kind: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Quick Attack Simulation</h3>
          <p className="mt-1 text-xs text-slate-400">
            Generate a scenario and run detection immediately.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="text-xs font-medium text-slate-300">
          Scenario
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loadingScenarios || submitting}
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-60"
          >
            {loadingScenarios ? (
              <option value="">Loading…</option>
            ) : scenarios.length === 0 ? (
              <option value="">No scenarios</option>
            ) : (
              scenarios.map((s) => {
                const val = s.type || s.scenarioType;
                return (
                  <option key={val} value={val}>
                    {s.name || val}
                  </option>
                );
              })
            )}
          </select>
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={submitting || loadingScenarios || !selected}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
              <span>Generating…</span>
            </>
          ) : (
            <span>Generate &amp; Analyze</span>
          )}
        </button>

        {selectedMeta && (
          <div className="text-[11px] text-slate-400">
            Default size:{' '}
            <span className="font-mono text-slate-200">
              {selectedMeta.defaultLogCount ?? 200}
            </span>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`pointer-events-none absolute right-4 top-4 max-w-[260px] rounded-md border px-3 py-2 text-[11px] shadow-sm ${
            toast.kind === 'success'
              ? 'border-emerald-500/50 bg-emerald-900/60 text-emerald-50'
              : 'border-red-500/50 bg-red-900/60 text-red-50'
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
