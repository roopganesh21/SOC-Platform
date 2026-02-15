import React from 'react';
import SeverityBadge from './SeverityBadge';

const severityToGradient = {
  critical: 'from-red-600/90 via-rose-600/90 to-orange-500/90',
  high: 'from-rose-600/90 via-red-500/90 to-amber-500/90',
  medium: 'from-amber-500/90 via-yellow-500/90 to-emerald-500/90',
  low: 'from-emerald-500/90 via-sky-500/90 to-cyan-500/90',
  default: 'from-slate-600/90 via-slate-700/90 to-slate-800/90',
};

const severityToIcon = {
  critical: '🚨',
  high: '🔥',
  medium: '⚠️',
  low: '👀',
};

function ScenarioSelector({ scenarios = [], onSelect, selected }) {
  const handleSelect = (scenarioType) => {
    if (typeof onSelect === 'function') {
      onSelect(scenarioType);
    }
  };

  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-6 text-sm text-slate-300">
        No scenarios available. Configure log generation on the backend to enable this panel.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Attack Scenarios
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Pick a scenario to generate coordinated auth + access logs for testing detection rules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => {
          const type = scenario.type || scenario.scenarioType || 'UNKNOWN';
          const name = scenario.name || type;
          const description = scenario.description || 'No description provided.';
          const severityRaw = (scenario.severity || scenario.defaultSeverity || 'default').toLowerCase();
          const severityKey = ['critical', 'high', 'medium', 'low'].includes(severityRaw)
            ? severityRaw
            : 'default';
          const isActive = selected === type;

          const gradient = severityToGradient[severityKey] || severityToGradient.default;
          const icon = severityToIcon[severityKey] || '🛡️';

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type)}
              className={[
                'group relative flex h-full flex-col overflow-hidden rounded-xl border p-[1px] text-left transition-all duration-200',
                isActive
                  ? 'border-cyan-400/80 shadow-lg shadow-cyan-500/30'
                  : 'border-slate-700/80 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/20',
              ].join(' ')}
            >
              <div className={`relative flex h-full flex-col rounded-[0.7rem] bg-gradient-to-br ${gradient}`}>
                <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light">
                  <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#ffffff33,_transparent_55%),radial-gradient(circle_at_bottom,_#00000066,_transparent_55%)]" />
                </div>

                <div className="relative flex flex-1 flex-col p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/40 text-xl shadow-inner shadow-black/40 ring-1 ring-slate-900/60">
                      <span className="drop-shadow-sm">{icon}</span>
                    </div>

                    <SeverityBadge severity={severityKey === 'default' ? 'low' : severityKey} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-50 line-clamp-2">{name}</h4>
                      {isActive && (
                        <span className="rounded-full bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300 ring-1 ring-cyan-400/60">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-100/80 line-clamp-3">{description}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-100/80">
                    <div className="inline-flex items-center gap-1 rounded-full bg-slate-950/50 px-2 py-1 ring-1 ring-slate-900/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/90 group-hover:bg-emerald-200" />
                      <span className="font-mono uppercase tracking-wide text-[10px] text-slate-100/90">
                        {type}
                      </span>
                    </div>

                    <span className="text-[10px] uppercase tracking-wide text-slate-100/70 group-hover:text-slate-50">
                      Click to select
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ScenarioSelector;
