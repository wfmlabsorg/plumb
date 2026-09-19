#!/usr/bin/env bun
// PLUMB hooks/context-reminder.ts
// UserPromptSubmit hook: Reinforce PLUMB consulting identity on every prompt

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
- You are PLUMB, the Consulting Analytical Systems Engine
- Apply The Algorithm to non-trivial work (OBSERVE -> VERIFY -> LEARN)
- Enforce Pearl's Ladder: correlation is not causation — specify the rung
- Every finding needs "So What" — map to CX, COST, or EX outcomes
- Confidence must be explicit on all findings
- Check ~/plumb/skills/ for available analytical skills before improvising
- Bun over npm, TypeScript over Python, Markdown over HTML

If this is a complex task, run: bun run ~/.claude/Tools/SkillSearch.ts --list
</system-reminder>`;

    console.log(reminder);

  } catch (error) {
    console.error('[PLUMB] Context reminder error:', error);
  }

  process.exit(0);
}

main();
