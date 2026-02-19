---
name: sdd-plan
description: Use when the user wants to decompose specs into work packages and assign to Agent Teams, or types /sdd-plan.
version: 0.3.0
---

# /sdd-plan — 태스크 분해 및 팀 배정

스펙을 병렬 처리 가능한 워크 패키지로 분해하고 Agent Teams 멤버에게 배정합니다.

## 사용법

```
/sdd-plan              # 스펙으로부터 태스크 계획 생성
/sdd-plan rebalance    # 현재 진행 상황에 따라 태스크 재분배
```

## 동작

### 사전 조건

1. `docs/specs/06-spec-checklist.md`를 읽어 전체 항목 목록을 확인합니다.
2. `docs/specs/02-*.md`부터 `05-*.md`까지 스펙 세부 사항을 읽습니다.
3. 스펙이 존재하지 않으면 안내합니다: `먼저 /sdd-spec을 실행하여 명세서를 생성하세요.`

### 태스크 분해

체크리스트와 스펙을 분석하여 워크 패키지를 생성합니다:

1. **모듈/기능별 그룹화**: 관련된 체크리스트 항목은 동일한 워크 패키지에 포함해야 합니다.
2. **의존성 식별**: 병렬 실행 가능한 패키지를 결정합니다.
3. **작업량 균형**: 각 패키지의 크기가 대략 비슷해야 합니다.
4. **병렬성 극대화**: 독립적인 패키지는 동시에 실행해야 합니다.

### 워크 패키지 형식

```markdown
## 워크 패키지 WP-1: [모듈 이름] (팀 멤버 1)

**스펙 섹션**: 03-api-spec.md#user-endpoints, 04-data-model.md#user
**체크리스트 항목**: API-001, API-002, DM-001, TEST-001

### 태스크
- [ ] TASK-001: User 엔티티 생성 (스펙: 04-data-model.md#user)
- [ ] TASK-002: User CRUD API (스펙: 03-api-spec.md#user-endpoints)
- [ ] TASK-003: User API 테스트 (스펙: 06-spec-checklist.md#TEST-001)

### 의존성
- 없음 (즉시 시작 가능)
```

### 병렬 실행 계획

```markdown
## 실행 계획

### 1단계 (병렬)
- WP-1: User 모듈 (팀 멤버 1)
- WP-2: Auth 모듈 (팀 멤버 2)

### 2단계 (순차, 1단계에 의존)
- WP-3: Integration 모듈 (팀 멤버 1)
```

### 팀 멤버 CLAUDE.md 생성

각 워크 패키지에 대해 `templates/claude-md/sdd-member.md.tmpl`에서 팀 멤버 CLAUDE.md를 준비합니다:
- `{{WORK_PACKAGE_ID}}`를 WP ID로 교체
- `{{SPEC_SECTIONS}}`를 관련 스펙 파일 참조로 교체
- `{{CHECKLIST_ITEMS}}`를 배정된 체크리스트 항목 ID로 교체

`/sdd-build`에서 사용할 수 있도록 `docs/specs/wp-N-member.md`로 저장합니다.

### 출력 요약

```
태스크 계획이 생성되었습니다: docs/specs/07-task-plan.md

워크 패키지: 4개
  WP-1: User 모듈 (5개 태스크, 8개 체크리스트 항목)
  WP-2: Auth 모듈 (4개 태스크, 6개 체크리스트 항목)
  WP-3: Payment 모듈 (6개 태스크, 10개 체크리스트 항목)
  WP-4: Integration (3개 태스크, 4개 체크리스트 항목)

실행 계획:
  1단계: WP-1, WP-2, WP-3 (병렬)
  2단계: WP-4 (순차)

팀 멤버 설정: docs/specs/wp-*-member.md

다음 단계: /sdd-build — Agent Teams를 통한 구현 시작
```

## 출력

- `docs/specs/07-task-plan.md`
- `docs/specs/wp-*-member.md` (워크 패키지당 하나)

## 의존성

- `docs/specs/02-*.md`부터 `06-*.md` (`/sdd-spec`에서 생성)
