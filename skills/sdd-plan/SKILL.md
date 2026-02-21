---
name: sdd-plan
description: 스펙을 워크 패키지로 분해하고 Agent Teams에 할당합니다. 멀티 도메인 프로젝트에서는 도메인별 태스크 분해를 지원합니다.
---

# /claude-sdd:sdd-plan — 태스크 분해 및 팀 배정

스펙을 병렬 처리 가능한 워크 패키지로 분해하고 Agent Teams 멤버에게 배정합니다.

## 사용법

```
/claude-sdd:sdd-plan              # 단일: 기존 동작 / 멀티: 도메인 선택 요청
/claude-sdd:sdd-plan rebalance    # 현재 진행 상황에 따라 태스크 재분배

# 멀티 도메인 옵션
/claude-sdd:sdd-plan --domain=<id>            # 특정 도메인 태스크 분해
/claude-sdd:sdd-plan --domain=<id> rebalance  # 특정 도메인 태스크 재분배
/claude-sdd:sdd-plan --all                    # 모든 도메인 일괄 분해
```

## 사전 조건

1. `docs/specs/sdd-config.yaml`을 읽어 프로젝트 설정을 확인합니다.
2. **도메인 모드 감지**: `domains` 키 존재 여부로 단일/멀티 도메인 모드를 결정합니다:
   - `domains` 없음 또는 빈 배열 → **단일 도메인 모드** (기존 동작)
   - `domains` 존재 → **멀티 도메인 모드**
3. 스펙 존재 확인:
   - 단일 도메인: `docs/specs/06-spec-checklist.md` 및 `docs/specs/02-*.md`부터 `05-*.md`
   - 멀티 도메인: `docs/specs/domains/<domain-id>/06-spec-checklist.md` 및 `docs/specs/domains/<domain-id>/02-*.md`부터 `05-*.md`
4. 스펙이 존재하지 않으면 안내합니다: `먼저 /claude-sdd:sdd-spec을 실행하여 명세서를 생성하세요.`

---

## 동작 (단일 도메인 모드)

### 태스크 분해

`docs/specs/06-spec-checklist.md`를 읽어 전체 항목 목록을 확인하고, `docs/specs/02-*.md`부터 `05-*.md`까지 스펙 세부 사항을 읽어 체크리스트와 스펙을 분석하여 워크 패키지를 생성합니다:

1. **모듈/기능별 그룹화**: 관련된 체크리스트 항목은 동일한 워크 패키지에 포함해야 합니다.
2. **의존성 식별**: 병렬 실행 가능한 패키지를 결정합니다.
3. **작업량 균형**: 각 패키지의 크기가 대략 비슷해야 합니다.
4. **병렬성 극대화**: 독립적인 패키지는 동시에 실행해야 합니다.

#### 레거시 프로젝트 추가 고려사항

`sdd-config.yaml`의 `project.type`이 `legacy`인 경우, 태스크 분해에 다음을 추가로 적용합니다:

1. **감사 대상 기존 코드 경로 명시**: 각 워크 패키지에 감사해야 할 기존 소스 파일/디렉토리 경로를 명시합니다.
2. **스펙 변경 영향도 기준 우선순위**: 기존 코드에 대한 변경 영향이 큰 항목을 먼저 처리하도록 정렬합니다.
3. **하위 호환성 검증 태스크 포함**: 각 워크 패키지에 기존 API/인터페이스 보존을 확인하는 검증 태스크를 포함합니다.
4. **기존 테스트 회귀 검증 태스크 포함**: 기존 테스트가 여전히 통과하는지 확인하는 태스크를 포함합니다.

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

### 워크 패키지 형식 (레거시 프로젝트)

`project.type: legacy`인 경우, 워크 패키지에 `기존 코드 참조` 필드를 추가합니다:

```markdown
## 워크 패키지 WP-1: [모듈 이름] (팀 멤버 1)

**스펙 섹션**: 03-api-changes.md#user-endpoints, 04-data-migration.md#user
**체크리스트 항목**: CHG-001, CHG-002, CHG-REG-001
**기존 코드 참조**: `src/user/controller.ts`, `src/user/model.ts`, `src/user/routes.ts`

### 태스크
- [ ] TASK-001: User 모듈 기존 코드 감사 (기존 코드: src/user/)
- [ ] TASK-002: User API 변경 사항 보완 (스펙: 03-api-changes.md#user-endpoints)
- [ ] TASK-003: 하위 호환성 검증 (기존 API 보존 확인)
- [ ] TASK-004: 기존 테스트 회귀 검증 + 새 테스트 추가

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

`/claude-sdd:sdd-build`에서 사용할 수 있도록 `docs/specs/wp-N-member.md`로 저장합니다.

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

다음 단계: /claude-sdd:sdd-build — Agent Teams를 통한 구현 시작
```

