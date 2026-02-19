---
name: sdd-integrate
description: Use when the user wants to finalize implementation with tests, documentation, and PR creation.
---

# /claude-sdd:sdd-integrate — 통합, PR 및 문서화

테스트, 문서화, 풀 리퀘스트를 포함하여 구현을 마무리합니다.

## 사용법

```
/claude-sdd:sdd-integrate              # 전체 통합 워크플로우
/claude-sdd:sdd-integrate pr           # PR만 생성 (테스트/문서 건너뛰기)
/claude-sdd:sdd-integrate docs         # 문서만 업데이트
```

## 사전 조건

- 품질 게이트가 통과되어야 함 (`08-review-report.md`에 100% 통과 표시)
- 또는 실패에도 불구하고 사용자가 `/claude-sdd:sdd-integrate`로 명시적으로 재정의

## 동작

### 1단계: 최종 테스트 실행

프로젝트의 전체 테스트 스위트를 실행합니다:
```
전체 테스트 스위트 실행 중...
  단위 테스트: 45개 통과, 0개 실패
  통합 테스트: 12개 통과, 0개 실패
  전체: 57개 통과

모든 테스트 통과.
```

테스트가 실패하면 경고하고 진행 여부를 묻습니다.

### 2단계: 문서 업데이트

1. **CHANGELOG.md**: 이번 개발 사이클에 대한 항목을 추가합니다.
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - [스펙의 기능]

   ### Changed
   - [스펙의 변경 사항]
   ```

2. **README.md**: 사용자 대면 동작이 변경된 경우 업데이트합니다.

3. **스펙 문서**: `06-spec-checklist.md`를 최종 확정으로 표시합니다.

### 3단계: 브랜치 생성 및 PR

1. 기능 브랜치를 생성합니다:
   ```
   git checkout -b sdd/<feature-name>
   ```

2. 변경 사항을 스테이징하고 커밋합니다:
   ```
   git add .
   git commit -m "feat: [requirements 기반 설명]

   SDD Spec Traceability:
   - Requirements: docs/specs/01-requirements.md
   - Architecture: docs/specs/02-*.md
   - Checklist: docs/specs/06-spec-checklist.md (28/28 complete)
   - Review: docs/specs/08-review-report.md"
   ```

3. 푸시하고 PR을 생성합니다:
   ```
   git push -u origin sdd/<feature-name>
   gh pr create --title "..." --body "..."
   ```

### PR 본문 형식

```markdown
## Summary

[요구사항의 간략한 설명]

## Spec Traceability

| Document | Status |
|----------|--------|
| Requirements | docs/specs/01-requirements.md |
| Architecture | docs/specs/02-*.md |
| API Spec | docs/specs/03-*.md |
| Data Model | docs/specs/04-*.md |
| Components | docs/specs/05-*.md |
| Checklist | 28/28 complete (100%) |
| Review | All items passed |

## Changes

[주요 변경 사항 목록]

## Test Plan

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual verification of key flows
```

### 4단계: 요약

```
통합 완료!

브랜치: sdd/<feature-name>
PR: #123 — <title>
URL: https://github.com/...

스펙 문서:
  - docs/specs/의 모든 스펙이 최종 확정됨
  - 체크리스트: 28/28 완료
  - 리뷰: 모두 통과

문서:
  - CHANGELOG.md 업데이트됨
  - README.md 업데이트됨 (해당하는 경우)
```

## 출력

- Git 브랜치 및 커밋
- `gh pr create`를 통한 풀 리퀘스트
- 업데이트된 CHANGELOG.md
- 업데이트된 README.md (필요한 경우)

## 의존성

- `docs/specs/08-review-report.md` (`/claude-sdd:sdd-review`에서 생성)
- `gh` CLI (PR 생성용)
