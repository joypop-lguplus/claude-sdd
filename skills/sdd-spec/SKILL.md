---
name: sdd-spec
description: 요구사항으로부터 기술 스펙과 준수 체크리스트를 생성합니다. 멀티 도메인 프로젝트에서는 도메인별 스펙을 생성합니다.
---

# /claude-sdd:sdd-spec — 기술 명세서 생성

요구사항을 상세한 기술 명세서와 스펙 준수 체크리스트로 변환합니다.

## 사용법

```
/claude-sdd:sdd-spec                           # 단일: 기존 동작 / 멀티: 도메인 선택 요청
/claude-sdd:sdd-spec refresh                   # 스펙 재생성 (기존 편집 내용은 주석으로 유지)

# 멀티 도메인 옵션
/claude-sdd:sdd-spec --shared                  # 프로젝트 수준 공유 아키텍처만 생성/갱신
/claude-sdd:sdd-spec --domain=<id>             # 특정 도메인 스펙 생성
/claude-sdd:sdd-spec --domain=<id> refresh     # 특정 도메인 스펙 재생성
/claude-sdd:sdd-spec --all                     # 모든 도메인 스펙 일괄 생성
```

## 사전 조건

1. `docs/specs/sdd-config.yaml`을 읽어 프로젝트 유형(new/legacy)과 도메인 설정을 확인합니다.
2. **도메인 모드 감지**: `domains` 키 존재 여부로 단일/멀티 도메인 모드를 결정합니다.
3. 요구사항 존재 확인:
   - 단일 도메인: `docs/specs/01-requirements.md`
   - 멀티 도메인: `docs/specs/domains/<domain-id>/01-requirements.md`
4. 요구사항이 존재하지 않으면 안내합니다: `먼저 /claude-sdd:sdd-intake를 실행하여 요구사항을 수집하세요.`

## 집요한 상세 설계 모드 (spec_depth: thorough)

`docs/specs/00-project-context.md`가 존재하고 `spec_depth: thorough`가 설정되어 있으면 (`/claude-sdd:sdd-godmode`에서 생성), 모든 스펙을 **집요하게 상세한 수준**으로 생성합니다:

- **API 스펙**: 모든 엔드포인트의 완전한 JSON 스키마, 필드별 유효성 검사 규칙(정규식, 길이, 범위), 모든 HTTP 상태 코드별 에러 코드, 페이지네이션/필터링/정렬 상세, Rate limiting, 캐시 전략, 요청/응답 예시
- **데이터 모델**: DDL 수준 스키마(CREATE TABLE 문), 인덱스 전략과 근거, 마이그레이션 윤곽, 시드 데이터, 소프트 삭제/감사 컬럼
- **아키텍처**: 핵심 유스케이스별 시퀀스 다이어그램, 통합 포인트별 에러 처리 전략, 서킷 브레이커/리트라이 패턴, 헬스체크 설계
- **컴포넌트**: 모든 공개 메서드의 완전한 시그니처, DI 전략, 에러 타입 계층 구조

이 모드가 아니면 기존 수준의 스펙을 생성합니다.

---

## 동작 (단일 도메인 모드)

### 신규 프로젝트의 경우 (`type: new`)

`sdd-spec-writer` 에이전트를 사용하여 다음을 생성합니다:

1. **`02-architecture.md`** — 시스템 아키텍처
   - 기술 스택과 선정 근거
   - 모듈 구조 및 책임
   - 모듈 의존성 다이어그램
   - 공통 관심사 (에러 처리, 로깅, 설정)

2. **`03-api-spec.md`** — API 명세서
   - HTTP 메서드가 포함된 모든 엔드포인트
   - 요청/응답 스키마 (JSON)
   - 필드별 유효성 검사 규칙
   - 모든 에러 코드 및 응답
   - 페이지네이션 및 속도 제한

3. **`04-data-model.md`** — 데이터 모델
   - 모든 필드가 포함된 엔티티 정의
   - 필드 타입, 제약 조건, 기본값
   - 관계 및 외래 키
   - 목적이 명시된 인덱스
   - Enum 정의

4. **`05-component-breakdown.md`** — 컴포넌트 분해
   - 모듈 책임
   - 공개 인터페이스 (타입 포함)
   - 의존성 (내부/외부)
   - 컴포넌트별 에러 처리

