#!/usr/bin/env node

/**
 * scripts/sdd-lsp.mjs — LSP CLI 브릿지
 *
 * Claude가 Bash로 호출하는 진입점.
 * 인자 파싱 → LspBridge 호출 → JSON 출력.
 *
 * 사용법:
 *   node scripts/sdd-lsp.mjs <command> [options]
 *
 * 명령어:
 *   status                          서버 설치 상태 확인
 *   diagnostics <file>              파일 진단
 *   definition <file> <line> <col>  정의 이동
 *   references <file> <line> <col>  참조 찾기
 *   hover <file> <line> <col>       호버 정보
 *   symbols <file>                  문서 심볼
 *   workspace-symbols <query>       워크스페이스 심볼 검색
 *   implementations <file> <line> <col>  구현 찾기
 *   call-hierarchy <file> <line> <col>   호출 계층
 *   incoming-calls <file> <line> <col>   수신 호출
 *   outgoing-calls <file> <line> <col>   발신 호출
 */

import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..');

// 전체 타임아웃 (60초)
const GLOBAL_TIMEOUT = 60_000;
const globalTimer = setTimeout(() => {
  output({ error: '전체 타임아웃 (60초) 초과' });
  process.exit(1);
}, GLOBAL_TIMEOUT);

function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

function usage() {
  output({
    error: '사용법 오류',
    usage: {
      status: 'node scripts/sdd-lsp.mjs status',
      diagnostics: 'node scripts/sdd-lsp.mjs diagnostics <file>',
      definition: 'node scripts/sdd-lsp.mjs definition <file> <line> <col>',
      references: 'node scripts/sdd-lsp.mjs references <file> <line> <col>',
      hover: 'node scripts/sdd-lsp.mjs hover <file> <line> <col>',
      symbols: 'node scripts/sdd-lsp.mjs symbols <file>',
      'workspace-symbols': 'node scripts/sdd-lsp.mjs workspace-symbols <query>',
      implementations: 'node scripts/sdd-lsp.mjs implementations <file> <line> <col>',
      'call-hierarchy': 'node scripts/sdd-lsp.mjs call-hierarchy <file> <line> <col>',
      'incoming-calls': 'node scripts/sdd-lsp.mjs incoming-calls <file> <line> <col>',
      'outgoing-calls': 'node scripts/sdd-lsp.mjs outgoing-calls <file> <line> <col>',
    },
  });
}

/**
 * 프로젝트 루트를 자동 감지합니다.
 * .git, package.json, go.mod, Cargo.toml, pyproject.toml 등을 찾습니다.
 */
