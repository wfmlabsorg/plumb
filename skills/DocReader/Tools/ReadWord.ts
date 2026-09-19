#!/usr/bin/env bun
/**
 * ReadWord.ts - Extract text from Word documents using pandoc
 *
 * Usage:
 *   bun run ReadWord.ts <filepath> [--track-changes]
 *   bun run ReadWord.ts /path/to/document.docx
 *   bun run ReadWord.ts /path/to/document.docx --track-changes
 *
 * Output: Markdown text
 */

import { $ } from "bun";
import { existsSync } from "fs";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun run ReadWord.ts <filepath> [--track-changes]");
    console.error("  filepath: Path to Word document (.docx)");
    console.error("  --track-changes: Include tracked changes in output");
    process.exit(1);
  }

  const trackChanges = args.includes("--track-changes");
  const filepath = args.find(a => !a.startsWith("--"))!;

  if (!existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }

  // Check if pandoc is available
  const pandocCheck = await $`which pandoc`.quiet().nothrow();
  if (pandocCheck.exitCode !== 0) {
    console.error("❌ pandoc not installed. Run: sudo apt-get install -y pandoc");
    process.exit(1);
  }

  // Run pandoc
  const cmd = trackChanges
    ? $`pandoc --track-changes=all ${filepath} -t markdown`
    : $`pandoc ${filepath} -t markdown`;

  const result = await cmd.nothrow();

  if (result.exitCode !== 0) {
    console.error(`❌ Error reading Word document: ${result.stderr.toString()}`);
    process.exit(1);
  }

  console.log(result.stdout.toString());
}

main();
