# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 다룰 때 참고하는 지침서입니다.

## 프로젝트 개요

claude-sdd는 스펙 주도 개발 (SDD) -- Agent Teams를 활용한 7단계 소프트웨어 프로젝트 라이프사이클 -- 을 구현하는 Claude Code 플러그인입니다. 프롬프트 기반 플러그인으로, 모든 스킬과 에이전트는 컴파일된 코드가 아닌 Claude Code가 해석하는 마크다운 파일입니다.

## 개발

**빌드 단계 없음.** npm 의존성이 없는 순수 ESM JavaScript 플러그인입니다. 모든 로직은 마크다운(스킬/에이전트)과 셸 스크립트에 있습니다.

**CLI 명령어** (진입점: `bin/cli.mjs`):
```
node bin/cli.mjs check      # 의존성 상태 확인
node bin/cli.mjs install     # 대화형 설치 마법사
node bin/cli.mjs doctor      # 심층 진단 (파일 무결성, JSON 검증)
node bin/cli.mjs version     # 버전 표시
```

**테스트 프레임워크 없음.** 통합 테스트는 Claude Code 자체에서 스킬을 호출하여 수행합니다.

## 아키텍처

### 플러그인 매니페스트
`.claude-plugin/plugin.json` -- 모든 스킬, 에이전트, 훅을 Claude Code에 등록합니다.

### 스킬 (`skills/` 내 11개 슬래시 명령어)
각 스킬은 Claude가 읽고 실행하는 절차적 지시사항이 담긴 `SKILL.md` 파일입니다. 라이프사이클 흐름:

```
/claude-sdd:sdd-auto      → 단계 자동 감지 후 계속 진행
/claude-sdd:sdd-init      → 프로젝트 설정 + SDD 디렉토리 초기화
/claude-sdd:sdd-intake    → 요구사항 수집 (Confluence/Jira/Figma/파일/인터뷰)
/claude-sdd:sdd-spec      → 기술 스펙 + 스펙 준수 체크리스트 생성
/claude-sdd:sdd-plan      → 태스크 분해 → 워크 패키지 + 팀 할당
/claude-sdd:sdd-build     → Agent Teams로 구현 + 품질 루프 (최대 3회 재작업 사이클)
/claude-sdd:sdd-review    → 품질 게이트 검증 + 자동 진단
/claude-sdd:sdd-integrate → PR 생성 + 문서화
/claude-sdd:sdd-status    → 상태 대시보드
/claude-sdd:sdd-lint      → 코드 분석 (진단, 검색, 심볼, 포맷)
/claude-sdd:sdd-lsp       → LSP 기반 의미 분석 (진단, 정의, 참조, 심볼, 호출 계층)
```

### 에이전트 (`agents/` 내 5개)
Sonnet 모델에서 실행되는 마크다운 기반 에이전트:
- **sdd-requirements-analyst** -- 외부 소스 파싱 (Confluence/Jira/Figma)
- **sdd-spec-writer** -- 기술 스펙 문서 생성
- **sdd-implementer** -- 워크 패키지를 구현하는 팀 멤버
- **sdd-reviewer** -- 체크리스트 대비 스펙 준수 검증
- **sdd-code-analyzer** -- 자동 진단, ast-grep, LSP, 포매팅 실행

### 품질 루프 (`/claude-sdd:sdd-build`의 핵심 메커니즘)
리더(Opus)가 팀 멤버(Sonnet, `sdd-implementer`)에게 워크 패키지를 할당합니다. 각 워크 패키지 완료 후 리더가 체크리스트를 검증합니다: 전부 `[x]` = 진행, `[ ]` 잔여 = 구체적 피드백과 함께 재작업, 3회 실패 = 사용자에게 에스컬레이션.

### 템플릿 (`templates/`)
- `claude-md/` -- `/claude-sdd:sdd-build` 시 대상 프로젝트에 주입되는 CLAUDE.md 템플릿 (리더 vs 멤버 규칙)
- `project-init/` -- 프로젝트 초기화용 `sdd-config.yaml.tmpl`
- `specs/` -- 아키텍처, API, 데이터 모델 스펙 템플릿
- `checklists/` -- 스펙 준수 및 품질 게이트 체크리스트 템플릿

### 도구 감지 (`scripts/sdd-detect-tools.sh`)
프로젝트 언어 및 사용 가능한 린터/포매터/LSP 서버를 자동 감지합니다. JSON 출력. TypeScript, Python, Go, Rust, Java, Kotlin, C++ 지원.

### LSP 통합 (`lib/lsp/` + `scripts/sdd-lsp.mjs`)
Language Server Protocol 기반 의미 분석. Per-request 수명주기 (시작→쿼리→종료). 5개 언어 서버 지원 (typescript-language-server, pyright-langserver, gopls, rust-analyzer, clangd). 서버 미설치 시 네이티브 도구로 자동 폴백.

### 세션 훅 (`hooks/hooks.json` + `scripts/sdd-session-init.sh`)
세션 시작 시 실행되어 현재 프로젝트가 SDD를 사용하는지 자동 감지하고 단계/진행 상황을 표시합니다.

### CLI 유틸리티 (`lib/`)
- `utils.mjs` -- 색상, 셸 실행, 프롬프트
- `checker.mjs` -- 의존성 검사 로직
- `installer.mjs` -- 설치 마법사
- `doctor.mjs` -- 진단 및 파일 무결성 검증
- `lsp/client.mjs` -- JSON-RPC 2.0 LSP 클라이언트
- `lsp/servers.mjs` -- 언어 서버 레지스트리
- `lsp/bridge.mjs` -- 고수준 LSP 브릿지

## 주요 규칙

- **체크리스트가 단일 진실 소스** -- 모든 진행 상황은 대상 프로젝트의 SDD 디렉토리 내 `06-spec-checklist.md`에서 추적됩니다.
- **ESM 전용** -- 모든 `.mjs` 파일은 ES 모듈 import를 사용합니다.
- **외부 의존성 없음** -- 플러그인은 Node.js 내장 모듈과 셸 명령어만 사용합니다.
- **버전은 네 곳에서 업데이트 필수**: `package.json`, `.claude-plugin/plugin.json`, `marketplace.json`, `bin/cli.mjs`.