function detectProjectRoot(startPath) {
  let dir = resolve(startPath);
  const markers = ['.git', 'package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml', 'setup.py', 'CMakeLists.txt'];

  for (let i = 0; i < 20; i++) {
    for (const marker of markers) {
      if (existsSync(resolve(dir, marker))) {
        return dir;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return resolve(startPath);
}

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help' || command === '--help') {
    usage();
    clearTimeout(globalTimer);
    return;
  }

  // status 명령은 LspBridge 불필요
  if (command === 'status') {
    const { getAllServerStatus } = await import(resolve(PLUGIN_ROOT, 'lib/lsp/servers.mjs'));
    const statuses = getAllServerStatus();
    output({ command: 'status', servers: statuses });
    clearTimeout(globalTimer);
    return;
  }

  // 파일 기반 명령어: 파일 존재 확인
  const file = args[0];
  if (!file) {
    output({ error: `'${command}' 명령에는 파일 경로가 필요합니다` });
    clearTimeout(globalTimer);
    return;
  }

  const absFile = resolve(file);
  if (command !== 'workspace-symbols' && !existsSync(absFile)) {
    output({ error: `파일을 찾을 수 없습니다: ${file}` });
    clearTimeout(globalTimer);
    return;
  }

  const rootPath = detectProjectRoot(command === 'workspace-symbols' ? process.cwd() : dirname(absFile));

  const { LspBridge } = await import(resolve(PLUGIN_ROOT, 'lib/lsp/bridge.mjs'));
  const bridge = new LspBridge();

  try {
    // 파일 확장자 또는 쿼리로 서버 결정
    const connectTarget = command === 'workspace-symbols' ? args[0] : absFile;
    let language;

    if (command === 'workspace-symbols') {
      // workspace-symbols는 언어를 두 번째 인자로 받거나 기본값 사용
      language = args[1] || 'typescript';
    } else {
      language = absFile; // bridge.connect()가 파일 확장자에서 언어 결정
    }

    const { serverName } = await bridge.connect(language, rootPath);
    let result;

    switch (command) {
      case 'diagnostics': {
        const waitMs = parseInt(args[1], 10) || 3000;
        result = await bridge.diagnostics(absFile, waitMs);
        break;
      }
      case 'definition': {
        const [, line, col] = args;
        if (!line || !col) { output({ error: 'line과 col이 필요합니다 (1-based)' }); break; }
        result = await bridge.definition(absFile, parseInt(line, 10), parseInt(col, 10));
        break;
      }
      case 'references': {
        const [, line, col] = args;
        if (!line || !col) { output({ error: 'line과 col이 필요합니다 (1-based)' }); break; }
        result = await bridge.references(absFile, parseInt(line, 10), parseInt(col, 10));
        break;
      }
      case 'hover': {
        const [, line, col] = args;
        if (!line || !col) { output({ error: 'line과 col이 필요합니다 (1-based)' }); break; }
        result = await bridge.hover(absFile, parseInt(line, 10), parseInt(col, 10));
        break;
      }
      case 'symbols': {
        result = await bridge.documentSymbols(absFile);
        break;
      }
      case 'workspace-symbols': {
        const query = args[0];
        result = await bridge.workspaceSymbols(query);
        break;
      }
      case 'implementations': {
        const [, line, col] = args;
        if (!line || !col) { output({ error: 'line과 col이 필요합니다 (1-based)' }); break; }
        result = await bridge.implementations(absFile, parseInt(line, 10), parseInt(col, 10));
        break;
      }
      case 'call-hierarchy': {
        const [, line, col] = args;
        if (!line || !col) { output({ error: 'line과 col이 필요합니다 (1-based)' }); break; }
        result = await bridge.prepareCallHierarchy(absFile, parseInt(line, 10), parseInt(col, 10));
        break;
      }
      case 'incoming-calls': {
        const [, line, col] = args;
        if (!line || !col) { output({ error: 'line과 col이 필요합니다 (1-based)' }); break; }
        const items = await bridge.prepareCallHierarchy(absFile, parseInt(line, 10), parseInt(col, 10));
        if (items && items.length > 0) {
          result = await bridge.incomingCalls(items[0]);
        } else {
          result = [];
        }
        break;
      }
      case 'outgoing-calls': {
        const [, line, col] = args;
        if (!line || !col) { output({ error: 'line과 col이 필요합니다 (1-based)' }); break; }
        const callItems = await bridge.prepareCallHierarchy(absFile, parseInt(line, 10), parseInt(col, 10));
        if (callItems && callItems.length > 0) {
          result = await bridge.outgoingCalls(callItems[0]);
        } else {
          result = [];
        }
        break;
      }
      default:
        output({ error: `알 수 없는 명령: ${command}` });
        await bridge.disconnect();
        clearTimeout(globalTimer);
        return;
    }

    output({
      command,
      server: serverName,
      file: command === 'workspace-symbols' ? null : file,
      result: result ?? null,
    });

    await bridge.disconnect();
  } catch (err) {
    output({ error: err.message });
    try { await bridge.disconnect(); } catch { /* ignore */ }
  }

  clearTimeout(globalTimer);
}

main().catch((err) => {
  output({ error: err.message });
  clearTimeout(globalTimer);
  process.exit(1);
});
