---
name: sdd-init
description: Use when the user wants to initialize a new or legacy project for Spec-Driven Development.
---

# /claude-sdd:sdd-init — SDD 프로젝트 초기화

현재 프로젝트를 스펙 주도 개발 (SDD)용으로 초기화합니다.

## 사용법

```
/claude-sdd:sdd-init new          # 신규 프로젝트 (greenfield)
/claude-sdd:sdd-init legacy       # 기존 프로젝트 (brownfield)
```

## 인자

- `new` — 완전히 새로운 프로젝트에 SDD를 설정
- `legacy` — 변경 사항이 있는 기존 코드베이스에 SDD를 설정

## 동작

### 1단계: 스펙 디렉토리 생성

`docs/specs/`가 존재하지 않으면 생성합니다.

### 2단계: SDD 설정 파일 생성

`templates/project-init/sdd-config.yaml.tmpl` 템플릿을 사용하여 `docs/specs/sdd-config.yaml`을 생성합니다.

사용자에게 질문합니다:
1. **프로젝트 이름**: 이 프로젝트의 이름은 무엇인가요?
2. **설명**: 프로젝트에 대한 간략한 설명
3. **프로젝트 유형**: 인자에 따라 `new` 또는 `legacy`를 확인

템플릿을 채우고 `docs/specs/sdd-config.yaml`에 저장합니다.

### 3단계: CLAUDE.md 규칙 주입

프로젝트 루트에 `CLAUDE.md`가 있는지 확인합니다. 없으면 생성합니다.

`templates/claude-md/sdd-leader.md.tmpl`의 SDD 리더 규칙을 프로젝트의 `CLAUDE.md`에 추가합니다:
- `{{PROJECT_NAME}}`을 실제 프로젝트 이름으로 교체
- `{{PROJECT_TYPE}}`을 `new` 또는 `legacy`로 교체

### 4단계: 설정 확인

요약을 출력합니다:
```
SDD가 [project-name]에 대해 초기화되었습니다 (유형: new/legacy)

생성된 파일:
  - docs/specs/sdd-config.yaml
  - CLAUDE.md에 SDD 규칙 업데이트 완료

다음 단계:
  1. /claude-sdd:sdd-intake — 요구사항 수집
  2. /claude-sdd:sdd-status — 프로젝트 대시보드 보기
```

## 의존성

- 없음 (첫 번째 단계)

## 출력

- `docs/specs/sdd-config.yaml`
- `CLAUDE.md` (생성 또는 업데이트)
