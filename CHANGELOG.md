# 변경 이력

## [Unreleased]

### Added
- **솔로 모드** — Agent Teams 없이도 빌드 가능
  - Agent Teams 비활성화 시 솔로 모드(순차 빌드)로 자동 전환
  - 현재 세션이 `agents/sdd-implementer.md` 등 에이전트 규칙을 읽고 직접 구현
  - 팀 모드와 동일한 결과물(코드, 테스트, 체크리스트) 및 동일한 품질 루프(최대 3회 재작업)
  - `sdd-build`(팀/솔로 분기), `sdd-change` Phase 2/5/6(팀/솔로 분기) 지원
  - `checker.mjs`에서 Agent Teams를 필수 → 선택(권장)으로 변경
  - `sdd-leader.md.tmpl`에 실행 모드 안내 섹션 추가
- **프로젝트 규칙(Project Rules) 시스템** — 코딩 규칙의 체계적 정의/전파/검증
  - 규칙 4필드 구조: 원칙 / 위반 기준 / 검증 방법 / 예외
  - 언어별 프리셋: Java+Spring, TypeScript+Node, Python+FastAPI, Kotlin+Spring, Go
  - 규칙 템플릿: `templates/rules/` (9개 카테고리 + 5개 프리셋 + 도메인 오버라이드)
  - 갓모드 인터뷰 섹션 7: 프로젝트 규칙 수집 + Phase 2.5 자동 생성
  - 레거시 자동 감지: 기존 코드에서 규칙 자동 추출 (섹션 7L)
  - 규칙 전파: CLAUDE.md 템플릿에 에이전트별 규칙 주입
  - 3단계 검증: sdd-spec(정합성), sdd-build(품질 루프), sdd-review(6패스 분석)
  - 적용 모드: strict(위반=FAIL) | advisory(위반=경고)
  - `sdd-config.yaml`에 `rules:` 설정 블록 추가
  - 멀티 도메인: 도메인별 규칙 오버라이드 지원
- **역할 기반 모델 분리** — 에이전트 모델을 역할에 따라 차등 적용
  - `teams.model` (기본: sonnet): 사고가 필요한 작업 (구현, 테스트, 리뷰)
  - `teams.lightweight_model` (기본: haiku): 경량 작업 (코드 분석, 린트, 포맷팅)
  - `sdd-code-analyzer` 에이전트 모델을 Sonnet → Haiku로 변경
  - `sdd-build` 3.5단계(린트/포맷) + `sdd-lint`에 경량 모델 적용
- **Agent Teams 설치 토글** — 인스톨러에서 Agent Teams 활성화/비활성화 선택 가능

### Fixed
- **claude-mermaid MCP 미설정 버그** — `configureDiagramTools()`에서 mmdc + atlassian-python-api가 이미 설치된 경우 조기 리턴하여 claude-mermaid MCP 설정 코드에 도달하지 못하던 문제 수정
- **checker 단계 라벨 오류** — 4/7(코드 분석/다이어그램 도구), 5/7(MCP 서버) 단계에서 불필요한 "(선택 사항)" 라벨 제거

## [0.5.0] - 2026-02-22

### 추가
- **Mermaid 다이어그램 엔진**: Graphviz/Python diagrams를 폐기하고 Mermaid (mmdc CLI)로 전면 전환. sdd-spec-writer가 스펙에 Mermaid 코드 블록 직접 작성
- **claude-mermaid MCP 통합**: 브라우저 다이어그램 프리뷰 지원 (선택 사항)
- **Confluence 변환 템플릿 시스템**: `templates/confluence/` 디렉토리에 6개 XML 템플릿 추가 (page-wrapper, info-panel, status-macro, expand-macro, checklist-summary, code-block)
- **Confluence 향상 변환 파이프라인**: blockquote→패널, HTTP 메서드→상태 배지, 긴 코드→접기 매크로, 체크리스트 진행률 요약 패널
- **Mermaid 테마 설정**: `scripts/mermaid-config.json` — 다이어그램 공통 테마/스타일

