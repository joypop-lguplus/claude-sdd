---
name: sdd-change
description: >-
  통합 완료 후 변경 요청을 체계적으로 처리합니다. 영향 분석, 체크리스트 부분 갱신, TDD 델타 빌드, 회귀 검증을 포함하는 7 Phase 변경 관리 워크플로우입니다.
  Use when: "변경 요청", "기능 변경해줘", "수정 사항 반영", "change request", "modify feature"
---

# /claude-sdd:sdd-change — 변경 관리

통합이 완료된 프로젝트에서 변경 요청(CR)을 체계적으로 처리합니다. 영향 분석 → 스펙 델타 → 체크리스트 부분 갱신 → TDD 델타 빌드 → 회귀 검증 → PR 생성의 7단계 프로세스를 실행합니다.

## 사용법

```
/claude-sdd:sdd-change                    # 새 변경 요청 시작
/claude-sdd:sdd-change status             # 변경 사이클 상태 확인
/claude-sdd:sdd-change resume             # 진행 중인 변경 사이클 재개

# 레거시 분석 기반 옵션
/claude-sdd:sdd-change --from-analysis                  # 분석 보고서 갭에서 CR 자동 생성
/claude-sdd:sdd-change --lightweight --from-analysis     # 소규모 갭 빠른 처리 (Phase 1-4 자동)

# 멀티 도메인 옵션
/claude-sdd:sdd-change --domain=<id>      # 특정 도메인 변경 관리
/claude-sdd:sdd-change --domain=<id> status   # 특정 도메인 변경 상태
/claude-sdd:sdd-change --domain=<id> resume   # 특정 도메인 변경 재개
```

## 사전 조건

1. `docs/specs/sdd-config.yaml`을 읽어 프로젝트 설정을 확인합니다.
2. **전제조건 확인** (프로젝트 유형에 따라):

   **레거시 프로젝트** (`project.type: legacy`):
   - `10-analysis-report.md`가 존재해야 합니다 (분석 완료 상태)
   - `08-review-report.md`는 불필요합니다 (갭 해소가 리뷰 전에 수행됨)
   - 분석이 완료되지 않은 경우 안내:
     ```
     이 프로젝트는 아직 분석이 완료되지 않았습니다.
     먼저 /claude-sdd:sdd-build를 실행하여 분석을 수행하세요.

     현재 상태: [현재 단계]
     체크리스트: X/Y 완료 (Z%)
     ```

   **신규 프로젝트** (`project.type: new`):
   - `08-review-report.md`가 존재하고 리뷰가 통과된 상태여야 합니다 (기존 동작)
   - 통합이 완료되지 않은 경우 안내:
     ```
     이 프로젝트는 아직 통합이 완료되지 않았습니다.
     먼저 /claude-sdd:sdd-integrate를 실행하세요.

     현재 상태: [현재 단계]
     체크리스트: X/Y 완료 (Z%)
     ```

3. **도메인 모드 감지**: `domains` 키 존재 여부로 단일/멀티 도메인 모드를 결정합니다.

---

## --from-analysis: 분석 보고서 기반 CR 생성

`--from-analysis` 플래그가 있으면 `10-analysis-report.md`의 "추천 변경 요청" 섹션에서 CR을 자동으로 생성합니다.

### 동작

1. `10-analysis-report.md`를 읽어 갭 항목과 추천 CR 그룹을 파싱합니다.
2. 사용자에게 CR 생성 방식을 확인합니다:
   ```
   분석 보고서에서 6개 갭 항목이 식별되었습니다.

   추천 변경 요청:
     CR-001: API 레이어 갭 (3개 항목)
     CR-002: 데이터 모델 갭 (1개 항목)
     CR-003: 테스트 커버리지 갭 (2개 항목)

   옵션:
     1. 전체 수락 — 3개 CR 생성
     2. 단일 CR — 모든 갭을 1개 CR로 통합
     3. 커스터마이즈 — 그룹핑 조정
   ```
3. 선택에 따라 `09-change-request.md`를 생성하고 Phase 2로 진행합니다.

### CR 자동 생성 시 Phase 1 간소화

