# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 다룰 때 참고하는 지침서입니다.

## 프로젝트 개요

claude-sdd는 스펙 주도 개발 (SDD) -- Agent Teams를 활용한 7단계 소프트웨어 프로젝트 라이프사이클 -- 을 구현하는 Claude Code 플러그인입니다. 프롬프트 기반 플러그인으로, 모든 스킬과 에이전트는 컴파일된 코드가 아닌 Claude Code가 해석하는 마크다운 파일입니다.

## 개발

**빌드 단계 없음.** npm 의존성이 없는 순수 ESM JavaScript 플러그인입니다. 모든 로직은 마크다운(스킬/에이전트)과 셸 스크립트에 있습니다.

**CLI 명령어** (진입점: `bin/cli.mjs`):
```
node bin/cli.mjs check      # 의존성 상태 확인
node bin/cli.mjs install     # 자동 설치 (Confluence 인증 정보만 입력)
node bin/cli.mjs uninstall   # 플러그인/설정 제거 (설치된 패키지는 보존)
node bin/cli.mjs doctor      # 심층 진단 (파일 무결성, JSON 검증)
node bin/cli.mjs version     # 버전 표시
```

**테스트 프레임워크 없음.** 통합 테스트는 Claude Code 자체에서 스킬을 호출하여 수행합니다.

## 아키텍처

### 플러그인 매니페스트
`.claude-plugin/plugin.json` -- 모든 스킬, 에이전트, 훅을 Claude Code에 등록합니다.

### 스킬 (`skills/` 내 14개 슬래시 명령어)
각 스킬은 Claude가 읽고 실행하는 절차적 지시사항이 담긴 `SKILL.md` 파일입니다. 모든 스킬은 슬래시 커맨드뿐 아니라 자연어로도 발동 가능합니다 (description의 "Use when:" 힌트 기반). 라이프사이클 흐름:

```
/claude-sdd:sdd-godmode   → 심층 인터뷰 → 전체 파이프라인 자동 실행 (풀 오토 모드)
/claude-sdd:sdd-next      → 단계 자동 감지 후 계속 진행
/claude-sdd:sdd-init      → 프로젝트 설정 + SDD 디렉토리 초기화 (--domains로 멀티 도메인)
/claude-sdd:sdd-intake    → 요구사항 수집 (Confluence/Jira/Figma/파일/인터뷰). 레거시: 인터뷰 없이 기존 코드 자동 분석으로 요구사항 생성
/claude-sdd:sdd-spec      → 기술 스펙 + 스펙 준수 체크리스트 생성 + Mermaid 다이어그램 PNG 자동 생성
/claude-sdd:sdd-plan      → 태스크 분해 → 워크 패키지
/claude-sdd:sdd-assign    → 워크 패키지에 팀 멤버 배정 + 멤버별 CLAUDE.md 생성
/claude-sdd:sdd-build     → Agent Teams로 구현 + 품질 루프 (최대 3회 재작업 사이클)
/claude-sdd:sdd-review    → 품질 게이트 검증 + 자동 진단
/claude-sdd:sdd-integrate → PR 생성 + 문서화
/claude-sdd:sdd-change    → 변경 관리 (영향 분석 → 체크리스트 갱신 → TDD 델타 빌드)
/claude-sdd:sdd-publish   → Confluence 퍼블리싱 (템플릿 기반 변환, Mermaid 다이어그램 PNG 첨부)
/claude-sdd:sdd-status    → 상태 대시보드
/claude-sdd:sdd-lint      → 코드 분석 (진단, 검색, 심볼, 포맷)
```

### 멀티 도메인 지원
대규모 프로젝트에서 도메인별 독립 라이프사이클을 지원합니다. `sdd-config.yaml`에 `domains` 섹션이 정의되면 멀티 도메인 모드가 활성화됩니다. 각 스킬에 `--domain=<id>`, `--all` 옵션이 추가되어 도메인별 독립 스펙/빌드/리뷰가 가능합니다. 도메인별 스펙은 `docs/specs/domains/<domain-id>/`에, 크로스 도메인 통합은 `docs/specs/cross-domain/`에 위치합니다.

