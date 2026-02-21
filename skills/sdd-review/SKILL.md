---
name: sdd-review
description: 스펙 준수 체크리스트 대비 품질 게이트를 검증합니다. 멀티 도메인 프로젝트에서는 도메인별/통합/전체 리뷰를 지원합니다.
---

# /claude-sdd:sdd-review — 품질 게이트 검증

스펙 준수 체크리스트에 대한 종합적인 품질 검증을 수행합니다.

## 사용법

```
/claude-sdd:sdd-review              # 단일: 전체 리뷰 / 멀티: 프로젝트 통합 리포트 생성
/claude-sdd:sdd-review quick        # 단일: 체크리스트 상태만 확인 (코드 검증 없음)

# 멀티 도메인 옵션
/claude-sdd:sdd-review --domain=<id>             # 특정 도메인 리뷰
/claude-sdd:sdd-review --domain=<id> quick       # 특정 도메인 퀵 리뷰
/claude-sdd:sdd-review --integration             # 크로스 도메인 통합 리뷰
/claude-sdd:sdd-review --all                     # 모든 도메인 + 통합 전체 리뷰
```

## 사전 조건

1. `docs/specs/sdd-config.yaml`을 읽어 프로젝트 설정을 확인합니다.
2. **도메인 모드 감지**: `domains` 키 존재 여부로 단일/멀티 도메인 모드를 결정합니다:
   - `domains` 없음 또는 빈 배열 → **단일 도메인 모드** (기존 동작)
   - `domains` 존재 → **멀티 도메인 모드**
3. 체크리스트 존재 확인:
   - 단일 도메인: `docs/specs/06-spec-checklist.md`
   - 멀티 도메인: `docs/specs/domains/<domain-id>/06-spec-checklist.md`

---

## 동작 (단일 도메인 모드)

### 1단계: 체크리스트 감사

`docs/specs/06-spec-checklist.md`를 읽고 모든 항목을 분류합니다:
- `[x]` 항목 → 코드가 존재하고 스펙과 일치하는지 검증
- `[ ]` 항목 → 미완료로 보고

### 2단계: 코드 검증 (전체 리뷰)

각 `[x]` 항목에 대해 `sdd-reviewer` 에이전트를 사용하여:

1. **코드 찾기**: 스펙이 참조하는 구현 파일을 찾습니다.
2. **스펙 준수 확인**: 구현과 스펙 섹션을 비교합니다.
3. **테스트 확인**: 공개 인터페이스에 대한 테스트 파일이 존재하는지 확인합니다.

각 항목을 분류합니다:
- **PASS**: 코드 존재, 스펙 일치, 테스트 존재
- **FAIL**: 코드 누락, 스펙 불일치, 또는 테스트 누락
- **PARTIAL**: 부분적으로 구현됨

### 2.5단계: 자동화된 진단

`sdd-code-analyzer` 에이전트를 사용하여 자동화된 검사를 수행합니다:

1. **진단 실행**: 프로젝트 고유의 진단 도구 실행 (tsc, ruff, cargo check 등)
2. **에러/경고 수집**: 출력을 구조화된 에러 목록으로 파싱
3. **체크리스트 항목에 매핑**: 가능한 경우 진단 결과를 스펙 체크리스트 항목 ID와 연결
4. **포맷 검증 실행**: 수정된 파일이 프로젝트 포맷팅 규칙을 따르는지 확인

리뷰 리포트의 "자동화된 검사" 섹션에 결과를 포함합니다:

```
자동화된 검사:
  진단: 0개 에러, 3개 경고
  포맷팅: 2개 파일 포맷팅 필요
  스펙 커버리지: 25/28 항목에 매칭되는 코드 존재 (ast-grep)
```

에러는 품질 게이트를 차단합니다. 경고와 포맷 문제는 보고되지만 차단하지 않습니다.

### 3단계: 테스트 실행

프로젝트에 테스트 명령이 설정된 경우:
1. 테스트 스위트 실행
2. 결과 보고 (통과/실패/건너뛰기 수)
3. 가능한 경우 실패를 체크리스트 항목과 연결

### 4단계: 리뷰 리포트 생성

다음 내용으로 `docs/specs/08-review-report.md`를 생성합니다:
- 요약 통계
- 항목별 상세 결과
- 실패 항목에 대한 구체적인 개선 지침
- 전체 권장 사항 (통합 진행 또는 재작업)

### 5단계: 판정