5. **`06-spec-checklist.md`** — 스펙 준수 체크리스트
   - 위 스펙에서 검증 가능한 모든 항목
   - 카테고리 분류: ARCH, API, DM, COMP, TEST, SEC, PERF, UI
   - 각 항목은 해당 스펙 섹션을 참조
   - 하단에 진행률 추적기

### 레거시 프로젝트의 경우 (`type: legacy`)

`sdd-spec-writer` 에이전트를 사용하여 다음을 생성합니다:

1. **`02-change-impact.md`** — 변경 영향 분석
   - 영향을 받는 모듈 및 파일
   - 상위/하위 의존성 영향
   - 위험 평가
   - 하위 호환성 계획
   - 마이그레이션 및 롤백 전략

2. **`03-api-changes.md`** — API 변경 사항
   - 신규 엔드포인트
   - 변경된 엔드포인트 (현재 버전과의 차이 포함)
   - 폐기/삭제된 엔드포인트
   - 하위 호환성 전략

3. **`04-data-migration.md`** — 데이터 마이그레이션
   - 스키마 변경 사항
   - 필요한 마이그레이션 스크립트
   - 데이터 변환 규칙
   - 롤백 계획

4. **`05-component-changes.md`** — 컴포넌트 변경 사항
   - 신규 모듈
   - 변경된 모듈 (변경 설명 포함)
   - 제거된 모듈
   - 의존성 그래프 변경 사항

5. **`06-spec-checklist.md`** — 신규 프로젝트와 동일

---

## 동작 (멀티 도메인 모드)

### --shared (프로젝트 수준 아키텍처)

프로젝트 수준 공유 아키텍처를 생성합니다. **멀티 도메인에서 항상 먼저 실행**해야 합니다.

`sdd-spec-writer` 에이전트를 사용하여 `docs/specs/02-architecture.md`를 생성합니다:
- `templates/specs/project-architecture-multi.md.tmpl` 템플릿 사용
- 프로젝트 개요 및 도메인 경계 다이어그램
- 도메인 목록 테이블 (ID, 이름, 설명, 의존성)
- 기술 스택 (계층별 기술과 선정 근거)
- 공유 인프라 (인증/인가, 공통 미들웨어, DB 전략)
- 도메인 간 통신 방식 (동기 API / 비동기 이벤트)
- 횡단 관심사 (에러 처리, 로깅, 설정)
- 배포 아키텍처

### --domain=<id> (도메인별 스펙)

사전 조건: `docs/specs/domains/<domain-id>/01-requirements.md`가 존재해야 합니다.

`sdd-spec-writer` 에이전트를 사용하여 도메인 디렉토리에 스펙을 생성합니다:

1. **`domains/<id>/02-architecture.md`** — 도메인 아키텍처
   - `templates/specs/domain-architecture.md.tmpl` 템플릿 사용
   - 프로젝트 수준 아키텍처 (`docs/specs/02-architecture.md`) 참조
   - 도메인 내부 모듈 구조
   - 다른 도메인과의 연동 인터페이스

2. **`domains/<id>/03-api-spec.md`** — 도메인 API 스펙
   - **해당 도메인이 소유한 엔드포인트만** 포함
   - 다른 도메인의 API를 호출하는 경우: `(ref: <other-domain>/03-api-spec.md#<endpoint>)` 형태로 참조만 기록

3. **`domains/<id>/04-data-model.md`** — 도메인 데이터 모델
   - **해당 도메인이 소유한 엔티티만** 포함
   - 다른 도메인의 엔티티를 참조하는 경우: `(ref: <other-domain>/04-data-model.md#<entity>)` 형태로 참조만 기록

4. **`domains/<id>/05-component-breakdown.md`** — 도메인 컴포넌트
   - 해당 도메인 내부 모듈만 포함

5. **`domains/<id>/06-spec-checklist.md`** — 도메인 체크리스트
   - `templates/checklists/domain-checklist.md.tmpl` 템플릿 사용
   - **항목 ID에 도메인 접두사**: `<PREFIX>-<CATEGORY>-<NNN>`
   - 도메인 접두사 규칙: 도메인 ID를 대문자 축약형으로 변환
     - `device-mgmt` → `DEV`
     - `subscription` → `SUB`
     - `rate-plan` → `RATE`
     - `rate-benefit` → `BENEFIT`
     - 그 외: 도메인 ID의 첫 번째 단어를 대문자로 (예: `user-management` → `USER`)
   - 예: `DEV-API-001`, `SUB-DM-003`, `RATE-TEST-001`
   - 각 항목은 도메인 스펙 섹션을 참조: `(domains/<id>/03-api-spec.md#section)`

