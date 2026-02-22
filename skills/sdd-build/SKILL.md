---
name: sdd-build
description: >-
  Agent Teams로 워크 패키지를 구현합니다. 품질 루프(최대 3회 재작업)를 통해 스펙 준수를 보장합니다. 멀티 도메인 프로젝트에서는 도메인별/통합 빌드를 지원합니다.
  Use when: "구현해줘", "빌드 시작", "코드 작성", "build", "implement", "개발 시작"
---

# /claude-sdd:sdd-build — Agent Teams를 통한 구현

리더 주도의 품질 루프를 갖춘 Claude Code Agent Teams를 사용하여 워크 패키지를 실행합니다.

## 사용법

```
/claude-sdd:sdd-build                 # 단일: 빌드 시작/재개 / 멀티: 도메인 선택 요청
/claude-sdd:sdd-build wp-1            # 특정 워크 패키지만 빌드
/claude-sdd:sdd-build wp-1 rework     # 특정 패키지에 피드백 기반 재작업
/claude-sdd:sdd-build --tdd           # TDD 모드로 빌드 (테스트 먼저 → 구현 → 검증)

# 멀티 도메인 옵션
/claude-sdd:sdd-build --domain=<id>              # 특정 도메인 빌드
/claude-sdd:sdd-build --domain=<id> --tdd        # 특정 도메인 TDD 빌드
/claude-sdd:sdd-build --domain=<id> DEV-WP-1     # 특정 도메인의 특정 WP 빌드
/claude-sdd:sdd-build --domain=<id> DEV-WP-1 rework  # 특정 도메인 WP 재작업
/claude-sdd:sdd-build --integration              # 크로스 도메인 통합 빌드
```

## 사전 조건

1. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 활성화되어야 함
2. `docs/specs/sdd-config.yaml`을 읽어 프로젝트 설정을 확인합니다.
3. **모델 설정 읽기**: `sdd-config.yaml`의 `teams` 섹션에서 모델을 결정합니다:
   - `teams.model` (기본: `"sonnet"`) — 구현, 테스트, 리뷰 등 사고가 필요한 작업
   - `teams.lightweight_model` (기본: `"haiku"`) — 코드 분석, 린트, 포맷팅 등 도구 실행 위주 작업
4. **TDD 모드 감지**: `--tdd` 플래그가 있거나 `sdd-config.yaml`의 `teams.tdd: true`이면 TDD 모드를 활성화합니다.
5. **레거시 모드 감지**: `sdd-config.yaml`의 `project.type`이 `legacy`이면 레거시 모드를 활성화합니다.
6. **도메인 모드 감지**: `domains` 키 존재 여부로 단일/멀티 도메인 모드를 결정합니다:
   - `domains` 없음 또는 빈 배열 → **단일 도메인 모드** (기존 동작)
   - `domains` 존재 → **멀티 도메인 모드**
7. 태스크 계획 존재 확인:
   - 단일 도메인: `docs/specs/07-task-plan.md` 및 `docs/specs/06-spec-checklist.md`
   - 멀티 도메인: `docs/specs/domains/<domain-id>/07-task-plan.md` 및 `docs/specs/domains/<domain-id>/06-spec-checklist.md`

---

## 핵심 메커니즘: Agent Teams 병렬 빌드 + 품질 루프

**중요: 같은 단계(stage)의 워크 패키지는 반드시 병렬로 실행합니다.**