---

## 동작 (멀티 도메인 모드)

### 도메인 미지정 시

사용자에게 도메인 선택 목록을 표시합니다:
```
도메인을 선택하세요:
  1. device-mgmt (단말관리) [상태: 스펙 생성 완료]
  2. subscription (구독 서비스) [상태: 스펙 생성 완료]
  3. rate-plan (요금제) [상태: 태스크 분해 완료]
  4. rate-benefit (요금제혜택) [상태: 스펙 생성 완료]
  5. (all) 모든 도메인 일괄 분해
```

### --domain=<id> (특정 도메인 태스크 분해)

사전 조건: `docs/specs/domains/<domain-id>/06-spec-checklist.md` 및 `docs/specs/domains/<domain-id>/02-*.md`부터 `05-*.md`가 존재해야 합니다.

1. 해당 도메인의 스펙 파일을 읽습니다:
   - `docs/specs/domains/<id>/02-architecture.md`
   - `docs/specs/domains/<id>/03-api-spec.md`
   - `docs/specs/domains/<id>/04-data-model.md`
   - `docs/specs/domains/<id>/05-component-breakdown.md`
   - `docs/specs/domains/<id>/06-spec-checklist.md`

2. 단일 도메인과 동일한 방식으로 태스크를 분해하되, 다음을 적용합니다:
   - **워크 패키지 ID에 도메인 접두사 사용**: `<PREFIX>-WP-<N>` 형식
     - `device-mgmt` → `DEV-WP-1`, `DEV-WP-2`
     - `subscription` → `SUB-WP-1`, `SUB-WP-2`
     - `rate-plan` → `RATE-WP-1`, `RATE-WP-2`
     - (접두사 규칙은 `sdd-spec`에서 사용한 것과 동일)
   - **체크리스트 항목 참조도 도메인 접두사**: `DEV-API-001`, `SUB-DM-003`
   - **스펙 참조는 도메인 경로**: `domains/<id>/03-api-spec.md#endpoint`

3. 도메인 간 의존성을 확인합니다:
   - `sdd-config.yaml`의 `dependencies` 필드를 읽어 의존 도메인의 빌드 상태를 확인합니다
   - 의존 도메인이 아직 빌드되지 않은 경우 경고를 표시합니다:
     ```
     경고: subscription 도메인은 device-mgmt에 의존하지만,
     device-mgmt의 빌드가 아직 완료되지 않았습니다.
     태스크 분해는 가능하지만, 빌드 시 의존성 문제가 발생할 수 있습니다.
     ```

4. 출력 파일:
   - `docs/specs/domains/<id>/07-task-plan.md`
   - `docs/specs/domains/<id>/wp-<PREFIX>-WP-N-member.md` (워크 패키지당 하나)

### --all (모든 도메인 일괄 분해)

1. **도메인 의존성 순서에 따라** 각 도메인의 태스크를 분해합니다:
   - 의존성이 없는 도메인 먼저 (예: `device-mgmt`, `rate-plan`)
   - 의존하는 도메인 나중에 (예: `subscription`, `rate-benefit`)
   - 이유: 후속 도메인의 워크 패키지가 선행 도메인의 인터페이스를 참조할 수 있음

2. 각 도메인에 대해 `--domain=<id>` 동작을 수행합니다.

