/**
 * main.js
 * Entry point. Imports all modules and wires up DOM event listeners.
 * Runs after the DOM is fully loaded (script tag has type="module").
 */

import { APP_DEFAULTS, SOURCES } from './data.js';
import { goStep, runAnalysis }   from './ui.js';

// ── Expose navigation functions to HTML onclick attributes ────────────────────
// ES modules don't attach to window automatically, so we do it explicitly.
window.goStep      = goStep;
window.runAnalysis = runAnalysis;

// ── Application type cards ────────────────────────────────────────────────────
document.querySelectorAll('.option-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    const app      = card.querySelector('input').value;
    const defaults = APP_DEFAULTS[app];
    if (!defaults) return;

    document.getElementById('cycles').value           = defaults.cycles;
    document.getElementById('duration').value         = defaults.duration;
    document.getElementById('dur-val').textContent    = `${defaults.duration} h`;
    document.getElementById('app-hint').textContent   = defaults.hint;
  });
});

// ── Sliders ───────────────────────────────────────────────────────────────────
function bindSlider(id, outId, fmt) {
  const el  = document.getElementById(id);
  const out = document.getElementById(outId);
  if (!el || !out) return;
  el.addEventListener('input', () => { out.textContent = fmt(el.value); });
}

bindSlider('duration', 'dur-val', v => `${v} h`);
bindSlider('dod',      'dod-val', v => `${v}%`);

// ── Energy hint (suggest MWh from MW × duration) ──────────────────────────────
function updateEnergyHint() {
  const pw = parseFloat(document.getElementById('power').value)    || 0;
  const du = parseInt(document.getElementById('duration').value)   || 4;
  const hint = document.getElementById('e-hint');
  if (hint && pw > 0) {
    hint.textContent = `Suggested for ${du} h at ${pw} MW: ${(pw * du).toFixed(0)} MWh`;
  }
}

document.getElementById('power').addEventListener('input',    updateEnergyHint);
document.getElementById('duration').addEventListener('input', updateEnergyHint);
updateEnergyHint();

// ── Populate data sources footer ──────────────────────────────────────────────
const srcEl = document.getElementById('sources-list');
if (srcEl) {
  srcEl.innerHTML = SOURCES.map(s => `<li>${s}</li>`).join('');
}

// ── Print / export ────────────────────────────────────────────────────────────
const printBtn = document.getElementById('print-btn');
if (printBtn) printBtn.addEventListener('click', () => window.print());