```
팀 리더 (현재 세션, opus):
  1. 태스크 계획 읽기 (07-task-plan.md)
     - 워크 패키지를 실행 단계(stage)별로 그룹화
     - 예: Stage 1 = [WP-1, WP-2, WP-3] (병렬), Stage 2 = [WP-4] (순차)

  2. 각 실행 단계(stage)에 대해:

     a. TeamCreate로 팀 생성 (team_name: "sdd-build")
     b. TaskCreate로 각 워크 패키지를 태스크로 등록
     c. Task 도구로 팀 멤버를 **동시에** 생성 (한 번의 메시지에 여러 Task 호출):
        - Task(team_name="sdd-build", name="wp-1", subagent_type="general-purpose")
        - Task(team_name="sdd-build", name="wp-2", subagent_type="general-purpose")
        - Task(team_name="sdd-build", name="wp-3", subagent_type="general-purpose")
        ※ 각 팀 멤버의 prompt에 sdd-implementer 에이전트 역할 + WP 태스크 + 스펙 참조 포함
     d. 모든 팀 멤버의 완료 대기 (idle 알림 수신)

  3. 전체 워크 패키지 완료 후 체크리스트 검증:
     - 06-spec-checklist.md 읽기
     - 배정된 각 항목에 대해:
       - [x]로 표시되었는가?
       - 코드가 실제로 존재하는가?
     - [ ] 항목이 남아있으면 → 재작업 사이클
     - 모두 [x]이면 → 다음 단계 또는 완료

  4. 팀 멤버에게 shutdown_request 전송 후 다음 단계로

재작업 사이클:
  팀 리더가 미완료 항목을 식별하고, 해당 WP 담당 멤버에게 SendMessage로
  구체적인 피드백을 전달합니다:
  "항목 API-003, DM-005가 미완료입니다.
   API-003: UserController에 422 에러 핸들러가 없습니다.
   DM-005: email 필드 유효성 검사가 구현되지 않았습니다.
   이 항목들을 수정하세요."

  워크 패키지당 최대 3회 재작업 사이클.
  3회 후 → 사용자에게 에스컬레이션.
```

### 병렬 실행 예시

### 모델 선택 기준

| 작업 유형 | 모델 (설정 키) | 기본값 | 사용 에이전트 |
|-----------|---------------|--------|-------------|
| 구현, 테스트 작성, 분석 | `teams.model` | `sonnet` | sdd-implementer, sdd-test-writer |
| 코드 분석, 린트, 포맷 | `teams.lightweight_model` | `haiku` | sdd-code-analyzer |

```
Stage 1 (병렬):
  ┌─ 팀 멤버 "wp-1" (teams.model) → WP-1: User 모듈
  ├─ 팀 멤버 "wp-2" (teams.model) → WP-2: Auth 모듈
  └─ 팀 멤버 "wp-3" (teams.model) → WP-3: Payment 모듈
  [전원 완료 대기]

체크리스트 검증 → 재작업 필요 시 해당 멤버에게만 메시지 전송

Stage 2 (순차, Stage 1 완료 후):
  └─ 팀 멤버 "wp-4" (Sonnet) → WP-4: Integration
  [완료 대기]

체크리스트 검증 → 완료
```

---

## TDD 모드 빌드 루프

`--tdd` 플래그가 있거나 `sdd-config.yaml`의 `teams.tdd: true`인 경우, 각 워크 패키지에 대해 기존 빌드 루프 대신 **Phase A/B/C 빌드 루프**를 실행합니다.

**TDD에서도 같은 단계의 워크 패키지는 병렬로 실행합니다.** 각 WP의 Phase A→B→C는 독립적으로 진행됩니다.

### TDD Phase A (Red): 실패 테스트 작성 — 병렬

같은 단계의 모든 WP에 대해 `sdd-test-writer` 팀 멤버를 **동시에** 생성합니다:

```
# 한 번의 메시지에서 여러 Task를 동시에 호출
Task(team_name="sdd-build", name="wp-1-test", model="sonnet",
     prompt="당신은 sdd-test-writer입니다. WP-1의 스펙에 기반하여 실패하는 테스트를 작성하세요...")
Task(team_name="sdd-build", name="wp-2-test", model="sonnet",
     prompt="당신은 sdd-test-writer입니다. WP-2의 스펙에 기반하여 실패하는 테스트를 작성하세요...")
```

모든 테스트 작성자가 완료되면:
- 테스트 파일이 생성되었는지 확인합니다.
- `sdd-config.yaml`의 `test.command`로 테스트를 실행하여 모두 실패하는지 확인합니다 (Red 상태).
- 테스트가 통과하면 이미 구현이 존재하는 것이므로 사용자에게 알립니다.
- 테스트 작성자 멤버에게 `shutdown_request`를 보냅니다.

