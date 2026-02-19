# 상황별 워크플로우 가이드

내 상황에 맞는 SDD 워크플로우를 빠르게 찾아보세요.

## 빠른 선택 가이드

| 상황 | 추천 워크플로우 | 바로가기 |
|------|----------------|----------|
| 처음부터 새 프로젝트를 시작 | 킥스타트 (풀 오토) | [시나리오 1](#시나리오-1-신규-프로젝트를-처음부터-시작) |
| 기존 코드베이스에 기능 추가 | 레거시 모드 | [시나리오 2](#시나리오-2-기존-코드베이스에-기능-추가) |
| 대규모 프로젝트 (여러 도메인) | 멀티 도메인 모드 | [시나리오 3](#시나리오-3-대규모-멀티-도메인-프로젝트) |
| 이미 완성된 기능에 변경 요청 | 변경 관리 | [시나리오 4](#시나리오-4-완성된-기능에-변경-요청-발생) |
| TDD로 품질 확보하며 개발 | TDD 모드 | [시나리오 5](#시나리오-5-tdd로-품질-확보하며-개발) |
| 작업 중 세션 끊김 / 재개 | 자동 감지 재개 | [시나리오 6](#시나리오-6-작업이-중단되었을-때-재개) |
| 특정 단계만 다시 실행 | 단계 재진입 | [시나리오 7](#시나리오-7-특정-단계만-다시-실행) |
| 코드 품질 점검만 필요 | 린트 / LSP | [시나리오 8](#시나리오-8-코드-품질-점검만-필요) |
| 진행 상황 확인 | 상태 대시보드 | [시나리오 9](#시나리오-9-진행-상황-확인) |

---

## 시나리오 1: 신규 프로젝트를 처음부터 시작

**상황**: 아무것도 없는 상태에서 새 프로젝트를 만들어야 합니다.

### 방법 A: 킥스타트 (추천 — 한 번에 끝까지)

```bash
/claude-sdd:sdd-kickstart
```

심층 인터뷰(기술 스택, 도메인 구조, 요구사항 소스, 비기능 요구사항 등)를 진행한 후, 전체 SDD 파이프라인을 **자동으로 끝까지** 실행합니다.

```
인터뷰 (6개 섹션)
  → sdd-init → sdd-intake → sdd-spec → sdd-plan → sdd-build → sdd-review → sdd-integrate
```

킥스타트는 `spec_depth: thorough`로 DDL 수준의 상세 스펙을 생성합니다.

### 방법 B: 단계별 수동 진행

```bash
/claude-sdd:sdd-init new           # 1. 프로젝트 초기화
/claude-sdd:sdd-intake interview   # 2. 요구사항 수집
/claude-sdd:sdd-spec               # 3. 기술 스펙 생성
/claude-sdd:sdd-plan               # 4. 태스크 분해
/claude-sdd:sdd-build              # 5. 구현
/claude-sdd:sdd-review             # 6. 리뷰
/claude-sdd:sdd-integrate          # 7. PR 생성
```

각 단계 사이에 스펙을 직접 검토하고 수정할 수 있어서, 세밀한 제어가 필요할 때 적합합니다.

### 방법 C: 자동 감지 모드

```bash
/claude-sdd:sdd-auto
```

현재 단계를 자동 감지하여 다음 단계로 진행합니다. 매번 어떤 명령어를 실행할지 고민할 필요 없이, `/claude-sdd:sdd-auto`만 반복 실행하면 됩니다.

---

## 시나리오 2: 기존 코드베이스에 기능 추가

**상황**: 이미 운영 중인 코드베이스에 새 기능을 추가해야 합니다.

```bash
/claude-sdd:sdd-init legacy        # 레거시 모드로 초기화
```

이후 흐름은 신규 프로젝트와 동일하지만, **생성되는 스펙이 다릅니다**:

| 신규 프로젝트 | 레거시 프로젝트 |
|--------------|----------------|
| 02-architecture.md | 02-change-impact.md |
| 03-api-spec.md | 03-api-changes.md |
| 04-data-model.md | 04-data-migration.md |
| 05-component-breakdown.md | 05-component-changes.md |

레거시 모드는 **하위 호환성**을 항상 고려합니다. 기존 API 변경 시 마이그레이션 전략이 포함되고, 데이터 모델 변경 시 마이그레이션 스크립트 개요가 생성됩니다.

### 요구사항 소스 결합

여러 소스의 요구사항을 결합할 수 있습니다:

```bash
/claude-sdd:sdd-intake jira:PROJ-100          # Jira에서 수집
/claude-sdd:sdd-intake confluence:PAGE-123     # Confluence에서 추가 수집
/claude-sdd:sdd-intake file:docs/prd.md        # 로컬 문서 추가
/claude-sdd:sdd-intake figma:https://...       # Figma 디자인 분석 추가
```

`sdd-intake`를 여러 번 실행하면 요구사항이 누적됩니다.

---

## 시나리오 3: 대규모 멀티 도메인 프로젝트

**상황**: 여러 도메인(단말관리, 구독, 요금제 등)으로 구성된 대규모 프로젝트입니다.

### 초기화

```bash
/claude-sdd:sdd-init new --domains
```

인터뷰를 통해 도메인 구조를 정의합니다. 예시:

| 도메인 ID | 이름 | 의존성 |
|-----------|------|--------|
| device-mgmt | 단말관리 | 없음 |
| subscription | 구독 | device-mgmt |
| rate-plan | 요금제 | 없음 |
| rate-benefit | 요금 혜택 | rate-plan, subscription |

### 도메인별 독립 라이프사이클

```bash
# 프로젝트 수준 아키텍처 먼저
/claude-sdd:sdd-spec --shared

# 도메인별 스펙 (병렬 가능)
/claude-sdd:sdd-spec --domain=device-mgmt
/claude-sdd:sdd-spec --domain=rate-plan

# 의존성이 해소된 도메인 빌드
/claude-sdd:sdd-build --domain=device-mgmt
/claude-sdd:sdd-build --domain=rate-plan

# 의존 도메인 빌드 (device-mgmt 완료 후)
/claude-sdd:sdd-build --domain=subscription

# 크로스 도메인 통합 빌드
/claude-sdd:sdd-build --integration

# 전체 리뷰
/claude-sdd:sdd-review --all
```

### 자동 모드 활용 (추천)

```bash
/claude-sdd:sdd-auto
```

멀티 도메인에서 `/claude-sdd:sdd-auto`는 전체 도메인 상태를 분석하고, **의존성과 진행률을 고려하여 최적의 다음 작업을 자동으로 권장**합니다:

```
도메인별 상태:
  device-mgmt:   Build    14/19 (74%)  ← 진행 중
  subscription:  Spec     —            (의존: device-mgmt)
  rate-plan:     Complete 15/15 (100%) ✓
  rate-benefit:  Plan     0/18  (0%)   (의존: rate-plan ✓, subscription ✗)

권장 다음 작업:
  /claude-sdd:sdd-build --domain=device-mgmt
  (이유: 가장 높은 진행률, subscription이 이 도메인에 의존)
```

---

## 시나리오 4: 완성된 기능에 변경 요청 발생

**상황**: 통합(integrate)까지 완료된 기능에 변경이 필요합니다.

```bash
/claude-sdd:sdd-change
```

7 Phase 변경 관리 워크플로우가 실행됩니다:

```
Phase 1: 변경 요청 인터뷰 → 09-change-request.md
Phase 2: sdd-change-analyst → 영향 분석 + 스펙 델타
Phase 3: 체크리스트 부분 갱신
           - 영향받는 [x] → [ ] (재설정)
           - 영향받지 않는 [x] → 변경 안함
           - CHG-NNN 항목 추가 (새 기능)
           - CHG-REG-NNN 항목 추가 (회귀 테스트)
Phase 4: 델타 태스크 계획 (CWP-1, CWP-2...)
Phase 5: TDD 델타 빌드
Phase 6: 리뷰 + 회귀 검증
Phase 7: 변경 추적성이 포함된 PR
```

### 핵심: 최소 영향 원칙

변경 관리에서 가장 중요한 원칙은 **최소 영향**입니다:
- 이미 검증된 체크리스트 항목은 변경하지 않음
- 영향받는 항목만 정확히 재설정
- 회귀 테스트(CHG-REG)로 기존 기능 보존 검증

### 변경 사이클 관리

```bash
/claude-sdd:sdd-change status     # 현재 변경 사이클 상태 확인
/claude-sdd:sdd-change resume     # 중단된 변경 사이클 재개
```

---

## 시나리오 5: TDD로 품질 확보하며 개발

**상황**: 테스트 주도 개발로 견고한 코드를 작성하고 싶습니다.

### 활성화 방법

```bash
# 방법 A: 빌드 시 플래그
/claude-sdd:sdd-build --tdd

# 방법 B: 설정 파일 (항상 TDD)
# sdd-config.yaml에 추가:
#   teams:
#     tdd: true
```

### TDD 빌드 루프

```
Phase A (Red):   sdd-test-writer가 스펙 기반 실패 테스트 작성
                 - 체크리스트 항목당 최소 1개 테스트
                 - 구현 코드 생성 금지 (테스트만!)

Phase B (Green): sdd-implementer가 테스트 통과 코드 작성
                 - 테스트 파일 수정 금지 (수정 시 재작업)
                 - 테스트를 통과하는 최소한의 코드

Phase C (Verify): 리더가 전체 테스트 실행
                 - 통과 → 다음 워크 패키지
                 - 실패 → Phase B+C 반복 (최대 3회)
```

### TDD + 변경 관리

`/claude-sdd:sdd-change`도 TDD 모드를 지원합니다. 변경 시 **CHG-** 테스트(새 기능)와 **CHG-REG-** 테스트(회귀 방지)가 먼저 작성됩니다.

---

## 시나리오 6: 작업이 중단되었을 때 재개

**상황**: 세션이 끊기거나 작업을 중단해야 했습니다.

### 방법 A: 자동 감지 재개

```bash
/claude-sdd:sdd-auto
```

`docs/specs/` 디렉토리의 파일 상태를 분석하여 마지막으로 완료된 단계 다음부터 자동으로 재개합니다.

### 방법 B: 킥스타트 재개

```bash
/claude-sdd:sdd-kickstart resume
```

킥스타트로 시작한 프로젝트라면 이 명령어로 재개할 수 있습니다. `00-project-context.md`를 읽어 프로젝트 컨텍스트를 복원하고, 중단된 단계부터 자동으로 재개합니다.

### 방법 C: 특정 단계부터 수동 재개

```bash
# 빌드 중에 끊겼다면
/claude-sdd:sdd-build              # 미완료 워크 패키지부터 재개

# 특정 워크 패키지 재작업
/claude-sdd:sdd-build wp-2 rework  # WP-2 재작업

# 변경 관리 중 끊겼다면
/claude-sdd:sdd-change resume      # 변경 사이클 재개
```

---

## 시나리오 7: 특정 단계만 다시 실행

**상황**: 스펙을 수정했으니 계획부터 다시 하고 싶습니다. 또는 리뷰에서 문제가 나와서 빌드를 다시 해야 합니다.

SDD의 모든 단계는 **독립적으로 재진입 가능**합니다:

```bash
# 스펙 수정 후 계획 재수립
/claude-sdd:sdd-plan

# 리뷰 실패 후 빌드 재실행
/claude-sdd:sdd-build

# 요구사항 추가 수집
/claude-sdd:sdd-intake file:docs/additional-requirements.md

# 스펙 재생성 (요구사항 변경 시)
/claude-sdd:sdd-spec
```

### 리뷰 → 빌드 루프백

리뷰에서 실패한 항목이 있으면 빌드 단계로 자동 루프백됩니다:

```
sdd-review → 항목 실패 발견 → sdd-build (해당 항목만 재작업) → sdd-review
```

---

## 시나리오 8: 코드 품질 점검만 필요

**상황**: SDD 라이프사이클 없이, 기존 코드의 품질만 점검하고 싶습니다.

### 린트 (네이티브 도구 기반)

```bash
# 프로젝트 진단 (에러/경고)
/claude-sdd:sdd-lint diagnostics

# 코드 구조 검색 (ast-grep)
/claude-sdd:sdd-lint search "export async function $NAME($$$) { $$$ }"

# 함수/클래스/export 심볼 추출
/claude-sdd:sdd-lint symbols src/

# 코드 포매팅 검사
/claude-sdd:sdd-lint format

# 자동 포매팅 적용
/claude-sdd:sdd-lint format --fix
```

### LSP (의미 분석)

Language Server가 설치되어 있으면 더 정확한 분석이 가능합니다:

```bash
# 설치 상태 확인
/claude-sdd:sdd-lsp status

# 의미 수준 진단 (타입 에러, 미해결 참조)
/claude-sdd:sdd-lsp diagnostics src/user/controller.ts

# 참조 찾기 (리팩토링 영향 범위 파악)
/claude-sdd:sdd-lsp references src/user/model.ts 12 10

# 심볼 추출 (LSP 기반, 더 정확)
/claude-sdd:sdd-lsp symbols src/user/controller.ts

# 호출 계층 분석
/claude-sdd:sdd-lsp incoming-calls src/user/controller.ts 28 15
```

### 지원 언어

| 언어 | 린트 진단 | 포매터 | LSP 서버 |
|------|----------|--------|----------|
| TypeScript/JS | `tsc --noEmit` | `prettier` / `biome format` | `typescript-language-server` |
| Python | `ruff check` | `ruff format` / `black` | `pyright-langserver` |
| Go | `go vet` | `gofmt` | `gopls` |
| Rust | `cargo check` | `rustfmt` | `rust-analyzer` |
| Java | `gradle build --dry-run` / `mvn compile` | `google-java-format` | `jdtls` |
| Kotlin | `gradle build --dry-run` | `ktfmt` | `kotlin-language-server` |
| C/C++ | `clang-tidy` | `clang-format` | `clangd` |

---

## 시나리오 9: 진행 상황 확인

**상황**: 현재 프로젝트가 어디까지 진행되었는지 한눈에 보고 싶습니다.

```bash
/claude-sdd:sdd-status
```

출력 예시:

```
SDD 상태 대시보드

프로젝트: my-project (유형: new)

단계별 진행 상황:
  [x] 1. Intake      -- 요구사항 수집 완료
  [x] 2. Spec        -- 스펙 문서 5개 생성
  [x] 3. Plan        -- 4개 워크 패키지에 12개 태스크
  [ ] 4. Build       -- 체크리스트 8/12 항목 (67%)
  [ ] 5. Review      -- 시작 전
  [ ] 6. Integrate   -- 시작 전

체크리스트: 8/12 완료 (67%)
  ARCH:  2/2  100%
  API:   3/4   75%
  DM:    2/2  100%
  TEST:  1/4   25%
```

### 멀티 도메인 상태

```bash
/claude-sdd:sdd-status                       # 전체 프로젝트 개요
/claude-sdd:sdd-status --domain=device-mgmt  # 특정 도메인 상세
```

---

## 워크플로우 조합 패턴

### 패턴 A: 빠른 MVP (권장 입문 경로)

```
/claude-sdd:sdd-kickstart
```

인터뷰 한 번으로 끝까지 자동 실행. 초보자에게 가장 추천.

### 패턴 B: 신중한 단계별 진행

```
sdd-init → sdd-intake → (스펙 검토) → sdd-spec → (스펙 수정) → sdd-plan → sdd-build → sdd-review → sdd-integrate
```

각 단계마다 직접 검토하고 수정. 스펙의 정확성이 중요한 프로젝트에 적합.

### 패턴 C: 레거시 + TDD

```
sdd-init legacy → sdd-intake → sdd-spec → sdd-plan → sdd-build --tdd → sdd-review → sdd-integrate
```

기존 코드베이스에 TDD로 안전하게 기능 추가. 회귀 버그 방지가 중요한 경우.

### 패턴 D: 멀티 도메인 + 변경 관리

```
sdd-init --domains → (도메인별 라이프사이클) → sdd-integrate → sdd-change
```

대규모 프로젝트를 도메인별로 개발하고, 이후 변경 요청을 체계적으로 관리.

### 패턴 E: 분석 → 스펙만 (코드 생성 없이)

```
sdd-init → sdd-intake → sdd-spec → sdd-plan
```

스펙과 태스크 계획만 생성하고, 구현은 수동으로 진행. 설계 문서가 주 목적인 경우.

---

## 자주 묻는 질문

### Q: `/claude-sdd:sdd-auto`와 `/claude-sdd:sdd-kickstart`의 차이는?

| | `sdd-auto` | `sdd-kickstart` |
|-|-----------|----------------|
| 인터뷰 | 없음 | 6섹션 심층 인터뷰 |
| 스펙 상세도 | 일반 | `spec_depth: thorough` (DDL 수준) |
| 시작점 | 기존 프로젝트 상태에서 이어감 | 처음부터 시작 |
| 제어 수준 | 한 단계씩 진행 | 끝까지 자동 실행 |

### Q: 스펙을 직접 수정해도 되나요?

네. 스펙 파일은 일반 마크다운입니다. 다음 단계로 진행하기 전에 자유롭게 편집할 수 있습니다. 수정한 뒤 `sdd-plan`이나 `sdd-build`를 실행하면 수정된 스펙이 반영됩니다.

### Q: 빌드 중 에러가 나면?

리더가 최대 3회까지 재작업을 지시합니다. 3회 실패 시 사용자에게 에스컬레이션됩니다. 직접 개입하여 코드를 수정한 뒤 `/claude-sdd:sdd-build`를 다시 실행할 수 있습니다.

### Q: MCP 없이도 사용할 수 있나요?

네. Confluence/Jira MCP 없이도 다음 대안으로 요구사항을 수집할 수 있습니다:
- `/claude-sdd:sdd-intake interview` — 대화형 인터뷰
- `/claude-sdd:sdd-intake file:path/to/doc.md` — 로컬 문서
- `/claude-sdd:sdd-intake figma:URL` — Figma 디자인 분석

### Q: LSP 서버가 없으면?

`/claude-sdd:sdd-lint`의 네이티브 도구(tsc, ruff, go vet 등)로 자동 폴백됩니다. LSP는 더 정확한 분석을 제공하지만, 없어도 SDD를 사용하는 데 문제없습니다.
