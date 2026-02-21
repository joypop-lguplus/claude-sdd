# 아키텍처

## 개요

claude-sdd는 스펙 주도 개발 (SDD) 라이프사이클을 구현하는 Claude Code 플러그인입니다. Claude Code의 Agent Teams 기능을 활용한 병렬 구현과, 리더 주도의 품질 루프를 통해 스펙 준수를 보장합니다.

## 핵심 설계 원칙

1. **체크리스트 = 마크다운**: 모든 추적은 git으로 버전 관리되는 마크다운 파일에서 이루어지며, 사람과 Claude 모두 읽을 수 있습니다.
2. **MCP 미번들**: Confluence/Jira MCP 서버를 번들하지 않습니다. 플러그인은 사용자의 기존 MCP 설정을 활용하도록 안내합니다.
3. **14개의 독립 스킬**: 각 라이프사이클 단계가 별도의 스킬이므로, 어느 지점에서든 재진입이 가능합니다.
4. **에이전트 모델 = Sonnet**: 모든 에이전트는 실제 분석 및 구현 작업에 Sonnet을 사용합니다.
5. **Figma = 비전**: 별도의 MCP 없이 스크린샷/URL을 통해 디자인을 분석합니다.

## 플러그인 구성 요소

```
claude-sdd/
├── Skills (14)        # 사용자용 슬래시 명령어
│   ├── /claude-sdd:sdd-next      # 오케스트레이터 (단계 자동 감지)
│   ├── /claude-sdd:sdd-godmode  # 심층 인터뷰 + 풀 오토 실행
│   ├── /claude-sdd:sdd-init      # 프로젝트 초기화
│   ├── /claude-sdd:sdd-intake    # 요구사항 수집
│   ├── /claude-sdd:sdd-spec      # 스펙 생성
│   ├── /claude-sdd:sdd-plan      # 태스크 분해
│   ├── /claude-sdd:sdd-assign    # 팀 멤버 배정
│   ├── /claude-sdd:sdd-build     # Agent Teams 구현 (TDD 모드 지원)
│   ├── /claude-sdd:sdd-review    # 품질 게이트
│   ├── /claude-sdd:sdd-integrate # PR 및 문서화
│   ├── /claude-sdd:sdd-change    # 변경 관리 (영향 분석 + 델타 빌드)
│   ├── /claude-sdd:sdd-publish   # Confluence 퍼블리싱 + 다이어그램
│   ├── /claude-sdd:sdd-status    # 대시보드
│   └── /claude-sdd:sdd-lint      # 코드 분석 및 진단
│
├── Agents (7)         # 전문 작업용 서브에이전트
│   ├── requirements-analyst  # 소스 파싱
│   ├── spec-writer           # 스펙 생성
│   ├── implementer           # 코드 구현 (TDD 모드 지원)
│   ├── reviewer              # 품질 검증 (TDD 준수 확인)
│   ├── code-analyzer         # 코드 분석 (진단, ast-grep)
│   ├── test-writer           # TDD 테스트 작성 (스펙→실패 테스트)
│   └── change-analyst        # 변경 영향 분석 (최소 영향 원칙)
│
├── Templates (24)     # 문서 템플릿
│   ├── claude-md/     # 리더/멤버용 CLAUDE.md 템플릿 (2)
│   ├── specs/         # 스펙 문서 템플릿 (13)
│   ├── checklists/    # 품질 체크리스트 템플릿 (4)
│   ├── cross-domain/  # 도메인 의존성/통합 템플릿 (3)
│   └── project-init/  # 프로젝트 설정 템플릿 (2)
│
├── Hooks (2)          # 이벤트 훅 (SessionStart)
│   ├── sdd-session-init.sh   # SDD 프로젝트 감지 + 진행 상황 표시
│   └── sdd-lsp-patch.sh      # gopls PATH 패치 + kotlin-lsp JVM 프리웜
│
└── CLI (5 modules)    # npx CLI (설치용)
    ├── cli.mjs        # 진입점
    ├── checker.mjs    # 의존성 검사 (MCP, 다이어그램 포함)
    ├── installer.mjs  # 설치 마법사 (MCP, 다이어그램 설정)
    ├── uninstaller.mjs # 일괄 제거
    └── doctor.mjs     # 진단
```

## 데이터 흐름

