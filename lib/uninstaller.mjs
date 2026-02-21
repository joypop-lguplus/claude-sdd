import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  commandExists, confirm,
  colors, sym, status, section, isMac,
} from './utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..');
const home = homedir();

const PLUGIN_NAME = 'claude-sdd';
const GLOBAL_PLUGIN_DIR = join(home, '.claude', 'plugins', 'claude-sdd');

function detectProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function projectPluginDir(projectRoot) {
  return join(projectRoot, '.claude', 'plugins', 'claude-sdd');
}

function isPluginInstalled() {
  try {
    const installed = readFileSync(
      join(home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8'
    );
    return installed.includes(`"${PLUGIN_NAME}@${PLUGIN_NAME}"`);
  } catch { return false; }
}

function isMarketplaceRegistered() {
  try {
    const known = readFileSync(
      join(home, '.claude', 'plugins', 'known_marketplaces.json'), 'utf8'
    );
    return known.includes(`"${PLUGIN_NAME}"`);
  } catch { return false; }
}

/**
 * 설치된 MCP 서버 목록에서 atlassian/figma 관련 서버를 찾습니다.
 */
function findMcpServers() {
  const claudeJson = join(home, '.claude.json');
  const servers = { atlassian: [], figma: [] };

  if (!existsSync(claudeJson)) return servers;

  try {
    const config = JSON.parse(readFileSync(claudeJson, 'utf8'));
    const mcpServers = config.mcpServers || {};
    for (const name of Object.keys(mcpServers)) {
      if (name.includes('atlassian')) servers.atlassian.push(name);
      if (name.includes('figma')) servers.figma.push(name);
    }
  } catch { /* ignore */ }

  return servers;
}

/**
 * Python 패키지가 설치되어 있는지 확인합니다.
 */
function pythonPkgInstalled(pkg) {
  try {
    const r = spawnSync('pip3', ['show', pkg], { stdio: 'pipe', timeout: 10000 });
    return r.status === 0;
  } catch { return false; }
}

// ─────────────────────────────────────────────
// uninstall (확장 버전)
// ─────────────────────────────────────────────

export async function runUninstaller() {
  console.log('claude-sdd 플러그인 및 관련 도구를 제거합니다.');
  console.log();

  // 제거 대상 스캔
  const installed = {
    plugin: isPluginInstalled(),
    marketplace: isMarketplaceRegistered(),
    lsps: [],
    mcpServers: findMcpServers(),
    diagrams: {
      graphviz: commandExists('dot'),
      diagramsPy: pythonPkgInstalled('diagrams'),
      graphvizPy: pythonPkgInstalled('graphviz'),
      atlassianApi: pythonPkgInstalled('atlassian-python-api'),
    },
  };

  // LSP 플러그인 확인
  const lspPlugins = [
    { label: 'TypeScript / JavaScript', plugin: 'vtsls' },
    { label: 'Python', plugin: 'pyright' },
    { label: 'Go', plugin: 'gopls' },
    { label: 'Java', plugin: 'jdtls' },
    { label: 'Kotlin', plugin: 'kotlin-lsp' },
    { label: 'Lua', plugin: 'lua-language-server' },
    { label: 'Terraform', plugin: 'terraform-ls' },
    { label: 'YAML', plugin: 'yaml-language-server' },
  ];

  try {
    const installedPlugins = readFileSync(
      join(home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8'
    );
    installed.lsps = lspPlugins.filter(
      lsp => installedPlugins.includes(`"${lsp.plugin}@claude-code-lsps"`)
    );
  } catch { /* ignore */ }

  // 제거 대상 표시
  section('제거 대상');

  const targets = [];
  if (installed.plugin) targets.push('claude-sdd 플러그인');
  if (installed.lsps.length > 0) {
    targets.push(`LSP 플러그인 (${installed.lsps.length}개): ${installed.lsps.map(l => l.plugin).join(', ')}`);
  }
  const mcpNames = [...installed.mcpServers.atlassian, ...installed.mcpServers.figma];
  if (mcpNames.length > 0) targets.push(`MCP 서버: ${mcpNames.join(', ')}`);

  const diagTools = [];
  if (installed.diagrams.graphviz) diagTools.push('graphviz');
  if (installed.diagrams.diagramsPy) diagTools.push('diagrams');
  if (installed.diagrams.atlassianApi) diagTools.push('atlassian-python-api');
  if (diagTools.length > 0) targets.push(`다이어그램 도구: ${diagTools.join(', ')}`);

  if (installed.marketplace) targets.push('마켓플레이스: claude-sdd');
  targets.push('관련 설정값 (ENABLE_LSP_TOOL, AGENT_TEAMS)');

  if (targets.length === 0) {
    console.log(colors.dim('  제거할 항목이 없습니다.'));
    return;
  }

  for (const t of targets) {
    console.log(`  ${sym.dot} ${t}`);
  }

  console.log();
  if (!await confirm(`  ${sym.arr} SDD 플러그인과 관련 도구를 모두 제거하시겠습니까?`)) {
    console.log(colors.dim('  제거가 취소되었습니다.'));
    return;
  }

  let removed = false;

  // 1. claude-sdd 플러그인 제거
  if (installed.plugin) {
    section('claude-sdd 플러그인 제거');
    const pi = spawnSync('claude', ['plugin', 'uninstall', PLUGIN_NAME], {
      stdio: 'pipe', timeout: 30000,
    });
    if (pi.status === 0) {
      status('플러그인 제거', true, `${PLUGIN_NAME} 제거 완료`);
      removed = true;
    } else {
      status('플러그인 제거', false, '실패');
    }
  }

  // 2. LSP 플러그인 제거
  if (installed.lsps.length > 0) {
    section('LSP 플러그인 제거');
    for (const lsp of installed.lsps) {
      const pi = spawnSync('claude', ['plugin', 'uninstall', `${lsp.plugin}@claude-code-lsps`], {
        stdio: 'pipe', timeout: 30000,
      });
      if (pi.status === 0) {
        status(`${lsp.label} LSP`, true, '제거 완료');
        removed = true;
      } else {
        const errMsg = (pi.stderr?.toString() || pi.stdout?.toString() || '').trim();
        const reason = errMsg ? ` — ${errMsg.split('\n')[0]}` : '';
        status(`${lsp.label} LSP`, false, `제거 실패${reason}`);
      }
    }

    // LSP 마켓플레이스 제거
    const mp = spawnSync('claude', ['plugin', 'marketplace', 'remove', 'claude-code-lsps'], {
      stdio: 'pipe', timeout: 30000,
    });
    if (mp.status === 0) {
      status('LSP 마켓플레이스', true, '제거 완료');
    }
  }

  // 3. MCP 서버 제거
  if (mcpNames.length > 0) {
    section('MCP 서버 제거');
    for (const name of mcpNames) {
      const mr = spawnSync('claude', ['mcp', 'remove', name], {
        stdio: 'pipe', timeout: 30000,
      });
      if (mr.status === 0) {
        status(`MCP ${name}`, true, '제거 완료');
        removed = true;
      } else {
        status(`MCP ${name}`, false, '제거 실패');
      }
    }
  }

  // 4. 다이어그램 도구 제거
  if (diagTools.length > 0) {
    section('다이어그램 도구 제거');

    const pyPkgs = [];
    if (installed.diagrams.diagramsPy) pyPkgs.push('diagrams');
    if (installed.diagrams.atlassianApi) pyPkgs.push('atlassian-python-api');

    if (installed.diagrams.graphvizPy) pyPkgs.push('graphviz');

    if (pyPkgs.length > 0) {
      const r = spawnSync('pip3', ['uninstall', '-y', '--break-system-packages', ...pyPkgs], { stdio: 'pipe', timeout: 60000 });
      if (r.status === 0) {
        status('Python 패키지', true, `${pyPkgs.join(', ')} 제거 완료`);
        removed = true;
      } else {
        status('Python 패키지', false, '제거 실패');
      }
    }

    if (installed.diagrams.graphviz && isMac && commandExists('brew')) {
      const r = spawnSync('brew', ['uninstall', 'graphviz'], { stdio: 'pipe', timeout: 60000 });
      if (r.status === 0) {
        status('Graphviz', true, '제거 완료');
        removed = true;
      } else {
        status('Graphviz', false, '제거 실패 — 수동으로 brew uninstall graphviz를 실행하세요');
      }
    }
  }

  // 5. 마켓플레이스 제거
  if (installed.marketplace) {
    section('마켓플레이스 제거');
    const mp = spawnSync('claude', ['plugin', 'marketplace', 'remove', PLUGIN_NAME], {
      stdio: 'pipe', timeout: 30000,
    });
    if (mp.status === 0) {
      status('마켓플레이스', true, '제거 완료');
      removed = true;
    } else {
      status('마켓플레이스', false, '제거 실패');
    }
  }

  // 6. 레거시 심볼릭 링크 정리
  const legacyDirs = [GLOBAL_PLUGIN_DIR];
  const projectRoot = detectProjectRoot();
  if (projectRoot) legacyDirs.push(projectPluginDir(projectRoot));

  for (const dir of legacyDirs) {
    if (existsSync(dir)) {
      try {
        unlinkSync(dir);
        status('레거시 심볼릭 링크', true, `${dir} 제거 완료`);
        removed = true;
      } catch { /* ignore */ }
    }
  }

  // 7. 설정 정리 (ENABLE_LSP_TOOL, AGENT_TEAMS)
  section('설정 정리');

  const settingsFiles = [
    { path: join(home, '.claude', 'settings.json'), label: '글로벌 settings.json' },
  ];
  if (projectRoot) {
    settingsFiles.push({
      path: join(projectRoot, '.claude', 'settings.local.json'),
      label: '프로젝트 settings.local.json',
    });
  }

  for (const sf of settingsFiles) {
    if (!existsSync(sf.path)) continue;
    try {
      const settings = JSON.parse(readFileSync(sf.path, 'utf8'));
      let changed = false;

      if (settings?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) {
        delete settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
        changed = true;
      }
      if (settings?.env?.ENABLE_LSP_TOOL) {
        delete settings.env.ENABLE_LSP_TOOL;
        changed = true;
      }

      if (changed) {
        if (Object.keys(settings.env).length === 0) delete settings.env;
        writeFileSync(sf.path, JSON.stringify(settings, null, 2) + '\n');
        status(sf.label, true, '설정 정리 완료');
        removed = true;
      }
    } catch { /* ignore */ }
  }

  // -- 요약 --
  console.log();
  if (removed) {
    console.log(colors.green(colors.bold('제거 완료!')));
    console.log(colors.dim('플러그인 소스 코드는 삭제되지 않았습니다. 필요하면 직접 삭제하세요:'));
    console.log(colors.dim(`  rm -rf ${PLUGIN_ROOT}`));
  } else {
    console.log(colors.dim('변경 사항이 없습니다.'));
  }
  console.log();
}