3. **프로젝트 수준 실행 계획을 생성**합니다:

   프로젝트 수준 실행 계획은 도메인 단계와 크로스 도메인 통합 단계를 포함하여 `docs/specs/07-task-plan.md`에 저장합니다:

   ```markdown
   # 07 — 프로젝트 실행 계획

   > 이 파일은 도메인별 태스크 계획의 프로젝트 수준 집계입니다.
   > 각 도메인의 상세 태스크는 domains/<id>/07-task-plan.md를 참조하세요.

   ## 도메인별 워크 패키지 요약

   | 도메인 | WP 수 | 태스크 수 | 체크리스트 항목 | 의존성 |
   |--------|--------|-----------|----------------|--------|
   | device-mgmt | 3 | 9 | 19 | 없음 |
   | rate-plan | 2 | 7 | 15 | 없음 |
   | subscription | 3 | 10 | 24 | device-mgmt |
   | rate-benefit | 2 | 8 | 18 | rate-plan, subscription |

   ## 프로젝트 실행 단계

   ### Phase 1: 독립 도메인 빌드 (병렬)
   - device-mgmt: DEV-WP-1 ~ DEV-WP-3
   - rate-plan: RATE-WP-1 ~ RATE-WP-2

   ### Phase 2: 의존 도메인 빌드 (Phase 1 완료 후)
   - subscription: SUB-WP-1 ~ SUB-WP-3 (device-mgmt 완료 필요)

   ### Phase 3: 후속 의존 도메인 빌드 (Phase 2 완료 후)
   - rate-benefit: BENEFIT-WP-1 ~ BENEFIT-WP-2 (rate-plan, subscription 완료 필요)

   ### Phase 4: 크로스 도메인 통합
   - cross-domain/integration-points.md 기반 통합 검증
   - cross-domain/integration-checklist.md 항목 구현

   ## 전체 통계
   - 도메인: 4개
   - 워크 패키지: 10개
   - 태스크: 34개
   - 체크리스트 항목: 84개 (도메인) + 8개 (크로스 도메인) = 92개
   ```

### --domain=<id> rebalance (특정 도메인 재분배)

기존 `rebalance`와 동일한 로직을 도메인 범위에 적용합니다:
1. `docs/specs/domains/<id>/07-task-plan.md`와 `docs/specs/domains/<id>/06-spec-checklist.md`를 읽습니다.
2. 완료된 태스크와 미완료 태스크를 분석합니다.
3. 미완료 태스크를 재분배하여 `07-task-plan.md`를 업데이트합니다.

---

## 출력

| 모드 | 출력 파일 |
|------|-----------|
| 단일 도메인 | `docs/specs/07-task-plan.md`, `docs/specs/wp-*-member.md` |
| 멀티 도메인 (특정 도메인) | `docs/specs/domains/<id>/07-task-plan.md`, `docs/specs/domains/<id>/wp-*-member.md` |
| 멀티 도메인 (전체) | 각 도메인의 `07-task-plan.md` + `wp-*-member.md` + 프로젝트 수준 `docs/specs/07-task-plan.md` |

생성 후 출력:

**단일 도메인**:
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

다음 단계: /claude-sdd:sdd-build — Agent Teams를 통한 구현 시작
```

**멀티 도메인 (특정 도메인)**:
```
태스크 계획이 생성되었습니다: docs/specs/domains/device-mgmt/07-task-plan.md

워크 패키지: 3개
  DEV-WP-1: 단말 등록 모듈 (4개 태스크, 7개 체크리스트 항목)
  DEV-WP-2: 단말 조회 모듈 (3개 태스크, 6개 체크리스트 항목)
  DEV-WP-3: 단말 상태관리 (2개 태스크, 6개 체크리스트 항목)

실행 계획:
  1단계: DEV-WP-1, DEV-WP-2 (병렬)
  2단계: DEV-WP-3 (순차)

팀 멤버 설정: docs/specs/domains/device-mgmt/wp-*-member.md

다음 단계: /claude-sdd:sdd-build --domain=device-mgmt — 도메인 빌드 시작
```

**멀티 도메인 (전체)**:
```
프로젝트 태스크 계획이 생성되었습니다:

도메인별:
  - domains/device-mgmt/07-task-plan.md (3개 WP, 9개 태스크)
  - domains/rate-plan/07-task-plan.md (2개 WP, 7개 태스크)
  - domains/subscription/07-task-plan.md (3개 WP, 10개 태스크)
  - domains/rate-benefit/07-task-plan.md (2개 WP, 8개 태스크)

프로젝트 수준:
  - docs/specs/07-task-plan.md (실행 계획: 4 Phase)

프로젝트 실행 계획:
  Phase 1: device-mgmt, rate-plan (병렬, 독립)
  Phase 2: subscription (device-mgmt 완료 후)
  Phase 3: rate-benefit (rate-plan, subscription 완료 후)
  Phase 4: 크로스 도메인 통합

전체 통계: 10개 WP, 34개 태스크, 92개 체크리스트 항목

다음 단계: /claude-sdd:sdd-build [--domain=<id>] — 도메인별 빌드 시작
```

## 의존성

- `docs/specs/02-*.md`부터 `06-*.md` (`/claude-sdd:sdd-spec`에서 생성)
- 멀티 도메인: `docs/specs/domains/<id>/02-*.md`부터 `06-*.md`
- `docs/specs/sdd-config.yaml` (`/claude-sdd:sdd-init`에서 생성)
