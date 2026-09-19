#!/usr/bin/env bun
// PLUMB hooks/initialize-session.ts
// SessionStart hook: Initialize session state and ensure directories exist

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface SessionStartPayload {
  session_id: string;
  cwd?: string;
  [key: string]: any;
}

function getLocalTimestamp(): string {
  const date = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return new Date().toISOString();
  }
}

function setTabTitle(title: string): void {
  const tabEscape = `\x1b]1;${title}\x07`;
  const windowEscape = `\x1b]2;${title}\x07`;

  process.stderr.write(tabEscape);
  process.stderr.write(windowEscape);
}

function getProjectName(cwd: string | undefined): string {
  if (!cwd) return 'PLUMB';

  const parts = cwd.split('/').filter(p => p);
  const projectIndicators = ['Projects', 'projects', 'src', 'repos', 'code'];

  for (let i = parts.length - 1; i >= 0; i--) {
    if (projectIndicators.includes(parts[i]) && parts[i + 1]) {
      return parts[i + 1];
    }
  }

  return parts[parts.length - 1] || 'PLUMB';
}

async function main() {
  try {
    const stdinData = await Bun.stdin.text();
    if (!stdinData.trim()) {
      process.exit(0);
    }

    const payload: SessionStartPayload = JSON.parse(stdinData);
    const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
    const caseDir = join(homedir(), 'case');

    // 1. Set tab title
    const projectName = getProjectName(payload.cwd);
    setTabTitle(`PLUMB: ${projectName}`);

    // 2. Ensure required directories exist
    const requiredDirs = [
      join(paiDir, 'hooks', 'lib'),
      join(caseDir, 'MEMORY', 'Work'),
      join(caseDir, 'MEMORY', 'Signals'),
      join(caseDir, 'MEMORY', 'State'),
      join(caseDir, 'projects'),
    ];

    for (const dir of requiredDirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // 3. Create session marker file
    const sessionFile = join(paiDir, '.current-session');
    writeFileSync(sessionFile, JSON.stringify({
      session_id: payload.session_id,
      started: getLocalTimestamp(),
      cwd: payload.cwd,
      project: projectName,
      engine: 'PLUMB'
    }, null, 2));

    // 4. Update session count in MEMORY stats
    const statsPath = join(caseDir, 'MEMORY', 'State', 'stats.json');
    try {
      let stats = { sessions: 0, engagements: 0 };
      if (existsSync(statsPath)) {
        stats = JSON.parse(require('fs').readFileSync(statsPath, 'utf-8'));
      }
      stats.sessions = (stats.sessions || 0) + 1;
      writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    } catch {
      // Don't fail on stats update
    }

    // Output session info
    console.error(`[PLUMB] Session initialized: ${projectName}`);
    console.error(`[PLUMB] Time: ${getLocalTimestamp()}`);

  } catch (error) {
    console.error('Session initialization error:', error);
  }

  process.exit(0);
}

main();
