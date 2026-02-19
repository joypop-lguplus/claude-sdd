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
