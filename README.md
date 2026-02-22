# claude-sdd — 스펙 주도 개발 (SDD) 라이프사이클

> [English](README.en.md)

**스펙 주도 개발(SDD)** 방법론을 통해 전체 개발 라이프사이클을 관리하는 Claude Code 플러그인입니다. **Agent Teams**를 활용한 병렬 구현을 지원합니다.

## 왜 SDD인가?

| 문제 | SDD 해결 방안 |
|------|--------------|
| 모호한 요구사항이 재작업을 유발 | Confluence, Jira, Figma, 인터뷰를 통한 구조화된 요구사항 수집 |
| 단일 정보 소스 부재 | 스펙 문서 + 준수 체크리스트를 git으로 관리 |
| 팀원 간 품질 편차 | 스펙 검증을 통한 자동화된 품질 게이트 |
| 진행 상황 파악 어려움 | 체크리스트 기반 진행률 추적 (0%~100%) |
| 순차 처리로 인한 병목 | Agent Teams의 워크 패키지 병렬 실행 |

## SDD 라이프사이클

```
/claude-sdd:sdd-init  -->  /claude-sdd:sdd-intake  -->  /claude-sdd:sdd-spec  -->  /claude-sdd:sdd-plan
   |                      |                        |                      |
   v                      v                        v                      v
 프로젝트             요구사항                  기술 스펙              태스크
 설정                 수집                      작성                   분해

/claude-sdd:sdd-build  -->  /claude-sdd:sdd-review  -->  /claude-sdd:sdd-integrate
   |                |                 |
   v                v                 v
 Agent Teams     품질               PR &
 구현            게이트             문서화
```

### 7단계

| 단계 | 명령어 | 산출물 |
|------|--------|--------|
| 1. 초기화 | `/claude-sdd:sdd-init new\|legacy` | `sdd-config.yaml`, CLAUDE.md 규칙 |
| 2. 요구사항 수집 | `/claude-sdd:sdd-intake` | `01-requirements.md` |
| 3. 스펙 작성 | `/claude-sdd:sdd-spec` | `02-*.md` ~ `06-spec-checklist.md` |
| 4. 계획 수립 | `/claude-sdd:sdd-plan` | `07-task-plan.md`, 워크 패키지 |
| 4.5. 팀 배정 | `/claude-sdd:sdd-assign` | `wp-*-member.md` |
| 5. 구현 | `/claude-sdd:sdd-build` | 구현 코드 + 테스트 |
| 6. 리뷰 | `/claude-sdd:sdd-review` | `08-review-report.md` |
| 7. 통합 | `/claude-sdd:sdd-integrate` | 스펙 추적 가능한 PR |
| 8. 변경 | `/claude-sdd:sdd-change` | 변경 영향 분석 + 델타 빌드 + 회귀 검증 |

`/claude-sdd:sdd-next`를 사용하면 현재 단계를 자동 감지하고 이어서 진행합니다.

## 설치

### 빠른 시작 (npx)

```bash
npx github:joypop-lguplus/claude-sdd install
```

### CLI 명령어

```bash
npx github:joypop-lguplus/claude-sdd check    # 상태 확인
npx github:joypop-lguplus/claude-sdd install   # 자동 설치
npx github:joypop-lguplus/claude-sdd doctor    # 정밀 진단
```

### 수동 설치 / 로컬 개발

```bash
git clone https://github.com/joypop-lguplus/claude-sdd.git
cd claude-sdd
claude --plugin-dir .
```

## 구성 요소

### 스킬 (슬래시 명령어)

| 명령어 | 설명 |
|--------|------|
| `/claude-sdd:sdd-next` | 현재 단계를 자동 감지하고 라이프사이클 진행 |
| `/claude-sdd:sdd-godmode` | 심층 인터뷰 + 전체 파이프라인 자동 실행 |
| `/claude-sdd:sdd-init` | SDD 프로젝트 초기화 |
| `/claude-sdd:sdd-intake` | 요구사항 수집 (Confluence, Jira, Figma, 파일, 인터뷰) |
| `/claude-sdd:sdd-spec` | 기술 스펙 생성 |
| `/claude-sdd:sdd-plan` | 태스크 분해 (워크 패키지) |
| `/claude-sdd:sdd-assign` | 워크 패키지에 팀 멤버 배정 |
| `/claude-sdd:sdd-build` | 품질 루프를 통한 구현 (`--tdd`로 TDD 모드 지원) |
| `/claude-sdd:sdd-review` | 품질 게이트 검증 |
| `/claude-sdd:sdd-integrate` | 통합, PR 생성, 문서화 |
| `/claude-sdd:sdd-change` | 변경 관리: 영향 분석, 체크리스트 갱신, TDD 델타 빌드 |
| `/claude-sdd:sdd-publish` | SDD 산출물을 Confluence에 퍼블리싱 + Mermaid 다이어그램 PNG 첨부 |
| `/claude-sdd:sdd-status` | 진행 상황 대시보드 |
| `/claude-sdd:sdd-lint` | 코드 분석: 진단, 검색, 심볼, 포맷 |

### 주요 기능

- **프로젝트 규칙 시스템** — 코딩 규칙을 템플릿 기반으로 생성하고, 전체 워크플로우에서 자동 검증 (strict/advisory 모드)

### 에이전트

| 에이전트 | 역할 |
|----------|------|
| `sdd-requirements-analyst` | Confluence/Jira/Figma에서 요구사항 추출 |
| `sdd-spec-writer` | 기술 스펙 및 체크리스트 생성 (Mermaid 다이어그램 포함) |
| `sdd-implementer` | 워크 패키지 구현 (Agent Teams 멤버, TDD 모드 지원) |
| `sdd-reviewer` | 스펙 체크리스트 대비 구현 검증 (TDD 준수 확인 포함) |
| `sdd-code-analyzer` | 네이티브 도구, ast-grep을 활용한 자동 코드 분석 |
| `sdd-test-writer` | TDD 테스트 작성 (스펙 기반 실패 테스트, 구현 금지) |
| `sdd-change-analyst` | 변경 영향 분석 (코드 분석, 최소 영향 원칙) |