```
품질 게이트 결과:
  전체: 28개 항목
  PASS:  25
  FAIL:   2
  PARTIAL: 1
  통과율: 89%

실패 항목:
  - API-003: 422 에러 핸들러 → UserController에 누락
  - TEST-002: 통합 테스트 → 테스트 파일 없음

권장 사항: /claude-sdd:sdd-build로 돌아가 재작업
```

모든 항목이 통과한 경우:
```
품질 게이트: 통과 (28/28 항목, 100%)
모든 테스트 통과.

다음 단계: /claude-sdd:sdd-integrate — PR 생성 및 마무리
```

항목이 실패한 경우:
```
품질 게이트: 실패 (25/28 항목, 89%)
3개 항목 재작업 필요.

다음 항목을 수정하려면 /claude-sdd:sdd-build를 실행하세요:
  - API-003, TEST-002, SEC-001

또는 수정 후 진행 상황을 확인하려면 /claude-sdd:sdd-review quick을 실행하세요.
```

---

## 동작 (멀티 도메인 모드)

### 도메인 미지정 시

프로젝트 수준 통합 리포트를 생성합니다. 사전 조건으로 각 도메인별 리뷰가 이미 완료되어 있어야 합니다.

1. 각 도메인의 `domains/<id>/08-review-report.md` 존재를 확인합니다.
2. 리뷰가 완료되지 않은 도메인이 있으면 안내합니다:
   ```
   다음 도메인의 리뷰가 아직 완료되지 않았습니다:
     - subscription (리뷰 미실행)
     - rate-benefit (리뷰 미실행)

   먼저 도메인별 리뷰를 실행하세요:
     /claude-sdd:sdd-review --domain=subscription
     /claude-sdd:sdd-review --domain=rate-benefit
   또는 전체 리뷰를 실행하세요:
     /claude-sdd:sdd-review --all
   ```
3. 모든 도메인 리뷰가 완료된 경우, 통합 리포트를 생성합니다 (아래 "통합 리뷰 리포트" 섹션 참조).

### --domain=<id> (특정 도메인 리뷰)

단일 도메인 모드와 동일한 리뷰 프로세스를 도메인 스코프에 적용합니다:

1. **체크리스트 감사**: `docs/specs/domains/<id>/06-spec-checklist.md` 읽기
2. **코드 검증**: `sdd-reviewer` 에이전트를 사용하여 도메인 스펙 대비 코드 검증
   - 스펙 참조: `domains/<id>/03-api-spec.md`, `domains/<id>/04-data-model.md` 등
   - **도메인 경계 검증 추가**: 이 도메인의 코드가 다른 도메인의 내부 구현에 직접 의존하고 있지 않은지 확인
3. **자동화된 진단**: 단일 도메인과 동일
4. **테스트 실행**: 도메인 관련 테스트만 실행 (가능한 경우)
5. **리뷰 리포트 생성**: `docs/specs/domains/<id>/08-review-report.md`

```
품질 게이트 결과 [device-mgmt]:
  전체: 19개 항목
  PASS:  18
  FAIL:   1
  PARTIAL: 0
  통과율: 95%

실패 항목:
  - DEV-TEST-003: 단말 상태 변경 통합 테스트 누락

권장 사항: /claude-sdd:sdd-build --domain=device-mgmt DEV-WP-3 rework
```

### --domain=<id> quick (특정 도메인 퀵 리뷰)

코드 검증 없이 도메인 체크리스트 상태만 확인합니다:
- `docs/specs/domains/<id>/06-spec-checklist.md`를 읽어 `[x]`/`[ ]` 비율만 보고
- 자동화된 진단이나 테스트 실행 없음

### --integration (크로스 도메인 통합 리뷰)

사전 조건:
- `docs/specs/cross-domain/integration-checklist.md`가 존재해야 합니다
- 모든 도메인의 빌드가 완료되어야 합니다 (또는 사용자 재정의)

1. `cross-domain/integration-checklist.md`를 읽어 통합 체크리스트를 감사합니다.
2. `sdd-reviewer` 에이전트를 사용하여 크로스 도메인 통합을 검증합니다:
   - 도메인 간 API 호출 정합성
   - 공유 엔티티 FK 관계 유효성
   - 이벤트 발행/구독 매핑
   - 통합 테스트 존재 여부
3. 리뷰 리포트를 `docs/specs/cross-domain/integration-review-report.md`에 생성합니다.

```
크로스 도메인 통합 리뷰 결과:
  전체: 8개 항목
  PASS: 7
  FAIL: 1
  통과율: 88%

실패 항목:
  - INT-005: subscription → device-mgmt API 호출 시 에러 핸들링 누락

권장 사항: /claude-sdd:sdd-build --integration으로 재작업
```