```
TDD Phase A — 병렬 실행:
  WP-1 테스트 작성: sdd-test-writer 실행 중...  ┐
  WP-2 테스트 작성: sdd-test-writer 실행 중...  ├─ 동시 진행
  WP-3 테스트 작성: sdd-test-writer 실행 중...  ┘
  [전원 완료]
  WP-1: 3개 파일, 8개 테스트 — 8/8 실패 (Red ✓)
  WP-2: 2개 파일, 5개 테스트 — 5/5 실패 (Red ✓)
  WP-3: 4개 파일, 12개 테스트 — 12/12 실패 (Red ✓)
  Phase B로 진행합니다.
```

### TDD Phase B (Green): 테스트 통과 구현 — 병렬

같은 단계의 모든 WP에 대해 `sdd-implementer` 팀 멤버를 **동시에** 생성합니다:

```
Task(team_name="sdd-build", name="wp-1-impl", model="sonnet",
     prompt="당신은 sdd-implementer입니다. TDD 모드입니다.
             테스트 파일을 먼저 읽고, 모든 테스트가 통과하도록 구현하세요.
             테스트 파일은 절대 수정하지 마세요. ...")
Task(team_name="sdd-build", name="wp-2-impl", model="sonnet",
     prompt="당신은 sdd-implementer입니다. TDD 모드입니다. ...")
```

모든 구현자가 완료되면:
- **테스트 파일 무결성 확인**: Phase B 완료 후 테스트 파일이 수정되지 않았는지 확인합니다.
- 수정된 경우 해당 멤버에게 재작업을 지시합니다: "테스트 파일이 수정되었습니다. 테스트 파일을 원래대로 복원하고 구현 코드만 수정하세요."

### TDD Phase C (Verify): 테스트 실행 검증

1. **전체 테스트 실행**: `sdd-config.yaml`의 `test.command`로 테스트를 실행합니다.
2. **결과 판정**:
   - 모든 테스트 통과 → 워크 패키지 완료, 체크리스트 검증으로 진행
   - 실패 테스트 존재 → Phase B 재작업 (실패 목록과 함께)

```
TDD Phase C — 워크 패키지 WP-1:
  테스트 실행: npm test
  결과: 8/8 통과 (Green 상태 ✓)
  체크리스트 검증으로 진행합니다.
```

### TDD 재작업 사이클

Phase C에서 실패 시 Phase B+C를 반복합니다 (최대 3회). 해당 WP 담당 멤버에게 `SendMessage`로 재작업을 지시합니다:

```
TDD 재작업 사이클 1/3:
  실패 테스트:
  - [FAIL] API-001: GET /users 페이지네이션 — Expected 20 items, got 0
  - [FAIL] DM-001: User 엔티티 email 필드 — Field not found

  → SendMessage(recipient="wp-1-impl", content="다음 테스트가 실패합니다.
    테스트를 수정하지 말고 구현 코드만 수정하세요:
    1. API-001: 페이지네이션 로직 구현 필요
    2. DM-001: User 모델에 email 필드 추가 필요")

  여러 WP에 실패가 있으면 동시에 메시지 전송:
  → SendMessage(recipient="wp-2-impl", content="...")
```

3회 재작업 후에도 실패 → 기존 에스컬레이션 프로세스와 동일하게 사용자에게 보고합니다.

---

## 레거시 모드: 분석 전용 빌드

`sdd-config.yaml`의 `project.type`이 `legacy`인 경우, 빌드 단계에서 **코드 변경 없이 분석(analysis)과 구조 분석만** 수행합니다. 모든 코드 변경은 `/claude-sdd:sdd-change` 워크플로우를 통해 처리합니다.

**레거시 모드에서도 같은 단계의 워크 패키지는 병렬로 분석합니다.**

### 레거시 분석 Phase (Analysis-Only): 기존 코드 분석 — 병렬

