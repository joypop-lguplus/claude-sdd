# /sdd-lint — 코드 분석 및 진단

자동화된 코드 분석을 실행합니다: 진단, 구조 검색, 심볼 추출, 포맷팅.

## 사용법

```
/sdd-lint diagnostics [path]       # 프로젝트 진단 실행 (에러/경고)
/sdd-lint search <pattern> [path]  # ast-grep을 통한 구조 검색
/sdd-lint symbols [path]           # 함수/클래스/export 심볼 추출
/sdd-lint format [path]            # 코드 포맷팅 확인/수정
```

서브커맨드가 지정되지 않으면 기본적으로 `diagnostics`를 실행합니다.

## 사전 조건

- 프로젝트에 고유 진단 도구가 설치되어 있어야 함 (tsc, ruff, cargo 등)
- ast-grep (`sg`)은 선택 사항이지만 `search` 및 `symbols`에 권장
- Language Server는 선택 사항이지만 `diagnostics` 및 `symbols`를 LSP 기반으로 향상

## 동작

### 0단계: 도구 감지

프로젝트 루트에서 `scripts/sdd-detect-tools.sh`를 실행하여 사용 가능한 도구를 확인합니다:

```bash
bash <plugin-root>/scripts/sdd-detect-tools.sh <project-root>
```

`sdd-config.yaml`에 `lint` 섹션이 있으면 해당 설정된 도구를 대신 사용합니다.

### 서브커맨드: `diagnostics [path]`

프로젝트의 고유 진단 도구를 실행하여 에러와 경고를 수집합니다.

**언어-도구 매핑:**

| 언어 | 주요 도구 | 대체 도구 |
|----------|-------------|----------|
| TypeScript/JS | `tsc --noEmit` | `biome check` |
| Python | `ruff check` | `pyright` / `mypy` |
| Go | `go vet ./...` | — |
| Rust | `cargo check` | — |
| Java | `gradle build --dry-run` | `mvn compile -q` |
| Kotlin | `gradle build --dry-run` | — |
| C/C++ | `clang-tidy` | — |

**출력:**

```
진단 리포트 — TypeScript 프로젝트
도구: tsc --noEmit

에러 (2):
  src/user/controller.ts:45:12 — TS2339: Property 'email' does not exist on type 'Request'
  src/user/model.ts:12:5 — TS2304: Cannot find name 'Schema'

경고 (1):
  src/utils/logger.ts:8:1 — TS6133: 'debug' is declared but its value is never read

요약: 2개 에러, 1개 경고
```

`[path]`가 제공되면 해당 경로로만 진단을 제한합니다.

**LSP 향상:** Language Server가 설치되어 있으면 `/sdd-lsp diagnostics`를 병행 실행하여 의미 수준 진단을 추가로 수집합니다. LSP 진단은 네이티브 도구가 놓칠 수 있는 타입 관련 오류를 포착합니다. 자세한 내용은 `/sdd-lsp`을 참조하세요.

### 서브커맨드: `search <pattern> [path]`

AST 기반 구조 코드 검색을 위해 ast-grep (`sg`)을 사용합니다.

**필요 사항:** ast-grep (`sg`)이 설치되어 있어야 합니다.

**예시:**

```bash
# 모든 export된 async 함수 찾기
/sdd-lint search "export async function $NAME($$$) { $$$ }"

# React 컴포넌트 찾기
/sdd-lint search "function $COMP($$$): JSX.Element { $$$ }"

# 특정 함수 호출 찾기
/sdd-lint search "fetch($URL, $$$)"

# 클래스 메서드 찾기
/sdd-lint search "class $NAME { $$$ async $METHOD($$$) { $$$ } $$$ }"
```

`$NAME`, `$$$` 등은 ast-grep 메타변수입니다:
- `$NAME` — 단일 AST 노드와 매칭
- `$$$` — 0개 이상의 노드와 매칭
- `$$$$` — 시퀀스와 매칭

**출력:**

```
구조 검색 결과 — 패턴: "export async function $NAME($$$) { $$$ }"

매칭 (4):
  src/user/controller.ts:28 — export async function createUser(req, res) { ... }
  src/user/controller.ts:45 — export async function getUsers(req, res) { ... }
  src/auth/middleware.ts:12 — export async function authenticate(req, res, next) { ... }
  src/health/check.ts:5 — export async function healthCheck(req, res) { ... }
```

