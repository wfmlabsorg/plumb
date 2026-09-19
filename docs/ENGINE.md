# The Python island — `Tools/engine/`

PLUMB is TypeScript on bun everywhere except this directory. This is deliberate and it is the
only exception.

## Why

The staffing math — Erlang B/C/A, the achievable-occupancy curve, the two-sided correlated
Monte Carlo, the Bayesian parameter updating and the intake validation — already exists, is
already verified, and is already Python. It comes from the **CP-WFM-018 Probabilistic Staffing
pack**, which went through seven evaluation rounds before it was published. The pack is not
vendored here — only the four modules extracted from it are.

Reimplementing it in TypeScript would create two sources of truth for the same arithmetic. The
failure mode is not a crash, it is a silent divergence between the deterministic central case and
the probabilistic band drawn around it — the one defect that would make every output of this
system quietly wrong while looking fine.

So: one Python island holds all the math. Everything that orchestrates, maps, reports or exports
is TypeScript.

## What is here

| File | Origin | Lines |
|---|---|---|
| `mc_staffing.py` | `pack/03-simulator.md` | 775 |
| `update.py` | `pack/03b-updating.md` | 259 |
| `intake.py` | `pack/05b-intake.md` | 788 |
| `cycle.py` | `pack/05c-cycle.md` | 669 |
| `deterministic.py` | **new in PLUMB** — the daily central case | — |
| `cli.py` | **new in PLUMB** — entry points; the pack ships none | — |

The four extracted modules are kept **flat and unmodified**, as plain sibling imports, so they
stay diffable against the pack. Do not refactor them into a package: `cycle.py` imports `intake`
and `update` by bare name, and packaging would mean rewriting five import statements and losing
the ability to diff.

PLUMB's own code goes in new files beside them, never inside them.

## Re-extracting

`extract_from_pack.py` lifts the modules out of the pack markdown. Run it if the pack is revised
upstream:

```bash
python3 Tools/engine/extract_from_pack.py <pack-dir>
#   or:  PLUMB_PACK_DIR=<pack-dir> python3 Tools/engine/extract_from_pack.py
```

`<pack-dir>` is wherever your copy of the pack lives — the directory holding `03-simulator.md`
and its siblings. There is deliberately no default: that path is a property of your machine, not
of this repository.

Each module doc carries exactly one ` ```python ` fence and the script asserts that. Two traps it
handles, both found the hard way:

- `pack/05-daily-protocol.md` and `pack/MODEL-STATE-template.md` also contain python fences, but
  they are usage snippets, not modules. They are not in the extraction map and are never read.
- `cycle.py` deliberately never writes a literal triple backtick — it builds one as
  `FENCE = "`" * 3` — precisely so a naive extractor does not truncate the file at that line.

After re-extracting, re-run the verification below. It is the only thing standing between a bad
extraction and silently wrong staffing numbers.

## Verification

Reproduces the figures the pack documents, on its built-in demo configuration:

```bash
cd Tools/engine && python3 -c "
import mc_staffing as M
res = M.run(M.load_config('params.yaml'), n_draws=60000)
print(f'pooled {res.coverage():.1%}  interactive {res.coverage(lane=\"interactive\"):.1%}')
print(f'occupancy at 30 erlangs: {30 / M.agents_for_sl(30, 0.80, 20.0, 450.0):.1%}')
"
```

| Check | Expected (from the pack) | Confirmed on extraction |
|---|---|---|
| Pooled coverage, 60k draws | 9.9% | 9.9% |
| Interactive-lane coverage | 52.2% | 52.2% |
| Weekly coverage range | 12%–46% | 12%–46% |
| Occupancy at 30 erlangs | ~83% | 83.3% |
| Occupancy at 480 erlangs | ~97% | 97.0% |

A `[warn] params.yaml not found` line means it fell back to demo parameters. That is expected for
the verification run and never acceptable for a real book.

## Runtime

`requirements.txt` pins numpy, pandas, scipy, PyYAML and matplotlib. In a Codespace,
`.devcontainer/setup.sh` builds `.venv` here. Locally, the TypeScript runner prefers
`Tools/engine/.venv/bin/python` and falls back to `python3` if the interpreter already has the
dependencies.