### 변경
- **인스톨러 다이어그램 도구**: Graphviz + Python diagrams → mmdc (Mermaid CLI) + claude-mermaid MCP
- **checker.mjs**: Graphviz/diagrams 체크 → mmdc + claude-mermaid MCP 체크
- **sdd-detect-tools.sh**: mmdc 사용 가능 여부 감지 추가
- **sdd-spec-writer 에이전트**: Mermaid 코드 블록 생성 규칙 추가 (flowchart/erDiagram/sequenceDiagram)
- **sdd-spec SKILL.md**: Mermaid 블록 추출 + mmdc 렌더링 파이프라인
- **sdd-publish SKILL.md**: 5단계 변환 파이프라인 (전처리→기본→향상→래핑→다이어그램)
- **스펙 템플릿**: architecture-new, component-breakdown에 Mermaid 블록 + 의존성 요약 테이블

### 삭제
- **`scripts/sdd-generate-diagram.py`**: 정규식 기반 스펙 추출 방식 폐기
- **Graphviz/Python diagrams 의존성**: 인스톨러/체커에서 제거

## [0.4.0] - 2026-02-21

### 추가
- **Confluence 퍼블리싱 (`sdd-publish`)**: SDD 산출물을 Confluence에 자동 퍼블리싱. 마크다운→Confluence storage format 변환, 다이어그램 PNG 생성/첨부, 증분 동기화 지원
- **다이어그램 생성 (`sdd-generate-diagram.py`)**: 아키텍처, ER, 모듈 의존성, 컴포넌트 상호작용 다이어그램을 PNG로 자동 생성. graphviz + Python diagrams 지원
- **Confluence 첨부 업로더 (`sdd-confluence-upload.py`)**: MCP 인증 정보를 재사용하여 atlassian-python-api로 PNG 첨부
- **인스톨러 MCP 설정 (Step 5/7)**: Atlassian MCP (최대 2개 사이트, uvx 기반, SSL 2계층 분리) + Figma MCP (Remote/Desktop) 대화형 설정
- **인스톨러 다이어그램 도구 (Step 6/7)**: Graphviz + Python diagrams + atlassian-python-api 설치
- **확장된 언인스톨러 (`lib/uninstaller.mjs`)**: 플러그인, LSP, MCP 서버, 다이어그램 도구, 마켓플레이스, 설정값을 일괄 스캔/제거
- **브랜치 관리**: `sdd-init`, `sdd-godmode`, `sdd-change` 실행 시 feature 브랜치 자동 확인/생성. Jira 키 기반 또는 사용자 입력
- **기존 스킬 퍼블리싱 통합**: `sdd-intake`, `sdd-spec`, `sdd-plan`, `sdd-review` 완료 시 Confluence 자동 퍼블리싱 (조건부)

### 변경
- **인스톨러 단계 확장**: `[1/5]`~`[5/5]` → `[1/7]`~`[7/7]` (MCP 서버 + 다이어그램 도구 단계 추가)
- **checker.mjs 구조화**: MCP 서버를 `~/.claude.json`에서 구조화하여 검사 (Atlassian 서버별 표시, Figma MCP 확인, 다이어그램 도구 확인)
- **sdd-config.yaml 확장**: `publishing.confluence` 섹션 추가
- **언인스톨러 분리**: `lib/installer.mjs`에서 `lib/uninstaller.mjs`로 분리

## [0.3.3] - 2026-02-21

### 변경
- **스킬 분리**: `sdd-plan`에서 팀 배정 기능을 분리하여 `sdd-assign` 신규 스킬 생성
  - `sdd-plan`: 순수 태스크 분해만 수행 (워크 패키지 생성, 의존성 식별, 실행 계획)
  - `sdd-assign`: 워크 패키지에 팀 멤버 배정 + `wp-*-member.md` 생성, `rebalance` 서브커맨드 포함