같은 단계의 모든 WP에 대해 `sdd-implementer` 팀 멤버를 **동시에** 생성하되, 분석 전용 모드 프롬프트를 사용합니다:

```
Task(team_name="sdd-build", name="wp-1", model="sonnet",
     prompt="당신은 sdd-implementer입니다. 레거시 분석 전용 모드입니다.
             기존 코드와 스펙을 대조하세요.
             이미 스펙을 충족하는 항목은 [x]로 표시하고, 미충족 항목은 [ ]로 남기세요.
             각 항목에 대해 근거(파일 경로:줄 번호)를 보고하세요.
             미충족 항목은 갭 유형(MISSING/PARTIAL/MISMATCH)과 상세를 보고하세요.
             새 코드를 작성하지 마세요. 분석만 수행하세요. ...")
Task(team_name="sdd-build", name="wp-2", model="sonnet",
     prompt="당신은 sdd-implementer입니다. 레거시 분석 전용 모드입니다. ...")
```

모든 분석이 완료되면:
- 각 멤버의 분석 보고서를 수집합니다.
- 이미 충족된 항목(`[x]`)과 미충족 항목(`[ ]`)을 집계합니다.
- `06-spec-checklist.md`를 갱신합니다: 충족 (satisfied) 항목만 `[x]`로 표시.

```
레거시 분석 결과:
  WP-1: 8개 항목 중 5개 충족 (satisfied), 3개 미충족 (gap)
  WP-2: 6개 항목 중 6개 충족 (satisfied) → 갭 없음
  WP-3: 10개 항목 중 7개 충족 (satisfied), 3개 미충족 (gap)

  전체: 24개 항목 중 18개 충족, 6개 미충족 (갭)
```

### 기존 테스트 검증

분석 완료 후 기존 테스트를 실행하여 현재 상태 스냅샷을 확보합니다:

1. `sdd-config.yaml`의 `test.command`로 기존 테스트를 실행합니다.
2. 테스트 결과를 기록합니다 (통과/실패/건너뜀).
3. 이 결과는 이후 변경 관리에서 회귀 검증의 베이스라인이 됩니다.

```
기존 테스트 검증:
  테스트 명령: npm test
  전체: 45개, 통과: 45개, 실패: 0개
  테스트 베이스라인 확립 완료
```

### 분석 보고서 생성

분석 결과와 테스트 검증 결과를 종합하여 `docs/specs/10-analysis-report.md`를 생성합니다.
`templates/specs/analysis-report.md.tmpl` 템플릿을 사용하며, 다음을 포함합니다:

1. **워크 패키지별 분석 결과**: 충족 항목 (근거 포함) + 갭 항목 (유형, 상세)
2. **기존 테스트 검증 결과**: 테스트 실행 결과, 베이스라인 정보
3. **갭 요약**: 전체 갭 항목을 기능별로 그룹핑
4. **추천 변경 요청**: 갭 항목을 기능 영역별로 그룹핑한 CR 추천 목록
5. **하위 호환성 베이스라인**: 기존 공개 API, 데이터 구조, 테스트 파일 목록

### 추천 CR 생성 및 사용자 선택

분석 보고서의 갭 항목을 기능 영역별로 그룹핑하여 추천 CR 목록을 생성하고, 사용자에게 다음 옵션을 제시합니다:

```
분석 완료. 6개 갭 항목이 식별되었습니다.

추천 변경 요청:
  CR-001: API 레이어 갭 (3개 항목: API-003, API-007, SEC-001)
  CR-002: 데이터 모델 갭 (1개 항목: DM-005)
  CR-003: 테스트 커버리지 갭 (2개 항목: TEST-004, TEST-008)

옵션:
  1. 전체 수락 — 3개 CR 생성 후 /claude-sdd:sdd-change로 진행
  2. 단일 CR — 모든 갭을 1개 CR로 통합
  3. 커스터마이즈 — 그룹핑 조정 또는 특정 갭 제외
  4. 수동 — /claude-sdd:sdd-change를 직접 실행하여 CR 생성
```

