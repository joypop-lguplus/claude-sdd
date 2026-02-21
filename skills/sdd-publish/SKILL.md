---
name: sdd-publish
description: SDD 산출물을 Confluence에 퍼블리싱하고 다이어그램을 PNG로 첨부합니다.
---

# /claude-sdd:sdd-publish — Confluence 퍼블리싱

SDD 라이프사이클 산출물을 Confluence에 자동 퍼블리싱합니다. 마크다운을 Confluence storage format으로 변환하고, 다이어그램을 PNG로 생성하여 첨부합니다.

## 사용법

```
/claude-sdd:sdd-publish                                    # 전체 산출물 퍼블리싱
/claude-sdd:sdd-publish --stage=spec                       # 특정 단계만
/claude-sdd:sdd-publish --stage=intake                     # intake 단계만
/claude-sdd:sdd-publish --domain=device-mgmt               # 특정 도메인만
/claude-sdd:sdd-publish confluence:SPACE_KEY/PAGE_ID       # 직접 지정 (config 무시)
/claude-sdd:sdd-publish https://company.atlassian.net/...  # URL로 직접 지정
```

## 인자

- `--stage=<name>` — 특정 단계 산출물만 퍼블리싱 (intake, spec, plan, review, change, analysis)
- `--domain=<id>` — 특정 도메인 산출물만 (멀티 도메인)
- `confluence:SPACE_KEY/PAGE_ID` — config 무시, 직접 대상 지정
- `https://...` — Confluence URL에서 space_key와 page_id를 파싱

## 사전 조건

1. `docs/specs/sdd-config.yaml`을 읽어 `publishing.confluence` 설정을 확인합니다.
2. `publishing.confluence.enabled: true`가 아니면 안내합니다:
   ```
   Confluence 퍼블리싱이 설정되지 않았습니다.
   설정하려면 /claude-sdd:sdd-init를 실행하거나 sdd-config.yaml에 publishing 섹션을 추가하세요.
   ```
3. `confluence:` 또는 URL 인자가 있으면 config 없이도 실행합니다 (일회성 퍼블리싱).
4. MCP 서버 연결을 확인합니다.

---

## 동작

### 1단계: 산출물 스캔

`docs/specs/` 디렉토리를 스캔하여 퍼블리싱 대상 파일을 수집합니다.

**산출물-페이지 매핑:**

| 파일 | 페이지 제목 | 다이어그램 |
|------|------------|-----------|
| `00-project-context.md` | 프로젝트 컨텍스트 | — |
| `01-requirements.md` | 요구사항 | — |
| `02-architecture.md` | 아키텍처 | 의존성 다이어그램 |
| `03-api-spec.md` / `03-api-changes.md` | API 스펙 | — |
| `04-data-model.md` / `04-data-migration.md` | 데이터 모델 | ER 다이어그램 |
| `05-component-breakdown.md` / `05-component-changes.md` | 컴포넌트 분해 | 상호작용 다이어그램 |
| `06-spec-checklist.md` | 스펙 체크리스트 | — |
| `07-task-plan.md` | 태스크 계획 | — |
| `08-review-report.md` | 리뷰 보고서 | — |
| `09-change-request.md` | 변경 요청 | — |
| `10-analysis-report.md` | 분석 보고서 (레거시) | — |

### 2단계: 변경 감지

각 파일에 대해 `publishing.confluence.sync.timestamps`의 마지막 퍼블리싱 시각과 파일 수정 시각(mtime)을 비교합니다.

- 파일이 더 최신이면 → 퍼블리싱 대상
- 파일이 더 오래되었거나 같으면 → 건너뜀 (변경 없음)
- `timestamps`에 기록이 없으면 → 신규 퍼블리싱 대상

`--stage` 옵션이 있으면 해당 단계 파일만 필터링합니다.

### 3단계: 마크다운 → Confluence 변환 + 퍼블리싱

각 변경된 파일에 대해:

1. **마크다운 → Confluence storage format 변환**:
   - 헤더(`#`, `##`, `###`) → `<h1>`, `<h2>`, `<h3>`
   - 코드 블록 → `<ac:structured-macro ac:name="code">`
   - 체크리스트(`- [x]`, `- [ ]`) → Confluence 체크리스트 매크로
   - 테이블 → Confluence 테이블
   - 인라인 코드 → `<code>`

2. **다이어그램 생성** (해당 파일에 다이어그램이 필요한 경우):
   - `scripts/sdd-generate-diagram.py`를 호출하여 PNG 생성
   - 생성된 PNG를 Confluence storage format의 `<ac:image>` 태그로 삽입

3. **Confluence API 호출**:
   - `page_ids`에 ID가 있으면 → `confluence_update_page` MCP 도구로 업데이트
   - `page_ids`에 ID가 없으면 → `confluence_create_page` MCP 도구로 신규 생성
     - 부모 페이지: `root_page_id`
     - 생성 후 반환된 page_id를 `page_ids`에 저장

4. **PNG 첨부** (다이어그램이 있는 경우):
   - `scripts/sdd-confluence-upload.py`를 실행하여 PNG를 Confluence 페이지에 첨부
   - 이 스크립트는 `~/.claude.json`에서 MCP 서버의 인증 정보를 추출하여 `atlassian-python-api`로 첨부

5. **타임스탬프 업데이트**: `publishing.confluence.sync.timestamps`에 현재 시각 기록

### 4단계: sdd-config.yaml 저장

변경된 `timestamps`와 `page_ids`를 `sdd-config.yaml`에 저장합니다.

