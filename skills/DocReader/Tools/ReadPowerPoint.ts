#!/usr/bin/env bun
/**
 * ReadPowerPoint.ts - Extract text from PowerPoint files using markitdown
 *
 * Usage:
 *   bun run ReadPowerPoint.ts <filepath>
 *   bun run ReadPowerPoint.ts /path/to/presentation.pptx
 *
 * Output: Markdown text with slide structure
 */

import { $ } from "bun";
import { existsSync } from "fs";

const PYTHON_SCRIPT = `
import sys
try:
    from markitdown import MarkItDown

    filepath = sys.argv[1]
    md = MarkItDown()
    result = md.convert(filepath)
    print(result.text_content)
except ImportError:
    print("markitdown module not found", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun run ReadPowerPoint.ts <filepath>");
    console.error("  filepath: Path to PowerPoint file (.pptx)");
    process.exit(1);
  }

  const filepath = args[0];

  if (!existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }

  // Check if markitdown is available
  const markitdownCheck = await $`python3 -c "import markitdown"`.quiet().nothrow();
  if (markitdownCheck.exitCode !== 0) {
    console.error("❌ markitdown not installed. Run: pip install markitdown --break-system-packages");
    process.exit(1);
  }

  // Run the Python script
  const result = await $`python3 -c ${PYTHON_SCRIPT} ${filepath}`.nothrow();

  if (result.exitCode !== 0) {
    console.error(`❌ Error reading PowerPoint: ${result.stderr.toString()}`);
    process.exit(1);
  }

  console.log(result.stdout.toString());
}

main();
