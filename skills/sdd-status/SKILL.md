---
name: sdd-status
description: Use when the user wants to check SDD lifecycle progress, phase status, or checklist completion.
---

# /claude-sdd:sdd-status — SDD 상태 대시보드

이 프로젝트의 SDD 라이프사이클 현재 상태를 표시합니다.

## 사용법

```
/claude-sdd:sdd-status
```

## 동작

### 1단계: SDD 초기화 확인

`docs/specs/sdd-config.yaml`을 읽습니다. 존재하지 않으면:
```
이 프로젝트는 SDD로 초기화되지 않았습니다.
시작하려면 /claude-sdd:sdd-init을 실행하세요.
```

### 2단계: 현재 단계 감지

존재하는 스펙 파일을 확인하여 현재 단계를 결정합니다:

| 존재하는 파일 | 단계 | 상태 |
|--------------|-------|--------|
| 스펙 파일 없음 | 1. Intake | 시작되지 않음 |
| `01-requirements.md` | 2. Spec | 요구사항 수집 완료 |
| `02-*.md`부터 `05-*.md` | 3. Plan | 스펙 생성 완료 |
| `06-spec-checklist.md` | 3. Plan | 체크리스트 준비 완료 |
| `07-task-plan.md` | 4. Build | 태스크 분해 완료 |
| `08-review-report.md` | 5. Review | 리뷰 완료 |

### 3단계: 체크리스트 진행률 표시

`06-spec-checklist.md`가 존재하면 파싱하여 표시합니다:
- 전체 항목 수
- 완료된 항목 (`[x]`)
- 미완료 항목 (`[ ]`)
- 완료 비율
- 카테고리별 분석 (ARCH, API, DM, COMP, TEST, SEC, PERF, UI)

### 4단계: 대시보드 표시

```
╔══════════════════════════════════════════════════╗
║  SDD 상태 대시보드                                ║
╚══════════════════════════════════════════════════╝

프로젝트: [name] (유형: new/legacy)

단계별 진행 상황:
  [x] 1. Intake      — 요구사항 수집 완료
  [x] 2. Spec        — 5개 스펙 문서 생성 완료
  [x] 3. Plan        — 4개 워크 패키지에 12개 태스크
  [ ] 4. Build       — 8/12 체크리스트 항목 완료 (67%)
  [ ] 5. Review      — 시작되지 않음
  [ ] 6. Integrate   — 시작되지 않음
  [ ] 7. Document    — 시작되지 않음

체크리스트: 8/12 완료 (67%)
  ARCH:  2/2  ██████████ 100%
  API:   3/4  ███████░░░  75%
  DM:    2/2  ██████████ 100%
  TEST:  1/4  ██░░░░░░░░  25%

다음 작업: /claude-sdd:sdd-build (구현 계속)
```

## 의존성

- `docs/specs/sdd-config.yaml` (선택 사항 — 없으면 "초기화되지 않음" 메시지 표시)
