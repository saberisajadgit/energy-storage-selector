# Energy Storage Technology Selector

An interactive, browser-based tool for comparing the lifetime economics of four long-duration energy storage technologies using a scientifically grounded Levelized Cost of Storage (LCOS) model.

**[Live demo →](https://saberisajadgit.github.io/energy-storage-selector)**

Built by [Sajad Saberi, Ph.D., EIT](mailto:saberisajad@icloud.com) — Postdoctoral Research Engineer, Battery Systems & Power Electronics, University of Alabama.

---

## Technologies compared

| Technology | RTE | Duration | Capex (2025) | Key advantage |
|---|---|---|---|---|
| Li-ion | 88% | 2–12 h | $70–110/kWh | Highest efficiency, lowest capex, fastest response |
| Vanadium Flow | 70% | 8–24 h | $350–600/kWh | Zero degradation, unlimited cycles, non-flammable |
| Iron-Air | 45% | 24–120 h | ~$100/kWh* | Lowest long-term $/kWh, earth-abundant materials |
| Solid Oxide FC | 60% | Multi-day | ~$280/kWh* | Multi-day duration, heat recovery possible |

\*Early-commercial pricing. Long-term targets: Iron-Air <$20/kWh (Form Energy), SOFC $20/kWh (Noon Energy / DOE FCTO).

---

## Financial model

### Levelized Cost of Storage (LCOS)

The model follows the **DOE Energy Storage Grand Challenge framework** and **Lazard LCOS v8.0**:

```math
\text{LCOS} = \frac{C_{\text{capex}} + C_{\text{replace, PV}} + C_{\text{O\&M, PV}} + C_{\text{charge, PV}} - V_{\text{residual, PV}}}{E_{\text{out, PV}}}
```

Where all future cost and energy terms are discounted to present value at the project WACC:

```math
\text{PV}(X) = \sum_{t=1}^{T} \frac{X_t}{(1+r)^t}
```

### Cost components

| Component | Description |
|---|---|
| **Capex** | Installed system cost ($/kWh × MWh capacity × safety multiplier) |
| **Replacement PV** | Li-ion replacement at years 8 & 16 at 85% of original capex, discounted |
| **O&M PV** | Annual operating & maintenance costs, discounted over project life |
| **Charging cost PV** | Annual energy purchased for charging (MWh_in × buy price), discounted |
| **Residual value PV** | End-of-life asset value: vanadium electrolyte 75%, others 5%, discounted |
| **Discharged energy PV** | Lifetime MWh delivered (MWh_in × RTE × degradation factor), discounted |

### Vanadium duration-dependent capex

Vanadium flow batteries separate power and energy costs, unlike Li-ion where they are coupled. The effective $/kWh falls for longer-duration projects:

```
stack_cost_per_kWh   = (500 $/kW × power_kW) / energy_kWh   ← 2025 commercial (Invinity / Largo)
electrolyte_per_kWh  = 150 $/kWh                              ← vanadium pentoxide + processing
scale_discount       = f(energyMWh)                           ← 0–28% volume discount
effective_capex      = min(list_price, max(list_price × 0.60, (stack + electrolyte) × scale_discount))
```

> **Note:** The PNNL long-term R&D stack target is $150/kW — this is NOT a current commercial price.
> Real 2025 commercial stack cost is $400–600/kW (Invinity / Largo Resources).

Scale discounts by system size (Lazard LCOS v8.0 · PNNL 2023):

| System size | Discount |
|---|---|
| <10 MWh | 0% |
| 10–50 MWh | 5% |
| 50–200 MWh | 12% |
| 200–500 MWh | 20% |
| >500 MWh | 28% |

References: PNNL Vanadium Redox Flow Batteries — A Technology Review (2023) · Invinity Energy Systems (2024) · Bushveld Minerals electrolyte cost breakdown

### Safety cost multipliers (Li-ion only)

Based on NFPA 855 compliance cost estimates for large-scale Li-ion BESS:

| Safety tier | Multiplier | Applies when |
|---|---|---|
| Standard | 1.00× | Industrial / remote grid site |
| High | 1.12× | Urban, near occupied buildings |
| Critical | 1.22× | Data center, hospital, dense urban |

Non-flammable chemistries (vanadium, iron-air, SOFC) carry no safety premium.

### Degradation model

Annual capacity degradation reduces both energy throughput and replacement timing:

| Technology | Annual degradation | Notes |
|---|---|---|
| Li-ion | 2.0%/yr | NREL ATB 2024; replacement triggered at yr 8 & 16 |
| Vanadium | 0% | Electrolyte ions are fully recoverable |
| Iron-Air | 0.5%/yr | Conservative estimate for early-commercial units |
| Solid Oxide FC | 0.5%/yr | Per DOE FCTO degradation targets |

### Application fit score

Qualitative score (0–100) combining:
- **Duration fit** (25 pts): penalty if required duration exceeds technology maximum
- **Application affinity** (20 pts): based on typical industry deployment patterns
- **Cycle life headroom** (10 pts): cycles × lifetime vs. rated cycle life
- **Safety priority** (20 pts): non-flammable techs gain when safety tier is elevated
- **Bonus factors** (up to 25 pts): high-frequency cycling bonus (Li-ion), long-duration sweet spot (iron-air), stability bonus (vanadium)

---

## Model limitations & assumptions

- All costs are in **nominal USD**. No inflation adjustment is applied.
- Vanadium electrolyte residual value (75%) assumes a functioning secondary market for reprocessing. This is the single most sensitive parameter — reducing it to 10–20% narrows vanadium's advantage significantly.
- Li-ion replacement is modelled at a fixed schedule (yr 8, yr 16). Actual timing depends on real degradation, which varies with temperature, cycle depth, and C-rate.
- SOFC RTE of 60% is the electrical-only figure. With waste heat recovery integrated into the facility design, effective RTE can reach ~70% (DOE FCTO target).
- Iron-air capex of ~$100/kWh reflects the Google/Form Energy deal basis. The long-term target is <$20/kWh; the current first-commercial price is higher.

### Minimum viable duration constraints

Each technology has a physical minimum duration below which it is not economically or operationally viable:

| Technology | Min viable duration | Reason |
|---|---|---|
| Li-ion | 1 h | No practical lower limit for grid-scale |
| Vanadium Flow | 8 h | Stack cost makes <8h uncompetitive vs Li-ion |
| Iron-Air | 24 h | Slow charge rate (C/20); designed for multi-day |
| Solid Oxide FC | 12 h | High operating temperature, slow thermal ramp |

The tool displays a ⚠️ warning when a technology ranks highly but falls below its minimum viable duration. The LCOS result is still shown (for comparison) but should be treated as indicative only.

- The model does not account for: grid interconnection costs, land costs, permitting timelines, revenue degradation from battery capacity fade, ancillary service revenue stacking, or project financing structure.
- **This tool is for indicative analysis only. Site-specific engineering and financial studies are required before any investment decision.**

---

## Data sources

| Parameter | Source |
|---|---|
| Li-ion capex | BNEF Battery Price Survey 2025 ($108/kWh system avg; $70/kWh stationary pack) |
| Vanadium capex | Zion Technologies / Mordor Intelligence 2025 ($350–600/kWh system level) |
| Iron-air capex | Form Energy commercial targets; Google/Form Energy deal basis |
| SOFC capex | Noon Energy / DOE FCTO target $20/kWh long-term |
| Li-ion RTE | BNEF / NREL (~88% AC-AC round-trip) |
| Vanadium RTE | Mordor Intelligence / PNNL (65–75%; model uses 70%) |
| SOFC RTE | DOE FCTO (55–65% electrical; 70% with heat recovery) |
| Iron-air RTE | Energy Solution Intelligence 2026 / Form Energy (40–50%; model uses 45%) |
| Li-ion degradation | NREL Annual Technology Baseline 2024 (~2%/yr capacity fade) |
| Li-ion O&M | NREL Cost and Performance Characteristics of New Generating Technologies 2023 |
| Vanadium O&M | DOE / PNNL Energy Storage Grand Challenge Cost and Performance Assessment 2020 |
| Cycle life | Sumitomo Electric (vanadium >20,000 cycles) · NREL (Li-ion 3,000–5,000 cycles) |
| LCOS methodology | DOE Energy Storage Grand Challenge framework · Lazard LCOS v8.0 |
| Safety multipliers | FM Global / NFPA 855 compliance cost estimates for large-scale Li-ion BESS |
| Vanadium capex model | PNNL Vanadium Redox Flow Batteries — A Technology Review (2023) |

---

## Repo structure

```
energy-storage-selector/
├── index.html        # HTML shell — wizard layout and result containers
├── css/
│   └── styles.css    # All styling
├── js/
│   ├── data.js       # Technology constants, app defaults, source citations
│   ├── model.js      # LCOS calculation, NPV, fit scoring — the science
│   ├── charts.js     # Chart.js chart creation and update
│   ├── ui.js         # DOM rendering, results display, wizard navigation
│   └── main.js       # Entry point — wires modules, handles events
├── README.md
└── LICENSE
```

No build step. No npm. No bundler. Pure ES modules — works directly in any modern browser and deploys from any static host.

---

## Deploy to GitHub Pages

```bash
# 1. Create a new GitHub repo named: energy-storage-selector
# 2. Clone it and copy these files in
git clone https://github.com/saberisajadgit/energy-storage-selector
cp -r /path/to/these/files/* energy-storage-selector/
cd energy-storage-selector

# 3. Push
git add .
git commit -m "Initial release — LCOS energy storage selector v1.2"
git push origin main

# 4. Enable GitHub Pages
# Go to: Settings → Pages → Source → Deploy from branch → main → / (root) → Save
# Your app will be live at: https://saberisajadgit.github.io/energy-storage-selector
```

> **Important:** Because the JS files use ES modules (`type="module"`), the app must be served over HTTP — it will not work when opened as a local `file://` URL directly in a browser. Use GitHub Pages, any static host, or a local server (`python3 -m http.server 8080`).

---

## Author

**Sajad Saberi, Ph.D., EIT**  
Postdoctoral Research Engineer — Battery Systems & Power Electronics  
University of Alabama, Tuscaloosa, AL  
[saberisajad@icloud.com](mailto:saberisajad@icloud.com)

Related publications:
- S. Saberi and J. A. Abu Qahouq, "A model-based framework for lithium-ion battery SoC estimation using a tuning-light discrete-time sliding-mode observer," *Modelling*, 2026.
- A. Bakr et al., "Modeling multi-view impedance-based cross-geometry SOH estimator for Li-ion batteries," *IEEE APEC*, 2026.

---

## License

MIT — free to use, modify, and distribute with attribution.