### 품질 루프

SDD의 핵심은 빌드 단계에서의 리더 주도 품질 루프입니다:

```
리더 (Opus): 스펙 참조와 함께 워크 패키지 할당
  |
팀 멤버 (teams.model): 스펙 확인 --> 구현 --> 테스트 --> 보고
  |
리더: 체크리스트 검증
  |-- [ ] 미완료 항목 존재 --> 구체적 피드백 + 재작업 (최대 3회)
  |-- 모두 [x] --> 다음 워크 패키지
  |-- 3회 실패 --> 사용자에게 에스컬레이션
```

### TDD 모드 (`--tdd`)

`/claude-sdd:sdd-build --tdd` 또는 `sdd-config.yaml`의 `teams.tdd: true`로 활성화합니다:

```
Phase A (Red):   sdd-test-writer가 스펙 기반 실패 테스트 작성
Phase B (Green): sdd-implementer가 테스트 통과 코드 작성 (테스트 수정 금지)
Phase C (Verify): 리더가 전체 테스트 실행, 통과 확인
재작업: 실패 시 Phase B+C 반복 (최대 3회)
```

### 변경 관리 (`/claude-sdd:sdd-change`)

통합 완료 후 변경 요청을 7 Phase로 처리합니다:

```
Phase 1: 변경 요청 수집 → 09-change-request.md
Phase 2: 영향 분석 (sdd-change-analyst) → 스펙 델타
Phase 3: 체크리스트 부분 갱신 (최소 영향 원칙)
Phase 4: 델타 태스크 계획 (CWP-1, CWP-2...)
Phase 5: TDD 델타 빌드 (CHG- + CHG-REG- 테스트)
Phase 6: 리뷰 + 회귀 검증
Phase 7: PR 생성 (변경 추적성 포함)
```

**추가 플래그:**

| 플래그 | 설명 |
|--------|------|
| `--from-analysis` | 분석 보고서(`10-analysis-report.md`)의 갭에서 CR을 자동 생성 (레거시 프로젝트용) |
| `--lightweight` | `--from-analysis`와 함께 사용. 5개 이하 소규모 갭을 빠르게 처리 (Phase 1-4 자동 설정, Phase 5-7만 실행) |

### 레거시 모드

`/claude-sdd:sdd-init legacy`로 초기화하면 `sdd-config.yaml`에 `project.type: legacy`가 설정됩니다. 레거시 모드에서는 빌드 단계에서 코드 변경 없이 **분석 전용 구조 분석**만 수행하며, 모든 코드 변경은 `/claude-sdd:sdd-change` 워크플로우를 통해 처리합니다.

**레거시 라이프사이클:**

```
init → intake → spec → plan → assign → build(분석 전용) → change(갭 해소 CRs) → review → integrate
```

- **Build (분석 전용):** 기존 코드와 스펙을 대조하여 충족 항목은 `[x]`, 미충족 항목은 갭으로 식별. 코드 수정 없음. `10-analysis-report.md` 생성.
- **Change (갭 해소):** 분석 보고서의 갭 항목을 CR로 변환하여 `sdd-change` 워크플로우로 처리.
- `sdd-config.yaml`의 `legacy.analysis_cr_mode` 설정: `suggest` (기본, 추천 CR 제시) / `auto` (자동 CR 생성) / `manual` (수동 CR 관리).

## 요구사항

| 구성 요소 | 필수 여부 | 비고 |
|-----------|----------|------|
| Claude Code | **필수** | 플러그인 호스트 |
| Node.js 18+ | **필수** | CLI 도구용 |
| Agent Teams | 권장 | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — 활성화 시 팀 모드(병렬), 비활성화 시 솔로 모드(순차) |
| `gh` CLI | 권장 | PR 생성용 |
| ast-grep (`sg`) | 선택 | `/claude-sdd:sdd-lint search` 및 `/claude-sdd:sdd-lint symbols`용 |
| mmdc (Mermaid CLI) | 선택 | 다이어그램 PNG 렌더링용. `npm i -g @mermaid-js/mermaid-cli` |
| claude-mermaid MCP | 선택 | 브라우저 다이어그램 프리뷰 (선택 사항) |
| LSP 플러그인 | 선택 | `boostvolt/claude-code-lsps` — 자동 진단 및 LSP 기능 활성화 |
| Confluence MCP | 선택 | `/claude-sdd:sdd-intake confluence:...`용 |
| Jira MCP | 선택 | `/claude-sdd:sdd-intake jira:...`용 |

### Agent Teams 활성화 (권장)

Agent Teams를 활성화하면 워크 패키지를 병렬로 빌드하여 더 빠르게 진행합니다. 비활성화 시 솔로 모드로 순차 빌드합니다.

```json
// ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## 문서

- [아키텍처](docs/architecture.md) -- 플러그인 구조 및 설계
- [설치 가이드](docs/setup-guide.md) -- 단계별 설치 방법
- [사용 가이드](docs/usage-guide.md) -- 상세 사용 예시
- [상황별 워크플로우 가이드](docs/workflow-guide.md) -- 시나리오별 최적 워크플로우
- [SDD 방법론](docs/sdd-methodology.md) -- SDD 접근법 설명
- [용어 사전](docs/glossary-ko.md) -- SDD 용어 정리

## 플러그인 구조

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

## 라이선스

MIT
