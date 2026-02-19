#!/usr/bin/env node

import { header, colors } from '../lib/utils.mjs';

const VERSION = '0.3.0';
const [,, command, ...args] = process.argv;

// npx 실행인지 직접 실행인지 감지하여 안내 명령어 결정
const isNpx = !!(process.env.npm_execpath || process.argv[1]?.includes('npx'));
process.env.SDD_CLI_NAME = isNpx
  ? 'npx github:joypop-lguplus/claude-sdd'
  : 'claude-sdd';

async function main() {
  switch (command) {
    case 'check':
    case 'status': {
      header('claude-sdd \u2014 상태 확인');
      const { checkAll, printResults } = await import('../lib/checker.mjs');
      const results = checkAll();
      printResults(results);
      break;
    }

    case 'install': {
      header('claude-sdd \u2014 설치 마법사');
      const { runInstaller } = await import('../lib/installer.mjs');
      await runInstaller();
      break;
    }

    case 'uninstall': {
      header('claude-sdd \u2014 제거');
      const { runUninstaller } = await import('../lib/installer.mjs');
      await runUninstaller();
      break;
    }

    case 'doctor': {
      header('claude-sdd \u2014 진단');
      const { runDoctor } = await import('../lib/doctor.mjs');
      await runDoctor();
      break;
    }

    case 'version':
    case '--version':
    case '-v':
      console.log(`claude-sdd v${VERSION}`);
      break;

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;

    default:
      console.log(colors.red(`알 수 없는 명령어: ${command}`));
      console.log();
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`${colors.bold('claude-sdd')} v${VERSION}`);
  console.log('Claude Code 에이전트 팀을 활용한 스펙 주도 개발 (SDD) 라이프사이클');
  console.log();
  console.log(colors.bold('사용법:'));
  console.log('  claude-sdd <명령어>');
  console.log();
  console.log(colors.bold('명령어:'));
  console.log('  install     설치 마법사 실행');
  console.log('  uninstall   플러그인 제거');
  console.log('  check       의존성 상태 확인');
  console.log('  doctor      정밀 진단');
  console.log('  version     버전 표시');
  console.log('  help        이 도움말 표시');
  console.log();
  console.log(colors.bold('빠른 시작:'));
  console.log('  npx github:joypop-lguplus/claude-sdd install');
  console.log();
  console.log(colors.bold('SDD 라이프사이클 (Claude Code 내에서):'));
  console.log('  /sdd-init       SDD 프로젝트 초기화');
  console.log('  /sdd-intake     요구사항 수집');
  console.log('  /sdd-spec       기술 스펙 생성');
  console.log('  /sdd-plan       작업 분해 및 팀 배정');
  console.log('  /sdd-build      에이전트 팀으로 구현');
  console.log('  /sdd-review     품질 게이트 검증');
  console.log('  /sdd-integrate  통합, PR 및 문서화');
  console.log('  /sdd-status     상태 대시보드');
  console.log('  /sdd-lsp        LSP 기반 의미 분석');
  console.log('  /sdd            단계 자동 감지 및 진행');
}

main().catch((err) => {
  console.error(colors.red(`오류: ${err.message}`));
  process.exit(1);
});