`--from-analysis` 모드에서는 Phase 1의 인터뷰 질문을 건너뛰고, 분석 보고서의 갭 정보로 CR을 채웁니다:
- **변경 요약**: "분석 보고서 갭 해소" + 갭 항목 요약
- **변경 사유**: "레거시 분석에서 식별된 스펙 미충족 항목 보완"
- **변경 범위**: 분석 보고서의 갭 항목 목록
- **우선순위**: 분석 보고서의 추천 우선순위
- **제약 조건**: "기존 코드 구조 보존, 하위 호환성 유지, 기존 테스트 무결성"
- **gap_source**: `10-analysis-report.md` (추적성을 위한 참조)

---

## --lightweight: 소규모 갭 빠른 처리

`--lightweight` 플래그는 `--from-analysis`와 함께 사용하며, 소규모 갭에 대해 Phase 1-4를 자동 처리합니다.

### 자동 감지 기준

다음 조건을 모두 만족하면 자동으로 lightweight 모드를 권장합니다:
- 레거시 프로젝트 (`project.type: legacy`)
- 분석 기반 CR (`gap_source: 10-analysis-report.md`)
- 갭 항목 5개 이하
- 크로스 모듈 영향 없음 (갭이 단일 모듈 내에 집중)

### Lightweight 동작

| 전체 Phase | Lightweight |
|-----------|-------------|
| Phase 1: CR 수집 | 분석 보고서에서 자동 생성 ✓ |
| Phase 2: 영향 분석 | 건너뜀 (분석에서 이미 범위 파악) |
| Phase 3: 체크리스트 갱신 | 자동 적용 (갭 항목 → CHG- 항목) |
| Phase 4: 태스크 계획 | 단일 CWP 자동 생성 |
| **Phase 5: TDD 델타 빌드** | **정상 실행** |
| **Phase 6: 리뷰 + 회귀 검증** | **정상 실행** |
| **Phase 7: PR 생성** | **정상 실행** |

### Lightweight 체크리스트 자동 갱신

Phase 3 자동 적용 시:
1. 갭 항목을 `CHG-` 항목으로 변환합니다.
2. 분석 보고서에서 근접한 기존 코드에 대해 `CHG-REG-` 회귀 테스트 항목을 추가합니다.
3. 기존 `[x]` 항목은 재설정하지 않습니다 (충족 (satisfied) 항목 보존).

```
Lightweight 모드 — 자동 설정 완료

Phase 1-4 자동 완료:
  CR: CR-001 (분석 갭 해소)
  CHG 항목: 3개 (API-003, SEC-001, TEST-004)
  CHG-REG 항목: 2개 (회귀 테스트)
  CWP: 1개 (CWP-001)

Phase 5로 진행합니다 — TDD 델타 빌드...
```

---

## Phase 0: 브랜치 확인 및 생성

변경 관리 시작 전에 현재 Git 브랜치를 확인합니다.

1. `git branch --show-current`로 현재 브랜치를 확인합니다.
2. 브랜치가 `feature/`로 시작하면 **건너뜁니다**.
3. `feature/`가 아닌 경우:
   a. Jira 소스가 설정된 경우: `feature/CR-<N>-<jira-key>` (예: `feature/CR-001-DEV-200`)
   b. Jira 소스가 없는 경우: `feature/change-CR-<N>` 또는 사용자 입력
4. `git checkout -b feature/<name>` 실행

---

## Phase 1: 변경 요청 수집

사용자와 대화하여 변경 요청 정보를 수집합니다.

### 인터뷰 질문

1. **변경 요약**: 어떤 변경이 필요한가요?
2. **변경 사유**: 왜 이 변경이 필요한가요? (비즈니스 요구, 버그, 성능 등)
3. **변경 범위**: 어떤 기능/API/데이터 모델이 영향받나요?
4. **우선순위**: 긴급/높음/보통/낮음?
5. **제약 조건**: 하위 호환성, 다운타임, 마이그레이션 관련 제약이 있나요?

### CR ID 자동 생성

기존 변경 이력을 확인하여 다음 CR ID를 자동 생성합니다:
- `sdd-config.yaml`의 `change_cycles` 배열에서 마지막 CR 번호를 확인
- 없으면 `CR-001`부터 시작

### 출력

`docs/specs/09-change-request.md`를 `templates/specs/change-request.md.tmpl` 기반으로 생성합니다.

