"""Extract the four CP-WFM-018 modules from the pack markdown into Tools/engine/.

Each module doc carries exactly ONE ```python fence. We take the lines strictly
between the first ```python and its matching close fence. Two traps:
  - 05-daily-protocol.md and MODEL-STATE-template.md carry NON-module python
    fences; they are not in MODULES below and are never read.
  - cycle.py builds its own triple-backtick as FENCE = "`" * 3 so that a naive
    extractor does not truncate it. Taking the FIRST close fence after the open
    is therefore correct: the literal never appears in the source.
"""
import os
import pathlib
import sys

# Where your copy of the CP-WFM-018 pack lives. Set PLUMB_PACK_DIR, or pass the
# directory as the first argument. There is no default: the pack is not part of
# this repository and its location is a property of your machine, not of PLUMB.
PACK = pathlib.Path(
    sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PLUMB_PACK_DIR", ""))
DEST = pathlib.Path(__file__).resolve().parent

if not PACK.name:
    sys.exit(
        "usage: extract_from_pack.py <pack-dir>   (or set PLUMB_PACK_DIR)\n"
        "  <pack-dir> is the CP-WFM-018 pack directory containing 03-simulator.md\n"
        "  and its siblings. See docs/ENGINE.md.")
if not PACK.is_dir():
    sys.exit(f"pack directory not found: {PACK}")

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
