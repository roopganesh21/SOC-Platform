# Log Generator Demo Walkthrough

This walkthrough is designed for a quick, repeatable demo of the Attack Scenario Generator end-to-end: generate logs → detect incidents → review incidents → generate AI explanation.

## Prerequisites

- Backend running (port is configured by `PORT` in `backend/.env`; examples below assume `5100`).
- Frontend running.
- Dashboard is reachable in the browser.

---

## Scenario 1: Brute Force Detection Demo

1. **Navigate to Generator**
   - Click **Generator** in the navbar (route: `/generator`).

2. **Select Brute Force**
   - Click the **SSH Brute Force** scenario card.

3. **Configure**
   - Set **Approximate total logs** to `100`.
   - Ensure **Auto-ingest into platform** is enabled.
     - Tooltip reminder: this ingests generated auth logs and runs detection automatically.

4. **Generate**
   - Click **Generate Scenario Logs**.
   - Watch the **Generating…** loading state.

5. **View Results**
   - In the success panel, confirm:
     - Total logs generated is near 100.
     - Incidents detected is non-zero.
   - Click **View Incidents**.

6. **Analyze an Incident**
   - Click an incident row.
   - Click **Generate AI Explanation**.
   - Read the explanation and call out:
     - why it triggered,
     - affected user,
     - source IP,
     - confidence/severity.

---

## Scenario 2: Multi-Vector Attack (Complex Demo)

This scenario is useful for demonstrating correlation-style detection and a more realistic “messy” dataset.

1. **Navigate to Generator**
   - Go to `/generator`.

2. **Select Multi-Vector**
   - Click the **MULTI_VECTOR** scenario card.

3. **Configure**
   - Set **Approximate total logs** to `200` (or higher for a stronger demo).
   - Keep **Auto-ingest into platform** enabled.

4. **Generate**
   - Click **Generate Scenario Logs**.

5. **Review Incidents**
   - Click **View Incidents**.
   - Use filters (severity/status) to highlight the most relevant results.

6. **Explain a High-Value Incident**
   - Pick a high-confidence / high-severity incident and generate an AI explanation.

---

## Video Script (Short Demo)

**Goal:** show the platform’s “one click → detection → investigation” loop.

1. **Open Dashboard**
   - “This is the SOC dashboard with live stats and trends.”

2. **Open Generator**
   - “We can generate realistic attack telemetry for demos and rule testing.”

3. **Brute Force Demo**
   - Select **SSH Brute Force** → set `100` logs → auto-ingest ON → generate.
   - “The platform immediately detects threats and persists incidents.”

4. **Incident Investigation**
   - Open incident list → open an incident → generate AI explanation.
   - “This makes triage faster and provides rationale.”

5. **Close**
   - “This workflow is great for training, testing detections, and showcasing the product.”

---

## Screenshots & Examples

Take these screenshots and save them under `screenshots/generator/`:

- Generator page (overview): `screenshots/generator/main.png`
- Attack scenarios grid: `screenshots/generator/scenarios.png`
- Configuration UI: `screenshots/generator/config.png`
- Generation success panel: `screenshots/generator/success.png`
- Incidents list after auto-ingest: `screenshots/generator/incidents.png`

Then embed them here:

![Generator Interface](../screenshots/generator/main.png)
![Attack Scenarios](../screenshots/generator/scenarios.png)
![Configuration](../screenshots/generator/config.png)
![Generation Success](../screenshots/generator/success.png)
![Detected Incidents](../screenshots/generator/incidents.png)
