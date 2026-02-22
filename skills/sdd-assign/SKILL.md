---
name: sdd-assign
description: >-
  워크 패키지에 Agent Teams 멤버를 배정하고 멤버별 CLAUDE.md를 생성합니다. 멀티 도메인 프로젝트에서는 도메인별 배정을 지원합니다.
  Use when: "팀 배정", "멤버 할당", "팀 구성", "assign team", "allocate members"
---

# /claude-sdd:sdd-assign — 팀 멤버 배정

태스크 계획의 워크 패키지에 Agent Teams 멤버를 배정하고, 멤버별 CLAUDE.md를 생성합니다.

## 사용법

```
/claude-sdd:sdd-assign              # 단일: 기존 동작 / 멀티: 도메인 선택 요청
/claude-sdd:sdd-assign rebalance    # 현재 진행 상황에 따라 재배정

# 멀티 도메인 옵션
/claude-sdd:sdd-assign --domain=<id>            # 특정 도메인 팀 멤버 배정
/claude-sdd:sdd-assign --domain=<id> rebalance  # 특정 도메인 재배정
/claude-sdd:sdd-assign --all                    # 모든 도메인 일괄 배정
```

## 사전 조건

1. `docs/specs/sdd-config.yaml`을 읽어 프로젝트 설정을 확인합니다.
2. **도메인 모드 감지**: `domains` 키 존재 여부로 단일/멀티 도메인 모드를 결정합니다:
   - `domains` 없음 또는 빈 배열 → **단일 도메인 모드** (기존 동작)
   - `domains` 존재 → **멀티 도메인 모드**
3. 태스크 계획 존재 확인:
   - 단일 도메인: `docs/specs/07-task-plan.md`
   - 멀티 도메인: `docs/specs/domains/<domain-id>/07-task-plan.md`
4. 태스크 계획이 존재하지 않으면 안내합니다: `먼저 /claude-sdd:sdd-plan을 실행하여 태스크 계획을 생성하세요.`

---

## 동작 (단일 도메인 모드)

### 팀 멤버 CLAUDE.md 생성

`docs/specs/07-task-plan.md`에서 워크 패키지 목록을 읽고, 각 워크 패키지에 대해 `templates/claude-md/sdd-member.md.tmpl`에서 팀 멤버 CLAUDE.md를 생성합니다:

1. 템플릿 변수 치환:
   - `{{WORK_PACKAGE_ID}}`를 WP ID로 교체
   - `{{SPEC_SECTIONS}}`를 관련 스펙 파일 참조로 교체
   - `{{CHECKLIST_ITEMS}}`를 배정된 체크리스트 항목 ID로 교체

2. `/claude-sdd:sdd-build`에서 사용할 수 있도록 `docs/specs/wp-N-member.md`로 저장합니다.

3. 프로젝트 규칙 포함 (규칙 활성화 시):
   - `sdd-config.yaml`의 `rules.enabled`가 `true`이면:
   - `{{RULES_ENABLED}}` → `true`
   - `{{RULES_ENFORCEMENT}}` → `sdd-config.yaml`의 `rules.enforcement` 값
   - `{{RULES_SUMMARY}}` → `00-project-rules.md`의 요약 테이블
   - `{{RULES_DETAIL}}` → WP 카테고리에 해당하는 규칙 상세 파일 내용

### 출력 요약

```
팀 멤버 배정이 완료되었습니다.

워크 패키지: 4개
  WP-1: User 모듈 → wp-1-member.md
  WP-2: Auth 모듈 → wp-2-member.md
  WP-3: Payment 모듈 → wp-3-member.md
  WP-4: Integration → wp-4-member.md

멤버 설정: docs/specs/wp-*-member.md

다음 단계: /claude-sdd:sdd-build — 구현 시작 (Agent Teams 활성화 시 팀 모드, 비활성화 시 솔로 모드)
```

---

## rebalance (재배정)

현재 진행 상황에 따라 미완료 태스크를 재배정합니다.

1. `docs/specs/07-task-plan.md`와 `docs/specs/06-spec-checklist.md`를 읽습니다.
2. 완료된 태스크와 미완료 태스크를 분석합니다.
3. 미완료 태스크의 워크 패키지를 재분배합니다.
4. 재분배된 워크 패키지에 대해 `wp-N-member.md`를 재생성합니다.