`sdd-config.yaml`의 `legacy.analysis_cr_mode` 설정에 따라:
- `suggest` (기본): 위 옵션을 사용자에게 제시
- `auto`: 자동으로 추천 CR을 생성하고 `/claude-sdd:sdd-change`로 진행
- `manual`: 분석 보고서만 생성하고 사용자가 직접 CR을 관리

### 레거시 팀 멤버 프롬프트 구성

팀 멤버 프롬프트 구성 시 다음을 추가합니다:

1. `agents/sdd-implementer.md`의 **레거시 분석 전용 모드** 섹션이 포함되도록 합니다.
2. `templates/claude-md/sdd-member.md.tmpl`의 `{{LEGACY_ANALYSIS_MODE}}` 변수를 `true`로 설정합니다.
3. 워크 패키지 컨텍스트에 **분석 대상 기존 코드 경로**를 포함합니다.

### 레거시 모드 완료 보고

```
빌드 단계 완료! (레거시 모드 — 분석 전용)

분석 결과:
  전체 항목: 24개
  기존 코드 충족: 18개 (satisfied)
  미충족 (갭): 6개

기존 테스트: 45/45 통과 (베이스라인 확립 ✓)
분석 보고서: docs/specs/10-analysis-report.md

추천 CR: 3개 (6개 갭 항목)

다음 단계: /claude-sdd:sdd-change [--from-analysis] — 갭 해소를 위한 변경 관리 시작
         또는: /claude-sdd:sdd-change --lightweight --from-analysis — 소규모 갭 빠른 처리
```

---

## 동작 (단일 도메인 모드)

### 1단계: 태스크 계획 읽기

`docs/specs/07-task-plan.md`를 파싱하여 다음을 식별합니다:
- 워크 패키지와 해당 태스크
- 실행 단계 (병렬 vs 순차)
- 현재 진행 상황 (완료된 WP 확인)

### 2단계: 팀 생성 및 병렬 워크 패키지 실행

현재 실행 단계(stage)의 모든 워크 패키지를 **동시에** 실행합니다.

1. **팀 생성**: `TeamCreate`로 팀을 생성합니다 (team_name: `"sdd-build"`)

2. **태스크 등록**: `TaskCreate`로 각 워크 패키지를 태스크로 등록합니다

3. **팀 멤버 동시 생성**: `Task` 도구를 **한 번의 메시지에 여러 개 호출**하여 병렬 생성:

   **프롬프트 구성** (각 멤버마다):
   1. `agents/sdd-implementer.md` 파일을 Read 도구로 **먼저 읽고** 전체 내용을 프롬프트 시작 부분에 포함합니다.
      (TDD Phase A: `agents/sdd-test-writer.md` 사용)
   2. 워크 패키지 컨텍스트 추가: 태스크 목록, 스펙 참조 경로, 체크리스트 항목.
   3. 대상 프로젝트에 `docs/specs/wp-N-member.md`(`/claude-sdd:sdd-assign`에서 생성)가 있으면 추가.
   4. **프로젝트 규칙 주입** (규칙 활성화 시):
      - `docs/specs/sdd-config.yaml`의 `rules.enabled`가 `true`이면:
      - `docs/specs/rules/architecture.md` + `docs/specs/rules/coding-conventions.md`를 항상 포함
      - WP에 해당하는 카테고리 규칙 파일을 선별하여 포함:
        - API 관련 WP → `rules/api-design.md` 추가
        - 데이터 모델 WP → `rules/data-model.md` 추가
        - 보안 관련 WP → `rules/security.md` 추가
      - `docs/specs/00-project-rules.md`의 요약 테이블을 인덱스로 포함

   ```
   # 반드시 하나의 메시지에서 여러 Task를 동시에 호출합니다!
   Task(
     team_name="sdd-build", name="wp-1",
     subagent_type="general-purpose", model="sonnet",
     prompt="[agents/sdd-implementer.md 전체 내용을 여기에 삽입]

             --- 워크 패키지 할당 ---
             워크 패키지 WP-1: [태스크 목록]
             스펙 참조: [파일 경로]
             체크리스트 항목: [항목 목록]

             --- 멤버 규칙 ---
             [wp-1-member.md 내용]"
   )
   ```

   **중요**: `[agents/sdd-implementer.md 전체 내용을 여기에 삽입]`은 플레이스홀더가 아닙니다.
   실제로 해당 파일을 Read 도구로 읽어서 그 텍스트를 프롬프트에 삽입하세요.

