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
| Figma MCP | - | 선택 |
| Graphviz | 최신 | 선택 (다이어그램) |
| Python diagrams | 최신 | 선택 (다이어그램) |

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

이 설정은 병렬 Agent Teams를 사용하는 `/claude-sdd:sdd-build` 단계에 필수입니다.

## 3단계: MCP 설정 (선택)

### 방법 A: 인스톨러 사용 (권장)

인스톨러가 Atlassian MCP와 Figma MCP를 대화형으로 설정합니다:

```bash
npx github:joypop-lguplus/claude-sdd install
# → [5/7] MCP 서버 설정 단계에서 안내
```

**Atlassian MCP 설정 항목:**
- Atlassian URL (예: `https://company.atlassian.net`)
- 사용자 이메일
- API 토큰
- MCP 서버 이름 (URL에서 자동 생성)
- SSL 인증서 검증 비활성화 (사설망인 경우)
- 최대 2개 사이트 지원

**SSL 우회 (2계층 분리):**
- **uvx 계층** (PyPI 다운로드): `UV_NATIVE_TLS=true` — 시스템 인증서 사용
- **mcp-atlassian 계층** (Jira/Confluence 접속): `JIRA_SSL_VERIFY=false`, `CONFLUENCE_SSL_VERIFY=false`

**Figma MCP:**
- Remote (Figma 클라우드, OAuth): `https://mcp.figma.com/mcp`
- Desktop (로컬 Figma 앱): `http://127.0.0.1:3845/mcp`

### 방법 B: 수동 설정

#### Confluence/Jira

```bash
claude mcp add mcp-atlassian -s user -- \
  uvx mcp-atlassian \
  --confluence-url https://your-company.atlassian.net \
  --confluence-username your@email.com \
  --confluence-token YOUR_TOKEN \
  --jira-url https://your-company.atlassian.net \
  --jira-username your@email.com \
  --jira-token YOUR_TOKEN
```

`mcp-atlassian` 패키지는 하나의 MCP 서버에서 Confluence와 Jira를 모두 지원합니다.

#### Figma

```bash
# Remote (Figma 클라우드)
claude mcp add figma -s user --transport http -- https://mcp.figma.com/mcp

# Desktop (로컬 Figma 앱)
claude mcp add figma -s user --transport http -- http://127.0.0.1:3845/mcp
```

## 3.5단계: 다이어그램 도구 설치 (선택)

Confluence 퍼블리싱 시 다이어그램 PNG를 생성하려면 다음 도구가 필요합니다:

```bash
# 인스톨러로 자동 설치 (권장)
npx github:joypop-lguplus/claude-sdd install
# → [6/7] 다이어그램 도구 설치 단계에서 안내

# 수동 설치
brew install graphviz
pip3 install --user diagrams graphviz atlassian-python-api
```

사설망 환경에서는 SSL 우회 옵션을 추가합니다:
```bash
pip3 install --user --break-system-packages \
  --trusted-host pypi.org --trusted-host files.pythonhosted.org \
  diagrams graphviz atlassian-python-api
```

## 4단계: LSP 플러그인 설치 (선택)

`boostvolt/claude-code-lsps` 플러그인을 설치하면 goToDefinition, findReferences, 자동 진단 등 LSP 기능이 Claude Code에 내장됩니다.

### 설치 방법

인스톨러를 사용하면 언어별로 선택 설치할 수 있습니다:

```bash
npx github:joypop-lguplus/claude-sdd install
```

### 수동 설치

```bash
# 마켓플레이스 등록
claude plugin marketplace add boostvolt/claude-code-lsps

# 언어별 플러그인 설치 (예: TypeScript)
claude plugin install vtsls@claude-code-lsps
```

### 지원 언어

| 언어 | 플러그인 | LSP 서버 설치 |
|------|---------|-------------|
| TypeScript/JS | `vtsls` | `npm i -g @vtsls/language-server typescript` |
| Python | `pyright` | `pip install pyright` |
| Go | `gopls` | `go install golang.org/x/tools/gopls@latest` |
| Java | `jdtls` | `brew install jdtls` (Java 21+) |
| Kotlin | `kotlin-lsp` | `brew install JetBrains/utils/kotlin-lsp` (Java 17+) |
| Lua | `lua-language-server` | `brew install lua-language-server` |
| Terraform | `terraform-ls` | `brew install terraform-ls` |
| YAML | `yaml-language-server` | `npm i -g yaml-language-server` |

LSP 플러그인 없이도 SDD를 사용할 수 있습니다. `/claude-sdd:sdd-lint`가 네이티브 도구로 코드 분석을 수행합니다.

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
/claude-sdd:sdd-init new      # 신규 프로젝트
/claude-sdd:sdd-init legacy   # 기존 코드베이스

# 상태 확인
/claude-sdd:sdd-status

# 라이프사이클 시작
/claude-sdd:sdd-next
```

## 제거 (Uninstall)

설치한 모든 구성 요소를 일괄 제거합니다:

```bash
npx github:joypop-lguplus/claude-sdd uninstall
```

제거 대상:
- claude-sdd 플러그인
- LSP 플러그인 (설치된 것만)
- MCP 서버 (mcp-atlassian-*, figma)
- 다이어그램 도구 (graphviz, diagrams, atlassian-python-api)
- 마켓플레이스 등록 (claude-sdd, claude-code-lsps)
- 관련 설정값 (ENABLE_LSP_TOOL, AGENT_TEAMS)

현재 설치된 항목만 선택적으로 제거하며, 없는 항목은 건너뜁니다.

## 문제 해결

### "Agent Teams not enabled"

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 설정에 포함되어 있는지 확인하세요:

```bash
cat ~/.claude/settings.json
```

### "Confluence/Jira MCP not configured"

MCP 없이도 SDD를 사용할 수 있습니다. 요구사항 수집에 다음 대안을 사용하세요:
- `/claude-sdd:sdd-intake file:path/to/doc.md` -- 로컬 문서 읽기
- `/claude-sdd:sdd-intake interview` -- 대화형 요구사항 수집
- `/claude-sdd:sdd-intake figma:URL` -- Figma 디자인 분석

### 플러그인을 찾을 수 없는 경우

Claude Code가 스킬을 인식하지 못하면 다음을 시도하세요:

```bash
# 플러그인을 명시적으로 등록
mkdir -p ~/.claude/plugins
ln -s $(pwd) ~/.claude/plugins/claude-sdd

# 또는 plugin-dir 플래그 사용
claude --plugin-dir /path/to/claude-sdd
```