### --all (전체 도메인 일괄 생성)

1. **프로젝트 수준 아키텍처를 먼저 생성**합니다 (`--shared` 동작과 동일).

2. **도메인 의존성 순서에 따라** 각 도메인의 스펙을 생성합니다:
   - 의존성이 없는 도메인 먼저 (예: `device-mgmt`, `rate-plan`)
   - 의존하는 도메인 나중에 (예: `subscription`, `rate-benefit`)
   - 이유: 후속 도메인이 선행 도메인의 인터페이스를 참조할 수 있음

3. **크로스 도메인 통합 문서를 생성**합니다:

   a. `docs/specs/cross-domain/dependency-map.md`:
      - `templates/cross-domain/dependency-map.md.tmpl` 템플릿 사용
      - 도메인 의존성 그래프
      - 공유 엔티티 목록

   b. `docs/specs/cross-domain/integration-points.md`:
      - `templates/cross-domain/integration-points.md.tmpl` 템플릿 사용
      - 도메인 간 통합 포인트 (FK 참조, API 호출, 이벤트, 공유 엔티티)

   c. `docs/specs/cross-domain/integration-checklist.md`:
      - `templates/cross-domain/integration-checklist.md.tmpl` 템플릿 사용
      - 크로스 도메인 통합 검증 항목 (INT-NNN 형식)

4. **프로젝트 통합 체크리스트를 자동 집계**합니다:
   - `docs/specs/06-spec-checklist.md`를 생성합니다
   - `templates/checklists/project-checklist-multi.md.tmpl` 템플릿 사용
   - 모든 도메인의 `06-spec-checklist.md` 항목을 합칩니다
   - `cross-domain/integration-checklist.md` 항목을 추가합니다
   - 도메인별 섹션으로 구분합니다
   - **이 파일은 자동 생성됨 — 직접 편집 금지 표시**

### 도메인 미지정 시 (멀티 도메인 모드)

사용자에게 도메인 선택 목록을 표시합니다:
```
도메인을 선택하세요:
  1. device-mgmt (단말관리) [상태: 요구사항 수집 완료]
  2. subscription (구독 서비스) [상태: 요구사항 수집 완료]
  3. (shared) 프로젝트 수준 아키텍처만 생성
  4. (all) 모든 도메인 일괄 생성
```

---

## 다이어그램 자동 생성

스펙 생성 완료 후, 스펙 검토 요약을 출력하기 전에 다이어그램 PNG를 자동 생성합니다.

### 단일 도메인

1. `docs/specs/diagrams/` 디렉토리를 생성합니다 (없으면).
2. 각 스펙 파일에 대해 `scripts/sdd-generate-diagram.py`를 호출합니다:

| 입력 파일 | --type | 출력 PNG |
|----------|--------|---------|
| `docs/specs/02-architecture.md` | `dependency` | `docs/specs/diagrams/02-module-dependency.png` |
| `docs/specs/04-data-model.md` | `er` | `docs/specs/diagrams/04-er-diagram.png` |
| `docs/specs/05-component-breakdown.md` | `interaction` | `docs/specs/diagrams/05-component-interaction.png` |

3. 실패 시 경고만 표시하고 계속 진행합니다 (graceful degradation):
   ```
   ⚠ 다이어그램 생성 실패: 02-module-dependency.png (graphviz 미설치)
   ```

### 멀티 도메인

1. **프로젝트 수준**: `docs/specs/diagrams/` 디렉토리에 생성

| 입력 파일 | --type | 출력 PNG |
|----------|--------|---------|
| `docs/specs/02-architecture.md` | `domain` | `docs/specs/diagrams/02-domain-boundary.png` |

2. **도메인별**: `docs/specs/domains/<id>/diagrams/` 디렉토리에 생성

| 입력 파일 | --type | 출력 PNG |
|----------|--------|---------|
| `domains/<id>/02-architecture.md` | `dependency` | `domains/<id>/diagrams/02-domain-dependency.png` |
| `domains/<id>/04-data-model.md` | `er` | `domains/<id>/diagrams/04-er-diagram.png` |
| `domains/<id>/05-component-breakdown.md` | `interaction` | `domains/<id>/diagrams/05-component-interaction.png` |