### 갓모드 (`/claude-sdd:sdd-godmode`)
심층 인터뷰를 통해 프로젝트 정보(기술 스택, 도메인 구조, 요구사항 소스, 비기능 요구사항 등)를 한번에 수집한 후 전체 SDD 파이프라인을 자동 실행합니다. `spec_depth: thorough` 모드로 DDL 수준의 상세 스펙을 생성합니다. 레거시 프로젝트에서는 코드 자동 분석으로 기술 스택/도메인/코드 규칙을 감지하여 확인만 받고, MVP/토이 프로젝트에서는 불필요한 엔터프라이즈급 질문을 자동 건너뜁니다. 섹션 7에서 프로젝트 규칙을 인터뷰하고, Phase 2.5에서 프리셋 매칭 후 규칙 파일을 자동 생성합니다.

### 에이전트 (`agents/` 내 7개)
마크다운 기반 에이전트. 사고가 필요한 작업은 Sonnet, 도구 실행 위주의 경량 작업은 Haiku를 사용합니다:
- **sdd-requirements-analyst** -- 외부 소스 파싱 (Confluence/Jira/Figma) [Sonnet]
- **sdd-spec-writer** -- 기술 스펙 문서 생성 (Mermaid 다이어그램 포함) [Sonnet]
- **sdd-implementer** -- 워크 패키지를 구현하는 팀 멤버 (TDD 모드 지원) [Sonnet]
- **sdd-reviewer** -- 체크리스트 대비 스펙 준수 검증 (TDD 준수 확인 포함) [Sonnet]
- **sdd-code-analyzer** -- 자동 진단, ast-grep, LSP, 포매팅 실행 [Haiku]
- **sdd-test-writer** -- TDD 테스트 작성 (스펙 기반 실패 테스트, 구현 코드 생성 금지) [Sonnet]
- **sdd-change-analyst** -- 변경 영향 분석 (LSP/코드 분석, 스펙 델타 생성, 최소 영향 원칙) [Sonnet]

모델은 `sdd-config.yaml`의 `teams.model` (기본: sonnet)과 `teams.lightweight_model` (기본: haiku)로 설정합니다.

### 품질 루프 (`/claude-sdd:sdd-build`의 핵심 메커니즘)
리더(Opus)가 팀 멤버(`teams.model`로 설정된 모델, `sdd-implementer`)에게 워크 패키지를 할당합니다. 각 워크 패키지 완료 후 리더가 체크리스트를 검증합니다: 전부 `[x]` = 진행, `[ ]` 잔여 = 구체적 피드백과 함께 재작업, 3회 실패 = 사용자에게 에스컬레이션.

### TDD 모드 (`/claude-sdd:sdd-build --tdd`)
`--tdd` 플래그 또는 `sdd-config.yaml teams.tdd: true`로 활성화. Phase A(Red): `sdd-test-writer`가 스펙 기반 실패 테스트 작성 → Phase B(Green): `sdd-implementer`가 테스트 통과 코드 작성 (테스트 수정 금지) → Phase C(Verify): 전체 테스트 실행. 실패 시 Phase B+C 반복 (최대 3회).

### 레거시 모드 (`/claude-sdd:sdd-init legacy`)
`sdd-config.yaml`의 `project.type: legacy`로 활성화. 빌드 단계에서 코드 변경 없이 **분석(analysis) 전용 구조 분석**만 수행합니다. 모든 코드 변경은 `/claude-sdd:sdd-change` 워크플로우를 통해 처리합니다.

**레거시 라이프사이클**: `init → intake → spec → plan → assign → build(분석 전용) → change(갭 해소 CRs) → review → integrate`