- **라이프사이클 갱신**: `plan → assign → build` 순서로 변경 (신규 8단계, 레거시 9단계)
- **`sdd-next` 라우팅**: `07-task-plan.md` 존재 + `wp-*-member.md` 부재 시 `sdd-assign`으로 라우팅
- **`sdd-godmode` 파이프라인**: `sdd-assign` 단계 삽입 (신규 [5/8], 레거시 [5/9])
- **`sdd-build` 의존성**: `wp-N-member.md` 출처를 `sdd-assign`으로 명시
- **버전**: `0.3.2` → `0.3.3` (package.json, plugin.json, marketplace.json, cli.mjs)

## [0.3.2] - 2026-02-21

### 변경
- **스킬 리네이밍**: `sdd-kickstart` → `sdd-godmode` (심층 인터뷰 + 전체 파이프라인 자동 실행), `sdd-auto` → `sdd-next` (단계 자동 감지 + 라우팅). 이름과 동작의 괴리 해소 — "킥스타트"(시작만 도와주는 느낌) → "갓모드"(풀 오토), "오토"(풀 오토 느낌) → "넥스트"(다음 단계 진행)
- **`lib/doctor.mjs`**: `skills/sdd-godmode/SKILL.md` 무결성 검사 추가 (기존 `sdd-kickstart` 누락 수정)
- **버전**: `0.3.1` → `0.3.2` (package.json, plugin.json, marketplace.json, cli.mjs)

## [Unreleased]

### 추가
- **에이전트 LSP 도구 활용 개선**: sdd-change-analyst, sdd-implementer, sdd-reviewer에 명시적 LSP 호출 지시 삽입 (findReferences, incomingCalls, documentSymbol 등). "자동으로 활용" → 워크플로우 단계 내 구체적 호출 + fallback 패턴
- **CLAUDE.md LSP 통합 섹션**: 자동 진단 vs 명시적 LSP 도구 구분 테이블 추가
- **레거시 모드 분석 전용 빌드** (`sdd-build`): 코드 변경 없이 기존 코드 ↔ 스펙 대조 분석만 수행, `10-analysis-report.md` 생성
- **레거시 모드 갭 해소 워크플로우** (`sdd-change`): 분석 보고서의 갭 항목을 CR로 변환하여 처리. `--from-analysis`, `--lightweight` 플래그 추가
- **레거시 모드 태스크 분해** (`sdd-plan`): 분석 대상 코드 경로, 하위 호환성 검증 태스크
- **레거시 모드 테스트 전략** (`sdd-test-writer`): 회귀/호환성 테스트 패턴
- **레거시 모드 멤버 템플릿** (`sdd-member.md.tmpl`): `{{LEGACY_MODE}}` 조건부 규칙 블록
- **분석 보고서 템플릿** (`templates/specs/analysis-report.md.tmpl`): 레거시 프로젝트 분석 결과 보고서 템플릿

### 변경
- **용어 통일**: "감사(audit)" → "분석(analysis)" 전체 용어 변경
- **CLAUDE.md**: LSP 통합 섹션 보강, 레거시 모드 섹션 추가, 세션 훅 + 템플릿 + 스크립트 현행화
- **문서 현행화**: architecture, usage-guide, workflow-guide, methodology, glossary, README

## [0.3.1] - 2026-02-20

### 추가
- **`lsp-test/` 테스트 환경**: 8개 언어(TS/Python/Go/Java/Kotlin/Lua/Terraform/YAML)별 최소 LSP 테스트 파일
- **`scripts/sdd-lsp-patch.sh` 세션 훅**: 세션 시작 시 gopls/kotlin-lsp .lsp.json 자동 패치 + kotlin-lsp JVM 프리웜
- **kotlin-lsp JVM 프리웜**: SessionStart 훅에서 kotlin-lsp를 미리 시작하여 JVM 클래스를 OS 페이지 캐시에 적재 → 후속 시작 시 디스크 I/O 없이 즉시 로딩
- **`lib/doctor.mjs` LSP 검증 섹션**: [4/4] LSP 설정 검증 — gopls 풀 패스 패치 상태, kotlin-lsp 풀 패스 패치 상태 확인