### 5단계: 결과 대시보드

```
╔═══════════════════════════════════════╗
║  Confluence 퍼블리싱 완료              ║
╚═══════════════════════════════════════╝

  산출물               상태       URL
  ─────────────────────────────────────────
  00-프로젝트 컨텍스트  — 변경없음
  01-요구사항          ✓ 업데이트  https://company.atlassian.net/wiki/...
  02-아키텍처          ✓ 신규생성  https://company.atlassian.net/wiki/... (다이어그램 2개 첨부)
  03-API 스펙          — 변경없음
  04-데이터 모델        ✓ 업데이트  https://company.atlassian.net/wiki/... (ER 다이어그램 첨부)
  05-컴포넌트 분해      — 변경없음
  06-스펙 체크리스트    ✓ 업데이트  https://company.atlassian.net/wiki/...
  07-태스크 계획        — 변경없음

  퍼블리싱: 4개 업데이트, 3개 건너뜀
  다이어그램: 3개 생성
```

---

## 페이지 계층

Confluence에 생성되는 페이지 계층:

```
루트 페이지 (사용자 지정)
├── 00-프로젝트 컨텍스트
├── 01-요구사항
├── 02-아키텍처          ← 의존성 다이어그램 PNG
├── 03-API 스펙
├── 04-데이터 모델        ← ER 다이어그램 PNG
├── 05-컴포넌트 분해      ← 상호작용 다이어그램 PNG
├── 06-스펙 체크리스트
├── 07-태스크 계획
├── 08-리뷰 보고서
├── 09-변경 요청
└── 10-분석 보고서 (레거시)
```

멀티 도메인인 경우:

```
루트 페이지
├── 00-프로젝트 컨텍스트
├── 01-요구사항 (인덱스)
├── 02-아키텍처 (프로젝트 수준)
├── 도메인: device-mgmt
│   ├── 01-요구사항
│   ├── 02-아키텍처
│   ├── 03-API 스펙
│   ├── 04-데이터 모델
│   ├── 05-컴포넌트 분해
│   └── 06-체크리스트
├── 도메인: subscription
│   └── ...
├── 크로스 도메인
│   ├── 의존성 맵
│   ├── 통합 포인트
│   └── 통합 체크리스트
├── 06-통합 체크리스트
├── 07-태스크 계획
└── 08-리뷰 보고서
```

---

## 다이어그램 생성

`scripts/sdd-generate-diagram.py`를 사용하여 다이어그램을 PNG로 생성합니다.

### 지원 유형

| 유형 | 도구 | 대상 산출물 |
|------|------|------------|
| `architecture` | diagrams 라이브러리 | 02-architecture.md |
| `dependency` | graphviz DOT | 02-architecture.md (모듈 의존성) |
| `er` | graphviz DOT | 04-data-model.md |
| `interaction` | graphviz DOT | 05-component-breakdown.md |
| `domain` | diagrams Cluster | 02-architecture.md (멀티 도메인) |

### 다이어그램 소스 추출

각 산출물의 마크다운 내용에서 다이어그램에 필요한 정보를 자동 추출합니다:

- **architecture**: 모듈 목록, 계층 구조, 외부 서비스
- **dependency**: 모듈 간 의존관계 (`→` 또는 화살표 표기)
- **er**: 엔티티, 필드, 관계 (FK, 1:N, N:M)
- **interaction**: 컴포넌트 간 호출 관계

### diagrams vs graphviz 선택

`publishing.confluence.diagrams.tool` 설정에 따라:
- `auto`: 가용한 도구 자동 선택 (diagrams 우선, 없으면 graphviz)
- `graphviz`: graphviz DOT만 사용
- `diagrams`: Python diagrams 라이브러리만 사용

---

## PNG 첨부

`scripts/sdd-confluence-upload.py`를 사용하여 PNG를 Confluence 페이지에 첨부합니다.

이 스크립트는:
1. `~/.claude.json`에서 지정된 MCP 서버의 인증 정보 추출
2. `atlassian-python-api`의 `attach_file()` 메서드로 첨부
3. `CONFLUENCE_SSL_VERIFY` 환경변수를 참조하여 SSL 우회 설정

MCP 도구의 `confluence_update_page`는 첨부 파일 업로드를 지원하지 않으므로, Python 스크립트를 통해 직접 API를 호출합니다.

---

## 멀티 도메인 지원

### --domain=<id>

1. `docs/specs/domains/<domain-id>/` 디렉토리의 산출물만 퍼블리싱합니다.
2. Confluence에 도메인별 하위 페이지 그룹을 생성합니다.
3. 도메인 하위 페이지의 부모는 루트 페이지입니다.

### 전체 퍼블리싱 (인자 없음)

1. 프로젝트 수준 파일 (00~02, 06~10) 퍼블리싱
2. 각 도메인 디렉토리의 파일 퍼블리싱
3. 크로스 도메인 파일 퍼블리싱

---

## 출력

- Confluence 페이지 생성/업데이트
- PNG 다이어그램 파일 (임시, 퍼블리싱 후 정리)
- `sdd-config.yaml` 업데이트 (timestamps, page_ids)

## 의존성

- `docs/specs/sdd-config.yaml` (`/claude-sdd:sdd-init`에서 생성)
- `publishing.confluence.enabled: true` 설정
- Atlassian MCP 서버 연결
- 다이어그램 생성: `graphviz` 또는 `diagrams` Python 패키지 (선택)
- PNG 첨부: `atlassian-python-api` Python 패키지
