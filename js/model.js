/**
 * model.js
 * Financial model for Levelized Cost of Storage (LCOS) comparison.
 *
 * Methodology follows the DOE Energy Storage Grand Challenge framework
 * and Lazard LCOS v8.0 approach:
 *
 *   LCOS = (Capex + Replacement_PV + O&M_PV + Charging_Cost_PV - Residual_PV)
 *          ─────────────────────────────────────────────────────────────────────
 *                         Lifetime Discharged Energy_PV
 *
 * All future cashflows are discounted at the user-supplied WACC.
 * Results are in $/MWh (discharged energy).
 */

import { TECHS } from './data.js';

/**
 * Net Present Value of an array of annual cashflows.
 * @param {number[]} cashflows - one value per year, starting at year 1
 * @param {number}   r         - annual discount rate (decimal, e.g. 0.07)
 * @returns {number} NPV in same currency as cashflows
 */
export function npv(cashflows, r) {
  return cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t + 1), 0);
}

/**
 * Effective capex ($/kWh) for vanadium flow batteries.
 *
 * Vanadium systems separate power and energy costs:
 *   - Power stack:   ~$150/kW  (fixed, regardless of duration)
 *   - Electrolyte:   ~$80/kWh  (scales linearly with energy capacity)
 *
 * This means the $/kWh falls significantly for longer-duration projects
 * because the stack cost is amortised over more kWh.
 * Reference: PNNL Vanadium Redox Flow Batteries Technology Review (2023)
 *
 * @param {number} powerMW   - rated power in MW
 * @param {number} energyMWh - energy capacity in MWh
 * @param {number} listCapex - list capex $/kWh (used as upper cap for small systems)
 * @returns {number} effective capex in $/kWh
 */
export function vanadiumEffectiveCapex(powerMW, energyMWh, listCapex) {
  const stackCostPerKwh   = (150 * powerMW * 1000) / (energyMWh * 1000);
  const electrolytePerKwh = 80;
  const effective = stackCostPerKwh + electrolytePerKwh;
  return Math.min(listCapex, Math.max(listCapex * 0.25, effective));
}

/**
 * Calculate full LCOS and financial metrics for one technology.
 *
 * @param {string} key - technology key ('li' | 'va' | 'ia' | 'so')
 * @param {object} p   - project parameters (see runAnalysis in ui.js for shape)
 * @returns {object}   - full result object including LCOS, NPV, cash flows
 */
