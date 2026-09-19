#!/bin/bash
# PLUMB Codespace Setup Script
# Runs automatically via postCreateCommand in devcontainer.json

set -e

echo "============================================"
echo "  PLUMB — Deterministic + Probabilistic"
echo "          Staffing Engine"
echo "  Codespace Setup"
echo "============================================"
echo ""

# 1. Find the repository
REPO_DIR=""
if [ -d "/workspaces/plumb" ]; then
  REPO_DIR="/workspaces/plumb"
elif [ -d "$HOME/plumb" ]; then
  REPO_DIR="$HOME/plumb"
else
  echo "ERROR: Cannot find PLUMB repository"
  exit 1
fi
echo "[1/10] Repository found: $REPO_DIR"

# 2. Create symlink if needed
if [ "$REPO_DIR" != "$HOME/plumb" ]; then
  ln -sf "$REPO_DIR" "$HOME/plumb"
  echo "[2/10] Symlinked $REPO_DIR -> ~/plumb"
else
  echo "[2/10] Repository already at ~/plumb"
fi

# 3. Install Bun
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo "[3/10] Bun installed"
else
  echo "[3/10] Bun already installed"
fi

# Ensure bun is in PATH for rest of script
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# 4. Install Claude Code
if ! command -v claude &> /dev/null; then
  bun install -g @anthropic-ai/claude-code
  echo "[4/10] Claude Code installed"
else
  echo "[4/10] Claude Code already installed"
fi

# 4b. Install PLUMB's own runtime dependencies (js-yaml, exceljs)
# Without this the mapping engine cannot start: `ingest` dies on its first import.
(cd "$REPO_DIR" && bun install --frozen-lockfile 2>/dev/null || bun install)
echo "[4b/10] PLUMB dependencies installed"

# 5. Create ~/.claude/ directory structure
mkdir -p "$HOME/.claude"
echo "[5/10] Created ~/.claude/"

# 6. Create symlinks from ~/.claude/ into repo
ln -sf "$HOME/plumb/skills" "$HOME/.claude/skills"
ln -sf "$HOME/plumb/hooks" "$HOME/.claude/hooks"
ln -sf "$HOME/plumb/Tools" "$HOME/.claude/Tools"
ln -sf "$HOME/plumb/context" "$HOME/.claude/context"
ln -sf "$HOME/plumb/agents" "$HOME/.claude/agents"
echo "[6/10] Symlinked skills, hooks, Tools, context, agents -> ~/.claude/"

# 7. Copy CLAUDE.md to home directory
cp "$HOME/plumb/CLAUDE.md" "$HOME/CLAUDE.md"
echo "[7/10] Copied CLAUDE.md to ~/CLAUDE.md"

# 8. Generate settings.json with hook registrations
cat > "$HOME/.claude/settings.json" << 'SETTINGS_EOF'
{
  "env": {
    "DA": "PLUMB",
    "PAI_DIR": "/home/vscode/.claude",
    "PAI_SOURCE_APP": "PLUMB",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CODESPACE": "true"
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/initialize-session.ts"
          },
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/load-core-context.ts"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/context-reminder.ts"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/security-validator.ts"
          }
        ]
      }
    ]
  }
}
SETTINGS_EOF
echo "[8/10] Generated settings.json with hook registrations"

# 9. Python environment for the engine
set +e
# PLUMB is TypeScript on bun everywhere EXCEPT Tools/engine/, which holds the
# staffing math (deterministic model + Monte Carlo). That code is reused as-is
# from the verified CP-WFM-018 pack; see docs/ENGINE.md for why it stays Python.
# The base image ships python3 but NOT python3-venv, so testing for python3
# alone is the wrong check -- venv creation then half-succeeds, leaving an
# interpreter with no pip and no site-packages that shadows a working system
# python. Test the capability, not the binary.
VENV="$HOME/plumb/Tools/engine/.venv"
rm -rf "$VENV"

if ! python3 -m venv "$VENV" 2>/dev/null; then
  echo "       python3-venv missing, installing..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3-venv python3-pip
  rm -rf "$VENV"
  python3 -m venv "$VENV"
fi

if [ -x "$VENV/bin/pip" ]; then
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q -r "$HOME/plumb/Tools/engine/requirements.txt"
  "$VENV/bin/python" -c "import numpy, pandas, scipy, yaml" \
    && echo "[9/10] Python engine environment ready" \
    || echo "[9/10] WARNING: engine dependencies failed to import"
else
  rm -rf "$VENV"
  echo "[9/10] WARNING: could not build the engine venv."
  echo "       PLUMB will fall back to system python3 if it has numpy, pandas,"
  echo "       scipy and PyYAML. See docs/ENGINE.md."
fi

set -e

# 10. Generate skill index
bun run "$HOME/.claude/Tools/GenerateSkillIndex.ts" 2>/dev/null \
  || echo "  (Skill index generation will complete on first session)"
echo "[10/10] Skill index generated"

echo ""
echo "============================================"
echo "  PLUMB Setup Complete!"
echo ""
echo "  To start: run 'claude' in terminal"
echo "  Books:    ~/plumb/books/"
echo "  Skills:   ~/plumb/skills/   (10 analytical skills)"
echo "  Agents:   ~/plumb/agents/   (7 agents)"
echo "  Engine:   ~/plumb/Tools/engine/"
echo ""
echo "  Try:  bun run Tools/run.ts --help"
echo "============================================"