```
Phase 1 완료: 변경 요청 수집

CR ID: CR-002
제목: 사용자 프로필 API에 프로필 이미지 필드 추가
우선순위: 보통
상태: 신규

생성된 파일: docs/specs/09-change-request.md

Phase 2로 진행합니다 — 영향 분석...
```

---

## Phase 2: 영향 분석

`sdd-change-analyst` 에이전트를 사용하여 변경 요청의 영향을 분석합니다.

### 에이전트 실행

1. **`sdd-change-analyst` 에이전트로 팀 멤버 생성**:
   - 에이전트: `sdd-change-analyst`
   - 컨텍스트: `09-change-request.md`, 기존 스펙 문서 전체 (02~05, 06-checklist)
   - 지시: "변경 요청을 분석하고 영향 범위를 식별하세요."

2. **분석 결과 수집**:
   - 직접 영향 / 간접 영향 / 회귀 위험 항목
   - 체크리스트 재설정 대상 및 신규 CHG- 항목

### 프로젝트 규칙 영향 분석 (규칙 활성화 시)

`rules.enabled`가 `true`이면 변경이 프로젝트 규칙에 미치는 영향도 분석합니다:

1. **규칙 충돌 확인**: 변경 요청이 기존 프로젝트 규칙과 충돌하는지 확인합니다.
   - 충돌 시 사용자에게 알리고 규칙 수정 여부를 질문합니다.
2. **규칙 영향 체크리스트**: 체크리스트에 `CHG-RULE-NNN` 항목을 추가합니다:
   ```markdown
   ### 규칙 준수 검증
   - [ ] CHG-RULE-001: 변경된 코드가 RULE-ARCH-001 (계층 의존성) 준수
   - [ ] CHG-RULE-002: 변경된 API가 RULE-API-010 (응답 형식) 준수
   ```

### 스펙 델타 문서 생성

영향 분석 결과에 따라 해당되는 델타 스펙 문서를 생성합니다:

| 영향 대상 | 생성 문서 | 템플릿 |
|-----------|----------|--------|
| API 변경 | `03-api-changes.md` | `templates/specs/api-changes.md.tmpl` |
| 데이터 모델 변경 | `04-data-migration.md` | `templates/specs/data-migration.md.tmpl` |
| 컴포넌트 변경 | `05-component-changes.md` | `templates/specs/component-changes.md.tmpl` |

### 09-change-request.md 업데이트

영향 분석 결과를 `09-change-request.md`의 "영향 분석 요약" 섹션에 반영합니다.

```
Phase 2 완료: 영향 분석

직접 영향: 3개 항목 (API 2개, DM 1개)
간접 영향: 2개 항목
회귀 위험: 1개 항목

생성된 델타 스펙:
  - docs/specs/03-api-changes.md (2개 엔드포인트 변경)
  - docs/specs/04-data-migration.md (1개 엔티티 변경)

Phase 3으로 진행합니다 — 체크리스트 부분 갱신...
```

---

## Phase 3: 체크리스트 부분 갱신

영향 분석 결과에 따라 `06-spec-checklist.md`를 부분적으로 갱신합니다.

### 갱신 전략

**핵심 원칙: 영향받지 않는 항목은 절대 변경하지 않습니다.**

1. **영향받는 `[x]` 항목 → `[ ]`로 재설정**:
   - 재설정 사유를 코멘트로 추가: `(CR-NNN 재작업 필요)`
   ```markdown
   - [ ] API-001: GET /users 페이지네이션 (CR-002 재작업 필요)
   ```

2. **영향받지 않는 `[x]` 항목 → 절대 변경 안함**:
   ```markdown
   - [x] API-002: POST /users 필드 유효성 검사  ← 그대로 유지
   ```

3. **신규 `CHG-` 항목 추가**:
   - `## 변경 사이클 CR-NNN` 섹션을 체크리스트 끝에 추가
   ```markdown
   ## 변경 사이클 CR-002

   ### 변경 항목
   - [ ] CHG-001: GET /users 응답에 profileImage 필드 추가
   - [ ] CHG-002: User 엔티티에 profileImage 컬럼 추가
   - [ ] CHG-003: 프로필 이미지 업로드 API 추가

   ### 회귀 테스트
   - [ ] CHG-REG-001: 기존 GET /users 응답 형식 보존
   - [ ] CHG-REG-002: 기존 User 엔티티 CRUD 동작 보존
   ```

