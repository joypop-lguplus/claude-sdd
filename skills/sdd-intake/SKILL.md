---
name: sdd-intake
description: Use when the user wants to gather requirements from Confluence, Jira, Figma, files, or interviews for the SDD lifecycle.
---

# /claude-sdd:sdd-intake — 요구사항 수집

다양한 소스에서 요구사항을 수집하고 표준화된 요구사항 문서로 구조화합니다.

## 사용법

```
/claude-sdd:sdd-intake confluence:<page-id>     # Confluence 페이지에서 가져오기
/claude-sdd:sdd-intake jira:<epic-key>          # Jira 에픽 + 스토리에서 가져오기
/claude-sdd:sdd-intake figma:<url>              # Figma 디자인 비전 분석
/claude-sdd:sdd-intake file:<path>              # 로컬 문서 읽기
/claude-sdd:sdd-intake interview                # 대화형 요구사항 인터뷰
/claude-sdd:sdd-intake                          # 사용자에게 소스 선택 요청
```

## 인자

- `confluence:<page-id>` — MCP를 통해 가져올 Confluence 페이지 ID
- `jira:<epic-key>` — MCP를 통해 가져올 Jira 에픽 키 (예: `PROJ-100`)
- `figma:<url>` — 시각 분석을 위한 Figma 파일 URL
- `file:<path>` — 로컬 요구사항 문서 경로
- `interview` — 대화형 인터뷰 세션 시작
- (없음) — 사용자에게 소스 유형 선택을 요청

## 동작

### 소스: Confluence

1. 주어진 페이지 ID로 `confluence_get_page` MCP 도구를 사용합니다.
2. MCP를 사용할 수 없는 경우, 사용자에게 안내합니다:
   ```
   Confluence MCP가 환경에 구성되어 있지 않습니다.
   설정하려면 Claude Code MCP 설정에 mcp-atlassian을 추가하세요.
   또는 페이지를 내보낸 후 다음을 사용하세요: /claude-sdd:sdd-intake file:<exported-file>
   ```
3. 페이지 콘텐츠를 파싱하고 요구사항을 추출합니다.
4. `confluence_get_page_children`로 하위 페이지를 확인하고 포함 여부를 제안합니다.

### 소스: Jira

1. `jira_get_issue` MCP 도구를 사용하여 에픽을 가져옵니다.
2. JQL `"Epic Link" = <epic-key>`로 `jira_search`를 사용하여 하위 스토리를 찾습니다.
3. MCP를 사용할 수 없는 경우, Confluence와 동일한 안내를 제공합니다.
4. 인수 조건과 사용자 스토리를 추출합니다.

### 소스: Figma

1. 사용자에게 디자인 스크린샷을 붙여넣거나 Figma URL을 제공하도록 요청합니다.
2. Claude의 비전 기능을 사용하여 디자인을 분석합니다.
3. UI 컴포넌트, 플로우 및 인터랙션 패턴을 추출합니다.
4. 시각적 요소를 기능 요구사항으로 변환합니다.

### 소스: 로컬 파일

1. 지정된 파일을 읽습니다.
2. 형식(markdown, text, HTML)에 따라 파싱합니다.
3. 요구사항을 추출하고 구조화합니다.

### 소스: 인터뷰

사용자에게 다음 질문을 순서대로 합니다:
1. 이 프로젝트의 주요 목표는 무엇인가요?
2. 대상 사용자는 누구인가요?
3. 3-5개의 핵심 기능은 무엇인가요?
4. 기술 스택(또는 선호하는 스택)은 무엇인가요?
5. 제약 조건(일정, 팀 규모, 예산)은 무엇인가요?
6. 성능 요구사항이 있나요?
7. 보안 요구사항이 있나요?
8. 명시적으로 범위에서 제외되는 사항은 무엇인가요?

### 다중 소스

여러 번의 `/claude-sdd:sdd-intake` 호출을 결합할 수 있습니다. 각 호출은 기존 `01-requirements.md`에 추가하거나 업데이트합니다.

## 출력

`sdd-requirements-analyst` 에이전트를 사용하여 `docs/specs/01-requirements.md`를 생성하거나 업데이트합니다.

문서는 다음 구조를 따릅니다:
- 프로젝트 개요
- 기능 요구사항 (FR-001, FR-002, ...)
- 비기능 요구사항 (NFR-001, NFR-002, ...)
- 제약 조건
- 가정 사항
- 범위 제외 사항

생성 후 출력:
```
요구사항 문서가 생성되었습니다: docs/specs/01-requirements.md
  - X개의 기능 요구사항
  - Y개의 비기능 요구사항

다음 단계: /claude-sdd:sdd-spec — 기술 명세서 생성
```

## 의존성

- `docs/specs/sdd-config.yaml`이 존재해야 함 (먼저 `/claude-sdd:sdd-init` 실행)
- Confluence/Jira MCP 도구 (원격 소스의 경우, 선택 사항)
