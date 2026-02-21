---
name: sdd-godmode
description: 심층 인터뷰를 통해 프로젝트 정보를 수집한 후 전체 SDD 라이프사이클을 자동 실행합니다.
---

# /claude-sdd:sdd-godmode — 심층 인터뷰 + 전체 파이프라인 자동 실행

심층 인터뷰를 통해 프로젝트의 모든 정보를 수집한 뒤, SDD 라이프사이클 전체(init -> intake -> spec -> plan -> assign -> build -> review -> integrate)를 자동으로 실행합니다.

## 사용법

```
/claude-sdd:sdd-godmode              # 심층 인터뷰 -> 전체 파이프라인 자동 실행
/claude-sdd:sdd-godmode resume       # 중단된 지점부터 재개
```

## 동작

### Phase 0: 브랜치 확인 및 생성

파이프라인 시작 전에 현재 Git 브랜치를 확인합니다.

1. `git branch --show-current`로 현재 브랜치를 확인합니다.
2. 브랜치가 `feature/`로 시작하면 **건너뜁니다**.
3. `feature/`가 아닌 경우:
   a. 인터뷰 섹션 4에서 Jira 키가 수집되면 자동 생성: `feature/<jira-key>`
   b. Jira 키가 없으면 사용자에게 입력 요청
4. `git checkout -b feature/<name>` 실행

> **주의**: Phase 0은 Phase 1 인터뷰 직전에 실행합니다. Jira 키가 인터뷰에서 수집되므로, 브랜치 생성은 인터뷰 완료 직후 Phase 2(프로젝트 컨텍스트 저장) 전에 실행하는 것도 허용됩니다.

### Phase 1: 심층 인터뷰

`AskUserQuestion`을 사용하여 6개 섹션으로 구조화된 인터뷰를 진행합니다. **각 섹션에서 답변이 모호하거나 불충분하면 후속 질문을 집요하게 이어갑니다.**

#### 섹션 1: 프로젝트 기본 정보

다음 항목을 순서대로 질문합니다:

1. **프로젝트 이름** — 프로젝트의 공식 이름
2. **프로젝트 유형** — 신규(new) / 레거시(legacy)
3. **프로젝트 설명** — 2~3문장으로 요약
4. **대상 사용자** — B2B / B2C / 내부 시스템 / 기타
5. **프로젝트 규모 감각** — MVP? 엔터프라이즈? 예상 사용자 수?

#### 섹션 2: 기술 스택 (집요한 질문 — 이 섹션이 가장 중요)

기술 스택을 빠짐없이 질문합니다. **사용자가 모호한 답변을 하면 반드시 더 깊이 파고듭니다.** 이 섹션의 품질이 이후 모든 스펙의 품질을 결정합니다.

**언어 & 런타임:**
- 메인 언어와 선택 이유
- 런타임 버전 (Node 20? JDK 21? Go 1.22?)
- 모노레포 vs 멀티레포?

**프레임워크:**
- 웹 프레임워크와 선택 이유 (NestJS? Spring Boot? Gin? FastAPI?)
- ORM/데이터 접근 계층 (Prisma? TypeORM? JPA? GORM?)
- 테스트 프레임워크 (Jest? JUnit? Go testing?)

**데이터베이스:**
- RDBMS vs NoSQL vs 둘 다?
- 구체적 DB 제품 (PostgreSQL? MySQL? MongoDB?)
- 예상 데이터 규모 (초기/1년 후)
- 읽기/쓰기 비율?
- 주요 쿼리 패턴?

**캐시 & 메시지 큐:**
- 캐시 (Redis? Memcached? 불필요?)
- 메시지 큐 (Kafka? RabbitMQ? SQS? 불필요?)
- 이벤트 기반 아키텍처 여부?

**API 설계:**
- API 스타일 (REST? GraphQL? gRPC?)
- API 버저닝 전략
- 인증 방식 (JWT? OAuth2? Session? API Key?)
- 역할/권한 체계 (RBAC? ABAC?)

**인프라 & 배포:**
- 클라우드 (AWS? GCP? Azure? 온프레미스?)
- 컨테이너화 (Docker? K8s?)
- CI/CD 파이프라인
- 환경 구성 (dev/staging/prod)

**관측성:**
- 로깅 전략
- 메트릭/모니터링
- 트레이싱

#### 섹션 3: 도메인 구조

- 주요 도메인/모듈 수
- 각 도메인: ID(kebab-case), 이름, 설명, 핵심 엔티티, 주요 API
- 도메인 간 의존관계
- 단일 도메인이면 이 섹션을 간소화

#### 섹션 4: 요구사항 소스

다음 중 해당하는 소스를 질문합니다:
- Confluence 페이지 ID
- Jira 에픽/스토리 키
- Figma 디자인 URL
- 로컬 파일 경로
- 또는 직접 입력 (인터뷰)

#### 섹션 4.5: Confluence 퍼블리싱

- Confluence에 산출물을 자동 퍼블리싱할 건지 질문
- "예"인 경우: `~/.claude.json`에서 감지된 Atlassian MCP 서버 선택, 스페이스 키 또는 루트 페이지 URL 입력
- URL 입력 시 파싱: `https://company.atlassian.net/wiki/spaces/TECH/pages/12345` → `space_key=TECH, root_page_id=12345`
- Atlassian MCP가 없으면 건너뛰고 안내 표시

#### 섹션 5: 비기능 요구사항

- **성능** — 응답 시간, TPS, 동시 사용자
- **보안** — 컴플라이언스, 암호화, 감사 로그
- **확장성** — 성장 전망, 피크 부하
- **가용성** — SLA, DR 전략

#### 섹션 6: 코드 규칙