### 갱신 전 백업

체크리스트 갱신 전에 원본을 보존합니다:
- `06-spec-checklist.md` → `06-spec-checklist.md.pre-CR-NNN.bak`

### 갱신 확인

```
Phase 3 완료: 체크리스트 부분 갱신

재설정: 2개 항목 ([x] → [ ])
  - API-001: GET /users 페이지네이션
  - DM-003: User 엔티티 필드 정의

보존: 10개 항목 (변경 없음)

추가: 5개 항목
  - CHG-001 ~ CHG-003: 변경 항목 3개
  - CHG-REG-001 ~ CHG-REG-002: 회귀 테스트 2개

체크리스트: 10/17 완료 (59%) — 재설정 2개 + 신규 5개

Phase 4로 진행합니다 — 델타 태스크 계획...
```

---

## Phase 4: 델타 태스크 계획

변경 항목(CHG-) 및 재설정 항목을 워크 패키지로 분해합니다.

### 변경 워크 패키지 (CWP)

기존 태스크 계획(`07-task-plan.md`)에 변경 워크 패키지를 추가합니다:

```markdown
## 변경 사이클 CR-002 — 워크 패키지

### CWP-1: API 변경 구현
- CHG-001: GET /users 응답에 profileImage 필드 추가
- API-001: GET /users 페이지네이션 재검증 (재설정)
- CHG-REG-001: 기존 GET /users 응답 형식 보존

### CWP-2: 데이터 모델 변경 구현
- CHG-002: User 엔티티에 profileImage 컬럼 추가
- DM-003: User 엔티티 필드 정의 재검증 (재설정)
- CHG-REG-002: 기존 User 엔티티 CRUD 동작 보존

### CWP-3: 프로필 이미지 API 구현
- CHG-003: 프로필 이미지 업로드 API 추가
```

```
Phase 4 완료: 델타 태스크 계획

변경 워크 패키지: 3개
  CWP-1: API 변경 구현 (3개 항목)
  CWP-2: 데이터 모델 변경 구현 (3개 항목)
  CWP-3: 프로필 이미지 API 구현 (1개 항목)

Phase 5로 진행합니다 — TDD 델타 빌드...
```

---

## Phase 5: TDD 델타 빌드

변경 워크 패키지를 **TDD 모드**로 빌드합니다. 이 단계는 `/claude-sdd:sdd-build --tdd`의 Phase A/B/C 루프를 사용합니다.

### 레거시 갭 해소 빌드 규칙

레거시 프로젝트의 갭 해소 CR인 경우 (`gap_source: 10-analysis-report.md`), Phase 5에서 다음 추가 규칙을 적용합니다:

1. **`sdd-implementer`에게 갭 해소 모드를 지시**: `agents/sdd-implementer.md`의 "레거시 갭 해소 모드" 섹션 규칙을 적용합니다.
2. **기존 코드 구조 보존**: 기존 코드 스타일, 네이밍, 디렉토리 구조를 따릅니다.
3. **기존 테스트 무결성**: Phase 5C 검증 시 기존 테스트(분석 보고서의 테스트 베이스라인)가 모두 통과해야 합니다.
4. **하위 호환성**: 기존 공개 API를 변경/삭제하지 않습니다.

### 빌드 흐름

각 CWP에 대해:

1. **Phase A (Red)**: `sdd-test-writer`가 변경 스펙 기반으로 테스트를 작성합니다.
   - CHG- 항목: 변경된 동작을 검증하는 테스트
   - CHG-REG- 항목: 기존 기능 보존을 검증하는 회귀 테스트
   - 참조 스펙: `03-api-changes.md`, `04-data-migration.md`, `05-component-changes.md`

2. **Phase B (Green)**: `sdd-implementer`가 모든 테스트(신규 + 회귀) 통과 코드를 작성합니다.
   - 기존 테스트도 모두 통과해야 합니다.
   - 테스트 파일 수정 금지 규칙 적용.

3. **Phase C (Verify)**: 전체 테스트 스위트를 실행합니다.
   - 변경 테스트 + 기존 테스트 모두 통과해야 합니다.
   - 기존 테스트 실패 = 회귀 발생, 재작업 필요.

