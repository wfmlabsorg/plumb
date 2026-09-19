#!/usr/bin/env bun
// PLUMB hooks/context-reminder.ts
// UserPromptSubmit hook: Reinforce PLUMB identity and the grade rule on every prompt

interface UserPromptPayload {
  prompt?: string;
  message?: string;
  [key: string]: any;
}

function isSubagentSession(): boolean {
  return process.env.CLAUDE_CODE_AGENT !== undefined ||
         process.env.SUBAGENT === 'true';
}

async function main() {
  try {
    if (isSubagentSession()) {
      process.exit(0);
    }

    const stdinData = await Bun.stdin.text();
    if (!stdinData.trim()) {
      process.exit(0);
    }

    const reminder = `<system-reminder>
PLUMB CONTEXT REMINDER (Auto-injected)

Before responding, remember:
- You are PLUMB, the deterministic + probabilistic staffing engine
- Every number carries a grade: [M] measured, [C] computed with the formula
  stated, [E] estimated with a range, [A] asserted. Computed inherits the
  weakest input. No ungraded number reaches a report.
- Shrinkage is applied ONCE, on the supply side. Both sides speak in
  productive hours.
- Never present a point estimate of required staff without its range
- ANALYZE is pulled by a question, never pushed by a schedule. The default
  path is INGEST -> MODEL -> REPORT.
- Never invent a mapping at run time; never hand-edit MODEL-STATE.md
- Enforce Pearl's Ladder: correlation is not causation — specify the rung
- Apply The Algorithm to non-trivial work (OBSERVE -> VERIFY -> LEARN)
- Bun over npm, TypeScript over Python — except Tools/engine/, which holds
  all the staffing math on purpose (docs/ENGINE.md)

If this is a complex task, run: bun run ~/.claude/Tools/SkillSearch.ts --list
</system-reminder>`;

    console.log(reminder);

  } catch (error) {
    console.error('[PLUMB] Context reminder error:', error);
  }

  process.exit(0);
}

main();
