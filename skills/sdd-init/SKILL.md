---
name: sdd-init
description: >-
  새 프로젝트 또는 기존 프로젝트를 스펙 주도 개발(SDD)로 초기화합니다. 멀티 도메인 프로젝트를 지원합니다.
  Use when: "프로젝트 초기화", "SDD 설정", "SDD 시작", "initialize", "setup project"
---

# /claude-sdd:sdd-init — SDD 프로젝트 초기화

현재 프로젝트를 스펙 주도 개발 (SDD)용으로 초기화합니다.

## 사용법

```
/claude-sdd:sdd-init new               # 신규 프로젝트 (greenfield)
/claude-sdd:sdd-init legacy            # 기존 프로젝트 (brownfield)
/claude-sdd:sdd-init new --domains     # 신규 멀티 도메인 프로젝트
/claude-sdd:sdd-init legacy --domains  # 기존 멀티 도메인 프로젝트
/claude-sdd:sdd-init add-domain <id>   # 기존 프로젝트에 도메인 추가
/claude-sdd:sdd-init remove-domain <id> # 도메인 제거
```

## 인자

- `new` — 완전히 새로운 프로젝트에 SDD를 설정
- `legacy` — 변경 사항이 있는 기존 코드베이스에 SDD를 설정
- `--domains` — 멀티 도메인 프로젝트로 초기화 (도메인 정의 인터뷰 진행)
- `add-domain <id>` — 기존 프로젝트에 새 도메인을 추가
- `remove-domain <id>` — 기존 도메인을 제거 (확인 필요)

## 동작

### 0단계: 브랜치 확인 및 생성

현재 Git 브랜치를 확인하고, `feature/**` 패턴이 아니면 feature 브랜치를 생성합니다.

1. `git branch --show-current`로 현재 브랜치를 확인합니다.
2. 브랜치가 `feature/`로 시작하면 **건너뜁니다** (이미 feature 브랜치).
3. `feature/`가 아닌 경우:
   a. 사용자에게 질문된 소스 설정에 Jira 키가 있으면:
      - Jira 키에서 자동 생성: `feature/<jira-key>` (예: `feature/DEV-100`)
   b. Jira 키가 없으면:
      - 사용자에게 브랜치명 입력 요청: "브랜치명을 입력하세요 (feature/ 접두사 자동 추가):"
      - 입력값으로 `feature/<입력값>` 생성
4. `git checkout -b feature/<name>` 실행

```
현재 브랜치: main
→ feature 브랜치가 필요합니다.
브랜치명을 입력하세요 (feature/ 접두사 자동 추가): my-project
→ git checkout -b feature/my-project ✓
```

### 1단계: 스펙 디렉토리 생성

`docs/specs/`가 존재하지 않으면 생성합니다.

`docs/specs/rules/` 디렉토리도 함께 생성합니다.

### 2단계: SDD 설정 파일 생성

`templates/project-init/sdd-config.yaml.tmpl` 템플릿을 사용하여 `docs/specs/sdd-config.yaml`을 생성합니다.

사용자에게 질문합니다:
1. **프로젝트 이름**: 이 프로젝트의 이름은 무엇인가요?
2. **설명**: 프로젝트에 대한 간략한 설명
3. **프로젝트 유형**: 인자에 따라 `new` 또는 `legacy`를 확인

규칙 시스템이 활성화된 경우 `rules:` 섹션을 포함합니다:
```yaml
rules:
  enabled: true
  enforcement: "strict"
  preset: ""
  validation:
    on_spec: true
    on_build: true
    on_review: true
```

템플릿을 채우고 `docs/specs/sdd-config.yaml`에 저장합니다.

### 2.5단계: 도메인 정의 (`--domains` 인자가 있는 경우)

사용자에게 도메인을 정의하기 위한 인터랙티브 인터뷰를 진행합니다:

1. **도메인 수 질문**: "이 프로젝트에는 몇 개의 도메인이 있나요?"

2. **각 도메인에 대해 질문**:
   - **도메인 ID**: 영문 kebab-case (예: `device-mgmt`, `subscription`, `rate-plan`)
   - **도메인 이름**: 표시용 이름 (예: "단말관리", "구독 서비스")
   - **도메인 설명**: 1줄 설명
   - **의존성**: 이 도메인이 의존하는 다른 도메인 ID 목록 (없으면 빈 배열)
   - **도메인별 소스** (선택): Jira 에픽/스토리 키, Confluence 페이지 ID

3. **도메인 구조 확인**: 전체 도메인 목록과 의존성 그래프를 표시하고 사용자에게 확인을 받습니다.

4. `sdd-config.yaml`에 `domains` 섹션을 추가합니다:

```yaml
domains:
  - id: "device-mgmt"
    name: "단말관리"
    description: "단말 등록, 조회, 상태 관리"
    sources:
      confluence: []
      jira: ["DEV-100"]
    dependencies: []

  - id: "subscription"
    name: "구독 서비스"
    description: "구독 생성, 변경, 해지 관리"
    sources:
      confluence: ["PAGE-201"]
      jira: ["SUB-100"]
    dependencies: ["device-mgmt"]
```

5. 도메인별 디렉토리를 생성합니다:
```
docs/specs/domains/<domain-id>/   (각 도메인에 대해)
docs/specs/cross-domain/
```

### 2.7단계: Confluence 퍼블리싱 설정 (선택)

SDD 산출물을 Confluence에 자동 퍼블리싱할지 질문합니다.

1. `~/.claude.json`에서 `mcp-atlassian-*` 서버가 설정되어 있는지 확인합니다.
2. Atlassian MCP가 없으면 이 단계를 건너뜁니다 (안내 메시지만 표시):
   ```
   Confluence 퍼블리싱: Atlassian MCP 미설정 (건너뜀)
   설정하려면: claude-sdd install → MCP 서버 설정
   ```