```
Phase 5 — TDD 델타 빌드

CWP-1: API 변경 구현
  Phase A: 3개 테스트 작성 (CHG-001: 1, CHG-REG-001: 1, API-001: 1)
  Phase B: sdd-implementer 실행 중...
  Phase C: 전체 테스트 실행
    변경 테스트: 3/3 통과 ✓
    기존 테스트: 24/24 통과 ✓ (회귀 없음)
  CWP-1 완료 ✓

CWP-2: 데이터 모델 변경 구현
  Phase A: 3개 테스트 작성
  Phase B: sdd-implementer 실행 중...
  Phase C: 전체 테스트 실행
    변경 테스트: 3/3 통과 ✓
    기존 테스트: 27/27 통과 ✓ (회귀 없음)
  CWP-2 완료 ✓

CWP-3: 프로필 이미지 API 구현
  Phase A: 2개 테스트 작성
  Phase B: sdd-implementer 실행 중...
  Phase C: 전체 테스트 실행
    변경 테스트: 2/2 통과 ✓
    기존 테스트: 30/30 통과 ✓ (회귀 없음)
  CWP-3 완료 ✓

Phase 5 완료: 3/3 CWP 완료

Phase 6으로 진행합니다 — 리뷰 + 회귀 검증...
```

---

## Phase 6: 리뷰 + 회귀 검증

`sdd-reviewer` 에이전트를 사용하여 변경 항목과 회귀 방지를 검증합니다.

### 검증 범위

1. **CHG- 항목 검증**: 변경된 기능이 스펙과 일치하는지 확인
2. **CHG-REG- 항목 검증**: 기존 기능이 보존되는지 확인
3. **재설정 항목 재검증**: `[ ]`로 재설정된 항목이 다시 `[x]`로 완료되었는지 확인
4. **전체 테스트 최종 실행**: 전체 테스트 스위트 실행

### 리뷰 리포트 업데이트

`08-review-report.md`에 변경 사이클 리뷰 섹션을 추가합니다:

```markdown
## 변경 사이클 CR-002 리뷰

### 요약
- 변경 항목: 3/3 PASS
- 회귀 테스트: 2/2 PASS
- 재설정 항목: 2/2 PASS
- 전체 테스트: 32/32 PASS

### 변경 항목 상세
- [x] CHG-001: GET /users 응답에 profileImage 필드 추가 — PASS
- [x] CHG-002: User 엔티티에 profileImage 컬럼 추가 — PASS
- [x] CHG-003: 프로필 이미지 업로드 API 추가 — PASS

### 회귀 테스트 상세
- [x] CHG-REG-001: 기존 GET /users 응답 형식 보존 — PASS
- [x] CHG-REG-002: 기존 User 엔티티 CRUD 동작 보존 — PASS
```

```
Phase 6 완료: 리뷰 + 회귀 검증

변경 항목: 3/3 PASS ✓
회귀 테스트: 2/2 PASS ✓
재설정 항목: 2/2 PASS ✓
전체 테스트: 32/32 PASS ✓

Phase 7로 진행합니다 — PR 생성...
```

---

## Phase 7: PR 생성

변경 내용을 포함한 PR을 생성합니다.

### PR 제목 형식

```
[CR-NNN] 변경 제목
```

### PR 본문

```markdown
## 변경 요청

- **CR ID**: CR-002
- **제목**: 사용자 프로필 API에 프로필 이미지 필드 추가
- **영향 범위**: API 2개, 데이터 모델 1개

## 변경 내역

### API 변경
- GET /users: 응답에 `profileImage` 필드 추가
- POST /users/profile-image: 신규 프로필 이미지 업로드 API

### 데이터 모델 변경
- User 엔티티: `profileImage` 컬럼 추가 (VARCHAR, nullable)

## 체크리스트
- [x] 영향 분석 완료
- [x] 스펙 델타 문서 생성
- [x] 체크리스트 부분 갱신
- [x] TDD 델타 빌드 완료
- [x] 리뷰 + 회귀 검증 통과
- [x] 전체 테스트 통과 (회귀 없음)

## 추적성

| 변경 항목 | 원본 요구사항 | 스펙 참조 |
|-----------|-------------|-----------|
| CHG-001 | CR-002-FC-001 | 03-api-changes.md |
| CHG-002 | CR-002-FC-001 | 04-data-migration.md |
| CHG-003 | CR-002-FC-002 | 03-api-changes.md |
```