### 수정
- **gopls PATH 감지 버그**: `configureGoplsPath()`에서 `commandExists('gopls')` 대신 `command -v gopls`로 실제 경로 확인 → `~/go/bin/gopls`면 .lsp.json에 풀 패스 패치 진행 (Claude Code 런타임에 `~/go/bin`이 없어 "server is error" 발생하던 문제 해결)
- **kotlin-lsp "server is starting" 타임아웃**: JVM+Kotlin 컴파일러 초기화 ~4초로 Claude Code 내부 타임아웃 초과 → SessionStart 프리웜으로 해결

### 변경
- **`lib/installer.mjs`**: gopls `command -v` 기반 경로 확인 + kotlin-lsp 풀 패스 패치 (`configureKotlinLspTuning()`) 추가
- **`hooks/hooks.json`**: `sdd-lsp-patch.sh` SessionStart 훅 추가 (기존 사용자 자동 패치 안전망)
- **`lib/doctor.mjs`**: 3단계 → 4단계 진단 (`scripts/sdd-lsp-patch.sh` 무결성 + LSP .lsp.json 검증)
- **버전**: `0.3.0` → `0.3.1` (package.json, plugin.json, marketplace.json, cli.mjs)

### Removed
- **커스텀 LSP 구현 전면 제거**: `boostvolt/claude-code-lsps` 마켓플레이스 플러그인으로 완전 대체
  - `skills/sdd-lsp/` — `/claude-sdd:sdd-lsp` 스킬 삭제
  - `scripts/sdd-lsp.mjs` — CLI 브릿지 삭제
  - `lib/lsp/` — LSP 클라이언트, 서버 레지스트리, 브릿지 삭제
  - `templates/project-init/lsp-config.yaml.tmpl` — LSP 설정 템플릿 삭제

## [0.3.0] - 2026-02-19

### 추가

- **`/claude-sdd:sdd-lsp` 스킬**: LSP 기반 의미 분석 — 10개 서브커맨드 (diagnostics, definition, references, hover, symbols, workspace-symbols, implementations, incoming-calls, outgoing-calls, status)
- **`lib/lsp/client.mjs`**: JSON-RPC 2.0 LSP 클라이언트 (Content-Length 프레이밍, 타임아웃, EventEmitter 기반 알림)
- **`lib/lsp/servers.mjs`**: 5개 언어 서버 레지스트리 (TypeScript, Python, Go, Rust, C/C++) 및 파일/언어 기반 서버 조회
- **`lib/lsp/bridge.mjs`**: 고수준 LSP 브릿지 — initialize 핸드셰이크, 문서 수명주기, 10개 LSP 오퍼레이션
- **`scripts/sdd-lsp.mjs`**: CLI 브릿지 — 프로젝트 루트 자동 감지, 1-based/0-based 좌표 변환, JSON 출력, 60초 타임아웃
- **`templates/project-init/lsp-config.yaml.tmpl`**: sdd-config.yaml용 LSP 설정 템플릿

### 변경

- **`scripts/sdd-detect-tools.sh`**: 각 언어 감지에 LSP 서버 존재 확인 추가, JSON 출력에 `lsp_server`, `lsp_available` 필드 추가
- **`lib/checker.mjs`**: 5개 LSP 서버 설치 상태 검사 추가 (tools 카테고리, 선택 사항)
- **`lib/doctor.mjs`**: 신규 LSP 파일 6개 무결성 검사 + `sdd-lsp.mjs` 실행 권한 검사 추가
- **`lib/installer.mjs`**: 코드 분석 도구 섹션에 LSP 서버별 설치 옵션 추가 (npm/pip/go/rustup/brew)
- **`skills/sdd-lint/SKILL.md`**: diagnostics, symbols 서브커맨드에 "LSP 향상" 섹션 추가, 의존성에 Language Server 추가
- **`agents/sdd-code-analyzer.md`**: "5. LSP 기반 의미 분석" 모드 추가, 규칙에 "LSP 우선, 네이티브 대체" 추가
- **`templates/claude-md/sdd-member.md.tmpl`**: 완료 전 코드 품질 검사에 LSP 진단 항목 추가
- **`plugin.json`**: sdd-lsp 스킬 등록, `lsp`, `language-server` 키워드 추가
- **`marketplace.json`**: sdd-lsp 스킬, `lsp_servers` 선택적 의존성, LSP 태그 추가
- **버전**: `0.2.0` → `0.3.0` (package.json, plugin.json, marketplace.json, cli.mjs)

