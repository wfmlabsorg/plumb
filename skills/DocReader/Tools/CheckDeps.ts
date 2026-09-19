#!/usr/bin/env bun
/**
 * CheckDeps.ts - Verify DocReader dependencies are installed
 */

import { $ } from "bun";

interface DepCheck {
  name: string;
  check: () => Promise<boolean>;
  install: string;
}

const deps: DepCheck[] = [
  {
    name: "pandas",
    check: async () => {
      const result = await $`python3 -c "import pandas"`.quiet().nothrow();
      return result.exitCode === 0;
    },
    install: "pip install pandas --break-system-packages",
  },
  {
    name: "openpyxl",
    check: async () => {
      const result = await $`python3 -c "import openpyxl"`.quiet().nothrow();
      return result.exitCode === 0;
    },
    install: "pip install openpyxl --break-system-packages",
  },
  {
    name: "pdfplumber",
    check: async () => {
      const result = await $`python3 -c "import pdfplumber"`.quiet().nothrow();
      return result.exitCode === 0;
    },
    install: "pip install pdfplumber --break-system-packages",
  },
  {
    name: "markitdown",
    check: async () => {
      const result = await $`python3 -c "import markitdown"`.quiet().nothrow();
      return result.exitCode === 0;
    },
    install: "pip install markitdown --break-system-packages",
  },
  {
    name: "pandoc",
    check: async () => {
      const result = await $`which pandoc`.quiet().nothrow();
      return result.exitCode === 0;
    },
    install: "sudo apt-get install -y pandoc",
  },
];

async function main() {
  console.log("🔍 Checking DocReader dependencies...\n");

  const missing: DepCheck[] = [];

  for (const dep of deps) {
    const ok = await dep.check();
    const status = ok ? "✅" : "❌";
    console.log(`${status} ${dep.name}`);
    if (!ok) missing.push(dep);
  }

  if (missing.length === 0) {
    console.log("\n✅ All dependencies installed!");
    process.exit(0);
  } else {
    console.log("\n❌ Missing dependencies. Run these commands:\n");
    for (const dep of missing) {
      console.log(`  ${dep.install}`);
    }
    process.exit(1);
  }
}

main();
