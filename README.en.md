# claude-sdd — Spec-Driven Development Lifecycle

A Claude Code plugin that manages the full development lifecycle through **Spec-Driven Development (SDD)** methodology, powered by **Agent Teams** for parallel implementation.

## Why SDD?

| Problem | SDD Solution |
|---------|-------------|
| Vague requirements lead to rework | Structured intake from Confluence, Jira, Figma, or interviews |
| No single source of truth | Spec documents + compliance checklist in git |
| Quality varies across team members | Automated quality gate with spec verification |
| Hard to track progress | Checklist-based progress tracking (0% to 100%) |
| Sequential bottlenecks | Agent Teams parallel execution with work packages |

## The SDD Lifecycle

```
/sdd-init  -->  /sdd-intake  -->  /sdd-spec  -->  /sdd-plan
   |                |                 |               |
   v                v                 v               v
 Project        Requirements       Technical        Task
 Setup          Gathering          Specs            Decomposition

/sdd-build  -->  /sdd-review  -->  /sdd-integrate
   |                |                 |
   v                v                 v
 Agent Teams     Quality           PR &
 Implementation  Gate              Documentation
```

### 7 Phases

| Phase | Command | Output |
|-------|---------|--------|
| 1. Init | `/sdd-init new\|legacy` | `sdd-config.yaml`, CLAUDE.md rules |
| 2. Intake | `/sdd-intake` | `01-requirements.md` |
| 3. Spec | `/sdd-spec` | `02-*.md` through `06-spec-checklist.md` |
| 4. Plan | `/sdd-plan` | `07-task-plan.md`, work packages |
| 5. Build | `/sdd-build` | Implementation + tests |
| 6. Review | `/sdd-review` | `08-review-report.md` |
| 7. Integrate | `/sdd-integrate` | PR with spec traceability |

Use `/sdd` to auto-detect the current phase and continue.

## Installation

### Quick Start (npx)

```bash
npx github:joypop-lguplus/claude-sdd install
```

### CLI Commands

```bash
npx github:joypop-lguplus/claude-sdd check    # Status check
npx github:joypop-lguplus/claude-sdd install   # Interactive setup
npx github:joypop-lguplus/claude-sdd doctor    # Deep diagnostics
```

### Manual / Local Development

```bash
git clone https://github.com/joypop-lguplus/claude-sdd.git
cd claude-sdd
claude --plugin-dir .
```

## What's Included

### Skills (Slash Commands)

| Command | Description |
|---------|-------------|
| `/sdd` | Auto-detect phase and continue lifecycle |
| `/sdd-init` | Initialize project for SDD |
| `/sdd-intake` | Gather requirements (Confluence, Jira, Figma, file, interview) |
| `/sdd-spec` | Generate technical specifications |
| `/sdd-plan` | Decompose tasks and assign to Agent Teams |
| `/sdd-build` | Implementation with quality loop |
| `/sdd-review` | Quality gate verification |
| `/sdd-integrate` | Integration, PR creation, documentation |
| `/sdd-status` | Status dashboard with progress tracking |
| `/sdd-lint` | Code analysis: diagnostics, search, symbols, format |
| `/sdd-lsp` | LSP-based semantic analysis: diagnostics, definitions, references, symbols, call hierarchy |

### Agents

| Agent | Role |
|-------|------|
| `sdd-requirements-analyst` | Extracts requirements from Confluence/Jira/Figma |
| `sdd-spec-writer` | Generates technical specs and checklists |
| `sdd-implementer` | Implements work packages (Agent Teams member) |
| `sdd-reviewer` | Verifies implementation against spec checklist |
| `sdd-code-analyzer` | Automated code analysis with native tools, ast-grep, and LSP |

### The Quality Loop

The core of SDD is the leader-driven quality loop during the build phase:

```
Leader (Opus): Assigns work package with spec references
  |
Team Member (Sonnet): Reads spec --> Implements --> Tests --> Reports
  |
Leader: Verifies checklist
  |-- [ ] items remain --> Specific feedback + rework (max 3 cycles)
  |-- All [x] --> Next work package
  |-- 3 failures --> Escalate to user
```

## Requirements

| Component | Required | Notes |
|-----------|----------|-------|
| Claude Code | **Yes** | Plugin host |
| Node.js 18+ | **Yes** | For CLI tools |
| Agent Teams | **Yes** | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| `gh` CLI | Recommended | For PR creation |
| ast-grep (`sg`) | Optional | For `/sdd-lint search` and `/sdd-lint symbols` |
| Language Server | Optional | For `/sdd-lsp` semantic analysis (per-language) |
| Confluence MCP | Optional | For `/sdd-intake confluence:...` |
| Jira MCP | Optional | For `/sdd-intake jira:...` |

### Enabling Agent Teams

```json
// ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## Documentation

- [Architecture](docs/architecture.md) -- Plugin structure and design
- [Setup Guide](docs/setup-guide.md) -- Step-by-step installation
- [Usage Guide](docs/usage-guide.md) -- Detailed usage examples
- [SDD Methodology](docs/sdd-methodology.md) -- The SDD approach explained

## Plugin Structure

```
claude-sdd/
├── .claude-plugin/plugin.json
├── agents/
│   ├── sdd-requirements-analyst.md
│   ├── sdd-spec-writer.md
│   ├── sdd-implementer.md
│   ├── sdd-reviewer.md
│   └── sdd-code-analyzer.md
├── skills/
│   ├── sdd/SKILL.md
│   ├── sdd-init/SKILL.md
│   ├── sdd-intake/SKILL.md
│   ├── sdd-spec/SKILL.md
│   ├── sdd-plan/SKILL.md
│   ├── sdd-build/SKILL.md
│   ├── sdd-review/SKILL.md
│   ├── sdd-integrate/SKILL.md
│   ├── sdd-status/SKILL.md
│   ├── sdd-lint/SKILL.md
│   └── sdd-lsp/SKILL.md
├── templates/
│   ├── claude-md/
│   ├── specs/
│   ├── checklists/
│   └── project-init/
├── scripts/
│   ├── sdd-session-init.sh
│   ├── sdd-detect-tools.sh
│   └── sdd-lsp.mjs
├── bin/cli.mjs
├── lib/
│   ├── utils.mjs
│   ├── checker.mjs
│   ├── installer.mjs
│   ├── doctor.mjs
│   └── lsp/
│       ├── client.mjs
│       ├── servers.mjs
│       └── bridge.mjs
├── docs/
│   ├── architecture.md
│   ├── setup-guide.md
│   ├── usage-guide.md
│   └── sdd-methodology.md
├── hooks/hooks.json
├── .mcp.json
├── package.json
├── marketplace.json
├── README.md
├── LICENSE
└── CHANGELOG.md
```

## License

MIT
