# 아키텍처

## 개요

claude-sdd는 스펙 주도 개발 (SDD) 라이프사이클을 구현하는 Claude Code 플러그인입니다. Claude Code의 Agent Teams 기능을 활용한 병렬 구현과, 리더 주도의 품질 루프를 통해 스펙 준수를 보장합니다.

## 핵심 설계 원칙

1. **체크리스트 = 마크다운**: 모든 추적은 git으로 버전 관리되는 마크다운 파일에서 이루어지며, 사람과 Claude 모두 읽을 수 있습니다.
2. **MCP 미번들**: Confluence/Jira MCP 서버를 번들하지 않습니다. 플러그인은 사용자의 기존 MCP 설정을 활용하도록 안내합니다.
3. **9개의 독립 스킬**: 각 라이프사이클 단계가 별도의 스킬이므로, 어느 지점에서든 재진입이 가능합니다.
4. **에이전트 모델 = Sonnet**: 모든 에이전트는 실제 분석 및 구현 작업에 Sonnet을 사용합니다.
5. **Figma = 비전**: 별도의 MCP 없이 스크린샷/URL을 통해 디자인을 분석합니다.

## 플러그인 구성 요소

```
claude-sdd/
├── Skills (11)        # 사용자용 슬래시 명령어
│   ├── /sdd           # 오케스트레이터 (단계 자동 감지)
│   ├── /sdd-init      # 프로젝트 초기화
│   ├── /sdd-intake    # 요구사항 수집
│   ├── /sdd-spec      # 스펙 생성
│   ├── /sdd-plan      # 태스크 분해
│   ├── /sdd-build     # Agent Teams 구현
│   ├── /sdd-review    # 품질 게이트
│   ├── /sdd-integrate # PR 및 문서화
│   ├── /sdd-status    # 대시보드
│   ├── /sdd-lint      # 코드 분석 및 진단
│   └── /sdd-lsp       # LSP 기반 의미 분석
│
├── Agents (5)         # 전문 작업용 서브에이전트
│   ├── requirements-analyst  # 소스 파싱
│   ├── spec-writer           # 스펙 생성
│   ├── implementer           # 코드 구현
│   ├── reviewer              # 품질 검증
│   └── code-analyzer         # 코드 분석 (진단, ast-grep, LSP)
│
├── Templates (10)     # 문서 템플릿
│   ├── claude-md/     # 리더/멤버용 CLAUDE.md 템플릿
│   ├── specs/         # 스펙 문서 템플릿
│   ├── checklists/    # 품질 체크리스트 템플릿
│   └── project-init/  # 프로젝트 설정 템플릿
│
├── Hooks (1)          # 이벤트 훅
│   └── SessionStart   # SDD 프로젝트 감지
│
├── LSP (3 modules)    # Language Server Protocol 통합
│   ├── client.mjs     # JSON-RPC 2.0 클라이언트
│   ├── servers.mjs    # 언어 서버 레지스트리
│   └── bridge.mjs     # 고수준 LSP 브릿지
│
└── CLI (4 modules)    # npx CLI (설치용)
    ├── cli.mjs        # 진입점
    ├── checker.mjs    # 의존성 검사
    ├── installer.mjs  # 설치 마법사
    └── doctor.mjs     # 진단
```

## 데이터 흐름

```
사용자 요구사항
    |
    v
[/sdd-intake] --> 01-requirements.md
    |
    v
[/sdd-spec]   --> 02-architecture.md (또는 02-change-impact.md)
              --> 03-api-spec.md (또는 03-api-changes.md)
              --> 04-data-model.md (또는 04-data-migration.md)
              --> 05-component-breakdown.md (또는 05-component-changes.md)
              --> 06-spec-checklist.md
    |
    v
[/sdd-plan]   --> 07-task-plan.md + wp-*-member.md
    |
    v
[/sdd-build]  --> 소스 코드 + 테스트
              --> 업데이트된 06-spec-checklist.md
    |
    v
[/sdd-review] --> 08-review-report.md
    |           (항목 실패 시 빌드 단계로 루프백)
    v
[/sdd-integrate] --> Git 브랜치, PR, CHANGELOG
```