### sdd-config.yaml 업데이트

변경 사이클 이력을 `sdd-config.yaml`의 `change_cycles`에 추가합니다:

```yaml
change_cycles:
  - id: "CR-002"
    title: "사용자 프로필 API에 프로필 이미지 필드 추가"
    status: "completed"
    date: "2025-03-15"
    affected_items: 2
    new_items: 5
```

```
Phase 7 완료: PR 생성

PR: [CR-002] 사용자 프로필 API에 프로필 이미지 필드 추가
브랜치: sdd/change-CR-002
상태: 생성 완료

변경 사이클 CR-002 완료!

체크리스트: 17/17 완료 (100%)
  기존 항목: 12/12 완료
  변경 항목: 3/3 완료
  회귀 테스트: 2/2 완료
```

---

## 서브커맨드

### `status` — 변경 사이클 상태

현재 진행 중인 변경 사이클의 상태를 표시합니다.

```
변경 사이클 상태 — CR-002

제목: 사용자 프로필 API에 프로필 이미지 필드 추가
상태: Phase 5 (TDD 델타 빌드)

Phase별 진행:
  [x] Phase 1: 변경 요청 수집
  [x] Phase 2: 영향 분석
  [x] Phase 3: 체크리스트 부분 갱신
  [x] Phase 4: 델타 태스크 계획
  [ ] Phase 5: TDD 델타 빌드 (CWP-2/3 진행 중)
  [ ] Phase 6: 리뷰 + 회귀 검증
  [ ] Phase 7: PR 생성

체크리스트: 13/17 완료 (76%)
  기존 항목: 12/12
  변경 항목: 1/3
  회귀 테스트: 0/2
```

### `resume` — 변경 사이클 재개

중단된 변경 사이클을 현재 Phase부터 재개합니다.

1. `09-change-request.md`의 상태를 확인합니다.
2. `sdd-config.yaml`의 `change_cycles`에서 진행 중인 CR을 찾습니다.
3. 마지막으로 완료된 Phase 다음부터 실행합니다.

---

## 동작 (멀티 도메인 모드)

### --domain=<id> (특정 도메인 변경 관리)

1. 도메인 스코프에서 변경 요청을 수집합니다.
2. 도메인별 스펙(`docs/specs/domains/<id>/`)을 기준으로 영향 분석합니다.
3. 도메인별 체크리스트를 부분 갱신합니다.
4. 도메인별 CWP를 생성하고 TDD 빌드합니다.
5. 프로젝트 통합 체크리스트도 자동 갱신합니다.

### 크로스 도메인 변경

변경이 여러 도메인에 영향을 미치는 경우:
1. Phase 2에서 영향받는 모든 도메인을 식별합니다.
2. 각 도메인별로 개별 델타 스펙과 체크리스트를 갱신합니다.
3. 크로스 도메인 통합 체크리스트도 갱신합니다.
4. Phase 5에서 도메인별로 순차 빌드합니다 (의존성 순서).

---

## 출력

| Phase | 생성/수정 파일 |
|-------|---------------|
| Phase 1 | `09-change-request.md` (신규) |
| Phase 2 | `03-api-changes.md`, `04-data-migration.md`, `05-component-changes.md` (해당 시), `09-change-request.md` (업데이트) |
| Phase 3 | `06-spec-checklist.md` (부분 갱신), `06-spec-checklist.md.pre-CR-NNN.bak` (백업) |
| Phase 4 | `07-task-plan.md` (CWP 추가) |
| Phase 5 | 소스 코드 + 테스트 코드, `06-spec-checklist.md` (업데이트) |
| Phase 6 | `08-review-report.md` (업데이트) |
| Phase 7 | PR 생성, `sdd-config.yaml` (change_cycles 업데이트) |

## 의존성

- `docs/specs/sdd-config.yaml` (`/claude-sdd:sdd-init`에서 생성)
- 기존 스펙 문서 (02~05, 06-checklist, 07-task-plan, 08-review-report)
- Agent Teams 활성화 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
- `sdd-change-analyst` 에이전트 (Phase 2)
- `sdd-test-writer` 에이전트 (Phase 5)
- `sdd-implementer` 에이전트 (Phase 5)
- `sdd-reviewer` 에이전트 (Phase 6)