```
재배정이 완료되었습니다.

완료된 워크 패키지: 2개 (WP-1, WP-2)
재배정된 워크 패키지: 2개
  WP-3: Payment 모듈 (6개 태스크 → 4개 미완료)
  WP-4: Integration (3개 태스크)

멤버 설정 갱신: docs/specs/wp-3-member.md, docs/specs/wp-4-member.md

다음 단계: /claude-sdd:sdd-build — 재배정된 워크 패키지부터 구현 재개
```

---

## 동작 (멀티 도메인 모드)

### 도메인 미지정 시

사용자에게 도메인 선택 목록을 표시합니다:
```
도메인을 선택하세요:
  1. device-mgmt (단말관리) [상태: 태스크 분해 완료]
  2. subscription (구독 서비스) [상태: 태스크 분해 완료]
  3. rate-plan (요금제) [상태: 팀 멤버 배정 완료]
  4. rate-benefit (요금제혜택) [상태: 태스크 분해 완료]
  5. (all) 모든 도메인 일괄 배정
```

### --domain=<id> (특정 도메인 팀 멤버 배정)

사전 조건: `docs/specs/domains/<domain-id>/07-task-plan.md`가 존재해야 합니다.

1. 해당 도메인의 태스크 계획(`docs/specs/domains/<id>/07-task-plan.md`)을 읽습니다.
2. 단일 도메인과 동일한 방식으로 멤버 CLAUDE.md를 생성합니다.
3. 출력 파일: `docs/specs/domains/<id>/wp-<PREFIX>-WP-N-member.md` (워크 패키지당 하나)

```
팀 멤버 배정이 완료되었습니다: device-mgmt

워크 패키지: 3개
  DEV-WP-1: 단말 등록 모듈 → wp-DEV-WP-1-member.md
  DEV-WP-2: 단말 조회 모듈 → wp-DEV-WP-2-member.md
  DEV-WP-3: 단말 상태관리 → wp-DEV-WP-3-member.md

멤버 설정: docs/specs/domains/device-mgmt/wp-*-member.md

다음 단계: /claude-sdd:sdd-build --domain=device-mgmt — 도메인 빌드 시작
```

### --domain=<id> rebalance (특정 도메인 재배정)

기존 `rebalance`와 동일한 로직을 도메인 범위에 적용합니다:
1. `docs/specs/domains/<id>/07-task-plan.md`와 `docs/specs/domains/<id>/06-spec-checklist.md`를 읽습니다.
2. 완료된 태스크와 미완료 태스크를 분석합니다.
3. 미완료 태스크를 재배정하여 `wp-*-member.md`를 재생성합니다.

### --all (모든 도메인 일괄 배정)

1. **도메인 의존성 순서에 따라** 각 도메인의 팀 멤버를 배정합니다.
2. 각 도메인에 대해 `--domain=<id>` 동작을 수행합니다.

```
전체 팀 멤버 배정이 완료되었습니다:

도메인별:
  - device-mgmt: 3개 WP → 3개 멤버 설정
  - rate-plan: 2개 WP → 2개 멤버 설정
  - subscription: 3개 WP → 3개 멤버 설정
  - rate-benefit: 2개 WP → 2개 멤버 설정

전체 통계: 10개 WP, 10개 멤버 설정

다음 단계: /claude-sdd:sdd-build [--domain=<id>] — 도메인별 빌드 시작
```

---

## 출력

| 모드 | 출력 파일 |
|------|-----------|
| 단일 도메인 | `docs/specs/wp-*-member.md` |
| 멀티 도메인 (특정 도메인) | `docs/specs/domains/<id>/wp-*-member.md` |
| 멀티 도메인 (전체) | 각 도메인의 `wp-*-member.md` |

## 의존성

- `docs/specs/07-task-plan.md` 또는 `docs/specs/domains/<id>/07-task-plan.md` (`/claude-sdd:sdd-plan`에서 생성)
- `templates/claude-md/sdd-member.md.tmpl` (멤버 CLAUDE.md 템플릿)
- `docs/specs/sdd-config.yaml` (`/claude-sdd:sdd-init`에서 생성)