4. **전원 완료 대기**: 모든 팀 멤버가 idle/완료될 때까지 대기합니다
   - 팀 멤버가 완료 보고를 보내면 해당 태스크를 `TaskUpdate`로 completed 처리
   - 문제 보고를 받으면 기록

### 3단계: 품질 검증 루프

**모든 병렬 워크 패키지가 완료된 후** 체크리스트를 일괄 검증합니다:

1. `docs/specs/06-spec-checklist.md` 읽기
2. 각 워크 패키지별 배정된 체크리스트 항목 확인
3. 여전히 `[ ]`인 항목에 대해:
   - 누락된 사항 식별
   - 해당 WP 담당 팀 멤버에게 `SendMessage`로 구체적인 재작업 지시 전달
   - 여러 팀 멤버에게 재작업이 필요하면 **동시에 메시지 전송**

```
재작업 사이클 1/3:
  WP-1 미완료 항목:
  - API-003: UserController에 422 에러 핸들러 누락
  → SendMessage(recipient="wp-1", content="API-003: 422 에러 핸들러를 추가하세요...")

  WP-2 미완료 항목:
  - DM-005: User 모델에 email 유효성 검사 미구현
  → SendMessage(recipient="wp-2", content="DM-005: email 유효성 검사를 구현하세요...")

  [재작업 완료 대기]
```

#### 규칙 준수 검증 (규칙 활성화 시)

`sdd-config.yaml`의 `rules.enabled`가 `true`이고 `rules.validation.on_build`가 `true`이면:

1. 수정된 파일 목록에서 관련 규칙을 식별합니다.
2. Grep/Glob으로 규칙 위반을 확인합니다:
   - import 방향 (아키텍처 규칙)
   - 파일/디렉토리 구조 (코딩 컨벤션)
   - 네이밍 패턴 (코딩 컨벤션)
3. 위반 발견 시 체크리스트 검증과 동일하게 재작업을 지시합니다:
   ```
   "프로젝트 규칙 위반:
    - RULE-ARCH-001: src/service/UserService.ts에서 Repository를 직접 import
    docs/specs/rules/architecture.md를 참조하여 수정하세요."
   ```
4. `enforcement: "strict"` → 위반 = FAIL (재작업 필수)
5. `enforcement: "advisory"` → 위반 = 경고 (보고만, 진행 가능)

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

5. **팀 정리**: 현재 단계 완료 시 `SendMessage(type="shutdown_request")`로 팀 멤버를 종료하고, 다음 단계로 진행합니다

### 3.5단계: 완료 전 린트 및 포맷

워크 패키지를 완료로 표시하기 전에 코드 품질을 확인합니다.
**이 단계에서는 `teams.lightweight_model` (기본: haiku)을 사용합니다** — 도구 실행과 결과 수집이 주 작업이므로 경량 모델로 충분합니다.

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

### 4단계: 단계 전환 및 팀 정리

한 단계의 모든 워크 패키지가 완료되면:
1. 현재 팀 멤버에게 `SendMessage(type="shutdown_request")`로 종료 요청
2. 모든 멤버 종료 확인 후 `TeamDelete`로 팀 리소스 정리
3. 다음 실행 단계로 이동 (새 `TeamCreate` + 새 멤버 생성)
4. 모든 단계가 완료된 경우 완료 보고

```
빌드 단계 완료!

모든 워크 패키지: 4/4 완료
체크리스트 진행률: 28/28 항목 완료 (100%)

다음 단계: /claude-sdd:sdd-review — 품질 게이트 검증 실행
```

---

## 동작 (멀티 도메인 모드)

### 도메인 미지정 시