## [0.2.0] - 2026-02-19

### 추가

- **`/claude-sdd:sdd-lint` 스킬**: 4개 서브커맨드를 통한 코드 분석 (diagnostics, search, symbols, format)
- **`sdd-code-analyzer` 에이전트**: 네이티브 진단 도구 및 ast-grep을 활용한 자동 코드 분석
- **`scripts/sdd-detect-tools.sh`**: 프로젝트 언어 및 사용 가능한 린트/포맷 도구 자동 감지
- **`templates/project-init/lint-config.yaml.tmpl`**: sdd-config.yaml용 린트/포맷 설정 템플릿
- **ast-grep 지원**: 구조 검색 및 심볼 추출 (7개 언어, 선택 사항)
- **품질 게이트 자동 진단**: `/claude-sdd:sdd-review` 2.5단계에 에러 0건 기준 적용

### 변경

- **`/claude-sdd:sdd-review`**: sdd-code-analyzer를 통한 자동 진단 2.5단계 추가
- **`/claude-sdd:sdd-build`**: 워크 패키지 완료 전 린트/포맷 검사 3.5단계 추가
- **`sdd-reviewer` 에이전트**: 검증 프로세스에 4단계(진단 검사) 추가
- **`sdd-implementer` 에이전트**: 완료 전 린트/포맷 가이드 추가
- **품질 게이트 템플릿**: 자동 진단 기준 게이트 2.5 추가
- **`lib/checker.mjs`**: 새 'tools' 카테고리에 ast-grep (sg) 검사 추가 (5개 카테고리)
- **`lib/doctor.mjs`**: 신규 파일 3개 + sdd-detect-tools.sh 스크립트 무결성 검사 추가
- **`plugin.json`**: sdd-lint 스킬 및 sdd-code-analyzer 에이전트 등록
- **`marketplace.json`**: 신규 컴포넌트 및 ast-grep 선택적 의존성 추가

## [0.1.0] - 2026-02-18

### Added

- **SDD 7단계 라이프사이클**: init, intake, spec, plan, build, review, integrate
- **9개 스킬**: `/claude-sdd:sdd-auto`, `/claude-sdd:sdd-init`, `/claude-sdd:sdd-intake`, `/claude-sdd:sdd-spec`, `/claude-sdd:sdd-plan`, `/claude-sdd:sdd-build`, `/claude-sdd:sdd-review`, `/claude-sdd:sdd-integrate`, `/claude-sdd:sdd-status`
- **4개 에이전트**: requirements-analyst, spec-writer, implementer, reviewer
- **Agent Teams 통합**: 리더-멤버 구조의 병렬 구현 및 품질 루프
- **스펙 준수 체크리스트**: 품질 게이트의 단일 진실 소스
- **다중 소스 요구사항 수집**: Confluence MCP, Jira MCP, Figma 비전, 로컬 파일, 대화형 인터뷰
- **신규/레거시 프로젝트 지원**: greenfield/brownfield 분리 워크플로우
- **10개 템플릿**: CLAUDE.md (리더/멤버), 스펙 문서, 체크리스트, 프로젝트 설정
- **SessionStart 훅**: SDD 프로젝트 자동 감지 및 진행 상태 표시
- **CLI**: `check`, `install`, `doctor` 명령어 (npx 지원)
- **문서**: 아키텍처, 설치 가이드, 사용 가이드, SDD 방법론