3. Atlassian MCP가 있으면 루트 페이지 URL을 질문합니다:
   ```
   Confluence 루트 페이지 URL (건너뛰려면 Enter):
   → https://company.atlassian.net/wiki/spaces/TECH/pages/12345
   ```
4. URL이 입력되면:
   a. URL에서 호스트(`company.atlassian.net`)를 추출합니다.
   b. 감지된 Atlassian MCP 서버 목록에서 해당 호스트와 매칭되는 서버를 찾습니다.
   c. 매칭되는 서버가 없으면 경고하고 사용자에게 재입력 또는 건너뛰기를 안내합니다.
   d. URL에서 `space_key`, `root_page_id`를 파싱합니다.
5. 입력을 `sdd-config.yaml`의 `publishing` 섹션에 기록합니다:
   ```yaml
   publishing:
     confluence:
       enabled: true
       mcp_server: "mcp-atlassian-company1"
       space_key: "TECH"
       root_page_id: "12345"
       diagrams:
         enabled: true
         tool: "auto"
       sync:
         strategy: "incremental"
         timestamps: {}
       page_ids: {}
   ```

### 3단계: CLAUDE.md 규칙 주입

프로젝트 루트에 `CLAUDE.md`가 있는지 확인합니다. 없으면 생성합니다.

`templates/claude-md/sdd-leader.md.tmpl`의 SDD 리더 규칙을 프로젝트의 `CLAUDE.md`에 추가합니다:
- `{{PROJECT_NAME}}`을 실제 프로젝트 이름으로 교체
- `{{PROJECT_TYPE}}`을 `new` 또는 `legacy`로 교체
- 멀티 도메인인 경우: `{{DOMAINS}}` 관련 섹션을 활성화하고 도메인 정보를 채움

### 4단계: 설정 확인

**단일 도메인인 경우**:
```
SDD가 [project-name]에 대해 초기화되었습니다 (유형: new/legacy)

생성된 파일:
  - docs/specs/sdd-config.yaml
  - CLAUDE.md에 SDD 규칙 업데이트 완료

다음 단계:
  1. /claude-sdd:sdd-intake — 요구사항 수집
  2. /claude-sdd:sdd-status — 프로젝트 대시보드 보기
```

**멀티 도메인인 경우**:
```
SDD가 [project-name]에 대해 초기화되었습니다 (유형: new, 멀티 도메인)

도메인:
  - device-mgmt: 단말관리
  - subscription: 구독 서비스 (의존: device-mgmt)
  - rate-plan: 요금제
  - rate-benefit: 요금제혜택 (의존: rate-plan, subscription)

생성된 파일:
  - docs/specs/sdd-config.yaml
  - docs/specs/domains/device-mgmt/
  - docs/specs/domains/subscription/
  - docs/specs/domains/rate-plan/
  - docs/specs/domains/rate-benefit/
  - docs/specs/cross-domain/
  - CLAUDE.md에 SDD 규칙 업데이트 완료

다음 단계:
  1. /claude-sdd:sdd-intake [--domain=<id> | --all] — 요구사항 수집
  2. /claude-sdd:sdd-status — 프로젝트 대시보드 보기
```

---

## add-domain 서브커맨드

기존 프로젝트에 새 도메인을 추가합니다.

### 동작

1. `sdd-config.yaml`을 읽어 기존 도메인 목록을 확인합니다.
2. 새 도메인 정보를 인터랙티브하게 질문합니다:
   - 도메인 ID, 이름, 설명, 의존성, 소스 (2.5단계의 개별 도메인 질문과 동일)
3. 기존 도메인 ID와 충돌하지 않는지 확인합니다.
4. `sdd-config.yaml`의 `domains` 배열에 추가합니다.
5. `docs/specs/domains/<new-domain-id>/` 디렉토리를 생성합니다.

**단일 도메인 → 멀티 도메인 전환 시**:

프로젝트가 기존에 단일 도메인 모드(`domains` 키 없음)로 진행되었고, 이미 스펙 파일(03~07)이 존재하는 경우:

1. 사용자에게 질문합니다:
   ```
   이 프로젝트에는 이미 단일 도메인 스펙 파일이 존재합니다.
   기존 스펙을 첫 번째 도메인으로 마이그레이션하시겠습니까?
   1. 예 — 기존 파일을 domains/<first-domain-id>/로 복사합니다
   2. 아니오 — 기존 파일을 유지하고 새 도메인만 추가합니다
   ```
2. "예"인 경우: 기존 `docs/specs/03-*.md` ~ `docs/specs/07-*.md`를 `docs/specs/domains/<id>/`로 복사합니다.
3. `docs/specs/cross-domain/` 디렉토리를 생성합니다.

## remove-domain 서브커맨드

도메인을 제거합니다.

### 동작

1. 사용자에게 확인합니다: "정말로 [domain-name] 도메인을 제거하시겠습니까? 도메인의 모든 스펙 파일이 삭제됩니다."
2. 확인 시:
   - `sdd-config.yaml`에서 해당 도메인 항목을 제거합니다.
   - `docs/specs/domains/<domain-id>/` 디렉토리를 삭제합니다.
   - 다른 도메인의 `dependencies`에서 이 도메인 ID를 제거합니다.
   - 프로젝트 통합 체크리스트를 업데이트합니다.

---

## 의존성

- 없음 (첫 번째 단계)

## 출력

- `docs/specs/sdd-config.yaml`
- `CLAUDE.md` (생성 또는 업데이트)
- 멀티 도메인 시: `docs/specs/domains/*/` 디렉토리, `docs/specs/cross-domain/` 디렉토리
