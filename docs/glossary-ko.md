# 한/영 용어 사전 (Korean-English Glossary)

> 이 문서는 claude-sdd 프로젝트의 한글화 시 용어 일관성을 유지하기 위한 참조 사전입니다.
> `docs/plan-lint-integration.md` 및 `CHANGELOG.md` v0.1.0에서 이미 사용된 표현을 기준으로 합니다.

---

## 핵심 개념

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Spec-Driven Development (SDD) | 스펙 주도 개발 (SDD) | 약어 SDD 병기 |
| Lifecycle | 라이프사이클 | |
| Phase | 단계 | |
| Skill | 스킬 | |
| Agent | 에이전트 | |
| Agent Teams | Agent Teams | Claude 기능명이므로 영어 유지 |
| Plugin | 플러그인 | |
| Slash command | 슬래시 커맨드 | |

## SDD 라이프사이클 단계

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Init / Initialization | 초기화 | |
| Intake | 인테이크 (요구사항 수집) | |
| Spec / Specification | 스펙 (기술 사양) | 짧은 형태: 스펙 |
| Plan / Planning | 계획 | |
| Build / Implementation | 빌드 (구현) | |
| Review | 리뷰 | |
| Integration | 통합 | |
| Status | 상태 | |

## 품질 관리

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Quality Gate | 품질 게이트 | plan-lint에서 사용 |
| Quality Loop | 품질 루프 | CHANGELOG v0.1.0에서 사용 |
| Checklist | 체크리스트 | CHANGELOG v0.1.0에서 사용 |
| Spec Compliance Checklist | 스펙 준수 체크리스트 | CHANGELOG v0.1.0에서 사용 |
| Rework Cycle | 재작업 사이클 | |
| Escalation / Escalate | 에스컬레이션 | |
| Single Source of Truth | 단일 진실 소스 | CHANGELOG v0.1.0에서 사용 |
| Verification | 검증 | |
| Compliance | 준수 | |

## 역할 및 구조

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Team Leader | 팀 리더 | |
| Team Member | 팀 멤버 | |
| Requirements Analyst | 요구사항 분석가 | |
| Spec Writer | 스펙 작성자 | |
| Implementer | 구현자 | |
| Reviewer | 리뷰어 | |
| Code Analyzer | 코드 분석기 | |
| Work Package | 워크 패키지 | |
| Task Decomposition | 태스크 분해 | |

## 요구사항 및 스펙

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Requirements | 요구사항 | |
| Functional Requirements | 기능 요구사항 | |
| Non-Functional Requirements | 비기능 요구사항 | |
| Architecture | 아키텍처 | |
| Data Model | 데이터 모델 | |
| API Specification | API 사양 | |
| Component Breakdown | 컴포넌트 분해 | |
| Change Impact Analysis | 변경 영향 분석 | |
| Data Migration | 데이터 마이그레이션 | |
| Greenfield (New project) | 신규 프로젝트 | CHANGELOG v0.1.0에서 사용 |
| Brownfield (Legacy project) | 레거시 프로젝트 | CHANGELOG v0.1.0에서 사용 |

## 코드 분석

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Diagnostics | 진단 | plan-lint에서 사용 |
| Linter | 린터 | plan-lint에서 사용 |
| Formatter | 포매터 | plan-lint에서 사용 |
| Symbol Extraction | 심볼 추출 | plan-lint에서 사용 |
| Structural Search | 구조 검색 / 구조적 코드 검색 | plan-lint에서 사용 |
| Auto-detection | 자동 감지 | plan-lint에서 사용 |

## CLI 및 인프라

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Dependency | 의존성 | |
| Setup Wizard | 설치 마법사 | |
| File Integrity | 파일 무결성 | |
| Hook | 훅 | CHANGELOG v0.1.0에서 사용 |
| Session Start | 세션 시작 | |
| Template | 템플릿 | |
| Configuration | 설정 | |
| Dashboard | 대시보드 | |

## TDD 및 변경 관리

| 영어 | 한국어 | 비고 |
|------|--------|------|
| TDD (Test-Driven Development) | TDD (테스트 주도 개발) | 약어 TDD 병기 |
| Red Phase | Red 단계 | 실패 테스트 작성 |
| Green Phase | Green 단계 | 테스트 통과 코드 작성 |
| Verify Phase | Verify 단계 | 전체 테스트 실행 |
| Test Writer | 테스트 작성자 | |
| Change Management | 변경 관리 | |
| Change Request (CR) | 변경 요청 (CR) | 약어 CR 병기 |
| Change Analyst | 변경 분석가 | |
| Impact Analysis | 영향 분석 | |
| Direct Impact | 직접 영향 | |
| Indirect Impact | 간접 영향 | |
| Regression Risk | 회귀 위험 | |
| Regression Test | 회귀 테스트 | |
| Spec Delta | 스펙 델타 | 변경된 스펙 부분 |
| Partial Checklist Update | 체크리스트 부분 갱신 | |
| Minimal Impact Principle | 최소 영향 원칙 | |
| Change Work Package (CWP) | 변경 워크 패키지 (CWP) | |
| Delta Build | 델타 빌드 | 변경분만 빌드 |
| CHG- (Change Item) | CHG- (변경 항목) | 체크리스트 접두사 |
| CHG-REG- (Regression Item) | CHG-REG- (회귀 항목) | 체크리스트 접두사 |

## 레거시 모드 및 분석

