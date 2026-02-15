export default function About() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">About</h1>
        <p className="mt-1 text-sm text-slate-400">
          Overview of the SOC Platform project and architecture.
        </p>
      </header>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Project Summary
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Incident Detection and Security Log Analysis Platform is a full-stack SOC demo that
          ingests authentication + access logs, detects suspicious patterns, groups them into
          incidents, and provides dashboards to support triage.
        </p>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Key Features
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>Log upload and parsing into normalized security events</li>
          <li>Detection rules (brute force, suspicious IP patterns, sudo violations, and more)</li>
          <li>Incident workflows (status updates, severity-based triage, and detail views)</li>
          <li>Dashboard analytics (severity distribution, trends, and top attacking IPs)</li>
          <li>Attack Scenario Generator for repeatable demo/test datasets</li>
          <li>AI incident explanation layer (Gemini-backed where configured)</li>
        </ul>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Architecture (High Level)
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Frontend</dt>
            <dd className="mt-1 text-slate-300">
              React dashboard (Incidents, Dashboard, Generator) consuming REST endpoints.
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Backend</dt>
            <dd className="mt-1 text-slate-300">
              Node/Express API for ingestion, detection, stats, and explanation.
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Storage</dt>
            <dd className="mt-1 text-slate-300">
              SQLite database for logs, incidents, and cached AI explanations.
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Detection</dt>
            <dd className="mt-1 text-slate-300">
              Rule engine correlates events over time windows and assigns severity + confidence.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
