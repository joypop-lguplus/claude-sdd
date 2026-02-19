---
name: sdd
description: Use when the user wants to continue the SDD lifecycle, asks "what's next", or types /sdd. Auto-detects the current phase and routes to the appropriate step.
version: 0.3.0
---

# /sdd — SDD 라이프사이클 오케스트레이터

스펙 주도 개발 (SDD) 라이프사이클의 메인 진입점입니다. 현재 프로젝트 상태에 따라 적절한 단계로 라우팅합니다.

## 사용법

```
/sdd                   # 단계 자동 감지 후 진행
/sdd help              # 모든 SDD 명령어 표시
/sdd reset             # SDD 상태 초기화 (확인 필요)
```

## 동작

### 자동 감지 모드 (`/sdd`)

프로젝트 상태를 읽고 다음 작업으로 라우팅합니다:

1. **`sdd-config.yaml`이 없음** → `/sdd-init` 실행
2. **`01-requirements.md`가 없음** → `/sdd-intake` 실행
3. **`02-*.md`부터 `06-*.md`가 없음** → `/sdd-spec` 실행
4. **`07-task-plan.md`가 없음** → `/sdd-plan` 실행
5. **`07-task-plan.md` 존재, 체크리스트 미완료** → `/sdd-build` 실행
6. **체크리스트 완료, `08-review-report.md` 없음** → `/sdd-review` 실행
7. **리뷰 통과** → `/sdd-integrate` 실행
8. **모두 완료** → 완료 요약 표시

라우팅 전 표시 내용:
```
SDD 라이프사이클 — 현재 상태

프로젝트: [name] (유형: new/legacy)
단계: [현재 단계]
체크리스트: X/Y 완료 (Z%)

진행 대상: /sdd-[phase]
```

### 도움말 모드 (`/sdd help`)

사용 가능한 모든 SDD 명령어를 표시합니다:
```
SDD — 스펙 주도 개발 (SDD) 라이프사이클

명령어:
  /sdd              단계 자동 감지 후 진행
  /sdd-init         SDD 프로젝트 초기화
  /sdd-intake       요구사항 수집
  /sdd-spec         기술 명세서 생성
  /sdd-plan         태스크 분해 및 팀 배정
  /sdd-build        Agent Teams를 통한 구현
  /sdd-review       품질 게이트 검증
  /sdd-integrate    통합, PR 및 문서화
  /sdd-status       상태 대시보드

라이프사이클:
  init → intake → spec → plan → build → review → integrate

각 단계는 반복을 위해 독립적으로 재진입할 수 있습니다.
```

### 초기화 모드 (`/sdd reset`)

확인을 요청한 후:
1. `docs/specs/` 내 모든 파일 삭제
2. `CLAUDE.md`에서 SDD 규칙 제거
3. 출력: `SDD 상태가 초기화되었습니다. /sdd-init을 실행하여 다시 시작하세요.`

## 의존성

- 상태에 따라 다른 SDD 스킬로 라우팅
