/**
 * data.js
 * Technology parameters, application defaults, and data sources.
 *
 * All capex values are system-level $/kWh (installed cost).
 * Sources documented in README.md and in the SOURCES object below.
 */

export const TECHS = {
  li: {
    name: 'Li-ion',
    color: '#22c55e',
    // BNEF Battery Price Survey 2025: $70/kWh stationary pack, $108/kWh system avg
    capex: 110,
    // BNEF / NREL: ~88% round-trip efficiency (AC-AC)
    rte: 0.88,
    // NREL Annual Technology Baseline 2024: ~2%/yr capacity fade
    degRate: 0.02,
    // Replacement assumed at yr 8 and yr 16 at 85% of original capex
    replaceAt: [8, 16],
    // Practical maximum duration before $/kWh becomes uncompetitive vs flow
    maxDur: 12,
    // NREL: 3,000–5,000 full cycles to 80% capacity
    cyclLife: 4000,
    // NFPA 855 compliance cost multiplier by safety tier
    safetyMult: { standard: 1.0, high: 1.12, critical: 1.22 },
  },

  va: {
    name: 'Vanadium Flow',
    color: '#3b82f6',
    // Zion Technologies / Mordor Intelligence 2025: $350–600/kWh system
    // Model uses $480/kWh as list price; effective capex scales with duration (see model.js)
    capex: 480,
    // Mordor Intelligence / PNNL: 65–75% RTE; model uses midpoint
    rte: 0.70,
    // Electrolyte never degrades — vanadium ions are fully recoverable
    degRate: 0,
    replaceAt: [],
    maxDur: 24,
    // Sumitomo Electric commercial systems: >20,000 cycles demonstrated
    cyclLife: 999999,
    // Non-flammable liquid electrolyte — minimal safety premium
    safetyMult: { standard: 1.0, high: 1.0, critical: 1.02 },
  },

  ia: {
    name: 'Iron-Air',
    color: '#f59e0b',
    // Form Energy commercial targets: <$20/kWh long-term
    // Current first-commercial pricing implied ~$100/kWh (Google deal basis)
    capex: 100,
    // Energy Solution Intelligence 2026 / Form Energy: 40–50% RTE
    rte: 0.45,
    // Early commercial — minor degradation modelled conservatively
    degRate: 0.005,
    replaceAt: [],
    maxDur: 120,
    cyclLife: 10000,
    // Aqueous chemistry — non-flammable, low safety premium
    safetyMult: { standard: 1.0, high: 1.0, critical: 1.02 },
  },

  so: {
    name: 'Solid Oxide FC',
    color: '#a855f7',
    // DOE FCTO / Noon Energy targets: $20/kWh long-term
    // Current early-commercial system cost estimated $280/kWh
    capex: 280,
    // DOE FCTO: 55–65% electrical RTE; up to 70% with heat recovery
    rte: 0.60,
    degRate: 0.005,
    replaceAt: [],
    maxDur: 240,
    cyclLife: 10000,
    // Solid-state, non-flammable — low safety premium
    safetyMult: { standard: 1.0, high: 1.0, critical: 1.02 },
  },
};

/**
 * Default input values pre-populated when a user selects an application type.
 * Cycles and duration are based on typical industry operating profiles.
 */
export const APP_DEFAULTS = {
  arbitrage:  { cycles: 300, duration: 4,  hint: 'High cycle count. RTE and replacement costs dominate over project life.' },
  backup:     { cycles: 30,  duration: 24, hint: 'Low cycles, long duration. Zero-degradation technologies have a strong advantage.' },
  frequency:  { cycles: 365, duration: 1,  hint: 'Very high cycle, short duration. Response speed and RTE are critical.' },
  renewable:  { cycles: 250, duration: 6,  hint: 'Moderate cycles, 4–8 h duration. Classic Li-ion vs. vanadium crossover zone.' },
  datacenter: { cycles: 50,  duration: 8,  hint: 'Low cycles, medium duration, critical safety. Non-flammable chemistries gain a large premium.' },
  utility:    { cycles: 200, duration: 4,  hint: 'Mixed-use. All technologies competitive — revenue stack determines the winner.' },
};

/**
 * Technology qualitative characteristics for the fit assessment panel.
 */
export const TECH_PROFILES = {
  li: {
    pros: ['Sub-second response time', 'Highest RTE (88%)', 'Lowest upfront capex', 'Compact — high energy density'],
    cons: ['Degrades ~2%/yr — replacement needed', 'Thermal runaway risk at GWh scale', 'Replacement cycles at yr 8 & 16', 'Practical max ~12 h duration'],
  },
  va: {
    pros: ['Zero degradation — RTE stable for life', 'Unlimited cycle life', 'Non-flammable liquid electrolyte', 'Power and energy scaled independently'],
    cons: ['High upfront capex ($350–600/kWh)', 'Large footprint — low energy density', 'Vanadium electrolyte supply risk', 'Lower RTE (70%)'],
  },
  ia: {
    pros: ['Target <$20/kWh — lowest cost/kWh', '100 h+ storage duration', 'Non-toxic, non-flammable, earth-abundant', 'Massive scale potential'],
    cons: ['Low RTE (45%) — needs cheap charging', 'Pre-commercial at scale', 'Low energy density — large footprint', 'Slow charge/discharge rate'],
  },
  so: {
    pros: ['Multi-day storage duration', 'Up to 70% RTE with heat recovery', 'Non-flammable solid-state chemistry', 'High energy density vs. flow batteries'],
    cons: ['Pre-commercial — limited track record', 'High operating temperature (~800°C)', 'Complex balance-of-plant', 'Moderate RTE without heat integration'],
  },
};

/**
 * Full data source citations — rendered in the app footer and README.
 */
export const SOURCES = [
  'Capex — BNEF Battery Price Survey 2025 ($108/kWh Li-ion system avg; $70/kWh stationary pack)',
  'Capex — Zion Technologies / Mordor Intelligence 2025 (Vanadium: $350–600/kWh system level)',
  'Capex — Form Energy commercial targets <$20/kWh (iron-air, long-term)',
  'Capex — Noon Energy / DOE FCTO target $20/kWh (reversible solid oxide)',
  'RTE — BNEF / NREL (Li-ion 88% AC-AC) · Mordor Intelligence (Vanadium 70%) · DOE FCTO (SOFC 60%) · Energy Solution Intelligence 2026 (Iron-air 45%)',
  'Degradation — NREL Annual Technology Baseline 2024 (Li-ion ~2%/yr capacity fade)',
  'O&M — NREL Cost and Performance Characteristics of New Generating Technologies 2023',
  'O&M — DOE / PNNL Energy Storage Grand Challenge Cost and Performance Assessment 2020',
  'Cycle life — Sumitomo Electric (Vanadium >20,000 cycles demonstrated) · NREL (Li-ion 3,000–5,000 cycles)',
  'LCOS methodology — DOE Energy Storage Grand Challenge framework · Lazard LCOS v8.0',
  'Safety cost premium — FM Global / NFPA 855 compliance cost estimates for large-scale Li-ion BESS',
  'Vanadium duration-dependent capex model — PNNL Vanadium Redox Flow Batteries: A Technology Review (2023)',
];
