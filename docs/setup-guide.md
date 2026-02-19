# 설치 가이드

## 사전 요구사항

| 구성 요소 | 버전 | 필수 여부 |
|-----------|------|-----------|
| Claude Code | 최신 | 필수 |
| Node.js | 18+ | 필수 |
| Agent Teams | 활성화 | 필수 |
| `gh` CLI | 최신 | 권장 |
| Language Server | - | 선택 |
| Confluence MCP | - | 선택 |
| Jira MCP | - | 선택 |

## 1단계: 플러그인 설치

### 방법 A: npx (권장)

```bash
npx github:joypop-lguplus/claude-sdd install
```

대화형 설치 마법사를 실행하여 모든 의존성을 검사하고 플러그인을 등록합니다.

### 방법 B: Git Clone

```bash
git clone https://github.com/joypop-lguplus/claude-sdd.git
cd claude-sdd
node bin/cli.mjs install
```

### 방법 C: 수동 설치

```bash
git clone https://github.com/joypop-lguplus/claude-sdd.git
claude --plugin-dir ./claude-sdd
```

## 2단계: Agent Teams 활성화

Claude Code 설정에 다음을 추가합니다:

```json
// ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

이 설정은 병렬 Agent Teams를 사용하는 `/sdd-build` 단계에 필수입니다.

## 3단계: MCP 설정 (선택)

### Confluence

Confluence에서 요구사항을 가져와야 하는 경우:

```bash
claude mcp add mcp-atlassian -s user -- \
  uvx mcp-atlassian \
  --confluence-url https://your-company.atlassian.net \
  --confluence-username your@email.com \
  --confluence-token YOUR_TOKEN
```

### Jira

Jira에서 요구사항을 가져와야 하는 경우:

```bash
claude mcp add mcp-atlassian -s user -- \
  uvx mcp-atlassian \
  --jira-url https://your-company.atlassian.net \
  --jira-username your@email.com \
  --jira-token YOUR_TOKEN
```

참고: `mcp-atlassian` 패키지는 하나의 MCP 서버에서 Confluence와 Jira를 모두 지원합니다.

## 4단계: Language Server 설치 (선택)

`/sdd-lsp` 의미 분석을 사용하려면 프로젝트 언어에 맞는 Language Server를 설치합니다:

```bash
# TypeScript/JavaScript
npm i -g typescript-language-server typescript

# Python
npm i -g pyright
# 또는: pip install pyright

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer

# C/C++
# macOS: brew install llvm
# Ubuntu: apt install clangd
```

Language Server 없이도 SDD를 사용할 수 있습니다. `/sdd-lint`가 네이티브 도구로 대체합니다.

## 5단계: 설치 확인

```bash
# 의존성 상태 확인
npx github:joypop-lguplus/claude-sdd check

# 심층 진단
npx github:joypop-lguplus/claude-sdd doctor
```

## 6단계: SDD 사용 시작

```bash
# 플러그인과 함께 Claude Code 실행
claude

# 프로젝트 초기화
/sdd-init new      # 신규 프로젝트
/sdd-init legacy   # 기존 코드베이스

# 상태 확인
/sdd-status

# 라이프사이클 시작
/sdd
```

## 문제 해결

### "Agent Teams not enabled"

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 설정에 포함되어 있는지 확인하세요:

```bash
cat ~/.claude/settings.json
```

### "Confluence/Jira MCP not configured"

MCP 없이도 SDD를 사용할 수 있습니다. 요구사항 수집에 다음 대안을 사용하세요:
- `/sdd-intake file:path/to/doc.md` -- 로컬 문서 읽기
- `/sdd-intake interview` -- 대화형 요구사항 수집
- `/sdd-intake figma:URL` -- Figma 디자인 분석

### 플러그인을 찾을 수 없는 경우

Claude Code가 스킬을 인식하지 못하면 다음을 시도하세요:

```bash
# 플러그인을 명시적으로 등록
mkdir -p ~/.claude/plugins
ln -s $(pwd) ~/.claude/plugins/claude-sdd

# 또는 plugin-dir 플래그 사용
claude --plugin-dir /path/to/claude-sdd
```