- 네이밍 컨벤션
- 디렉토리 구조 선호 (계층별/기능별/도메인별)
- 에러 처리 전략
- 테스트 커버리지 목표

### Phase 2: 프로젝트 컨텍스트 저장

인터뷰에서 수집한 모든 정보를 `templates/specs/project-context.md.tmpl` 템플릿을 사용하여 `docs/specs/00-project-context.md`에 저장합니다.

필수 설정:
- `spec_depth: thorough` 플래그를 포함합니다.
- 모든 템플릿 변수(`{{PROJECT_NAME}}`, `{{LANGUAGE}}` 등)를 인터뷰 결과로 치환합니다.
- 도메인 구조가 멀티 도메인인 경우 도메인 테이블을 완전히 채웁니다.
- 요구사항 소스에 해당하지 않는 행은 제거합니다.

저장 후 출력:
```
프로젝트 컨텍스트가 저장되었습니다: docs/specs/00-project-context.md
  - 기본 정보: [프로젝트 이름] ([유형])
  - 기술 스택: [언어] + [프레임워크] + [DB]
  - 도메인: [N]개
  - spec_depth: thorough

Phase 3으로 진행합니다...
```

### Phase 3: 자동 파이프라인 실행

전체 라이프사이클을 자동으로 실행하며 각 단계의 진행 상황을 표시합니다.

**단일 도메인 프로젝트 (신규):**

```
[1/8] sdd-init 실행 중... ✓
[2/8] sdd-intake 실행 중... ✓
[3/8] sdd-spec 실행 중... ✓ (집요한 상세 스펙)
[4/8] sdd-plan 실행 중... ✓
[5/8] sdd-assign 실행 중... ✓
[6/8] sdd-build 실행 중... ✓
[7/8] sdd-review 실행 중... ✓
[8/8] sdd-integrate 실행 중... ✓
```

**단일 도메인 프로젝트 (레거시):**

```
[1/9] sdd-init legacy 실행 중... ✓
[2/9] sdd-intake 실행 중... ✓
[3/9] sdd-spec 실행 중... ✓ (집요한 상세 스펙)
[4/9] sdd-plan 실행 중... ✓
[5/9] sdd-assign 실행 중... ✓
[6/9] sdd-build 실행 중... ✓ (분석 전용 — 코드 변경 없음)
[7/9] sdd-change --from-analysis 실행 중... ✓ (갭 해소)
[8/9] sdd-review 실행 중... ✓
[9/9] sdd-integrate 실행 중... ✓
```

**멀티 도메인 프로젝트:**

```
[1/N] sdd-init --domains 실행 중... ✓
[2/N] sdd-intake --all 실행 중... ✓
[3/N] sdd-spec --shared 실행 중... ✓
[4/N] sdd-spec --all 실행 중... ✓
[5/N] sdd-plan --all 실행 중... ✓
[6/N] sdd-assign --all 실행 중... ✓
... (도메인 빌드는 의존성 순서대로)
[N/N] sdd-integrate 실행 중... ✓
```

각 단계는 `docs/specs/00-project-context.md`를 참조하여 의사결정을 수행합니다. 에러 발생 시 컨텍스트를 활용하여 자동 해결을 시도하고, 불가능한 경우 일시 중단하고 사용자에게 보고합니다.

### Phase 4: 집요한 상세 설계 지침

갓모드 모드에서는 `sdd-spec`이 평소보다 훨씬 상세한 스펙을 생성합니다. `00-project-context.md`에 `spec_depth: thorough`가 설정되어 있으면 아래 수준의 상세도를 적용합니다.

**API 스펙:**
- 모든 엔드포인트에 대한 완전한 JSON 스키마
- 필드별 유효성 검사 규칙 (정규식, 길이, 범위, 필수/선택)
- 모든 HTTP 상태 코드와 에러 코드
- 페이지네이션, 필터링, 정렬 파라미터 상세
- 속도 제한 정책
- 캐시 헤더 전략
- 요청/응답 예시 (정상 + 에러 경로)

**데이터 모델:**
- DDL 수준 스키마 (CREATE TABLE 문)
- 쿼리 패턴 근거가 있는 인덱스 전략
- 해당 시 파티션 전략
- 마이그레이션 스크립트 개요
- 시드 데이터 정의
- 소프트 삭제 / 감사 컬럼 설계

**아키텍처:**
- 주요 유스케이스별 시퀀스 다이어그램
- 통합 지점별 에러 처리 전략
- 서킷 브레이커, 재시도 패턴
- 설정 관리
- 헬스 체크 엔드포인트 설계

**컴포넌트:**
- 타입이 포함된 완전한 메서드 시그니처
- DI 전략
- 컴포넌트별 설정 요구사항
- 에러 타입 계층 구조

### resume 서브커맨드

`resume` 인자와 함께 호출된 경우:

1. `docs/specs/00-project-context.md`를 읽어 컨텍스트가 존재하는지 확인합니다.
   - 존재하지 않으면: `먼저 /claude-sdd:sdd-godmode를 실행하여 인터뷰를 진행하세요.`
2. `docs/specs/sdd-config.yaml`을 읽어 초기화 여부를 확인합니다.
3. `/claude-sdd:sdd-next`의 자동 감지 로직을 사용하여 현재 단계를 판별합니다.
4. 해당 단계부터 자동으로 재개합니다.

```
갓모드 재개 모드
  프로젝트 컨텍스트: docs/specs/00-project-context.md ✓
  현재 감지된 단계: [단계명]
  [단계명]부터 자동 재개합니다...
```

## 출력

- `docs/specs/00-project-context.md`
- 모든 표준 SDD 스펙 파일 (01~08)
- 소스 코드, 테스트, PR (전체 라이프사이클)

## 의존성

- 없음 (최초 진입점)
