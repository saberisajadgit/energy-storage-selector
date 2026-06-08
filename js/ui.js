/**
 * ui.js
 * DOM manipulation, results rendering, and wizard step navigation.
 * Pure presentation logic — no financial calculations here.
 */

import { TECHS, TECH_PROFILES } from './data.js';
import { calcTech, fitScore } from './model.js';
import { renderCostChart, renderCashChart } from './charts.js';

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtM(v) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export function fmtLCOS(v) {
  return `$${Math.round(v)}/MWh`;
}

// ── Wizard navigation ─────────────────────────────────────────────────────────

export function goStep(n) {
  if (n === 2 && !validateStep1()) return;
  if (n === 3 && !validateStep2()) return;

  [1, 2, 3, 4].forEach(i => {
    document.getElementById(`step${i}`).classList.toggle('section-hidden', i !== n);
    const si = document.getElementById(`s${i}`);
    si.classList.remove('active', 'done');
    if (i < n) si.classList.add('done');
    else if (i === n) si.classList.add('active');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep1() {
  return true;
}

function validateStep2() {
  let ok = true;
  const checks = [
    { id: 'power',  min: 0.01,  max: 10000,  errId: 'power-err' },
    { id: 'energy', min: 0.1,   max: 100000, errId: 'energy-err' },
    { id: 'cycles', min: 1,     max: 365,    errId: 'cycles-err' },
  ];
  checks.forEach(({ id, min, max, errId }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(errId);
    const v   = parseFloat(el.value);
    const bad = isNaN(v) || v < min || v > max;
    el.classList.toggle('invalid', bad);
    err.style.display = bad ? 'block' : 'none';
    if (bad) ok = false;
  });
  return ok;
}

// ── Collect inputs ────────────────────────────────────────────────────────────

export function collectInputs() {
  return {
    app:        document.querySelector('input[name=app]:checked').value,
    duration:   parseInt(document.getElementById('duration').value),
    safety:     document.getElementById('safety').value,
    power:      parseFloat(document.getElementById('power').value),
    energy:     parseFloat(document.getElementById('energy').value),
    lifetime:   parseInt(document.getElementById('lifetime').value),
    cycles:     parseInt(document.getElementById('cycles').value),
    dod:        parseInt(document.getElementById('dod').value),
    elecBuy:    parseFloat(document.getElementById('elec-buy').value),
    elecSell:   parseFloat(document.getElementById('elec-sell').value),
    capPayment: parseFloat(document.getElementById('cap-payment').value) || 0,
    discount:   parseFloat(document.getElementById('discount').value),
    om: {
      li: parseFloat(document.getElementById('om-li').value),
      va: parseFloat(document.getElementById('om-va').value),
      ia: parseFloat(document.getElementById('om-ia').value),
      so: parseFloat(document.getElementById('om-so').value),
    },
  };
}

// ── Run analysis & render results ─────────────────────────────────────────────

export function runAnalysis() {
  if (!validateStep2()) { goStep(2); return; }

  const p       = collectInputs();
  const results = {};
  Object.keys(TECHS).forEach(k => { results[k] = calcTech(k, p); });
  const ranked     = Object.keys(results).sort((a, b) => results[a].lcos - results[b].lcos);
  const winner     = ranked[0];
  const winnerRes  = results[winner];
  const winnerTech = TECHS[winner];

  goStep(4);

  renderWinnerBadge(winner, winnerTech, winnerRes, ranked, results);
  renderMetricsGrid(winnerRes, winnerTech, ranked, results, p.lifetime);
  renderRankTable(ranked, results, p);
  renderCostChart(ranked, results);
  renderCashChart(ranked, results, p.lifetime);
  renderFitGrid(ranked, results, p);
  renderAssumptionBox(p);
}

// ── Section renderers ─────────────────────────────────────────────────────────

function renderWinnerBadge(winner, winnerTech, winnerRes, ranked, results) {
  const saving  = ranked.length > 1 ? results[ranked[1]].totalCostPV - winnerRes.totalCostPV : 0;
  const lcosGap = ranked.length > 1 ? results[ranked[1]].lcos - winnerRes.lcos : 0;

  const colorMap = { li:'34,197,94', va:'59,130,246', ia:'245,158,11', so:'168,85,247' };
  const badge = document.getElementById('winner-badge');
  badge.innerHTML = `<span style="width:14px;height:14px;border-radius:50%;background:${winnerTech.color};flex-shrink:0"></span>${winnerTech.name} is optimal`;
  badge.style.cssText += `;background:rgba(${colorMap[winner]},.12);border:1.5px solid ${winnerTech.color}44;color:${winnerTech.color}`;

  document.getElementById('winner-sub').textContent =
    `${fmtM(saving)} cheaper in present-value lifetime cost vs. next best · LCOS advantage: ${fmtLCOS(lcosGap)}`;
}

function renderMetricsGrid(winnerRes, winnerTech, ranked, results, lifetime) {
  const saving = ranked.length > 1 ? results[ranked[1]].totalCostPV - winnerRes.totalCostPV : 0;
  document.getElementById('metrics-grid').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Winner LCOS</div>
      <div class="metric-val" style="color:${winnerTech.color}">${fmtLCOS(winnerRes.lcos)}</div>
      <div class="metric-detail">Levelized cost of storage</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Lifetime cost saving</div>
      <div class="metric-val" style="color:#22c55e">${fmtM(saving)}</div>
      <div class="metric-detail">vs. next-best option (PV)</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Winner capex</div>
      <div class="metric-val">${fmtM(winnerRes.capex)}</div>
      <div class="metric-detail">Upfront capital cost</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Net PV (winner)</div>
      <div class="metric-val" style="color:${winnerRes.netPV > 0 ? '#22c55e' : '#ef4444'}">${fmtM(winnerRes.netPV)}</div>
      <div class="metric-detail">Revenue minus all costs</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Simple payback</div>
      <div class="metric-val">${winnerRes.payback ? winnerRes.payback + ' yr' : 'N/A'}</div>
      <div class="metric-detail">At ${lifetime} yr project life</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Annual revenue</div>
      <div class="metric-val">${fmtM(winnerRes.annualRevenue)}</div>
      <div class="metric-detail">Gross, year 1</div>
    </div>
  `;
}

function renderRankTable(ranked, results, p) {
  const rt = document.getElementById('rank-table');
  rt.innerHTML = `
    <thead>
      <tr>
        <th>#</th><th>Technology</th><th>LCOS ($/MWh)</th>
        <th>Capex</th><th>Replacement</th><th>O&M (PV)</th>
        <th>RTE loss cost</th><th>App fit</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  ranked.forEach((k, i) => {
    const r  = results[k];
    const t  = TECHS[k];
    const fs = fitScore(k, p);
    const tr = document.createElement('tr');
    if (i === 0) tr.className = 'winner-row';
    tr.innerHTML = `
      <td style="font-weight:600;color:${i === 0 ? t.color : 'var(--muted)'}">${i === 0 ? '★' : i + 1}</td>
      <td><span class="tech-dot" style="background:${t.color}"></span>${t.name}</td>
      <td><strong style="color:${i === 0 ? t.color : 'var(--text)'}">${fmtLCOS(r.lcos)}</strong></td>
      <td>${fmtM(r.capex)}</td>
      <td>${r.replaceCost > 0 ? fmtM(r.replaceCost) : '<span class="tag tag-green">None</span>'}</td>
      <td>${fmtM(r.omPV)}</td>
      <td>${fmtM(r.rteLossPV)}</td>
      <td>
        <div class="score-bar-wrap">
          <div class="score-bar" style="width:${fs * 0.6}px;max-width:60px;background:${t.color};opacity:0.7"></div>
          <span style="font-size:.78rem;color:var(--muted)">${fs}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  rt.appendChild(tbody);
}

function renderFitGrid(ranked, results, p) {
  const fg = document.getElementById('fit-grid');
  fg.innerHTML = '';
  ranked.forEach((k, i) => {
    const t    = TECHS[k];
    const prof = TECH_PROFILES[k];
    const fs   = fitScore(k, p);
    const div  = document.createElement('div');
    div.className = 'fit-card';
    if (i === 0) div.style.borderColor = t.color + '55';
    div.innerHTML = `
      <div class="fit-card-header">
        <span class="tech-dot" style="background:${t.color}"></span>
        <span class="fit-card-name">${t.name}</span>
        ${i === 0
          ? '<span class="tag tag-green" style="margin-left:auto">Best fit</span>'
          : `<span class="fit-score">Fit: ${fs}%</span>`
        }
      </div>
      ${prof.pros.map(p => `<div class="fit-pro">+ ${p}</div>`).join('')}
      ${prof.cons.map(c => `<div class="fit-con">− ${c}</div>`).join('')}
    `;
    fg.appendChild(div);
  });
}

function renderAssumptionBox(p) {
  document.getElementById('assumption-box').innerHTML = `
    <strong>Model assumptions &amp; methodology</strong><br>
    LCOS&nbsp;=&nbsp;(Capex + Replacement<sub>PV</sub> + O&amp;M<sub>PV</sub> + Charging<sub>PV</sub> − Residual<sub>PV</sub>) ÷ Lifetime discharged energy<sub>PV</sub>.
    Li-ion replacement at years ${TECHS.li.replaceAt.join(' &amp; ')} at 85% of original capex.
    Vanadium effective capex scales with power-to-energy ratio (stack + electrolyte model, PNNL 2023).
    Vanadium electrolyte residual value: 75% at EOL · Other technologies: 5%.
    Annual degradation: Li-ion ${(TECHS.li.degRate * 100).toFixed(0)}%/yr · Vanadium 0% · Iron-air ~0.5%/yr · SOFC ~0.5%/yr.
    Safety multiplier (Li-ion): standard ${TECHS.li.safetyMult.standard}× · high ${TECHS.li.safetyMult.high}× · critical ${TECHS.li.safetyMult.critical}×.
    Discount rate: ${p.discount}% WACC applied to all future cashflows. All figures nominal USD.
  `;
}
