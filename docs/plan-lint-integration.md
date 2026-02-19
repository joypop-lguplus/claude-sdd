# Plan: claude-sdd에 코드 분석 기능 통합 (v0.2.0)

## Context

oh-my-opencode의 LSP 구현(32개 TypeScript 파일, 6개 LSP 도구, ast-grep 통합)과 OpenCode 자체의 LSP/포매터 기능을 참고하여, claude-sdd의 SDD 라이프사이클에 코드 분석 기능을 통합한다.

**핵심 목표**: `/claude-sdd:sdd-review` 품질 게이트와 `/claude-sdd:sdd-build` 구현 단계에서 자동화된 코드 품질 검증을 추가한다.

**접근법**: oh-my-opencode의 개념(진단, 심볼, 검색, 포매팅)을 Claude Code 플러그인 형태(스킬 + 에이전트)로 재구현. 전체 LSP 클라이언트가 아닌, ast-grep + 네이티브 도구 조합의 경량 접근법.

**참고 자료**:
- oh-my-opencode: https://github.com/code-yeongyu/oh-my-opencode (SUL-1.0)
- OpenCode LSP 문서: https://opencode.ai/docs/lsp/
- OpenCode 포매터 문서: https://opencode.ai/docs/formatters/

---

## 변경 파일 목록

### 신규 생성 (4개)

| 파일 | 역할 |
|------|------|
| `skills/sdd-lint/SKILL.md` | `/claude-sdd:sdd-lint` 스킬 — 진단, 구조 검색, 포매팅 |
| `agents/sdd-code-analyzer.md` | 코드 분석 에이전트 — ast-grep + 네이티브 도구 |
| `scripts/sdd-detect-tools.sh` | 프로젝트 언어/도구 자동 감지 스크립트 |
| `templates/project-init/lint-config.yaml.tmpl` | 프로젝트별 린트/포맷 도구 설정 템플릿 |

### 수정 (9개)

| 파일 | 변경 내용 |
|------|-----------|
| `skills/sdd-review/SKILL.md` | 진단 결과를 품질 게이트에 통합 |
| `skills/sdd-build/SKILL.md` | 구현 완료 시 린트/포맷 자동 실행 안내 |
| `agents/sdd-reviewer.md` | 코드 분석 에이전트 활용하여 검증 강화 |
| `agents/sdd-implementer.md` | 구현 시 린트/포맷 가이드 추가 |
| `templates/checklists/quality-gate.md.tmpl` | 린트/진단 게이트 항목 추가 |
| `lib/checker.mjs` | ast-grep 의존성 검사 추가 |
| `lib/doctor.mjs` | 코드 분석 에이전트 파일 + 스크립트 무결성 검사 |
| `.claude-plugin/plugin.json` | 새 스킬/에이전트 등록 |
| `marketplace.json` | 새 컴포넌트 등록 |

### 문서 업데이트 (4개)

| 파일 | 변경 내용 |
|------|-----------|
| `README.md` | `/claude-sdd:sdd-lint` 스킬, 코드 분석 에이전트 문서화 |
| `CHANGELOG.md` | v0.2.0 변경 사항 추가 |
| `docs/architecture.md` | 코드 분석 레이어 추가 |
| `docs/usage-guide.md` | `/claude-sdd:sdd-lint` 사용 예시 추가 |

---

## 상세 설계

### 1. `/claude-sdd:sdd-lint` 스킬 (`skills/sdd-lint/SKILL.md`)

oh-my-opencode의 6개 LSP 도구를 4개 서브커맨드로 매핑:

```
/claude-sdd:sdd-lint diagnostics [path]      # 프로젝트 에러/경고 수집 (tsc, ruff, cargo check 등)
/claude-sdd:sdd-lint search <pattern> [path] # ast-grep 구조적 코드 검색
/claude-sdd:sdd-lint symbols [path]          # 함수/클래스/export 심볼 추출
/claude-sdd:sdd-lint format [path]           # 코드 포매팅 (prettier, biome, rustfmt 등)
```

**언어별 도구 매핑** (oh-my-opencode의 server-definitions.ts + OpenCode 포매터 참고):

| 언어 | 진단 도구 | 포매터 | ast-grep |
|------|----------|--------|----------|
| TypeScript/JS | `tsc --noEmit` / `biome check` | `prettier` / `biome format` | 지원 |
| Python | `ruff check` / `pyright` | `ruff format` | 지원 |
| Go | `go vet` | `gofmt` | 지원 |
| Rust | `cargo check` | `rustfmt` | 지원 |
| Java | `javac` | `google-java-format` | 지원 |
| Kotlin | `kotlinc -script` | `ktfmt` | 지원 |
| C/C++ | `clang-tidy` | `clang-format` | 지원 |

**자동 감지**: `scripts/sdd-detect-tools.sh`가 프로젝트 파일(package.json, pyproject.toml, Cargo.toml 등)을 기반으로 사용 가능한 도구를 자동 감지.

### 2. `sdd-code-analyzer` 에이전트 (`agents/sdd-code-analyzer.md`)

oh-my-opencode의 LSP 도구 6개에 대응하는 분석 역할:

