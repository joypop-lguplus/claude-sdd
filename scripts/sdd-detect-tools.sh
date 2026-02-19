#!/usr/bin/env bash
# sdd-detect-tools.sh — 프로젝트 언어 및 사용 가능한 린터/포매터 도구 감지
# 사용법: ./scripts/sdd-detect-tools.sh [프로젝트-루트]
# 출력: 감지된 언어, 진단, 포매터, 린터, ast_grep 정보가 담긴 JSON

set -euo pipefail

PROJECT_ROOT="${1:-.}"

# 절대 경로로 변환
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

# 결과 저장 변수
LANGUAGE=""
DIAGNOSTICS=""
FORMATTER=""
LINTER=""
AST_GREP=false
LSP_SERVER=""
LSP_AVAILABLE=false

# 명령어 존재 여부 확인
cmd_exists() { command -v "$1" &>/dev/null; }

# ast-grep 사용 가능 여부 확인
if cmd_exists sg; then
  AST_GREP=true
fi

# --- 감지 로직 ---

detect_typescript_js() {
  if [[ -f "$PROJECT_ROOT/package.json" ]]; then
    local pkg
    pkg=$(cat "$PROJECT_ROOT/package.json")

    # TypeScript 여부 확인
    if [[ -f "$PROJECT_ROOT/tsconfig.json" ]] || echo "$pkg" | grep -q '"typescript"'; then
      LANGUAGE="typescript"
      # 진단
      if echo "$pkg" | grep -q '"biome"' || echo "$pkg" | grep -q '"@biomejs/biome"'; then
        DIAGNOSTICS="biome check"
      elif cmd_exists tsc; then
        DIAGNOSTICS="tsc --noEmit"
      fi
      # 포매터
      if echo "$pkg" | grep -q '"biome"' || echo "$pkg" | grep -q '"@biomejs/biome"'; then
        FORMATTER="biome format --write"
      elif echo "$pkg" | grep -q '"prettier"'; then
        FORMATTER="prettier --write"
      fi
      # 린터
      if echo "$pkg" | grep -q '"biome"' || echo "$pkg" | grep -q '"@biomejs/biome"'; then
        LINTER="biome lint"
      elif echo "$pkg" | grep -q '"eslint"'; then
        LINTER="eslint"
      fi
      # LSP 서버
      if cmd_exists typescript-language-server; then
        LSP_SERVER="typescript-language-server --stdio"
        LSP_AVAILABLE=true
      fi
    else
      LANGUAGE="javascript"
      # 진단
      if echo "$pkg" | grep -q '"biome"' || echo "$pkg" | grep -q '"@biomejs/biome"'; then
        DIAGNOSTICS="biome check"
      fi
      # 포매터
      if echo "$pkg" | grep -q '"biome"' || echo "$pkg" | grep -q '"@biomejs/biome"'; then
        FORMATTER="biome format --write"
      elif echo "$pkg" | grep -q '"prettier"'; then
        FORMATTER="prettier --write"
      fi
      # 린터
      if echo "$pkg" | grep -q '"biome"' || echo "$pkg" | grep -q '"@biomejs/biome"'; then
        LINTER="biome lint"
      elif echo "$pkg" | grep -q '"eslint"'; then
        LINTER="eslint"
      fi
      # LSP 서버
      if cmd_exists typescript-language-server; then
        LSP_SERVER="typescript-language-server --stdio"
        LSP_AVAILABLE=true
      fi
    fi
    return 0
  fi
  return 1
}

detect_python() {
  if [[ -f "$PROJECT_ROOT/pyproject.toml" ]] || [[ -f "$PROJECT_ROOT/setup.py" ]] || [[ -f "$PROJECT_ROOT/setup.cfg" ]]; then
    LANGUAGE="python"
    # 진단
    if cmd_exists ruff; then
      DIAGNOSTICS="ruff check"
    elif cmd_exists pyright; then
      DIAGNOSTICS="pyright"
    elif cmd_exists mypy; then
      DIAGNOSTICS="mypy"
    fi
    # 포매터
    if cmd_exists ruff; then
      FORMATTER="ruff format"
    elif cmd_exists black; then
      FORMATTER="black"
    fi
    # 린터
    if cmd_exists ruff; then
      LINTER="ruff check"
    elif cmd_exists flake8; then
      LINTER="flake8"
    fi
    # LSP 서버
    if cmd_exists pyright-langserver; then
      LSP_SERVER="pyright-langserver --stdio"
      LSP_AVAILABLE=true
    fi
    return 0
  fi
  return 1
}