## Agent Teams 아키텍처

`/sdd-build` 단계에서 플러그인은 Claude Code Agent Teams를 사용합니다:

```
리더 세션 (Opus)
  |
  |-- 팀 멤버 1 실행 (Sonnet) --> WP-1: User 모듈
  |-- 팀 멤버 2 실행 (Sonnet) --> WP-2: Auth 모듈
  |-- 팀 멤버 3 실행 (Sonnet) --> WP-3: Payment 모듈
  |
  |-- [전원 완료]
  |
  |-- 체크리스트 검증
  |   |-- [ ] 항목 --> 재작업 지시 (최대 3회 사이클)
  |   |-- 전부 [x] --> 다음 단계 또는 완료
  |
  |-- 순차 단계 실행
  |-- ...
```

## 코드 분석 레이어

코드 분석 레이어는 SDD 라이프사이클 전반에 걸쳐 자동화된 품질 검사를 제공합니다:

```
/sdd-lint                         sdd-code-analyzer 에이전트
    |                                     |
    |-- diagnostics [path]  <--- 네이티브 도구 (tsc, ruff, cargo check, go vet)
    |-- search <pattern>    <--- ast-grep 구조 검색
    |-- symbols [path]      <--- ast-grep 심볼 추출
    |-- format [path]       <--- 포매터 (prettier, ruff format, gofmt)
    |
    v
/sdd-lsp                         LSP 기반 의미 분석 (보완)
    |                                     |
    |-- diagnostics <file>  <--- Language Server 의미 진단
    |-- definition          <--- 정의 이동
    |-- references          <--- 참조 찾기
    |-- hover               <--- 타입/문서 정보
    |-- symbols             <--- 문서/워크스페이스 심볼
    |-- implementations     <--- 구현 찾기
    |-- incoming/outgoing   <--- 호출 계층
    |
    v
scripts/sdd-detect-tools.sh      언어 및 사용 가능한 도구/LSP 서버 자동 감지
    |
    v
sdd-config.yaml (lint/lsp 섹션)  프로젝트별 도구 설정
```

대체 전략: LSP 서버 미설치 → `/sdd-lint` 네이티브 도구 → ast-grep → Grep/Glob

통합 지점:
- `/sdd-spec` (레거시): 코드베이스 이해를 위한 심볼 추출 (LSP 또는 ast-grep)
- `/sdd-build`: 워크 패키지 완료 전 LSP 진단 + 린트/포맷 실행
- `/sdd-review`: 품질 게이트 (2.5단계)에 LSP + 네이티브 진단 포함

## 품질 루프

품질 루프는 핵심 품질 관리 메커니즘입니다:

1. 리더가 명시적인 스펙 참조와 함께 워크 패키지를 할당
2. 멤버가 구현, 테스트하고 체크리스트 항목을 표시
3. 리더가 각 `[x]` 표시를 실제 코드와 대조하여 검증
4. 미완료 항목에 구체적이고 실행 가능한 피드백 제공
5. 3회 재작업 사이클 후 사용자에게 에스컬레이션
6. 할당된 항목이 100% `[x]`일 때만 다음 단계로 진행

## 신규 프로젝트 vs 레거시 프로젝트 워크플로우

| 관점 | 신규 프로젝트 (Greenfield) | 레거시 프로젝트 (Brownfield) |
|------|---------------------------|------------------------------|
| 2단계 문서 | 02-architecture.md | 02-change-impact.md |
| 3단계 문서 | 03-api-spec.md | 03-api-changes.md |
| 4단계 문서 | 04-data-model.md | 04-data-migration.md |
| 5단계 문서 | 05-component-breakdown.md | 05-component-changes.md |
| 리스크 수준 | 낮음 | 높음 (하위 호환성 필요) |
| 체크리스트 | 동일 형식 | 동일 형식 |