- **진단 수집**: 네이티브 도구 실행 → 에러/경고 파싱 → 체크리스트 항목과 매핑
- **구조 검색**: ast-grep 패턴으로 스펙 항목의 코드 존재 여부 확인
- **심볼 분석**: ast-grep으로 함수/클래스 목록 추출 → 레거시 코드베이스 구조 파악
- **포맷 검증**: 포매터 dry-run으로 스타일 위반 검출

SDD 라이프사이클과의 통합:
- `/claude-sdd:sdd-spec` 단계: 레거시 프로젝트에서 기존 코드 구조 분석
- `/claude-sdd:sdd-build` 단계: 구현 완료 시 자동 린트/포맷
- `/claude-sdd:sdd-review` 단계: 진단 결과를 품질 게이트에 포함

### 3. `scripts/sdd-detect-tools.sh`

프로젝트 루트의 파일들을 분석하여 사용 가능한 도구 목록을 출력:

```bash
# 입력: 프로젝트 루트 경로
# 출력: JSON 형태의 도구 목록
{
  "language": "typescript",
  "diagnostics": "tsc --noEmit",
  "formatter": "prettier --write",
  "linter": "eslint",
  "ast_grep": true
}
```

감지 로직:
- `package.json` → TypeScript/JavaScript
- `pyproject.toml` / `setup.py` → Python
- `Cargo.toml` → Rust
- `go.mod` → Go
- `build.gradle` / `pom.xml` → Java/Kotlin

### 4. 기존 스킬/에이전트 수정

**`/claude-sdd:sdd-review` 수정**: Step 2.5로 "자동 진단 실행" 추가
```
Step 2.5: Automated Diagnostics
  1. Run sdd-code-analyzer agent for diagnostics
  2. Collect errors/warnings
  3. Map diagnostic results to checklist items
  4. Include in review report under "Automated Checks" section
```

**`/claude-sdd:sdd-build` 수정**: 팀 멤버 완료 보고 전 린트/포맷 권장 추가
```
Before reporting completion:
  1. Run project formatter (if configured)
  2. Run project linter (if configured)
  3. Fix any issues before marking checklist items [x]
```

**`sdd-reviewer` 에이전트 수정**: 검증 프로세스에 진단 단계 추가
```
Step 1: Code Existence Check (기존)
Step 2: Spec Compliance Check (기존)
Step 3: Test Check (기존)
Step 4: Diagnostics Check (신규)
  - Run diagnostics via sdd-code-analyzer
  - Zero errors required for PASS
  - Warnings are reported but don't block
```

**`sdd-implementer` 에이전트 수정**: 완료 전 린트 가이드 추가

### 5. 인프라 업데이트

**`lib/checker.mjs`**: ast-grep 검사 추가
```javascript
// -- ast-grep (optional) --
const sgOk = commandExists('sg');
const sgVer = sgOk ? run('sg --version', { ignoreError: true }) : '';
results.push({
  name: 'ast-grep (sg)',
  ok: sgOk,
  detail: sgVer || 'Not installed (optional)',
  category: 'tools'
});
```

**`lib/doctor.mjs`**: 새 파일 무결성 검사 추가
```
- agents/sdd-code-analyzer.md
- skills/sdd-lint/SKILL.md
- scripts/sdd-detect-tools.sh
```

### 6. 버전 업데이트

- `package.json`, `plugin.json`, `marketplace.json`, `bin/cli.mjs`: 0.1.0 → 0.2.0
- `CHANGELOG.md`: v0.2.0 항목 추가

---

## 구현 순서

```
1. scripts/sdd-detect-tools.sh 생성 (언어/도구 감지)
2. agents/sdd-code-analyzer.md 생성
3. skills/sdd-lint/SKILL.md 생성
4. templates/project-init/lint-config.yaml.tmpl 생성
5. 기존 스킬 수정 (sdd-review, sdd-build)
6. 기존 에이전트 수정 (sdd-reviewer, sdd-implementer)
7. 기존 템플릿 수정 (quality-gate.md.tmpl)
8. 인프라 수정 (checker.mjs, doctor.mjs, plugin.json, marketplace.json)
9. 문서 업데이트 (README, CHANGELOG, architecture, usage-guide)
10. 버전 업데이트 (0.1.0 → 0.2.0)
11. 검증: node bin/cli.mjs doctor
12. 커밋 & push
```

---

## 검증 방법

1. `node bin/cli.mjs check` — ast-grep 검사 항목 추가 확인
2. `node bin/cli.mjs doctor` — 새 파일(3개) 무결성 검사 통과 확인
3. `scripts/sdd-detect-tools.sh` 실행 — 프로젝트 도구 감지 출력 확인
4. 전체 파일 구조 확인 — 42 → 46개 파일

---

## 실행 프롬프트

이 계획을 나중에 실행하려면 아래 프롬프트를 사용하세요:

```
docs/plan-lint-integration.md 계획서를 읽고 그대로 구현해줘.
신규 파일 4개 생성, 기존 파일 9개 수정, 문서 4개 업데이트.
완료 후 node bin/cli.mjs doctor로 검증하고 커밋 & push.
```