### --all (전체 프로젝트 리뷰)

모든 도메인과 크로스 도메인 통합을 한 번에 리뷰합니다:

1. 각 도메인에 대해 `--domain=<id>` 리뷰를 순차 실행합니다.
2. `--integration` 리뷰를 실행합니다.
3. **통합 리뷰 리포트**를 생성합니다.

---

## 통합 리뷰 리포트

`--all` 완료 후 또는 모든 개별 리뷰 완료 후 도메인 미지정 호출 시, `docs/specs/08-review-report.md`에 프로젝트 수준 통합 리포트를 생성합니다:

```markdown
# 08 — 프로젝트 리뷰 리포트 (통합)

> 생성일: YYYY-MM-DD
> 이 파일은 도메인별 리뷰 결과의 통합 리포트입니다.

## 도메인별 요약

| 도메인 | 전체 | PASS | FAIL | PARTIAL | 통과율 | 판정 |
|--------|------|------|------|---------|--------|------|
| device-mgmt | 19 | 18 | 1 | 0 | 95% | 조건부 통과 |
| subscription | 24 | 24 | 0 | 0 | 100% | 통과 |
| rate-plan | 15 | 15 | 0 | 0 | 100% | 통과 |
| rate-benefit | 18 | 17 | 0 | 1 | 94% | 조건부 통과 |
| 크로스 도메인 | 8 | 7 | 1 | 0 | 88% | 조건부 통과 |
| **합계** | **84** | **81** | **2** | **1** | **96%** | — |

## 실패 항목 상세

### device-mgmt
- DEV-TEST-003: 단말 상태 변경 통합 테스트 누락
  - 파일: src/device-mgmt/tests/
  - 권장: 통합 테스트 작성

### rate-benefit
- BENEFIT-API-005: 혜택 적용 API 응답 형식 스펙 불일치 (PARTIAL)
  - 스펙: domains/rate-benefit/03-api-spec.md#apply-benefit
  - 권장: 응답 형식 수정

### 크로스 도메인
- INT-005: subscription → device-mgmt API 에러 핸들링 누락
  - 권장: 에러 핸들링 추가

## 전체 판정

프로젝트 품질 게이트: 조건부 통과 (96%)
3개 항목 재작업 후 통합 가능.

## 권장 다음 단계
1. /claude-sdd:sdd-build --domain=device-mgmt DEV-WP-3 rework
2. /claude-sdd:sdd-build --domain=rate-benefit BENEFIT-WP-2 rework
3. /claude-sdd:sdd-build --integration
4. /claude-sdd:sdd-review --all (재확인)
5. /claude-sdd:sdd-integrate — PR 생성
```

---

## 출력

| 모드 | 출력 파일 |
|------|-----------|
| 단일 도메인 | `docs/specs/08-review-report.md` |
| 멀티 도메인 (특정 도메인) | `docs/specs/domains/<id>/08-review-report.md` |
| 멀티 도메인 (통합) | `docs/specs/cross-domain/integration-review-report.md` |
| 멀티 도메인 (전체/미지정) | 각 도메인의 `08-review-report.md` + `docs/specs/08-review-report.md` (통합 리포트) |

## 퍼블리싱 (조건부)

`sdd-config.yaml`에서 `publishing.confluence.enabled: true`인 경우, 리뷰 보고서 생성 완료 후 자동으로 Confluence에 퍼블리싱합니다.

1. `publishing` 설정을 확인합니다.
2. `enabled: true`이면 `/claude-sdd:sdd-publish --stage=review`와 동일한 로직으로 다음을 퍼블리싱합니다:
   - `08-review-report.md` (리뷰 보고서)
   - `06-spec-checklist.md` (최종 체크리스트 상태 업데이트)
3. 퍼블리싱 결과를 출력합니다:
   ```
   Confluence 퍼블리싱:
     06-스펙 체크리스트 ✓ 업데이트
     08-리뷰 보고서    ✓ 신규생성
   ```
4. 퍼블리싱 실패 시 경고만 표시합니다.

## 의존성

- `docs/specs/06-spec-checklist.md` 또는 `docs/specs/domains/<id>/06-spec-checklist.md` (`/claude-sdd:sdd-spec`에서 생성)
- `docs/specs/sdd-config.yaml` (`/claude-sdd:sdd-init`에서 생성)
- 구현 코드 (`/claude-sdd:sdd-build`에서 생성)
- 통합 리뷰: `docs/specs/cross-domain/integration-checklist.md` (`/claude-sdd:sdd-spec`에서 생성)
