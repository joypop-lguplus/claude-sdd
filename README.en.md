# claude-sdd — Spec-Driven Development Lifecycle

> [한국어](README.md)

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
/claude-sdd:sdd-init  -->  /claude-sdd:sdd-intake  -->  /claude-sdd:sdd-spec  -->  /claude-sdd:sdd-plan
   |                      |                        |                      |
   v                      v                        v                      v
 Project              Requirements              Technical              Task
 Setup                Gathering                 Specs                  Decomposition

/claude-sdd:sdd-build  -->  /claude-sdd:sdd-review  -->  /claude-sdd:sdd-integrate
   |                |                 |
   v                v                 v
 Agent Teams     Quality           PR &
 Implementation  Gate              Documentation
```

### 7 Phases

| Phase | Command | Output |
|-------|---------|--------|
| 1. Init | `/claude-sdd:sdd-init new\|legacy` | `sdd-config.yaml`, CLAUDE.md rules |
| 2. Intake | `/claude-sdd:sdd-intake` | `01-requirements.md` |
| 3. Spec | `/claude-sdd:sdd-spec` | `02-*.md` through `06-spec-checklist.md` |
| 4. Plan | `/claude-sdd:sdd-plan` | `07-task-plan.md`, work packages |
| 4.5. Assign | `/claude-sdd:sdd-assign` | `wp-*-member.md` |
| 5. Build | `/claude-sdd:sdd-build` | Implementation + tests |
| 6. Review | `/claude-sdd:sdd-review` | `08-review-report.md` |
| 7. Integrate | `/claude-sdd:sdd-integrate` | PR with spec traceability |
| 8. Change | `/claude-sdd:sdd-change` | Impact analysis + delta build + regression verification |

Use `/claude-sdd:sdd-next` to auto-detect the current phase and continue.

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
| `/claude-sdd:sdd-next` | Auto-detect phase and continue lifecycle |
| `/claude-sdd:sdd-godmode` | Deep interview + full pipeline auto-execution |
| `/claude-sdd:sdd-init` | Initialize project for SDD |
| `/claude-sdd:sdd-intake` | Gather requirements (Confluence, Jira, Figma, file, interview) |
| `/claude-sdd:sdd-spec` | Generate technical specifications |
| `/claude-sdd:sdd-plan` | Decompose tasks into work packages |
| `/claude-sdd:sdd-assign` | Assign team members to work packages |
| `/claude-sdd:sdd-build` | Implementation with quality loop (`--tdd` for TDD mode) |
| `/claude-sdd:sdd-review` | Quality gate verification |
| `/claude-sdd:sdd-integrate` | Integration, PR creation, documentation |
| `/claude-sdd:sdd-change` | Change management: impact analysis, checklist update, TDD delta build |
| `/claude-sdd:sdd-publish` | Publish SDD artifacts to Confluence with diagram PNG attachments |
| `/claude-sdd:sdd-status` | Status dashboard with progress tracking |
| `/claude-sdd:sdd-lint` | Code analysis: diagnostics, search, symbols, format |

### Agents

| Agent | Role |
|-------|------|
| `sdd-requirements-analyst` | Extracts requirements from Confluence/Jira/Figma |
| `sdd-spec-writer` | Generates technical specs and checklists |
| `sdd-implementer` | Implements work packages (Agent Teams member, TDD mode supported) |
| `sdd-reviewer` | Verifies implementation against spec checklist (TDD compliance check) |
| `sdd-code-analyzer` | Automated code analysis with native tools and ast-grep |
| `sdd-test-writer` | TDD test writer: generates failing tests from specs (no implementation) |
| `sdd-change-analyst` | Change impact analysis: code analysis, minimal impact principle |

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

### TDD Mode (`--tdd`)

Enable with `/claude-sdd:sdd-build --tdd` or `teams.tdd: true` in `sdd-config.yaml`:

```
Phase A (Red):   sdd-test-writer generates failing tests from specs
Phase B (Green): sdd-implementer writes code to pass tests (no test modification)
Phase C (Verify): Leader runs full test suite, confirms all pass
Rework: On failure, repeat Phase B+C (max 3 cycles)
```

### Change Management (`/claude-sdd:sdd-change`)

After integration, handle change requests through a 7-phase workflow:

```
Phase 1: Collect change request → 09-change-request.md
Phase 2: Impact analysis (sdd-change-analyst) → spec deltas
Phase 3: Partial checklist update (minimal impact principle)
Phase 4: Delta task plan (CWP-1, CWP-2...)
Phase 5: TDD delta build (CHG- + CHG-REG- tests)
Phase 6: Review + regression verification
Phase 7: PR creation (with change traceability)
```

**Additional Flags:**

| Flag | Description |
|------|-------------|
| `--from-analysis` | Auto-generate CRs from analysis report (`10-analysis-report.md`) gaps (for legacy projects) |
| `--lightweight` | Used with `--from-analysis`. Fast processing for small gaps (5 or fewer). Auto-sets Phase 1-4, runs only Phase 5-7 |

### Legacy Mode

Initialize with `/claude-sdd:sdd-init legacy` to set `project.type: legacy` in `sdd-config.yaml`. In legacy mode, the build phase performs **analysis-only structural review** without code changes. All code modifications go through the `/claude-sdd:sdd-change` workflow.

**Legacy Lifecycle:**

```
init → intake → spec → plan → assign → build(analysis-only) → change(gap resolution CRs) → review → integrate
```

- **Build (analysis-only):** Compares existing code against specs. Matched items marked `[x]`, unmatched items identified as gaps. No code modifications. Generates `10-analysis-report.md`.
- **Change (gap resolution):** Converts analysis report gaps into CRs and processes them through the `sdd-change` workflow.
- `legacy.analysis_cr_mode` in `sdd-config.yaml`: `suggest` (default, recommend CRs) / `auto` (auto-generate CRs) / `manual` (manual CR management).

## Requirements

| Component | Required | Notes |
|-----------|----------|-------|
| Claude Code | **Yes** | Plugin host |
| Node.js 18+ | **Yes** | For CLI tools |
| Agent Teams | **Yes** | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| `gh` CLI | Recommended | For PR creation |
| ast-grep (`sg`) | Optional | For `/claude-sdd:sdd-lint search` and `/claude-sdd:sdd-lint symbols` |
| LSP Plugin | Optional | `boostvolt/claude-code-lsps` — auto-diagnostics and LSP features |
| Confluence MCP | Optional | For `/claude-sdd:sdd-intake confluence:...` |
| Jira MCP | Optional | For `/claude-sdd:sdd-intake jira:...` |

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
- [Workflow Guide](docs/workflow-guide.md) -- Scenario-based optimal workflows
- [SDD Methodology](docs/sdd-methodology.md) -- The SDD approach explained
- [Glossary (Korean)](docs/glossary-ko.md) -- SDD terminology

## Plugin Structure

```
claude-sdd/
├── .claude-plugin/plugin.json
├── agents/
│   ├── sdd-requirements-analyst.md
│   ├── sdd-spec-writer.md
│   ├── sdd-implementer.md
│   ├── sdd-reviewer.md
│   ├── sdd-code-analyzer.md
│   ├── sdd-test-writer.md
│   └── sdd-change-analyst.md
├── skills/
│   ├── sdd-next/SKILL.md
│   ├── sdd-godmode/SKILL.md
│   ├── sdd-init/SKILL.md
│   ├── sdd-intake/SKILL.md
│   ├── sdd-spec/SKILL.md
│   ├── sdd-plan/SKILL.md
│   ├── sdd-assign/SKILL.md
│   ├── sdd-build/SKILL.md
│   ├── sdd-review/SKILL.md
│   ├── sdd-integrate/SKILL.md
│   ├── sdd-change/SKILL.md
│   ├── sdd-status/SKILL.md
│   └── sdd-lint/SKILL.md
├── templates/
│   ├── claude-md/
│   ├── specs/
│   ├── checklists/
│   ├── cross-domain/
│   └── project-init/
├── scripts/
│   ├── sdd-session-init.sh
│   ├── sdd-detect-tools.sh
│   └── sdd-lsp-patch.sh
├── bin/cli.mjs
├── lib/
│   ├── utils.mjs
│   ├── checker.mjs
│   ├── installer.mjs
│   └── doctor.mjs
├── docs/
│   ├── architecture.md
│   ├── setup-guide.md
│   ├── usage-guide.md
│   ├── workflow-guide.md
│   ├── sdd-methodology.md
│   ├── glossary-ko.md
│   └── plan-lint-integration.md
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
