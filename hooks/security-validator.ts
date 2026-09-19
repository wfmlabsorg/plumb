#!/usr/bin/env bun
// PLUMB hooks/security-validator.ts
// PreToolUse hook: Validates commands and blocks dangerous operations

interface PreToolUsePayload {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, any>;
}

// Attack pattern categories
const ATTACK_PATTERNS = {
  // Tier 1: Catastrophic - Always block
  catastrophic: {
    patterns: [
      /rm\s+(-rf?|--recursive)\s+[\/~]/i,
      /rm\s+(-rf?|--recursive)\s+\*/i,
      />\s*\/dev\/sd[a-z]/i,
      /mkfs\./i,
      /dd\s+if=.*of=\/dev/i,
    ],
    action: 'block',
    message: 'BLOCKED: Catastrophic deletion/destruction detected'
  },

  // Tier 2: Reverse shells - Always block
  reverseShell: {
    patterns: [
      /bash\s+-i\s+>&\s*\/dev\/tcp/i,
      /nc\s+(-e|--exec)\s+\/bin\/(ba)?sh/i,
      /python.*socket.*connect/i,
      /perl.*socket.*connect/i,
      /ruby.*TCPSocket/i,
      /php.*fsockopen/i,
      /socat.*exec/i,
      /\|\s*\/bin\/(ba)?sh/i,
    ],
    action: 'block',
    message: 'BLOCKED: Reverse shell pattern detected'
  },

  // Tier 3: Credential theft - Always block
  credentialTheft: {
    patterns: [
      /curl.*\|\s*(ba)?sh/i,
      /wget.*\|\s*(ba)?sh/i,
      /curl.*(-o|--output).*&&.*chmod.*\+x/i,
      /base64\s+-d.*\|\s*(ba)?sh/i,
    ],
    action: 'block',
    message: 'BLOCKED: Remote code execution pattern detected'
  },

  // Tier 4: Prompt injection indicators - Block
  promptInjection: {
    patterns: [
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /disregard\s+(all\s+)?prior\s+instructions/i,
      /you\s+are\s+now\s+(in\s+)?[a-z]+\s+mode/i,
      /new\s+instruction[s]?:/i,
      /system\s+prompt:/i,
      /\[INST\]/i,
      /<\|im_start\|>/i,
    ],
    action: 'block',
    message: 'BLOCKED: Prompt injection pattern detected'
  },

  // Tier 5: Environment manipulation - Warn
  envManipulation: {
    patterns: [
      /export\s+(ANTHROPIC|OPENAI|AWS|AZURE)_/i,
      /echo\s+\$\{?(ANTHROPIC|OPENAI)_/i,
      /env\s*\|.*KEY/i,
      /printenv.*KEY/i,
    ],
    action: 'warn',
    message: 'WARNING: Environment/credential access detected'
  },

  // Tier 6: Git dangerous operations - Require confirmation
  gitDangerous: {
    patterns: [
      /git\s+push.*(-f|--force)/i,
      /git\s+reset\s+--hard/i,
      /git\s+clean\s+-fd/i,
      /git\s+checkout\s+--\s+\./i,
    ],
    action: 'confirm',
    message: 'CONFIRM: Potentially destructive git operation'
  },

  // Tier 7: System modification - Log
  systemMod: {
    patterns: [
      /chmod\s+777/i,
      /chown\s+root/i,
      /sudo\s+/i,
      /systemctl\s+(stop|disable)/i,
    ],
    action: 'log',
    message: 'LOGGED: System modification command'
  },

  // Tier 8: Data exfiltration patterns - Block
  exfiltration: {
    patterns: [
      /curl.*(@|--upload-file)/i,
      /tar.*\|.*curl/i,
      /zip.*\|.*nc/i,
    ],
    action: 'block',
    message: 'BLOCKED: Data exfiltration pattern detected'
  },

  // Tier 9: PLUMB infrastructure protection - Block
  caseProtection: {
    patterns: [
      /rm.*\.claude/i,
      /git\s+push.*public/i,
    ],
    action: 'block',
    message: 'BLOCKED: PLUMB infrastructure protection triggered'
  },

  // Tier 10: Client data protection - Warn
  clientDataAccess: {
    patterns: [
      /cat\s+.*01-source\//i,
      /head\s+.*01-source\//i,
      /tail\s+.*01-source\//i,
    ],
    action: 'warn',
    message: 'WARNING: Direct access to client source files detected. Ensure DataScrub has been run before processing client data through cloud AI.'
  }
};

function validateCommand(command: string): { allowed: boolean; message?: string; action?: string } {
  if (!command || command.length < 3) {
    return { allowed: true };
  }

  for (const [tierName, tier] of Object.entries(ATTACK_PATTERNS)) {
    for (const pattern of tier.patterns) {
      if (pattern.test(command)) {
        console.error(`[Security] ${tierName}: ${tier.message}`);
        console.error(`[Security] Command: ${command.substring(0, 100)}...`);

        return {
          allowed: tier.action !== 'block',
          message: tier.message,
          action: tier.action
        };
      }
    }
  }

  return { allowed: true };
}

async function main() {
  try {
    const stdinData = await Bun.stdin.text();
    if (!stdinData.trim()) {
      process.exit(0);
    }

    const payload: PreToolUsePayload = JSON.parse(stdinData);

    if (payload.tool_name !== 'Bash') {
      process.exit(0);
    }

    const command = payload.tool_input?.command;
    if (!command) {
      process.exit(0);
    }

    const validation = validateCommand(command);

    if (!validation.allowed) {
      console.log(validation.message);
      console.log(`Command blocked: ${command.substring(0, 100)}...`);
      process.exit(2);
    }

    if (validation.action === 'warn' || validation.action === 'confirm') {
      console.log(validation.message);
    }

  } catch (error) {
    console.error('Security validator error:', error);
  }

  process.exit(0);
}

main();
