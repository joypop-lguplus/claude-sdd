---
name: sdd-intake
description: Confluence, Jira, Figma, 파일, 인터뷰 등에서 요구사항을 수집합니다. 멀티 도메인 프로젝트에서는 도메인별 수집을 지원합니다.
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

# 멀티 도메인 옵션
/claude-sdd:sdd-intake --domain=<id>            # 특정 도메인 요구사항 수집
/claude-sdd:sdd-intake --domain=<id> jira:<key> # 특정 도메인에 특정 소스에서 수집
/claude-sdd:sdd-intake --all                    # 모든 도메인 일괄 수집
```

## 인자

- `confluence:<page-id>` — MCP를 통해 가져올 Confluence 페이지 ID
- `jira:<epic-key>` — MCP를 통해 가져올 Jira 에픽 키 (예: `PROJ-100`)
- `figma:<url>` — 시각 분석을 위한 Figma 파일 URL
- `file:<path>` — 로컬 요구사항 문서 경로
- `interview` — 대화형 인터뷰 세션 시작
- `--domain=<id>` — 특정 도메인의 요구사항만 수집 (멀티 도메인 프로젝트)
- `--all` — 모든 도메인의 요구사항을 도메인별 소스에서 일괄 수집
- (없음) — 사용자에게 소스 유형 선택을 요청

## 사전 조건

1. `docs/specs/sdd-config.yaml`을 읽어 프로젝트 설정을 확인합니다.
2. `domains` 키가 존재하는지 확인하여 **도메인 모드**를 감지합니다:
   - `domains` 없음 또는 빈 배열 → **단일 도메인 모드** (기존 동작)
   - `domains` 존재 → **멀티 도메인 모드**

## 동작 (단일 도메인 모드)

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

### 도메인 분리 권장

단일 도메인 모드에서 요구사항 수집이 완료된 후, 요구사항 규모를 분석합니다:
- **기능 요구사항(FR)이 30개 이상** 또는 **예상 엔티티가 10개 이상**이면 도메인 분리를 권장합니다:

```
이 프로젝트의 요구사항 규모가 큽니다 (FR: 45개, 예상 엔티티: 15개).
도메인별 분리를 권장합니다:
  - 관련 기능을 도메인으로 묶으면 스펙 관리와 빌드 품질이 향상됩니다
  - 각 도메인이 독립적인 라이프사이클을 가져 병렬 작업이 가능합니다

도메인을 추가하려면: /claude-sdd:sdd-init add-domain <id>
도메인 분리 없이 계속 진행하려면: /claude-sdd:sdd-spec
```

이 권장은 정보 제공 목적이며 강제하지 않습니다.

---

## 동작 (멀티 도메인 모드)

### 도메인 미지정 시

사용자에게 도메인 선택 목록을 표시합니다:
```
도메인을 선택하세요:
  1. device-mgmt (단말관리) [상태: 요구사항 없음]
  2. subscription (구독 서비스) [상태: 요구사항 없음]
  3. rate-plan (요금제) [상태: 요구사항 수집 완료]
  4. rate-benefit (요금제혜택) [상태: 요구사항 없음]
  5. (all) 모든 도메인 일괄 수집
```

### --domain=<id> 지정 시

1. 지정된 도메인의 요구사항만 수집합니다.
2. 도메인의 `sources` 설정이 `sdd-config.yaml`에 있으면 해당 소스를 자동으로 사용합니다.
3. 추가 소스는 인자로 지정할 수 있습니다 (예: `--domain=device-mgmt jira:DEV-200`).
4. `sdd-requirements-analyst` 에이전트에 도메인 컨텍스트를 전달합니다:
   - 이 도메인의 범위에 해당하는 요구사항만 추출하세요
   - 요구사항 번호에 도메인 접두사를 사용하세요 (예: `DEV-FR-001`)
   - 다른 도메인과의 연동이 필요한 요구사항은 "크로스 도메인 의존성" 섹션에 별도 기록
5. 출력: `docs/specs/domains/<domain-id>/01-requirements.md`

### --all 지정 시

1. `sdd-config.yaml`의 각 도메인에 대해:
   - 도메인별 `sources`가 설정되어 있으면 해당 소스에서 요구사항을 수집합니다.
   - 소스가 설정되어 있지 않으면 건너뛰고 보고합니다.
2. 각 도메인의 `01-requirements.md`를 생성합니다.
3. 프로젝트 수준 `docs/specs/01-requirements.md`를 자동 생성/업데이트합니다 (각 도메인의 요약 인덱스).

### 프로젝트 수준 요구사항 인덱스

멀티 도메인 모드에서 프로젝트 수준 `docs/specs/01-requirements.md`는 **자동 생성**됩니다:

```markdown
# 01 — 프로젝트 요구사항 인덱스

> 이 파일은 도메인별 요구사항의 요약 인덱스입니다.
> 상세 요구사항은 각 도메인 디렉토리를 참조하세요.

## 도메인별 요구사항

### 단말관리 (device-mgmt)
- 요구사항 문서: [domains/device-mgmt/01-requirements.md](domains/device-mgmt/01-requirements.md)
- 기능 요구사항: 15개
- 비기능 요구사항: 5개
- 요약: 단말 등록, 조회, 상태 관리, ...

### 구독 서비스 (subscription)
- 요구사항 문서: [domains/subscription/01-requirements.md](domains/subscription/01-requirements.md)
- 기능 요구사항: 12개
- 비기능 요구사항: 4개
- 요약: 구독 생성, 변경, 해지, ...

## 프로젝트 전체 비기능 요구사항
(모든 도메인에 공통 적용)
- NFR-001: 응답 시간 200ms 이하
- NFR-002: 동시 사용자 10,000명 지원
- ...
```

---

## 출력

| 모드 | 출력 파일 |
|------|-----------|
| 단일 도메인 | `docs/specs/01-requirements.md` |
| 멀티 도메인 (특정 도메인) | `docs/specs/domains/<domain-id>/01-requirements.md` |
| 멀티 도메인 (전체) | 각 도메인의 `01-requirements.md` + 프로젝트 인덱스 |

생성 후 출력:
```
요구사항 문서가 생성되었습니다: docs/specs/[domains/<id>/]01-requirements.md
  - X개의 기능 요구사항
  - Y개의 비기능 요구사항

다음 단계: /claude-sdd:sdd-spec [--domain=<id>] — 기술 명세서 생성
```

## 퍼블리싱 (조건부)

`sdd-config.yaml`에서 `publishing.confluence.enabled: true`인 경우, 요구사항 문서 생성 완료 후 자동으로 Confluence에 퍼블리싱합니다.

1. `publishing` 설정을 확인합니다.
2. `enabled: true`이면 `/claude-sdd:sdd-publish --stage=intake`와 동일한 로직으로 `01-requirements.md`를 퍼블리싱합니다.
3. 퍼블리싱 결과를 출력합니다:
   ```
   Confluence 퍼블리싱: 01-요구사항 ✓ https://company.atlassian.net/wiki/...
   ```
4. 퍼블리싱 실패 시 경고만 표시하고 다음 단계로 진행합니다 (퍼블리싱 실패가 라이프사이클을 차단하지 않음).

## 의존성

- `docs/specs/sdd-config.yaml`이 존재해야 함 (먼저 `/claude-sdd:sdd-init` 실행)
- Confluence/Jira MCP 도구 (원격 소스의 경우, 선택 사항)
