#!/usr/bin/env bun
/**
 * LoadCausalContext.ts
 * Loads BookOfWhy conceptual context files for CausalInference workflows.
 *
 * Usage:
 *   bun run LoadCausalContext.ts <context-name>
 *   bun run LoadCausalContext.ts --list
 *   bun run LoadCausalContext.ts --all
 *
 * Context names: ladder, diagrams, do-calculus, counterfactuals, traps
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";

const CONTEXT_DIR = join(import.meta.dir, "../../BookOfWhy/Context");

const CONTEXT_MAP: Record<string, string> = {
  "ladder": "LadderOfCausation.md",
  "diagrams": "CausalDiagrams.md",
  "do-calculus": "DoCalculus.md",
  "counterfactuals": "Counterfactuals.md",
  "traps": "CommonTraps.md",
};

async function listContexts(): Promise<void> {
  console.log("Available causal contexts:");
  for (const [alias, file] of Object.entries(CONTEXT_MAP)) {
    console.log(`  ${alias.padEnd(16)} → ${file}`);
  }
}

async function loadContext(name: string): Promise<string> {
  const fileName = CONTEXT_MAP[name];
  if (!fileName) {
    console.error(`Unknown context: "${name}". Use --list to see available contexts.`);
    process.exit(1);
  }

  const filePath = join(CONTEXT_DIR, fileName);
  const content = await readFile(filePath, "utf-8");
  return content;
}

async function loadAll(): Promise<string> {
  const sections: string[] = [];
  for (const [alias, fileName] of Object.entries(CONTEXT_MAP)) {
    const filePath = join(CONTEXT_DIR, fileName);
    const content = await readFile(filePath, "utf-8");
    sections.push(`\n${"=".repeat(60)}\n## Context: ${alias} (${fileName})\n${"=".repeat(60)}\n\n${content}`);
  }
  return sections.join("\n");
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log("Usage: bun run LoadCausalContext.ts <context-name|--list|--all>");
  console.log("\nContexts: ladder, diagrams, do-calculus, counterfactuals, traps");
  process.exit(0);
}

if (args[0] === "--list") {
  await listContexts();
} else if (args[0] === "--all") {
  const content = await loadAll();
  console.log(content);
} else {
  // Load one or more named contexts
  for (const arg of args) {
    const content = await loadContext(arg);
    console.log(content);
  }
}