- **Build(분석 전용)**: 기존 코드와 스펙 대조, 충족 항목은 `[x]` 표시, 미충족 항목은 갭으로 식별. 코드 수정 없음. `10-analysis-report.md` 생성.
- **Change(갭 해소)**: 분석 보고서의 갭 항목을 CR로 변환하여 `sdd-change` 워크플로우로 처리. `--from-analysis` 플래그로 분석 기반 CR 자동 생성, `--lightweight` 플래그로 소규모 갭 빠른 처리 (Phase 1-4 자동, Phase 5-7 실행).
- **하위 호환성 유지 필수**, 기존 테스트 수정/삭제 금지.
- `sdd-config.yaml`의 `legacy.analysis_cr_mode` 설정: `suggest` (기본, 추천 CR 제시) / `auto` (자동 CR 생성) / `manual` (수동 CR 관리).

### 변경 관리 (`/claude-sdd:sdd-change`)
변경 요청을 7 Phase로 처리: 변경 수집 → 영향 분석(`sdd-change-analyst`) → 체크리스트 부분 갱신(최소 영향 원칙) → 델타 태스크 계획(CWP) → TDD 델타 빌드 → 리뷰+회귀 검증 → PR 생성. 체크리스트는 영향받는 항목만 `[x]`→`[ ]` 재설정, CHG-/CHG-REG- 항목 추가.

**전제조건**: 신규 프로젝트는 통합 완료 후, 레거시 프로젝트는 분석 완료(`10-analysis-report.md` 존재) 후 실행 가능.

**레거시 전용 옵션**:
- `--from-analysis`: 분석 보고서 갭에서 CR 자동 생성
- `--lightweight --from-analysis`: 소규모 갭(5개 이하) 빠른 처리 — Phase 1-4 자동 설정, Phase 5(빌드)+6(검증)+7(PR)만 실행

### 템플릿 (`templates/`)
- `claude-md/` -- `/claude-sdd:sdd-build` 시 대상 프로젝트에 주입되는 CLAUDE.md 템플릿 (리더 vs 멤버 규칙)
- `project-init/` -- 프로젝트 초기화용 `sdd-config.yaml.tmpl`
- `specs/` -- 아키텍처, API, 데이터 모델 스펙 템플릿 (Mermaid 블록 포함)
- `checklists/` -- 스펙 준수 및 품질 게이트 체크리스트 템플릿
- `cross-domain/` -- 도메인 의존성 맵, 통합 포인트, 통합 체크리스트 템플릿
- `confluence/` -- Confluence 변환 XML 템플릿 (page-wrapper, info-panel, status-macro, expand-macro, checklist-summary, code-block)

### 도구 감지 (`scripts/sdd-detect-tools.sh`)
프로젝트 언어 및 사용 가능한 린터/포매터를 자동 감지합니다. JSON 출력. TypeScript, Python, Go, Rust, Java, Kotlin, C++ 지원.

### 프로젝트 규칙 시스템 (`templates/rules/`)
프로젝트의 코딩 규칙을 체계적으로 정의/전파/검증하는 시스템입니다. `00-project-context.md`(무엇인가)를 보완하여 `00-project-rules.md`(어떻게 만드는가)를 정의합니다.

**규칙 저장 구조** (대상 프로젝트):
```
docs/specs/
  00-project-rules.md          (규칙 인덱스 + 핵심 요약 테이블)
  rules/                       (카테고리별 상세 규칙)
    architecture.md
    coding-conventions.md
    api-design.md
    error-handling.md
    testing.md
    security.md
    data-model.md
    performance.md
    custom/*.md                (사용자 정의 규칙)
```

**규칙 4필드 구조**: 각 규칙은 원칙 / 위반 기준 / 검증 방법 / 예외의 4필드로 정의됩니다.

**프리셋**: `templates/rules/presets/`에 Java+Spring, TypeScript+Node, Python+FastAPI, Kotlin+Spring, Go 프리셋이 있습니다.

