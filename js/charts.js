/**
 * charts.js
 * All Chart.js chart creation and update logic.
 * Charts are destroyed and recreated on each analysis run to avoid
 * canvas reuse issues with Chart.js.
 */

import { TECHS } from './data.js';

// Track active chart instances so we can destroy before re-rendering
const instances = {};

/**
 * Format a dollar value for chart axis labels and tooltips.
 * @param {number} v
 * @returns {string}
 */
function fmtAxis(v) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/**
 * Format a dollar value for tooltips (more precision).
 * @param {number} v
 * @returns {string}
 */
function fmtTooltip(v) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

/**
 * Stacked bar chart: 20-year cumulative cost breakdown by component.
 * Each bar represents one technology, stacked by cost type.
 *
 * @param {string[]} ranked   - tech keys sorted best → worst LCOS
 * @param {object}   results  - calcTech results keyed by tech key
 */
export function renderCostChart(ranked, results) {
  if (instances.cost) instances.cost.destroy();

  const labels = ranked.map(k => TECHS[k].name);
  const colors = ranked.map(k => TECHS[k].color);

  instances.cost = new Chart(document.getElementById('costChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Capex',
          data: ranked.map(k => Math.round(results[k].capex)),
          backgroundColor: colors.map(c => c + 'cc'),
          borderWidth: 0,
        },
        {
          label: 'Replacement',
          data: ranked.map(k => Math.round(results[k].replaceCost)),
          backgroundColor: colors.map(c => c + '66'),
          borderWidth: 0,
        },
        {
          label: 'O&M (PV)',
          data: ranked.map(k => Math.round(results[k].omPV)),
          backgroundColor: 'rgba(120,130,155,0.5)',
          borderWidth: 0,
        },
        {
          label: 'RTE losses (PV)',
          data: ranked.map(k => Math.round(results[k].rteLossPV)),
          backgroundColor: 'rgba(239,68,68,0.5)',
          borderWidth: 0,
        },
        {
          label: 'Charging electricity (PV)',
          data: ranked.map(k => Math.round(results[k].elecCostPV - results[k].rteLossPV)),
          backgroundColor: 'rgba(239,68,68,0.2)',
          borderWidth: 0,
        },
        {
          label: 'Residual value (credit)',
          data: ranked.map(k => -Math.round(results[k].residualPV)),
          backgroundColor: 'rgba(34,197,94,0.35)',
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: item => ` ${item.dataset.label}: ${fmtTooltip(item.raw)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#7a8399' },
          border: { color: 'transparent' },
        },
        y: {
          stacked: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#7a8399', callback: fmtAxis },
          border: { color: 'transparent' },
        },
      },
    },
  });
}

/**
 * Line chart: cumulative net cash flow over project lifetime.
 * Winner drawn as solid line; others as dashed.
 *
 * @param {string[]} ranked   - tech keys sorted best → worst LCOS
 * @param {object}   results  - calcTech results keyed by tech key
 * @param {number}   lifetime - project lifetime in years
 */
export function renderCashChart(ranked, results, lifetime) {
  if (instances.cash) instances.cash.destroy();

  const years = Array.from({ length: lifetime }, (_, i) => i + 1);

  instances.cash = new Chart(document.getElementById('cashChart'), {
    type: 'line',
    data: {
      labels: years,
      datasets: ranked.map((k, i) => ({
        label: TECHS[k].name,
        data: results[k].cumulativeNet.slice(0, lifetime),
        borderColor: TECHS[k].color,
        backgroundColor: 'transparent',
        borderWidth: i === 0 ? 2.5 : 1.5,
        pointRadius: 0,
        tension: 0.35,
        borderDash: i === 0 ? [] : [5, 4],
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => `Year ${items[0].label}`,
            label: item => ` ${item.dataset.label}: ${fmtTooltip(item.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#7a8399', callback: v => `Yr ${v + 1}` },
          border: { color: 'transparent' },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#7a8399', callback: fmtAxis },
          border: { color: 'transparent' },
        },
      },
    },
  });
}