`sg`가 설치되지 않은 경우, 기본 텍스트 기반 검색을 위해 Grep으로 대체합니다.

### 서브커맨드: `symbols [path]`

코드베이스의 구조적 개요를 추출합니다: 함수, 클래스, exports, 타입.

**필요 사항:** ast-grep (`sg`) 권장. 사용할 수 없으면 grep 기반 추출로 대체합니다.

**출력:**

```
심볼 테이블 — src/

| 심볼 | 타입 | 파일 | 라인 | Export 여부 |
|--------|------|------|------|----------|
| UserController | class | src/user/controller.ts | 15 | yes |
| createUser | function | src/user/controller.ts | 28 | yes |
| getUsers | function | src/user/controller.ts | 45 | yes |
| UserSchema | const | src/user/model.ts | 5 | yes |
| validateEmail | function | src/utils/validation.ts | 12 | yes |
| hashPassword | function | src/utils/crypto.ts | 8 | no |

전체: 6개 심볼 (5개 export, 1개 internal)
```

**LSP 향상:** Language Server가 설치되어 있으면 `/sdd-lsp symbols`를 병행 실행하여 더 정확한 심볼 테이블을 제공합니다. LSP는 타입 정보와 계층 관계를 포함합니다.

활용 사례:
- `/sdd-spec` 시 레거시 프로젝트의 코드베이스 구조 파악
- `/sdd-review` 시 예상 exports 존재 여부 확인
- 스펙 항목을 실제 코드 위치에 매핑

### 서브커맨드: `format [path]`

프로젝트의 포매터를 사용하여 코드 포맷팅을 확인하고 선택적으로 수정합니다.

**기본 동작:** 확인 모드 (dry-run) — 파일을 수정하지 않고 포맷팅이 필요한 파일을 보고합니다.

**언어-도구 매핑:**

| 언어 | 주요 포매터 | 대체 도구 |
|----------|------------------|----------|
| TypeScript/JS | `prettier` | `biome format` |
| Python | `ruff format` | `black` |
| Go | `gofmt` | — |
| Rust | `rustfmt` | — |
| Java | `google-java-format` | — |
| Kotlin | `ktfmt` | — |
| C/C++ | `clang-format` | — |

**확인 모드 출력:**

```
포맷 확인 — prettier

포맷팅이 필요한 파일 (3):
  src/user/controller.ts
  src/user/model.ts
  src/utils/helpers.ts

이 파일들을 자동 포맷하려면 "/sdd-lint format --fix"를 실행하세요.
```

사용자가 명시적으로 `--fix`를 전달하면, 쓰기 모드로 포매터를 실행하여 파일을 자동 포맷합니다.

## SDD 라이프사이클과의 통합

### `/sdd-build`와 함께

워크 패키지를 완료로 표시하기 전에 팀 멤버는 다음을 수행해야 합니다:
1. `/sdd-lint diagnostics` 실행 — 모든 에러 수정
2. `/sdd-lint format --fix` 실행 — 코드 자동 포맷

### `/sdd-review`와 함께

리뷰 프로세스에는 자동으로 다음이 포함됩니다:
1. 진단 검사 (PASS를 위해 에러 0건 필요)
2. 포맷 검증 (파일에 포맷팅이 필요하면 경고)
3. 리뷰 리포트의 "자동화된 검사" 섹션에 결과 포함

### `/sdd-spec`와 함께 (레거시 프로젝트)

스펙 생성을 위해 기존 코드를 분석할 때:
1. `/sdd-lint symbols` 실행으로 코드 구조 파악
2. `/sdd-lint diagnostics` 실행으로 기존 기술 부채 식별

## 에이전트

이 스킬은 복잡한 분석 작업을 `sdd-code-analyzer` 에이전트에 위임합니다.

## 의존성

- 프로젝트 언어에 맞는 고유 진단/포매터 도구
- ast-grep (`sg`) — 선택 사항, `search` 및 `symbols` 서브커맨드 향상
- Language Server — 선택 사항, `diagnostics` 및 `symbols`에 LSP 기반 의미 분석 추가
- `scripts/sdd-detect-tools.sh` — 도구 자동 감지