**규칙 생성**: `/claude-sdd:sdd-godmode`의 섹션 7 인터뷰(신규) 또는 섹션 7L 자동 감지(레거시)로 수집 → Phase 2.5에서 프리셋 매칭 후 파일 생성.

**규칙 검증**: `sdd-spec`(스펙 정합성), `sdd-build`(품질 루프), `sdd-review`(최종 검증)에서 자동 검증.

**적용 모드**: `sdd-config.yaml`의 `rules.enforcement` — `strict`(위반=FAIL) | `advisory`(위반=경고).

### LSP 통합
`boostvolt/claude-code-lsps` 마켓플레이스 플러그인을 통해 Claude Code 내장 LSP를 활용합니다.

**자동 진단**: 파일 편집 후 에러/경고가 자동으로 표시됩니다. 에이전트의 별도 호출이 불필요합니다.

**명시적 LSP 도구**: 다음 LSP 오퍼레이션은 에이전트가 직접 호출해야 합니다. LSP가 사용 불가하면 Grep/Glob으로 대체합니다.

| 오퍼레이션 | 활용 장면 | 주요 사용 에이전트 |
|-----------|----------|------------------|
| `LSP findReferences` | 함수/클래스의 모든 호출자 파악 | sdd-change-analyst, sdd-implementer |
| `LSP incomingCalls` | 호출 계층 추적 (영향 분석) | sdd-change-analyst |
| `LSP documentSymbol` | 파일 내 공개 API/심볼 목록 추출 | sdd-reviewer, sdd-implementer |
| `LSP goToDefinition` | 심볼의 원본 정의 위치 확인 | sdd-implementer, sdd-change-analyst |
| `LSP hover` | 타입 정보 확인 | sdd-implementer, sdd-test-writer |

**CLAUDE.md 템플릿 적용**: `sdd-leader.md.tmpl`과 `sdd-member.md.tmpl`에 LSP 우선 활용 지침이 포함되어, 빌드 시 대상 프로젝트의 에이전트가 코드 분석에 LSP를 적극 사용합니다.

### 세션 훅 (`hooks/hooks.json` + `scripts/sdd-session-init.sh` + `scripts/sdd-lsp-patch.sh`)
세션 시작 시 두 개의 훅이 실행됩니다:
- `sdd-session-init.sh` -- 현재 프로젝트가 SDD를 사용하는지 자동 감지하고 단계/진행 상황을 표시
- `sdd-lsp-patch.sh` -- gopls PATH 자동 패치 및 kotlin-lsp JVM 프리웜

### Confluence 퍼블리싱 (`/claude-sdd:sdd-publish`)
SDD 산출물을 Confluence에 자동 퍼블리싱합니다. `sdd-config.yaml`의 `publishing.confluence` 섹션이 활성화되면 동작합니다. 마크다운 → Confluence storage format 변환 (템플릿 기반), 다이어그램 PNG 생성/첨부, 증분 동기화(타임스탬프 비교)를 지원합니다.

**다이어그램 생성 (Mermaid 기반)**: `sdd-spec-writer` 에이전트가 스펙에 Mermaid 코드 블록(graph TB, erDiagram, sequenceDiagram)을 직접 작성합니다. `sdd-spec` 단계에서 Mermaid 블록을 추출하여 mmdc (Mermaid CLI)로 PNG를 렌더링합니다. PNG는 `docs/specs/diagrams/`에 영구 저장됩니다 (도메인별: `docs/specs/domains/<id>/diagrams/`, 크로스 도메인: `docs/specs/cross-domain/diagrams/`). `sdd-publish` 단계에서는 기존 PNG가 소스보다 최신이면 재사용합니다. `claude-mermaid` MCP로 브라우저 프리뷰 가능 (선택).

**PNG 파일명 규칙**: `02-module-dependency.png`, `04-er-diagram.png`, `05-component-interaction.png`, `02-domain-boundary.png`, `02-domain-dependency.png`, `cross-domain-dependency.png`