3. **크로스 도메인**: `docs/specs/cross-domain/diagrams/` 디렉토리에 생성

| 입력 파일 | --type | 출력 PNG |
|----------|--------|---------|
| `cross-domain/dependency-map.md` | `dependency` | `cross-domain/diagrams/cross-domain-dependency.png` |

### 요약 출력

다이어그램 생성 결과를 스펙 검토 요약에 포함합니다:
```
다이어그램:
  02-module-dependency.png  ✓ 생성 (4개 모듈, 3개 의존성)
  04-er-diagram.png         ✓ 생성 (5개 엔티티, 4개 관계)
  05-component-interaction.png ⚠ 실패 (graphviz 미설치)
```

---

## 스펙 검토

생성 후 요약을 표시합니다:

**단일 도메인**:
```
기술 명세서가 생성되었습니다:
  - 02-architecture.md (또는 02-change-impact.md)
  - 03-api-spec.md (또는 03-api-changes.md)
  - 04-data-model.md (또는 04-data-migration.md)
  - 05-component-breakdown.md (또는 05-component-changes.md)
  - 06-spec-checklist.md (M개 카테고리에 N개 항목)

진행하기 전에 스펙을 검토하고 필요한 편집을 수행하세요.
다음 단계: /claude-sdd:sdd-plan — 태스크 분해 및 팀 멤버 배정
```

**멀티 도메인**:
```
기술 명세서가 생성되었습니다:

프로젝트 수준:
  - 02-architecture.md (멀티 도메인 아키텍처)
  - 06-spec-checklist.md (통합 체크리스트: N개 항목)

도메인별:
  - domains/device-mgmt/: 02~06 (19개 항목)
  - domains/subscription/: 02~06 (24개 항목)
  - domains/rate-plan/: 02~06 (15개 항목)
  - domains/rate-benefit/: 02~06 (18개 항목)

크로스 도메인:
  - cross-domain/dependency-map.md
  - cross-domain/integration-points.md
  - cross-domain/integration-checklist.md (8개 항목)

전체 체크리스트: 84개 항목 (4개 도메인 + 크로스 도메인)

진행하기 전에 스펙을 검토하고 필요한 편집을 수행하세요.
다음 단계: /claude-sdd:sdd-plan [--domain=<id> | --all] — 태스크 분해
```

## 퍼블리싱 (조건부)

`sdd-config.yaml`에서 `publishing.confluence.enabled: true`인 경우, 스펙 생성 완료 후 자동으로 Confluence에 퍼블리싱합니다.

1. `publishing` 설정을 확인합니다.
2. `enabled: true`이면 `/claude-sdd:sdd-publish --stage=spec`와 동일한 로직으로 생성된 스펙 파일(02~06)을 퍼블리싱합니다.
3. 다이어그램이 있는 파일(02-architecture, 04-data-model, 05-component)은 PNG를 함께 생성하여 첨부합니다.
4. 퍼블리싱 결과를 출력합니다:
   ```
   Confluence 퍼블리싱:
     02-아키텍처      ✓ 신규생성 (다이어그램 1개 첨부)
     03-API 스펙      ✓ 신규생성
     04-데이터 모델    ✓ 신규생성 (ER 다이어그램 첨부)
     05-컴포넌트 분해  ✓ 신규생성
     06-스펙 체크리스트 ✓ 신규생성
   ```
5. 퍼블리싱 실패 시 경고만 표시하고 다음 단계로 진행합니다.

## 출력

- 단일 도메인: `docs/specs/02-*.md`부터 `docs/specs/06-*.md`
- 멀티 도메인: `docs/specs/02-architecture.md` + `docs/specs/domains/<id>/02-*.md`부터 `06-*.md` + `docs/specs/cross-domain/*.md` + `docs/specs/06-spec-checklist.md` (통합)

## 의존성

- `docs/specs/01-requirements.md` 또는 `docs/specs/domains/<id>/01-requirements.md` (`/claude-sdd:sdd-intake`에서 생성)
- `docs/specs/sdd-config.yaml` (`/claude-sdd:sdd-init`에서 생성)
- `docs/specs/00-project-context.md` (선택 — `/claude-sdd:sdd-godmode`에서 생성, 집요한 설계 모드용)