detect_go() {
  if [[ -f "$PROJECT_ROOT/go.mod" ]]; then
    LANGUAGE="go"
    DIAGNOSTICS="go vet ./..."
    if cmd_exists gofmt; then
      FORMATTER="gofmt -w"
    fi
    if cmd_exists golangci-lint; then
      LINTER="golangci-lint run"
    elif cmd_exists staticcheck; then
      LINTER="staticcheck ./..."
    fi
    # LSP 서버
    if cmd_exists gopls; then
      LSP_SERVER="gopls serve"
      LSP_AVAILABLE=true
    fi
    return 0
  fi
  return 1
}

detect_rust() {
  if [[ -f "$PROJECT_ROOT/Cargo.toml" ]]; then
    LANGUAGE="rust"
    DIAGNOSTICS="cargo check"
    if cmd_exists rustfmt; then
      FORMATTER="rustfmt"
    fi
    if cmd_exists cargo-clippy || cmd_exists clippy-driver; then
      LINTER="cargo clippy"
    fi
    # LSP 서버
    if cmd_exists rust-analyzer; then
      LSP_SERVER="rust-analyzer"
      LSP_AVAILABLE=true
    fi
    return 0
  fi
  return 1
}

detect_java_kotlin() {
  if [[ -f "$PROJECT_ROOT/build.gradle" ]] || [[ -f "$PROJECT_ROOT/build.gradle.kts" ]]; then
    if [[ -f "$PROJECT_ROOT/build.gradle.kts" ]] || find "$PROJECT_ROOT/src" -name "*.kt" -print -quit 2>/dev/null | grep -q .; then
      LANGUAGE="kotlin"
      DIAGNOSTICS="gradle build --dry-run"
      if cmd_exists ktfmt; then
        FORMATTER="ktfmt"
      fi
    else
      LANGUAGE="java"
      DIAGNOSTICS="gradle build --dry-run"
      if cmd_exists google-java-format; then
        FORMATTER="google-java-format --replace"
      fi
    fi
    return 0
  elif [[ -f "$PROJECT_ROOT/pom.xml" ]]; then
    LANGUAGE="java"
    DIAGNOSTICS="mvn compile -q"
    if cmd_exists google-java-format; then
      FORMATTER="google-java-format --replace"
    fi
    return 0
  fi
  return 1
}

detect_cpp() {
  if [[ -f "$PROJECT_ROOT/CMakeLists.txt" ]] || [[ -f "$PROJECT_ROOT/Makefile" ]]; then
    # C/C++ 소스 파일 존재 여부 확인
    if find "$PROJECT_ROOT" -maxdepth 3 \( -name "*.cpp" -o -name "*.cc" -o -name "*.c" -o -name "*.h" \) -print -quit 2>/dev/null | grep -q .; then
      LANGUAGE="cpp"
      if cmd_exists clang-tidy; then
        DIAGNOSTICS="clang-tidy"
      fi
      if cmd_exists clang-format; then
        FORMATTER="clang-format -i"
      fi
      # LSP 서버
      if cmd_exists clangd; then
        LSP_SERVER="clangd --log=error"
        LSP_AVAILABLE=true
      fi
      return 0
    fi
  fi
  return 1
}

# 우선순위에 따라 감지 실행
detect_typescript_js || detect_python || detect_go || detect_rust || detect_java_kotlin || detect_cpp || true

# 언어가 감지되지 않은 경우
if [[ -z "$LANGUAGE" ]]; then
  LANGUAGE="unknown"
fi

# --- JSON 출력 ---
cat <<EOF
{
  "project_root": "$PROJECT_ROOT",
  "language": "$LANGUAGE",
  "diagnostics": "$DIAGNOSTICS",
  "formatter": "$FORMATTER",
  "linter": "$LINTER",
  "ast_grep": $AST_GREP,
  "lsp_server": "$LSP_SERVER",
  "lsp_available": $LSP_AVAILABLE
}
EOF