**Confluence 변환 파이프라인**: 5단계 파이프라인 — 전처리(메타데이터 추출) → 기본 변환(헤더/코드/테이블/체크리스트) → 향상 변환(blockquote→패널, HTTP 메서드→상태 배지, 긴 코드→접기 매크로, 체크리스트 진행률 요약) → 래핑(page-wrapper 템플릿) → 다이어그램(Mermaid→PNG→ac:image). `templates/confluence/` 디렉토리의 6개 XML 템플릿을 사용합니다.

**첨부 업로드**: `scripts/sdd-confluence-upload.py`가 `atlassian-python-api`를 사용하여 PNG를 Confluence 페이지에 첨부합니다. MCP 도구는 첨부를 지원하지 않으므로 별도 스크립트가 필요합니다.

**수동 퍼블리싱**: 퍼블리싱은 모든 워크플로우 완료 후 사용자가 `/claude-sdd:sdd-publish`를 직접 실행합니다. 인자 없이 실행 시 퍼블리싱할 문서를 대화형으로 선택할 수 있으며, `--all`로 전체 일괄 퍼블리싱도 가능합니다.

### 브랜치 관리
`sdd-init`, `sdd-godmode`, `sdd-change` 스킬은 실행 시작 전에 현재 브랜치가 `feature/**` 패턴인지 확인합니다. 아닌 경우 Jira 소스에서 자동 생성하거나 사용자 입력을 받아 `feature/<name>` 브랜치를 생성합니다.

### CLI 유틸리티 (`lib/`)
- `utils.mjs` -- 색상, 셸 실행, 프롬프트, brew Node.js symlink 보호
- `checker.mjs` -- 의존성 검사 로직 (MCP, 다이어그램 도구 포함)
- `installer.mjs` -- 자동 설치 (Confluence 인증 정보만 입력, 나머지 전부 자동)
- `uninstaller.mjs` -- 플러그인/설정 제거 (npm/pip/brew 설치 패키지는 보존)
- `doctor.mjs` -- 진단 및 파일 무결성 검증

## 주요 규칙

- **체크리스트가 단일 진실 소스** -- 모든 진행 상황은 대상 프로젝트의 SDD 디렉토리 내 `06-spec-checklist.md`에서 추적됩니다.
- **ESM 전용** -- 모든 `.mjs` 파일은 ES 모듈 import를 사용합니다.
- **외부 의존성 없음** -- 플러그인은 Node.js 내장 모듈과 셸 명령어만 사용합니다.
- **버전은 네 곳에서 업데이트 필수**: `package.json`, `.claude-plugin/plugin.json`, `marketplace.json`, `bin/cli.mjs`.
- **문서 현행화 필수** -- 코드/스킬/에이전트/템플릿 변경 시, **커밋 전에 반드시** 아래 매핑에 따라 관련 문서를 함께 갱신합니다. 문서가 갱신되지 않은 변경은 커밋하지 않습니다.

### 변경-문서 매핑

| 변경 대상 | 함께 갱신할 문서 |
|-----------|-----------------|
| `skills/*.md` | `CLAUDE.md`, `docs/usage-guide.md`, `docs/workflow-guide.md` |
| `agents/*.md` | `CLAUDE.md`, `docs/architecture.md` |
| `templates/*.tmpl` | `CLAUDE.md`, `docs/architecture.md` |
| `templates/rules/*` | `CLAUDE.md`, `docs/architecture.md` |
| 워크플로우/라이프사이클 변경 | `docs/workflow-guide.md`, `docs/sdd-methodology.md` |
| 아키텍처/구조 변경 | `docs/architecture.md` |
| 신규 기능/모드/용어 추가 | `README.md`, `README.en.md`, `CHANGELOG.md`, `docs/glossary-ko.md` |
| CLI 명령어 변경 | `CLAUDE.md`, `README.md`, `README.en.md` |