```
사용자 요구사항
    |
    v
[/claude-sdd:sdd-intake] --> 01-requirements.md
    |
    v
[/claude-sdd:sdd-spec]   --> 02-architecture.md (또는 02-change-impact.md)
                     --> 03-api-spec.md (또는 03-api-changes.md)
                     --> 04-data-model.md (또는 04-data-migration.md)
                     --> 05-component-breakdown.md (또는 05-component-changes.md)
                     --> 06-spec-checklist.md
                     --> diagrams/*.png (자동 생성)
    |
    v
[/claude-sdd:sdd-plan]   --> 07-task-plan.md
    |
    v
[/claude-sdd:sdd-assign] --> wp-*-member.md
    |
    v
[/claude-sdd:sdd-build]  --> 소스 코드 + 테스트
                     --> 업데이트된 06-spec-checklist.md
                     --> 10-analysis-report.md (레거시 모드)
    |
    v
[/claude-sdd:sdd-review] --> 08-review-report.md
    |                  (항목 실패 시 빌드 단계로 루프백)
    v
[/claude-sdd:sdd-integrate] --> Git 브랜치, PR, CHANGELOG
    |                  (변경 요청 발생 시)
    v
[/claude-sdd:sdd-change]   --> 09-change-request.md
                       --> 03-api-changes.md, 04-data-migration.md, 05-component-changes.md (델타)
                       --> 06-spec-checklist.md 부분 갱신
                       --> TDD 델타 빌드 → 리뷰 → PR
```

## Agent Teams 아키텍처

`/claude-sdd:sdd-build` 단계에서 플러그인은 Claude Code Agent Teams를 사용합니다:

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
/claude-sdd:sdd-lint                  sdd-code-analyzer 에이전트
    |                                     |
    |-- diagnostics [path]  <--- 네이티브 도구 (tsc, ruff, cargo check, go vet, gradle, mvn, clang-tidy)
    |-- search <pattern>    <--- ast-grep 구조 검색
    |-- symbols [path]      <--- ast-grep 심볼 추출
    |-- format [path]       <--- 포매터 (prettier, ruff format, gofmt)
    |
    v
scripts/sdd-detect-tools.sh      언어 및 사용 가능한 도구 자동 감지
    |
    v
sdd-config.yaml (lint 섹션)      프로젝트별 도구 설정
```

`boostvolt/claude-code-lsps` 플러그인 설치 시 Claude Code 내장 LSP가 활성화됩니다. 두 가지 활용 방식이 있습니다:

**자동 진단**: 파일 편집 후 에러/경고가 자동으로 표시됩니다. 에이전트의 별도 호출이 불필요합니다.

**명시적 LSP 도구**: 다음 오퍼레이션은 에이전트가 직접 호출해야 합니다 (LSP 불가 시 Grep/Glob 대체):

| 오퍼레이션 | 활용 장면 | 주요 사용 에이전트 |
|-----------|----------|------------------|
| `LSP findReferences` | 함수/클래스의 모든 호출자 파악 | sdd-change-analyst, sdd-implementer |
| `LSP incomingCalls` | 호출 계층 추적 (영향 분석) | sdd-change-analyst |
| `LSP documentSymbol` | 파일 내 공개 API/심볼 목록 추출 | sdd-reviewer, sdd-implementer |
| `LSP goToDefinition` | 심볼의 원본 정의 위치 확인 | sdd-implementer, sdd-change-analyst |
| `LSP hover` | 타입 정보 확인 | sdd-implementer, sdd-test-writer |

통합 지점:
- `/claude-sdd:sdd-build`: 워크 패키지 완료 전 린트/포맷 실행
- `/claude-sdd:sdd-review`: 품질 게이트 (2.5단계)에 네이티브 진단 포함

## TDD 모드

`--tdd` 플래그 또는 `sdd-config.yaml`의 `teams.tdd: true`로 활성화됩니다:

```
Phase A (Red):   sdd-test-writer가 스펙 기반 실패 테스트 작성
    |
Phase B (Green): sdd-implementer가 테스트 통과 코드 작성
    |            (테스트 파일 수정 금지)
    |
Phase C (Verify): 전체 테스트 실행
    |-- 실패 → Phase B 재작업 (최대 3회)
    |-- 통과 → 체크리스트 검증 → 다음 WP
```

TDD 모드에서 `sdd-test-writer`와 `sdd-implementer`는 완전히 분리됩니다. 테스트 작성자는 구현 코드를 생성하지 않고, 구현자는 테스트 파일을 수정하지 않습니다.

## 변경 관리 아키텍처

`/claude-sdd:sdd-change`는 통합 완료 후 변경 요청을 처리합니다:

```
Phase 1: 변경 요청 수집 → 09-change-request.md
Phase 2: sdd-change-analyst → 영향 분석 → 스펙 델타 (03/04/05-*-changes.md)
Phase 3: 체크리스트 부분 갱신 (최소 영향 원칙)
    |-- 영향받는 [x] → [ ] (재설정)
    |-- 영향받지 않는 [x] → 변경 안함
    |-- 신규 CHG- / CHG-REG- 항목 추가
