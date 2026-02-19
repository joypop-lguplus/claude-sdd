---
name: sdd-build
description: Use when the user wants to implement work packages using Agent Teams with quality loops.
---

# /claude-sdd:sdd-build — Agent Teams를 통한 구현

리더 주도의 품질 루프를 갖춘 Claude Code Agent Teams를 사용하여 워크 패키지를 실행합니다.

## 사용법

```
/claude-sdd:sdd-build                 # 빌드 단계 시작/재개
/claude-sdd:sdd-build wp-1            # 특정 워크 패키지만 빌드
/claude-sdd:sdd-build wp-1 rework     # 특정 패키지에 피드백 기반 재작업
```

## 사전 조건

- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 활성화되어야 함
- `docs/specs/07-task-plan.md`가 존재해야 함 (`/claude-sdd:sdd-plan`에서 생성)
- `docs/specs/06-spec-checklist.md`가 존재해야 함

## 핵심 메커니즘: 품질 루프

```
팀 리더 (현재 세션, opus):
  1. 태스크 계획 읽기 (07-task-plan.md)
  2. 현재 단계의 각 워크 패키지에 대해:
     a. sdd-implementer 에이전트로 팀 멤버 생성
     b. 전달: 워크 패키지 태스크 + 스펙 참조 + 멤버 CLAUDE.md
     c. 완료 대기
  3. 체크리스트 검증:
     - 06-spec-checklist.md 읽기
     - 배정된 각 항목에 대해:
       - [x]로 표시되었는가?
       - 코드가 실제로 존재하는가?
     - [ ] 항목이 남아있으면 → 재작업 사이클
     - 모두 [x]이면 → 다음 워크 패키지 또는 완료

재작업 사이클:
  팀 리더가 미완료 항목을 식별하고 구체적인 피드백을 전달합니다:
  "항목 API-003, DM-005가 미완료입니다.
   API-003: UserController에 422 에러 핸들러가 없습니다.
   DM-005: email 필드 유효성 검사가 구현되지 않았습니다.
   이 항목들을 수정하세요."

  워크 패키지당 최대 3회 재작업 사이클.
  3회 후 → 사용자에게 에스컬레이션.
```

## 동작

### 1단계: 태스크 계획 읽기

`docs/specs/07-task-plan.md`를 파싱하여 다음을 식별합니다:
- 워크 패키지와 해당 태스크
- 실행 단계 (병렬 vs 순차)
- 현재 진행 상황 (완료된 WP 확인)

### 2단계: 워크 패키지 실행

현재 실행 단계의 각 워크 패키지에 대해:

1. **팀 멤버 실행** (Agent Teams 사용):
   - 에이전트: `sdd-implementer`
   - 컨텍스트: 워크 패키지 태스크, 관련 스펙 파일, 체크리스트 항목
   - CLAUDE.md: `docs/specs/wp-N-member.md`의 내용

2. **진행 상황 모니터링**:
   - 체크리스트 항목 완료 추적
   - 멤버가 보고한 문제 또는 모호한 사항 기록

### 3단계: 품질 검증 루프

팀 멤버가 완료를 보고한 후:

1. `docs/specs/06-spec-checklist.md` 읽기
2. 배정된 모든 체크리스트 항목 확인
3. 여전히 `[ ]`인 항목에 대해:
   - 누락된 사항 식별
   - 구체적인 재작업 지시 생성
   - 팀 멤버에게 재배정

```
재작업 사이클 1/3:
  미완료 항목:
  - API-003: UserController에 422 에러 핸들러 누락
  - DM-005: User 모델에 email 유효성 검사 미구현

  팀 멤버 1에게 재작업 지시를 전달 중...
```

4. 3회 실패 후:
```
에스컬레이션: 워크 패키지 WP-1이 3회 재작업 사이클 후에도 미완료 항목이 있습니다.

여전히 미완료:
- API-003: 422 에러 핸들러
  - 스펙: 03-api-spec.md#create-user
  - 예상: 잘못된 입력 시 { error: "Validation failed", fields: [...] }를 반환

검토 후 결정해 주세요:
1. 수동으로 수정
2. 스펙 조정
3. 이 항목들 건너뛰기
```

### 3.5단계: 완료 전 린트 및 포맷

워크 패키지를 완료로 표시하기 전에 코드 품질을 확인합니다:

1. **프로젝트 포매터 실행** (설정된 경우): 수정된 파일 자동 포맷
   - `/claude-sdd:sdd-lint format --fix` 또는 프로젝트에 설정된 포매터 사용
2. **프로젝트 린터 실행** (설정된 경우): 린트 에러 확인
   - `/claude-sdd:sdd-lint diagnostics` 또는 프로젝트에 설정된 진단 도구 사용
3. 체크리스트 항목을 `[x]`로 표시하기 전에 **모든 문제 수정**

```
완료 전 검사:
  1. 포맷팅: prettier --write src/ ✓
  2. 진단: tsc --noEmit ✓ (0 errors)
  3. 모든 체크리스트 항목 검증 완료 [x]
```

이 단계는 권장 사항이지만 필수는 아닙니다. `/claude-sdd:sdd-review` 품질 게이트에서 나머지 문제를 잡아냅니다.

### 4단계: 단계 전환

한 단계의 모든 워크 패키지가 완료되면:
- 다음 실행 단계로 이동
- 또는 모든 단계가 완료된 경우 완료 보고

```
빌드 단계 완료!

모든 워크 패키지: 4/4 완료
체크리스트 진행률: 28/28 항목 완료 (100%)

다음 단계: /claude-sdd:sdd-review — 품질 게이트 검증 실행
```

## 출력

- 수정된 소스 코드 파일 (스펙에 따라)
- `[x]` 표시가 업데이트된 `docs/specs/06-spec-checklist.md`
- 테스트 파일

## 의존성

- `docs/specs/07-task-plan.md` (`/claude-sdd:sdd-plan`에서 생성)
- `docs/specs/06-spec-checklist.md` (`/claude-sdd:sdd-spec`에서 생성)
- Agent Teams 활성화 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
