"""Extract the four CP-WFM-018 modules from the pack markdown into Tools/engine/.

Each module doc carries exactly ONE ```python fence. We take the lines strictly
between the first ```python and its matching close fence. Two traps:
  - 05-daily-protocol.md and MODEL-STATE-template.md carry NON-module python
    fences; they are not in MODULES below and are never read.
  - cycle.py builds its own triple-backtick as FENCE = "`" * 3 so that a naive
    extractor does not truncate it. Taking the FIRST close fence after the open
    is therefore correct: the literal never appears in the source.
"""
import pathlib, sys

PACK = pathlib.Path.home() / "cloud/projects/amexgbt/52-monte-carlo/pack"
DEST = pathlib.Path.home() / "projects/plumb/Tools/engine"

MODULES = {
    "03-simulator.md":  "mc_staffing.py",
    "03b-updating.md":  "update.py",
    "05b-intake.md":    "intake.py",
    "05c-cycle.md":     "cycle.py",
}

FENCE = "`" * 3
OPEN = FENCE + "python"

DEST.mkdir(parents=True, exist_ok=True)
ok = True

for doc, module in MODULES.items():
    src = PACK / doc
    if not src.exists():
        print(f"FAIL  {doc}: not found"); ok = False; continue
    lines = src.read_text().splitlines()

    starts = [i for i, l in enumerate(lines) if l.strip() == OPEN]
    if len(starts) != 1:
        print(f"FAIL  {doc}: expected exactly 1 '{OPEN}' fence, found {len(starts)}")
        ok = False; continue
    start = starts[0]

    end = None
    for i in range(start + 1, len(lines)):
        if lines[i].strip() == FENCE:
            end = i; break
    if end is None:
        print(f"FAIL  {doc}: no closing fence"); ok = False; continue

    code = "\n".join(lines[start + 1:end]).rstrip() + "\n"
    (DEST / module).write_text(code)
    print(f"ok    {doc:22s} -> {module:18s} {end - start - 1:5d} lines")

sys.exit(0 if ok else 1)