Phase 4: 델타 태스크 계획 (CWP-1, CWP-2...)
Phase 5: TDD 델타 빌드 (변경 + 회귀 테스트)
Phase 6: 리뷰 + 회귀 검증
Phase 7: PR 생성 (변경 추적성 포함)
```

**레거시 갭 해소 옵션**:
- `--from-analysis`: 분석 보고서(`10-analysis-report.md`)의 갭 항목에서 CR 자동 생성
- `--lightweight --from-analysis`: 소규모 갭(5개 이하) 빠른 처리 — Phase 1-4 자동 설정, Phase 5(빌드)+6(검증)+7(PR)만 실행

## 다이어그램 파이프라인

PNG 다이어그램은 두 단계로 나뉘어 생성/활용됩니다:

```
[1] sdd-spec 단계 (스펙 생성 직후)
    |
    |-- 02-architecture.md, 04-data-model.md, 05-component-breakdown.md 파싱
    |   |
    |   v
    |   scripts/sdd-generate-diagram.py
    |       extract_modules()   ← "모듈 책임"/"컴포넌트" 섹션의 ### 헤더만 추출
    |       extract_relations() ← **의존성**: targets 패턴 + "관계" 테이블 + 화살표 fallback
    |       extract_entities()  ← "엔티티" 섹션 범위 한정 + 필드/관계 테이블
    |       → PNG 파일 생성
    |
    |-- 영구 저장:
    |   docs/specs/diagrams/                    ← 단일 도메인 / 프로젝트 수준
    |   docs/specs/domains/<id>/diagrams/       ← 도메인별
    |   docs/specs/cross-domain/diagrams/       ← 크로스 도메인
    |
    |-- 마크다운에 이미지 참조: ![alt](diagrams/xxx.png)

[2] sdd-publish 단계 (Confluence 퍼블리싱)
    |
    |-- docs/specs/diagrams/ PNG 존재 + 소스 md보다 최신? → 재사용
    |-- PNG 없거나 오래됨? → sdd-generate-diagram.py로 재생성
    |
    |-- ![](diagrams/xxx.png) → <ac:image><ri:attachment ri:filename="xxx.png"/></ac:image>
    |-- scripts/sdd-confluence-upload.py → 첨부 업로드
```

### PNG 파일명 규칙

| 스펙 파일 | PNG 파일명 | 위치 |
|----------|-----------|------|
| `02-architecture.md` (단일) | `02-module-dependency.png` | `docs/specs/diagrams/` |
| `04-data-model.md` | `04-er-diagram.png` | `docs/specs/diagrams/` |
| `05-component-breakdown.md` | `05-component-interaction.png` | `docs/specs/diagrams/` |
| `02-architecture.md` (멀티) | `02-domain-boundary.png` | `docs/specs/diagrams/` |
| 도메인 `02-architecture.md` | `02-domain-dependency.png` | `domains/<id>/diagrams/` |
| `cross-domain/dependency-map.md` | `cross-domain-dependency.png` | `cross-domain/diagrams/` |

## Confluence 퍼블리싱 아키텍처

`/claude-sdd:sdd-publish`는 SDD 산출물을 Confluence에 자동 퍼블리싱합니다:

```
sdd-config.yaml (publishing 설정)
    |
    v
/claude-sdd:sdd-publish
    |
    |-- docs/specs/*.md 스캔
    |-- 타임스탬프 비교 (파일 mtime vs config timestamps)
    |
    |-- 변경된 파일만:
    |   |-- 마크다운 → Confluence storage format 변환
    |   |-- ![](diagrams/xxx.png) → <ac:image> 변환
    |   |
    |   |-- docs/specs/diagrams/ PNG 재사용 (최신이면) 또는 재생성
    |   |
    |   |-- MCP confluence_create_page / confluence_update_page
    |   |-- scripts/sdd-confluence-upload.py
    |   |       (atlassian-python-api → 첨부 업로드)
    |   |
    |   v
    |-- sdd-config.yaml 업데이트 (timestamps, page_ids)
    |
    v
결과 대시보드
```

**조건부 퍼블리싱**: `sdd-intake`, `sdd-spec`, `sdd-plan`, `sdd-review` 스킬은 단계 완료 시 `publishing.confluence.enabled: true`이면 해당 산출물을 즉시 퍼블리싱합니다.

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
| 빌드 루프 | 일반 품질 루프 | 분석 전용 루프 (아래 참조) |
| 체크리스트 | 동일 형식 | 동일 형식 |

### 레거시 빌드 루프 (분석 전용)

레거시 프로젝트(`project.type: legacy`)의 빌드 단계는 **코드 변경 없이 분석만** 수행합니다:

```
Phase 1 (Analyze):  기존 코드 ↔ 스펙 대조, 이미 충족하는 항목은 [x] 표시
Phase 2 (Identify): 미충족 항목을 갭으로 식별 (코드 수정 없음)
Phase 3 (Report):   10-analysis-report.md 생성 (충족/미충족 항목 + 갭 목록)
```

코드 변경은 빌드 단계에서 수행하지 않으며, 식별된 갭은 `/claude-sdd:sdd-change` 워크플로우를 통해 해소합니다. `--from-analysis` 플래그로 분석 보고서의 갭을 CR로 변환하여 처리합니다.
