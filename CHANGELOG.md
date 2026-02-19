# 변경 이력

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
