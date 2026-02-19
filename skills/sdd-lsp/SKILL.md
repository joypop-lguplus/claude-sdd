# /sdd-lsp — LSP 기반 의미 분석

Language Server Protocol을 활용한 의미 수준 코드 분석을 수행합니다: 진단, 정의 이동, 참조 찾기, 호버, 심볼, 구현, 호출 계층.

## 사용법

```
/sdd-lsp status                          # 언어 서버 설치 상태 확인
/sdd-lsp diagnostics <file>              # LSP 진단 (에러/경고)
/sdd-lsp definition <file> <line> <col>  # 정의 위치로 이동
/sdd-lsp references <file> <line> <col>  # 참조 찾기
/sdd-lsp hover <file> <line> <col>       # 타입/문서 정보
/sdd-lsp symbols <file>                  # 문서 심볼 추출
/sdd-lsp workspace-symbols <query>       # 워크스페이스 심볼 검색
/sdd-lsp implementations <file> <line> <col>  # 인터페이스 구현 찾기
/sdd-lsp incoming-calls <file> <line> <col>   # 수신 호출 계층
/sdd-lsp outgoing-calls <file> <line> <col>   # 발신 호출 계층
```

서브커맨드가 지정되지 않으면 `status`를 실행합니다.
`<line>`과 `<col>`은 1-based입니다.

## 사전 조건

- 대상 언어의 Language Server가 설치되어 있어야 합니다
- 서버가 없으면 `/sdd-lint`로 자동 폴백합니다

### 지원 언어 서버

| 언어 | 서버 명령어 | 설치 방법 |
|------|-------------|-----------|
| TypeScript/JS | `typescript-language-server` | `npm i -g typescript-language-server typescript` |
| Python | `pyright-langserver` | `npm i -g pyright` 또는 `pip install pyright` |
| Go | `gopls` | `go install golang.org/x/tools/gopls@latest` |
| Rust | `rust-analyzer` | `rustup component add rust-analyzer` |
| C/C++ | `clangd` | OS 패키지 매니저 또는 LLVM 설치 |

## 동작

### 0단계: 서버 확인

CLI 브릿지를 실행하여 서버 상태를 확인합니다:

```bash
node <plugin-root>/scripts/sdd-lsp.mjs status
```

서버가 설치되지 않은 경우 설치 안내를 표시합니다.

### 서브커맨드: `status`

모든 지원 언어 서버의 설치 상태를 JSON으로 출력합니다.

**출력 예시:**

```json
{
  "command": "status",
  "servers": {
    "typescript": { "command": "typescript-language-server", "installed": true },
    "python": { "command": "pyright-langserver", "installed": false },
    "go": { "command": "gopls", "installed": true },
    "rust": { "command": "rust-analyzer", "installed": false },
    "cpp": { "command": "clangd", "installed": false }
  }
}
```

### 서브커맨드: `diagnostics <file>`

LSP를 통해 파일의 의미적 진단을 수집합니다. `/sdd-lint diagnostics`의 네이티브 도구 결과와 보완적입니다.

```bash
node <plugin-root>/scripts/sdd-lsp.mjs diagnostics src/user/controller.ts
```

**출력 예시:**

```json
{
  "command": "diagnostics",
  "server": "typescript",
  "file": "src/user/controller.ts",
  "result": [
    {
      "file": "src/user/controller.ts",
      "range": { "start": { "line": 45, "character": 12 }, "end": { "line": 45, "character": 17 } },
      "severity": "error",
      "message": "Property 'email' does not exist on type 'Request'",
      "source": "typescript",
      "code": 2339
    }
  ]
}
```

### 서브커맨드: `definition <file> <line> <col>`

심볼의 정의 위치를 반환합니다. 코드 탐색과 의존성 추적에 유용합니다.

```bash
node <plugin-root>/scripts/sdd-lsp.mjs definition src/user/controller.ts 28 15
```

### 서브커맨드: `references <file> <line> <col>`

심볼의 모든 참조 위치를 반환합니다. 영향 분석에 유용합니다.

```bash
node <plugin-root>/scripts/sdd-lsp.mjs references src/user/model.ts 12 10
```

### 서브커맨드: `hover <file> <line> <col>`

심볼의 타입 정보와 문서를 반환합니다.

```bash
node <plugin-root>/scripts/sdd-lsp.mjs hover src/user/controller.ts 28 15
```

### 서브커맨드: `symbols <file>`

파일의 모든 심볼(함수, 클래스, 변수, 타입 등)을 추출합니다. `/sdd-lint symbols`의 ast-grep 결과보다 더 정확합니다.

```bash
node <plugin-root>/scripts/sdd-lsp.mjs symbols src/user/controller.ts
```

### 서브커맨드: `workspace-symbols <query>`

워크스페이스 전체에서 심볼을 검색합니다.

```bash
node <plugin-root>/scripts/sdd-lsp.mjs workspace-symbols "UserController"
```

### 서브커맨드: `implementations <file> <line> <col>`

인터페이스나 추상 클래스의 구현체를 찾습니다.

```bash
node <plugin-root>/scripts/sdd-lsp.mjs implementations src/types.ts 15 10
```

### 서브커맨드: `incoming-calls <file> <line> <col>` / `outgoing-calls <file> <line> <col>`

함수의 호출 계층을 탐색합니다.

```bash
node <plugin-root>/scripts/sdd-lsp.mjs incoming-calls src/user/controller.ts 28 15
node <plugin-root>/scripts/sdd-lsp.mjs outgoing-calls src/user/controller.ts 28 15
```

## 대체 전략

LSP 서버가 설치되지 않은 경우, 다음 순서로 대체합니다:

1. **`/sdd-lint diagnostics`** — 네이티브 진단 도구 (tsc, ruff 등)
2. **`/sdd-lint symbols`** — ast-grep 기반 심볼 추출
3. **`/sdd-lint search`** — ast-grep 구조 검색
4. **Grep/Glob** — 기본 텍스트 검색

대체 시 사용자에게 LSP 서버 설치를 안내합니다.

## SDD 라이프사이클과의 통합

### `/sdd-build`와 함께

워크 패키지를 완료로 표시하기 전에:
1. `/sdd-lsp diagnostics` 실행 — LSP 기반 의미 에러 확인
2. `/sdd-lint diagnostics` 실행 — 네이티브 도구 에러 확인
3. 두 결과를 종합하여 에러 0건 확인

### `/sdd-review`와 함께

리뷰 프로세스에서:
1. `/sdd-lsp diagnostics` — 의미 수준 에러/경고 수집
2. `/sdd-lsp references` — 명세 항목의 API가 실제 사용되는지 확인
3. `/sdd-lsp symbols` — 구현된 심볼이 명세와 일치하는지 확인
4. 리뷰 리포트의 "LSP 분석" 섹션에 결과 포함

### `/sdd-spec`와 함께 (레거시 프로젝트)

기존 코드베이스 분석:
1. `/sdd-lsp symbols` — 정확한 심볼 테이블 추출
2. `/sdd-lsp references` — 핵심 함수의 사용 패턴 파악
3. `/sdd-lsp implementations` — 인터페이스/추상 클래스 구조 파악

## 의존성

- 대상 언어의 Language Server (선택 사항 — 없으면 `/sdd-lint`로 폴백)
- `scripts/sdd-lsp.mjs` — CLI 브릿지
- `lib/lsp/` — LSP 핵심 라이브러리 (client, servers, bridge)
