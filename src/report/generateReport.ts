import fs from "fs";
import path from "path";
import type { GAResult } from "../ga/runGA.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";

export interface ReportRun {
  label: string;
  result: GAResult;
}

export interface ReportConfig {
  populationSize: number;
  generations: number;
  tournamentSize: number;
  mutationRate: number;
  elitisimCount: number;
}

/**
 * Generates a self-contained HTML report file from one or more GA runs.
 * Uses Chart.js via CDN — no build step needed, just open in a browser.
 */
export function generateReport(
  runs: ReportRun[],
  candidates: PreGACandidate[],
  config: ReportConfig,
  outputPath: string
): void {
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  // --- Chart datasets ---
  const chartColors = [
    { border: "#6366f1", bg: "rgba(99,102,241,0.12)" },  // indigo – single point
    { border: "#22d3ee", bg: "rgba(34,211,238,0.12)" },  // cyan   – uniform
    { border: "#f59e0b", bg: "rgba(245,158,11,0.12)" },  // amber  – PMX
  ];

  const bestDatasets = runs.map((r, i) => ({
    label: r.label,
    data: r.result.history,
    borderColor: chartColors[i % chartColors.length]!.border,
    backgroundColor: chartColors[i % chartColors.length]!.bg,
    fill: true,
    tension: 0.3,
    borderWidth: 2,
    pointRadius: 0,
  }));

  const avgDatasets = runs.map((r, i) => ({
    label: r.label,
    data: r.result.avgHistory,
    borderColor: chartColors[i % chartColors.length]!.border,
    backgroundColor: chartColors[i % chartColors.length]!.bg,
    fill: true,
    tension: 0.3,
    borderWidth: 2,
    pointRadius: 0,
    borderDash: [5, 3],
  }));

  const labels = Array.from({ length: runs[0]!.result.history.length }, (_, i) => i + 1);

  // --- Summary table rows ---
  const tableRows = runs.map(r => `
    <tr>
      <td>${r.label}</td>
      <td class="num">${r.result.bestFitness.toFixed(6)}</td>
      <td class="num ${r.result.hardViolations === 0 ? "ok" : "bad"}">${r.result.hardViolations}</td>
      <td class="num">${r.result.softPenalty}</td>
      <td class="num">${r.result.history.filter(f => f === r.result.bestFitness).length} gen(s)</td>
    </tr>
  `).join("");

  // --- Best schedule table (from the overall winner) ---
  const winner = runs.reduce((best, cur) =>
    cur.result.bestFitness > best.result.bestFitness ? cur : best
  );

  const candidateMap = new Map(candidates.map(c => [c.offeringId, c]));
  const scheduleRows = winner.result.bestChromosome.map(gene => {
    const c = candidateMap.get(gene.offeringId);
    return `
      <tr>
        <td class="num">${gene.offeringId}</td>
        <td class="num">${c?.lecturerIds.join(", ") ?? "—"}</td>
        <td class="num">${c?.roomId ?? "—"}</td>
        <td class="num">${gene.assignedTimeSlotIds.join(", ")}</td>
        <td class="num">${gene.assignedTimeSlotIds.length}</td>
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GA Scheduler — Run Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --surface2: #22263a;
      --border: #2e3354;
      --text: #e2e8f0;
      --muted: #8892b0;
      --indigo: #6366f1;
      --cyan: #22d3ee;
      --amber: #f59e0b;
      --green: #22c55e;
      --red: #f87171;
    }

    body {
      font-family: "Inter", "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }

    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, var(--indigo), var(--cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    header p { color: var(--muted); font-size: 0.85rem; margin-top: 0.3rem; }

    .badge {
      display: inline-block;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 99px;
      padding: 0.3rem 0.75rem;
      font-size: 0.78rem;
      color: var(--muted);
    }

    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 2.5rem;
    }

    .config-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
    }

    .config-card .label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; }
    .config-card .value { font-size: 1.35rem; font-weight: 700; color: var(--text); margin-top: 0.25rem; }

    .section { margin-bottom: 2.5rem; }
    .section h2 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section h2::after {
      content: "";
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .chart-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .chart-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
    }

    .chart-card h3 { font-size: 0.88rem; color: var(--muted); margin-bottom: 1rem; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    thead tr { background: var(--surface2); }
    th { padding: 0.65rem 0.9rem; text-align: left; color: var(--muted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--border); }
    td { padding: 0.6rem 0.9rem; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--surface2); }
    .num { font-variant-numeric: tabular-nums; font-family: "JetBrains Mono", monospace; }
    .ok { color: var(--green); font-weight: 600; }
    .bad { color: var(--red); font-weight: 600; }

    .table-wrapper {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: auto;
      max-height: 420px;
    }

    footer { margin-top: 3rem; text-align: center; color: var(--muted); font-size: 0.78rem; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>GA Scheduler — Run Report</h1>
      <p>Generated on ${timestamp}</p>
    </div>
    <span class="badge">ga_scheduler_lab</span>
  </header>

  <section class="section">
    <h2>Configuration</h2>
    <div class="config-grid">
      <div class="config-card"><div class="label">Population</div><div class="value">${config.populationSize}</div></div>
      <div class="config-card"><div class="label">Generations</div><div class="value">${config.generations}</div></div>
      <div class="config-card"><div class="label">Tournament Size</div><div class="value">${config.tournamentSize}</div></div>
      <div class="config-card"><div class="label">Mutation Rate</div><div class="value">${config.mutationRate}</div></div>
      <div class="config-card"><div class="label">Elitism Count</div><div class="value">${config.elitisimCount}</div></div>
      <div class="config-card"><div class="label">Candidates</div><div class="value">${candidates.length}</div></div>
    </div>
  </section>

  <section class="section">
    <h2>Convergence Charts</h2>
    <div class="chart-grid">
      <div class="chart-card">
        <h3>Best Fitness per Generation</h3>
        <canvas id="bestChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>Average Fitness per Generation</h3>
        <canvas id="avgChart"></canvas>
      </div>
    </div>
  </section>

  <section class="section">
    <h2>Crossover Comparison</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Crossover</th>
            <th>Best Fitness</th>
            <th>Hard Violations</th>
            <th>Soft Penalty</th>
            <th>Plateau</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </section>

  <section class="section">
    <h2>Best Schedule — ${winner.label}</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Offering ID</th>
            <th>Lecturer ID(s)</th>
            <th>Room ID</th>
            <th>Time Slot ID(s)</th>
            <th>Sessions</th>
          </tr>
        </thead>
        <tbody>${scheduleRows}</tbody>
      </table>
    </div>
  </section>

  <footer>ga_scheduler_lab &nbsp;·&nbsp; Tugas Akhir</footer>

  <script>
    const labels = ${JSON.stringify(labels)};

    const chartDefaults = {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "#8892b0", font: { size: 12 } } },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: {
          ticks: { color: "#8892b0", maxTicksLimit: 10 },
          grid: { color: "rgba(46,51,84,0.6)" },
          title: { display: true, text: "Generation", color: "#8892b0" },
        },
        y: {
          ticks: { color: "#8892b0" },
          grid: { color: "rgba(46,51,84,0.6)" },
          title: { display: true, text: "Fitness", color: "#8892b0" },
          min: 0,
          max: 1,
        },
      },
    };

    new Chart(document.getElementById("bestChart"), {
      type: "line",
      data: { labels, datasets: ${JSON.stringify(bestDatasets)} },
      options: chartDefaults,
    });

    new Chart(document.getElementById("avgChart"), {
      type: "line",
      data: { labels, datasets: ${JSON.stringify(avgDatasets)} },
      options: chartDefaults,
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, "utf-8");
  console.log(`\n✅ Report saved → ${outputPath}`);
}