사용자에게 도메인 선택 목록을 표시합니다:
```
도메인을 선택하세요:
  1. device-mgmt (단말관리) [상태: 태스크 분해 완료, 0% 빌드]
  2. subscription (구독 서비스) [상태: 태스크 분해 완료, 0% 빌드]
  3. rate-plan (요금제) [상태: 빌드 중, 45% 완료]
  4. rate-benefit (요금제혜택) [상태: 태스크 분해 완료, 0% 빌드]
  5. (integration) 크로스 도메인 통합 빌드
```

### --domain=<id> (특정 도메인 빌드)

#### 의존성 검증

빌드를 시작하기 전에 도메인 의존성을 검증합니다:

1. `sdd-config.yaml`에서 이 도메인의 `dependencies`를 확인합니다.
2. 의존 도메인의 빌드 상태(체크리스트 완료율)를 확인합니다.
3. 의존 도메인이 아직 빌드되지 않은 경우 경고합니다:
   ```
   경고: subscription 도메인은 device-mgmt에 의존합니다.
   device-mgmt 빌드 상태: 30% 완료 (6/19 항목)

   의존 도메인이 완료되지 않아 통합 관련 기능이 빌드 중 실패할 수 있습니다.
   계속 진행하시겠습니까? (Y/n)
   ```

#### 도메인 빌드 실행

1. `docs/specs/domains/<id>/07-task-plan.md`를 읽어 워크 패키지를 파싱합니다.
2. `docs/specs/domains/<id>/06-spec-checklist.md`를 읽어 체크리스트를 확인합니다.

3. **팀 생성 및 병렬 워크 패키지 실행**: 단일 도메인 모드와 동일한 병렬 패턴을 사용합니다.
   - `TeamCreate`로 팀 생성 (team_name: `"sdd-build-<domain-id>"`)
   - 같은 실행 단계의 모든 WP를 `Task` 도구로 **동시에** 생성:
     ```
     Task(team_name="sdd-build-device-mgmt", name="dev-wp-1",
          subagent_type="general-purpose", model="sonnet",
          prompt="당신은 sdd-implementer입니다. [...]
                  도메인 경계 규칙:
                  - 이 도메인(device-mgmt)에 속하는 코드만 생성/수정하세요.
                  - 다른 도메인의 코드를 직접 수정하지 마세요.
                  - 다른 도메인의 기능이 필요한 경우 공개 인터페이스(API)를 통해 호출하세요.
                  - 공유 코드(shared/, common/ 등)를 수정해야 하는 경우 리더에게 보고하세요.")
     Task(team_name="sdd-build-device-mgmt", name="dev-wp-2", ...)
     Task(team_name="sdd-build-device-mgmt", name="dev-wp-3", ...)
     ```
   - 컨텍스트: 도메인 워크 패키지 태스크, 도메인 스펙 파일, 도메인 체크리스트 항목
   - CLAUDE.md: `docs/specs/domains/<id>/wp-<PREFIX>-WP-N-member.md`의 내용 (`/claude-sdd:sdd-assign`에서 생성, 있으면 추가)

4. **품질 검증 루프**: 단일 도메인과 동일한 병렬 패턴 (최대 3회 재작업)
   - 도메인 체크리스트 (`domains/<id>/06-spec-checklist.md`) 기준으로 검증
   - 재작업 시 해당 WP 담당 멤버에게 `SendMessage`로 구체적 피드백 전달

5. **프로젝트 통합 체크리스트 자동 업데이트**:
   - 도메인 빌드가 완료되면, 프로젝트 수준 `docs/specs/06-spec-checklist.md`에서 해당 도메인 섹션의 항목을 자동으로 `[x]`로 업데이트합니다.

#### 도메인 빌드 완료 출력