| 영어 | 한국어 | 비고 |
|------|--------|------|
| `analysis_cr_mode` | `analysis_cr_mode` | `sdd-config.yaml` 설정. 분석 보고서 갭의 CR 처리 방식: `suggest` (추천), `auto` (자동 생성), `manual` (수동) |
| Analysis Report | 분석 보고서 | `10-analysis-report.md`. 레거시 모드에서 빌드 단계가 생성하는 보고서. 기존 코드와 스펙을 대조하여 충족/미충족(갭) 항목을 식별 |
| Analysis-Only Build | 분석 전용 빌드 | 레거시 프로젝트의 빌드 모드. 코드를 수정하지 않고 기존 코드를 스펙 대비 분석만 수행 |
| Analysis-based CR | 분석 기반 CR | `--from-analysis` 플래그로 분석 보고서의 갭에서 자동 생성되는 변경 요청 |
| Gap | 갭 | 분석 보고서에서 식별된 스펙 미충족 항목. 유형: missing (기능 부재), partial (부분 구현), divergent (스펙과 다른 구현) |
| Lightweight Mode | 경량 모드 | `--lightweight --from-analysis` 플래그 조합. 5개 이하 소규모 갭을 빠르게 처리. Phase 1-4 자동 설정, Phase 5-7만 실행 |

## 퍼블리싱 및 다이어그램

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Publishing | 퍼블리싱 | SDD 산출물을 Confluence에 자동 게시 |
| Confluence Storage Format | Confluence 저장 형식 | 마크다운을 변환하는 대상 형식 |
| Incremental Sync | 증분 동기화 | 타임스탬프 비교로 변경된 파일만 퍼블리싱 |
| Conditional Publishing | 조건부 퍼블리싱 | `publishing.confluence.enabled: true`일 때 단계 완료 후 자동 퍼블리싱 |
| Diagram | 다이어그램 | 스펙에서 자동 생성되는 시각 자료 (PNG) |
| Architecture Diagram | 아키텍처 다이어그램 | Mermaid flowchart (`graph TB`)로 생성 |
| Dependency Diagram | 의존성 다이어그램 | Mermaid flowchart로 생성 |
| ER Diagram | ER 다이어그램 | 엔티티 관계도, Mermaid `erDiagram`으로 생성 |
| Interaction Diagram | 상호작용 다이어그램 | 컴포넌트 간 흐름, Graphviz DOT으로 생성 |
| Attachment Upload | 첨부 업로드 | `atlassian-python-api`로 PNG를 Confluence에 첨부 |
| Root Page | 루트 페이지 | Confluence 퍼블리싱의 상위 페이지 |
| Page Hierarchy | 페이지 계층 | 루트 페이지 아래 산출물별 하위 페이지 구조 |

## 브랜치 관리

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Feature Branch | 피처 브랜치 | `feature/**` 패턴의 작업 브랜치 |
| Branch Management | 브랜치 관리 | sdd-init/godmode/change 실행 시 자동 브랜치 확인/생성 |

## 프로젝트 규칙

| 영어 | 한국어 | 비고 |
|------|--------|------|
| 프로젝트 규칙 (Project Rules) | 프로젝트 규칙 | 프로젝트의 코딩 규칙을 체계적으로 정의한 문서 세트. `00-project-rules.md`(인덱스)와 `rules/` 디렉토리(상세)로 구성. |
| 규칙 4필드 구조 | 규칙 4필드 구조 | 각 규칙의 원칙/위반 기준/검증 방법/예외를 정의하는 표준 형식. |
| 프리셋 (Preset) | 프리셋 | 언어/프레임워크별 규칙 기본값 세트 (java-spring, typescript-node, python-fastapi, kotlin-spring, go). |
| 규칙 적용 모드 (Enforcement) | 규칙 적용 모드 | strict(위반=FAIL) 또는 advisory(위반=경고) 중 선택. `sdd-config.yaml`의 `rules.enforcement`로 설정. |
| 6패스 교차 분석 | 6패스 교차 분석 | sdd-review 단계에서 프로젝트 규칙을 검증하는 6단계 분석 프로세스: 중복/모호성/미명세/정합성/커버리지/불일치. |

## 인스톨러

| 영어 | 한국어 | 비고 |
|------|--------|------|
| MCP Server | MCP 서버 | Model Context Protocol 서버 |
| SSL Bypass | SSL 우회 | 사설망 환경에서 인증서 검증 비활성화 |
| Uninstaller | 언인스톨러 | 플러그인 및 관련 도구 일괄 제거 |

## 기타

| 영어 | 한국어 | 비고 |
|------|--------|------|
| Pull Request (PR) | PR (Pull Request) | 약어 유지 |
| Commit | 커밋 | |
| Review Report | 리뷰 리포트 | |
| Progress | 진행 상태 | |
| Summary | 요약 | |
| Error | 에러 | |
| Warning | 경고 | |
| Pass / Fail | 통과 / 실패 | |
| Scope | 범위 | |
| Constraint | 제약 사항 | |

---

## 번역 시 주의사항

1. **명령어 이름**: `/claude-sdd:sdd-build`, `/claude-sdd:sdd-review` 등은 항상 영어로 유지
2. **파일 경로**: `docs/specs/06-spec-checklist.md` 등은 영어로 유지
3. **체크리스트 접두사**: `ARCH`, `API`, `DM`, `COMP`, `TEST`, `SEC`, `PERF`, `UI`는 영어 유지
4. **템플릿 변수**: `{{PROJECT_NAME}}`, `{{TIMESTAMP}}` 등은 그대로 유지
5. **모델 이름**: `sonnet`, `opus` 등은 영어 유지
6. **코드 블록 내부**: 주석과 출력 문자열만 번역, 코드 구문은 영어 유지
7. **YAML 키**: 키는 영어, 값과 주석만 번역