export function calcTech(key, p) {
  const t          = TECHS[key];
  const energyMWh  = p.energy;
  const powerMW    = p.power;
  const life       = p.lifetime;
  const cycles     = p.cycles;
  const dod        = p.dod / 100;
  const elecBuy    = p.elecBuy;
  const elecSell   = p.elecSell;
  const capPayKWyr = p.capPayment;
  const r          = p.discount / 100;
  const omPerMWhYr = p.om[key];
  const safety     = p.safety;
  const duration   = p.duration;
  const safeMult   = t.safetyMult[safety];

  // ── Capex ──────────────────────────────────────────────────────────────────
  const effectiveCapex = key === 'va'
    ? vanadiumEffectiveCapex(powerMW, energyMWh, t.capex)
    : t.capex;

  const capex = effectiveCapex * 1000 * energyMWh * safeMult;

  // ── Replacement cost (Li-ion only) ─────────────────────────────────────────
  // Only schedule replacements that fall within the project lifetime.
  // Each replacement is costed at 85% of original capex, adjusted for
  // remaining capacity at that year (degraded asset is cheaper to replace).
  const validReplace = (t.replaceAt || []).filter(yr => yr < life);

  const replacePV = validReplace.reduce((acc, yr) => {
    const remainCap = Math.pow(1 - t.degRate, yr);
    const cost      = capex * remainCap * 0.85;
    return acc + cost / Math.pow(1 + r, yr);
  }, 0);

  const replaceCost = validReplace.reduce((acc, yr) =>
    acc + capex * Math.pow(1 - t.degRate, yr) * 0.85
  , 0);

  // ── O&M ────────────────────────────────────────────────────────────────────
  const omPV = npv(Array(life).fill(omPerMWhYr * energyMWh), r);

  // ── Energy throughput ──────────────────────────────────────────────────────
  // Annual energy IN (MWh) — what we charge, accounting for depth of discharge
  const annEnergyIn = energyMWh * dod * cycles;

  // Annual energy OUT — degrades over time for technologies with degRate > 0
  const annEnergyOut = Array.from({ length: life }, (_, i) =>
    annEnergyIn * t.rte * Math.pow(1 - t.degRate, i)
  );

  // ── Cost components ────────────────────────────────────────────────────────
  // Charging electricity: we pay for all energy IN regardless of RTE
  const chargeCostPV = npv(Array(life).fill(annEnergyIn * (elecBuy / 1000)), r);

  // Discharged energy PV — denominator of LCOS
  const energyOutPV = npv(annEnergyOut, r);

  // RTE loss cost (display only — already embedded in chargeCostPV numerator)
  const rteLossPerYear = annEnergyIn * (1 - t.rte);
  const rteLossPV      = npv(Array(life).fill(rteLossPerYear * elecBuy / 1000), r);

  // ── Residual value ────────────────────────────────────────────────────────
  // Vanadium electrolyte retains ~75% of commodity value at EOL — recoverable
  // through resale or reprocessing (PNNL 2023 / Invinity commercial practice).
  // Other technologies: ~5% scrap/salvage value.
  const residualFrac = key === 'va' ? 0.75 : 0.05;
  const residualPV   = capex * residualFrac / Math.pow(1 + r, life);

  // ── LCOS ──────────────────────────────────────────────────────────────────
  const totalCostPV = capex + replacePV + omPV + chargeCostPV - residualPV;
  const lcos        = energyOutPV > 0 ? totalCostPV / energyOutPV : 9999;

  // ── Revenue & NPV ─────────────────────────────────────────────────────────
  const revenuePerYear = annEnergyIn * t.rte * (elecSell / 1000)
    + capPayKWyr * powerMW * 1000 / 1000;
  const revenuePV = npv(Array(life).fill(revenuePerYear), r);

  // ── Cumulative cash flow (for payback & chart) ────────────────────────────
  const cumulativeNet = [];
  let cum = -capex;
  for (let yr = 1; yr <= life; yr++) {
    const capDeg   = Math.pow(1 - t.degRate, yr - 1);
    const rev      = annEnergyIn * t.rte * capDeg * (elecSell / 1000)
      + capPayKWyr * powerMW * 1000 / 1000;
    const cost     = omPerMWhYr * energyMWh + annEnergyIn * (elecBuy / 1000);
    const replCost = validReplace.includes(yr)
      ? capex * Math.pow(1 - t.degRate, yr) * 0.85
      : 0;
    cum += rev - cost - replCost;
    cumulativeNet.push(Math.round(cum));
  }

  const paybackIdx = cumulativeNet.findIndex(v => v >= 0);

  return {
    key,
    // Cost components
    capex,
    replaceCost,
    replacePV,
    elecCostPV: chargeCostPV,
    rteLossPV,
    omPV,
    residualPV,
    totalCostPV,
    // Revenue & returns
    revenuePV,
    lcos,
    netPV: revenuePV - totalCostPV,
    // Time series
    cumulativeNet,
    payback: paybackIdx >= 0 ? paybackIdx + 1 : null,
    // Summaries
    annualRevenue: revenuePerYear,
    annualCost: annEnergyIn * (elecBuy / 1000) + omPerMWhYr * energyMWh,
    effectiveCapexPerKwh: effectiveCapex,
    // Fit flags
    durCheck:  duration <= t.maxDur,
    cyclCheck: cycles <= t.cyclLife / life,
  };
}

/**
 * Application fit score (0–100) for a technology given project parameters.
 * Combines duration fit, application affinity, cycle profile, and safety priority.
 * Used for the qualitative ranking panel — not a financial metric.
 *
 * @param {string} key - technology key
 * @param {object} p   - project parameters
 * @returns {number}   - fit score 0–100
 */
export function fitScore(key, p) {
  const t   = TECHS[key];
  const { app, duration, cycles, safety } = p;
  let score = 0;

  // Duration fit (25 pts): full marks if within rated max, linear penalty beyond
  score += duration <= t.maxDur
    ? 25
    : Math.max(0, 25 - (duration - t.maxDur) * 2);

  // Application affinity (20 pts)
  const appAffinities = {
    li: ['frequency', 'arbitrage'],
    va: ['backup', 'renewable', 'utility'],
    ia: ['backup', 'renewable'],
    so: ['backup', 'datacenter'],
  };
  if ((appAffinities[key] || []).includes(app)) score += 20;

  // Cycle life headroom (10 pts)
  score += cycles <= t.cyclLife / p.lifetime ? 10 : 0;

  // Safety priority (20 pts): non-flammable techs gain when safety is elevated
  if (safety === 'critical' && key !== 'li') score += 20;
  else if (safety === 'high' && key !== 'li') score += 12;
  else if (safety === 'standard' && key === 'li') score += 8;

  // Bonus points
  if (key === 'va') score += 5;                        // stability / longevity bonus
  if (key === 'li' && cycles > 300) score += 10;       // high-frequency cycling bonus
  if (key === 'ia' && duration >= 48) score += 15;     // long-duration sweet spot

  return Math.min(100, score);
}