```
도메인 빌드 완료: device-mgmt

워크 패키지: 3/3 완료
  DEV-WP-1: 단말 등록 모듈 ✓ (7/7 항목)
  DEV-WP-2: 단말 조회 모듈 ✓ (6/6 항목)
  DEV-WP-3: 단말 상태관리 ✓ (6/6 항목)

도메인 체크리스트: 19/19 항목 완료 (100%)
프로젝트 통합 체크리스트 업데이트 완료: 19/92 항목 (21%)

다음 단계:
  - /claude-sdd:sdd-build --domain=subscription — 다음 도메인 빌드
  - /claude-sdd:sdd-review --domain=device-mgmt — 이 도메인 리뷰
  - /claude-sdd:sdd-status — 전체 진행 상황 확인
```

### --domain=<id> <WP-ID> (특정 WP 빌드)

지정된 도메인의 특정 워크 패키지만 빌드합니다. 동작은 단일 도메인의 특정 WP 빌드와 동일하되, 도메인 스코프를 적용합니다.

### --domain=<id> <WP-ID> rework (재작업)

지정된 도메인의 특정 워크 패키지에 대해 재작업을 수행합니다. 이전 빌드/리뷰에서 발견된 문제에 대한 피드백을 팀 멤버에게 전달합니다.

### --integration (크로스 도메인 통합 빌드)

사전 조건:
- 모든 도메인의 빌드가 완료되어야 합니다 (또는 사용자가 명시적으로 재정의)
- `docs/specs/cross-domain/integration-points.md`가 존재해야 합니다
- `docs/specs/cross-domain/integration-checklist.md`가 존재해야 합니다

1. 도메인 빌드 상태를 확인합니다:
   ```
   도메인 빌드 상태 확인:
     device-mgmt: 19/19 (100%) ✓
     subscription: 24/24 (100%) ✓
     rate-plan: 15/15 (100%) ✓
     rate-benefit: 18/18 (100%) ✓

   모든 도메인 빌드 완료. 통합 빌드를 시작합니다.
   ```

2. `cross-domain/integration-points.md`를 읽어 통합 포인트를 파싱합니다.
3. `cross-domain/integration-checklist.md`를 읽어 통합 체크리스트를 확인합니다.

4. **팀 생성 및 병렬 통합 워크 패키지 실행**:
   - `TeamCreate`로 통합 팀 생성 (team_name: `"sdd-build-integration"`)
   - 통합 워크 패키지를 `Task` 도구로 **동시에** 생성:
     - 도메인 간 API 연동 검증
     - 공유 엔티티 정합성 확인
     - 이벤트 기반 통합 검증 (해당하는 경우)
     - 통합 테스트 작성

5. 품질 검증 루프: 단일 도메인과 동일한 병렬 패턴 (최대 3회 재작업)

6. 프로젝트 통합 체크리스트의 크로스 도메인 섹션 업데이트

```
크로스 도메인 통합 빌드 완료!

통합 체크리스트: 8/8 항목 완료 (100%)
프로젝트 통합 체크리스트: 92/92 항목 완료 (100%)

다음 단계: /claude-sdd:sdd-review --all — 전체 프로젝트 리뷰
```

---

## 출력

| 모드 | 출력 |
|------|------|
| 단일 도메인 | 소스 코드, `docs/specs/06-spec-checklist.md` 업데이트 |
| 멀티 도메인 (특정 도메인) | 소스 코드, `docs/specs/domains/<id>/06-spec-checklist.md` 업데이트, `docs/specs/06-spec-checklist.md` 자동 업데이트 |
| 멀티 도메인 (통합) | 통합 코드/테스트, `docs/specs/cross-domain/integration-checklist.md` 업데이트, `docs/specs/06-spec-checklist.md` 자동 업데이트 |

## 의존성

- `docs/specs/07-task-plan.md` 또는 `docs/specs/domains/<id>/07-task-plan.md` (`/claude-sdd:sdd-plan`에서 생성)
- `docs/specs/06-spec-checklist.md` 또는 `docs/specs/domains/<id>/06-spec-checklist.md` (`/claude-sdd:sdd-spec`에서 생성)
- `docs/specs/sdd-config.yaml` (`/claude-sdd:sdd-init`에서 생성)
- Agent Teams 활성화 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
- 통합 빌드: `docs/specs/cross-domain/integration-points.md`, `docs/specs/cross-domain/integration-checklist.md`
