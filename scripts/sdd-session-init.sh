#!/usr/bin/env bash
# SDD 세션 초기화 — SDD 프로젝트를 감지하고 세션 시작 시 진행 상황을 표시합니다

set -euo pipefail

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

SDD_CONFIG="docs/specs/sdd-config.yaml"
SPEC_DIR="docs/specs"

# SDD 프로젝트인지 확인
if [ ! -f "$SDD_CONFIG" ]; then
  exit 0
fi

echo ""
echo -e "${BOLD}${BLUE}[SDD]${RESET} 스펙 주도 개발 프로젝트 감지됨"

# 스펙 체크리스트가 존재하면 체크리스트 진행 상황 계산
CHECKLIST="$SPEC_DIR/06-spec-checklist.md"
if [ -f "$CHECKLIST" ]; then
  TOTAL=$(grep -c '^\- \[' "$CHECKLIST" 2>/dev/null || echo "0")
  DONE=$(grep -c '^\- \[x\]' "$CHECKLIST" 2>/dev/null || echo "0")
  if [ "$TOTAL" -gt 0 ]; then
    PCT=$(( DONE * 100 / TOTAL ))
    echo -e "${BOLD}${BLUE}[SDD]${RESET} 스펙 체크리스트: ${GREEN}${DONE}${RESET}/${TOTAL} 완료 (${PCT}%)"
  fi
fi

# 기존 파일을 기반으로 현재 단계 표시
if [ -f "$SPEC_DIR/08-review-report.md" ]; then
  echo -e "${BOLD}${BLUE}[SDD]${RESET} 단계: ${GREEN}리뷰 / 통합${RESET}"
elif [ -f "$SPEC_DIR/07-task-plan.md" ]; then
  echo -e "${BOLD}${BLUE}[SDD]${RESET} 단계: ${YELLOW}빌드 (구현)${RESET}"
elif [ -f "$SPEC_DIR/06-spec-checklist.md" ]; then
  echo -e "${BOLD}${BLUE}[SDD]${RESET} 단계: ${YELLOW}계획${RESET}"
elif [ -f "$SPEC_DIR/01-requirements.md" ]; then
  echo -e "${BOLD}${BLUE}[SDD]${RESET} 단계: ${YELLOW}스펙 생성${RESET}"
else
  echo -e "${BOLD}${BLUE}[SDD]${RESET} 단계: ${DIM}인테이크 (요구사항 수집)${RESET}"
fi

echo -e "${DIM}  전체 대시보드를 보려면 /claude-sdd:sdd-status 를 사용하세요${RESET}"
echo ""
