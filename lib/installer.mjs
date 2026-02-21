import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  commandExists, run, confirm, select, prompt,
  colors, sym, status, section,
  isMac, refreshPath,
} from './utils.mjs';
import { checkAll, printResults, isAgentTeamsEnabled } from './checker.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..');
const home = homedir();

// -- 경로 헬퍼 --

function enableAgentTeams() {
  const settingsPath = join(home, '.claude', 'settings.json');
  let settings = {};
  if (existsSync(settingsPath)) {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  }
  settings.env = settings.env || {};
  settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return settingsPath;
}

const PLUGIN_NAME = 'claude-sdd';

/**
 * Claude Code 플러그인 CLI를 사용하여 플러그인이 설치되어 있는지 확인합니다.
 */
function isPluginInstalled() {
  try {
    const installed = readFileSync(
      join(home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8'
    );
    return installed.includes(`"${PLUGIN_NAME}@${PLUGIN_NAME}"`);
  } catch { return false; }
}

/**
 * claude plugin marketplace add + claude plugin install/update 로 플러그인을 설치합니다.
 * 항상 마켓플레이스를 갱신하고, 이미 설치된 경우 update로 최신화합니다.
 * @returns {{ marketplace: boolean, plugin: boolean }}
 */
function registerPlugin() {
  const result = { marketplace: false, plugin: false };

  // 1. 마켓플레이스 등록 (항상 실행 — 경로 갱신)
  const mp = spawnSync('claude', ['plugin', 'marketplace', 'add', PLUGIN_ROOT], {
    stdio: 'pipe', timeout: 30000,
  });
  if (mp.status === 0) {
    result.marketplace = true;
    status('마켓플레이스 등록', true, `${PLUGIN_ROOT}`);
  } else {
    status('마켓플레이스 등록', false, '실패 — claude plugin marketplace add');
    return result;
  }

  // 2. 플러그인 설치 또는 업데이트
  if (isPluginInstalled()) {
    const up = spawnSync('claude', ['plugin', 'update', PLUGIN_NAME], {
      stdio: 'pipe', timeout: 30000,
    });
    if (up.status === 0) {
      result.plugin = true;
      status('플러그인 업데이트', true, '최신 버전으로 갱신 완료');
    } else {
      // update 실패 시 재설치 시도
      spawnSync('claude', ['plugin', 'uninstall', PLUGIN_NAME], { stdio: 'pipe', timeout: 30000 });
      const pi = spawnSync('claude', ['plugin', 'install', PLUGIN_NAME], { stdio: 'pipe', timeout: 30000 });
      if (pi.status === 0) {
        result.plugin = true;
        status('플러그인 재설치', true, '최신 버전 설치 완료');
      } else {
        const errMsg = (pi.stderr?.toString() || pi.stdout?.toString() || '').trim();
        const reason = errMsg ? ` — ${errMsg.split('\n')[0]}` : '';
        status('플러그인 설치', false, `실패${reason}`);
      }
    }
  } else {
    const pi = spawnSync('claude', ['plugin', 'install', PLUGIN_NAME], {
      stdio: 'pipe', timeout: 30000,
    });
    if (pi.status === 0) {
      result.plugin = true;
      status('플러그인 설치', true, `${PLUGIN_NAME}@${PLUGIN_NAME}`);
    } else {
      const errMsg = (pi.stderr?.toString() || pi.stdout?.toString() || '').trim();
      const reason = errMsg ? ` — ${errMsg.split('\n')[0]}` : '';
      status('플러그인 설치', false, `실패${reason}`);
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// jdtls Java 21 설정
// ─────────────────────────────────────────────

/**
 * jdtls 플러그인의 .lsp.json을 패치하여 Java 21로 실행되도록 설정합니다.
 * 기본 Java가 22+인 경우에만 실행됩니다. (macOS 전용)
 */
async function configureJdtlsJava21() {
  if (!isMac) return;

  // 기본 Java 버전 확인 (java -version + /usr/libexec/java_home)
  // jenv 등으로 쉘 기본이 17이어도 시스템 기본 JDK가 22+이면 패치 필요
  const javaVerOutput = run('java -version 2>&1', { ignoreError: true }) || '';
  const majorMatch = javaVerOutput.match(/version "(\d+)/);
  const defaultMajor = majorMatch ? parseInt(majorMatch[1]) : 0;

  const systemJavaHome = run('/usr/libexec/java_home 2>/dev/null', { ignoreError: true })?.trim();
  let systemMajor = 0;
  if (systemJavaHome) {
    const sysVerOutput = run(`"${systemJavaHome}/bin/java" -version 2>&1`, { ignoreError: true }) || '';
    const sysMatch = sysVerOutput.match(/version "(\d+)/);
    systemMajor = sysMatch ? parseInt(sysMatch[1]) : 0;
  }

  if (defaultMajor <= 21 && systemMajor <= 21) return; // 패치 불필요

  const triggerMajor = Math.max(defaultMajor, systemMajor);

  console.log(colors.dim(`  기본 Java ${triggerMajor} 감지 — jdtls에는 Java 21이 필요합니다.`));

  // Java 21 설치 확인
  let java21Home = run('/usr/libexec/java_home -v 21 2>/dev/null', { ignoreError: true })?.trim();

  if (!java21Home) {
    if (commandExists('brew')) {
      if (await confirm(`  ${sym.arr} jdtls용 Java 21 (Temurin)을 설치하시겠습니까?`)) {
        console.log(colors.dim('  brew install --cask temurin@21 실행 중...'));
        const r = spawnSync('brew', ['install', '--cask', 'temurin@21'], { stdio: 'inherit' });
        if (r.status !== 0) {
          status('Java 21', false, '설치 실패');
          return;
        }
        status('Java 21', true, '설치 완료');
        java21Home = run('/usr/libexec/java_home -v 21 2>/dev/null', { ignoreError: true })?.trim();
      } else {
        console.log(colors.dim('  건너뜀. jdtls가 정상 동작하지 않을 수 있습니다.'));
        return;
      }
    } else {
      status('Java 21', false, 'Homebrew 없음 — 수동 설치 필요');
      console.log(colors.dim(`  ${sym.arr} https://adoptium.net/temurin/releases/?version=21`));
      return;
    }
  } else {
    status('Java 21', true, java21Home);
  }

  if (!java21Home) {
    status('Java 21 경로', false, '찾을 수 없음');
    return;
  }

  // .lsp.json 패치
  const lspJsonPaths = findJdtlsLspJsons();
  const patchedConfig = JSON.stringify({
    java: {
      command: 'env',
      args: [`JAVA_HOME=${java21Home}`, 'jdtls'],
      extensionToLanguage: { '.java': 'java' },
    },
  }, null, 2) + '\n';

  let patched = 0;
  for (const lspPath of lspJsonPaths) {
    try {
      writeFileSync(lspPath, patchedConfig);
      patched++;
    } catch { /* ignore */ }
  }

  if (patched > 0) {
    status('jdtls Java 21 설정', true, `${patched}개 .lsp.json 패치 완료`);
  } else {
    status('jdtls Java 21 설정', false, '.lsp.json을 찾을 수 없음');
  }
}

/**
 * jdtls 플러그인의 .lsp.json 파일 경로를 모두 찾습니다.
 */
function findJdtlsLspJsons() {
  const pluginsBase = join(home, '.claude', 'plugins');
  const paths = [];

  // cache: ~/.claude/plugins/cache/claude-code-lsps/jdtls/<version>/.lsp.json
  const cacheBase = join(pluginsBase, 'cache', 'claude-code-lsps', 'jdtls');
  if (existsSync(cacheBase)) {
    try {
      for (const ver of readdirSync(cacheBase)) {
        const p = join(cacheBase, ver, '.lsp.json');
        if (existsSync(p)) paths.push(p);
      }
    } catch { /* ignore */ }
  }

  // marketplace: ~/.claude/plugins/marketplaces/claude-code-lsps/jdtls/.lsp.json
  const mpPath = join(pluginsBase, 'marketplaces', 'claude-code-lsps', 'jdtls', '.lsp.json');
  if (existsSync(mpPath)) paths.push(mpPath);

  return paths;
}

// ─────────────────────────────────────────────
// gopls PATH 설정
// ─────────────────────────────────────────────

/**
 * gopls 플러그인의 .lsp.json 파일 경로를 모두 찾습니다.
 */
function findGoplsLspJsons() {
  const pluginsBase = join(home, '.claude', 'plugins');
  const paths = [];

  // cache: ~/.claude/plugins/cache/claude-code-lsps/gopls/<version>/.lsp.json
  const cacheBase = join(pluginsBase, 'cache', 'claude-code-lsps', 'gopls');
  if (existsSync(cacheBase)) {
    try {
      for (const ver of readdirSync(cacheBase)) {
        const p = join(cacheBase, ver, '.lsp.json');
        if (existsSync(p)) paths.push(p);
      }
    } catch { /* ignore */ }
  }

  // marketplace: ~/.claude/plugins/marketplaces/claude-code-lsps/gopls/.lsp.json
  const mpPath = join(pluginsBase, 'marketplaces', 'claude-code-lsps', 'gopls', '.lsp.json');
  if (existsSync(mpPath)) paths.push(mpPath);

  return paths;
}

/**
 * gopls가 PATH에 없을 경우, .lsp.json에 풀 패스를 설정합니다.
 * gopls가 ~/go/bin이 아닌 표준 PATH에 있으면 패치하지 않습니다.
 */
async function configureGoplsPath() {
  const goplsPath = join(home, 'go', 'bin', 'gopls');

  // gopls가 ~/go/bin이 아닌 표준 PATH에 있으면 패치 불필요
  if (commandExists('gopls')) {
    try {
      const resolved = run('command -v gopls 2>/dev/null', { ignoreError: true })?.trim();
      if (resolved && resolved !== goplsPath) return; // 표준 위치에 있음
    } catch { /* fallthrough — 패치 진행 */ }
  }

  // ~/go/bin/gopls 존재 확인
  if (!existsSync(goplsPath)) {
    console.log(colors.dim('  gopls 바이너리를 찾을 수 없습니다 — PATH 패치를 건너뜁니다.'));
    return;
  }

  console.log(colors.dim(`  gopls가 PATH에 없음 — ${goplsPath}로 .lsp.json 패치`));

  const lspJsonPaths = findGoplsLspJsons();
  let patched = 0;
  for (const lspPath of lspJsonPaths) {
    try {
      const content = JSON.parse(readFileSync(lspPath, 'utf8'));
      if (content.go && content.go.command === 'gopls') {
        content.go.command = goplsPath;
        writeFileSync(lspPath, JSON.stringify(content, null, 2) + '\n');
        patched++;
      }
    } catch { /* ignore */ }
  }

  if (patched > 0) {
    status('gopls PATH 설정', true, `${patched}개 .lsp.json 패치 완료`);
  } else if (lspJsonPaths.length === 0) {
    status('gopls PATH 설정', false, '.lsp.json을 찾을 수 없음');
  }
}

// ─────────────────────────────────────────────
// kotlin-lsp JVM 튜닝
// ─────────────────────────────────────────────

/**
 * kotlin-lsp 플러그인의 .lsp.json 파일 경로를 모두 찾습니다.
 */
function findKotlinLspJsons() {
  const pluginsBase = join(home, '.claude', 'plugins');
  const paths = [];

  // cache: ~/.claude/plugins/cache/claude-code-lsps/kotlin-lsp/<version>/.lsp.json
  const cacheBase = join(pluginsBase, 'cache', 'claude-code-lsps', 'kotlin-lsp');
  if (existsSync(cacheBase)) {
    try {
      for (const ver of readdirSync(cacheBase)) {
        const p = join(cacheBase, ver, '.lsp.json');
        if (existsSync(p)) paths.push(p);
      }
    } catch { /* ignore */ }
  }

  // marketplace: ~/.claude/plugins/marketplaces/claude-code-lsps/kotlin-lsp/.lsp.json
  const mpPath = join(pluginsBase, 'marketplaces', 'claude-code-lsps', 'kotlin-lsp', '.lsp.json');
  if (existsSync(mpPath)) paths.push(mpPath);

  return paths;
}

/**
 * kotlin-lsp의 .lsp.json에 풀 패스를 설정합니다.
 * Claude Code 런타임 PATH에 /opt/homebrew/bin이 없을 수 있어 풀 패스 필수.
 * 세션 훅(sdd-lsp-patch.sh)에서 JVM 프리웜도 함께 실행.
 */
async function configureKotlinLspTuning() {
  const lspJsonPaths = findKotlinLspJsons();
  if (lspJsonPaths.length === 0) return;

  // kotlin-lsp 바이너리 풀 패스 감지
  let kotlinLspPath = 'kotlin-lsp';
  try {
    const resolved = run('command -v kotlin-lsp 2>/dev/null', { ignoreError: true })?.trim();
    if (resolved) kotlinLspPath = resolved;
  } catch { /* fallthrough */ }

  // 이미 풀 패스가 설정된 파일인지 확인
  let needsPatch = false;
  for (const lspPath of lspJsonPaths) {
    try {
      const content = readFileSync(lspPath, 'utf8');
      if (!content.includes(kotlinLspPath)) {
        needsPatch = true;
        break;
      }
    } catch { /* ignore */ }
  }

  if (!needsPatch) return;

  console.log(colors.dim(`  kotlin-lsp 풀 패스 적용 (${kotlinLspPath})`));

  const patchedConfig = JSON.stringify({
    kotlin: {
      command: kotlinLspPath,
      extensionToLanguage: { '.kt': 'kotlin', '.kts': 'kotlin' },
    },
  }, null, 2) + '\n';

  let patched = 0;
  for (const lspPath of lspJsonPaths) {
    try {
      writeFileSync(lspPath, patchedConfig);
      patched++;
    } catch { /* ignore */ }
  }

  if (patched > 0) {
    status('kotlin-lsp 풀 패스', true, `${patched}개 .lsp.json 패치 완료`);
  }
}

// ─────────────────────────────────────────────
// LSP Tool 환경변수 설정
// ─────────────────────────────────────────────

/**
 * ENABLE_LSP_TOOL=1 환경변수를 ~/.claude/settings.json에 설정합니다.
 * 이 설정이 있어야 Claude Code에서 9개 LSP 연산
 * (goToDefinition, findReferences, documentSymbol 등)을 사용할 수 있습니다.
 */
async function configureLspToolEnv() {
  const settingsPath = join(home, '.claude', 'settings.json');
  let settings = {};
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')); } catch { /* ignore */ }
  }

  settings.env = settings.env || {};
  if (settings.env.ENABLE_LSP_TOOL === '1') {
    status('LSP Tool', true, 'ENABLE_LSP_TOOL=1 (이미 설정됨)');
    return;
  }

  console.log();
  console.log(colors.dim('  ENABLE_LSP_TOOL=1 — goToDefinition, documentSymbol 등 9개 LSP 연산을 활성화합니다.'));
  console.log(colors.dim('  이 설정 없이는 자동 진단만 동작하고 LSP 도구가 노출되지 않습니다.'));

  if (await confirm(`  ${sym.arr} LSP Tool을 활성화하시겠습니까?`)) {
    settings.env.ENABLE_LSP_TOOL = '1';
    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    status('LSP Tool', true, 'ENABLE_LSP_TOOL=1 설정 완료');
  } else {
    console.log(colors.dim('  건너뜀. 수동으로 설정하려면:'));
    console.log(colors.dim('  ~/.claude/settings.json → "env": { "ENABLE_LSP_TOOL": "1" }'));
  }
}

// ─────────────────────────────────────────────
// MCP 서버 설정
// ─────────────────────────────────────────────

/**
 * ~/.claude.json에서 기존 MCP 서버를 읽습니다.
 */
function readClaudeJson() {
  const claudeJson = join(home, '.claude.json');
  if (!existsSync(claudeJson)) return {};
  try { return JSON.parse(readFileSync(claudeJson, 'utf8')); } catch { return {}; }
}

/**
 * ~/.claude.json에 MCP 서버를 저장합니다.
 */
function writeClaudeJson(config) {
  const claudeJson = join(home, '.claude.json');
  writeFileSync(claudeJson, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Atlassian MCP 서버를 설정합니다 (최대 2개 사이트).
 */
async function configureAtlassianMcp() {
  if (!await confirm(`  ${sym.arr} Atlassian (Jira/Confluence) MCP를 설정하시겠습니까?`)) {
    console.log(colors.dim('  건너뜀.'));
    return;
  }

  // uv 확인 및 설치
  if (!commandExists('uvx')) {
    if (!commandExists('uv')) {
      console.log(colors.dim('  uv가 설치되어 있지 않습니다.'));
      if (isMac && commandExists('brew')) {
        if (await confirm(`  ${sym.arr} Homebrew로 uv를 설치하시겠습니까?`)) {
          console.log(colors.dim('  brew install uv 실행 중...'));
          const r = spawnSync('brew', ['install', 'uv'], { stdio: 'inherit' });
          if (r.status !== 0) {
            status('uv', false, '설치 실패');
            return;
          }
          status('uv', true, '설치 완료');
        } else {
          status('uv', false, '설치 필요 — https://docs.astral.sh/uv/');
          return;
        }
      } else {
        status('uv', false, '설치 필요 — https://docs.astral.sh/uv/');
        return;
      }
    }
  } else {
    status('uv/uvx', true, '설치됨');
  }

  const config = readClaudeJson();
  config.mcpServers = config.mcpServers || {};

  for (let site = 1; site <= 2; site++) {
    if (site === 2) {
      if (!await confirm(`  ${sym.arr} 사이트 2를 추가하시겠습니까?`)) break;
    }

    console.log(colors.bold(`\n  사이트 ${site}:`));

    const url = await prompt(`  Atlassian URL (예: https://company.atlassian.net): `);
    if (!url) { console.log(colors.dim('  건너뜀.')); break; }

    const email = await prompt(`  사용자 이메일: `);
    const token = await prompt(`  API 토큰: `);

    // 서버 이름 자동 생성
    let defaultName;
    try {
      const hostname = new URL(url).hostname.split('.')[0];
      defaultName = `mcp-atlassian-${hostname}`;
    } catch {
      defaultName = `mcp-atlassian-site${site}`;
    }
    const nameInput = await prompt(`  MCP 서버 이름 (기본: ${defaultName}): `);
    const serverName = nameInput || defaultName;

    const sslBypass = await confirm(`  SSL 인증서 검증 비활성화? (사설망인 경우 y)`, false);

    const env = {
      JIRA_URL: url,
      JIRA_USERNAME: email,
      JIRA_API_TOKEN: token,
      CONFLUENCE_URL: url.replace(/\/?$/, '') + '/wiki',
      CONFLUENCE_USERNAME: email,
      CONFLUENCE_API_TOKEN: token,
    };

    if (sslBypass) {
      env.UV_NATIVE_TLS = 'true';
      env.JIRA_SSL_VERIFY = 'false';
      env.CONFLUENCE_SSL_VERIFY = 'false';
    }

    config.mcpServers[serverName] = {
      command: 'uvx',
      args: ['mcp-atlassian'],
      env,
    };

    status(`Atlassian MCP (${serverName})`, true, url);
  }

  writeClaudeJson(config);
}

/**
 * Figma MCP 서버를 설정합니다.
 */
async function configureFigmaMcp() {
  if (!await confirm(`  ${sym.arr} Figma MCP를 설정하시겠습니까?`)) {
    console.log(colors.dim('  건너뜀.'));
    return;
  }

  const modeOptions = [
    { label: 'Remote (Figma 클라우드, OAuth 인증) — 권장', value: 'remote' },
    { label: 'Desktop (로컬 Figma 앱, 포트 3845)', value: 'desktop' },
  ];
  const mode = await select(`  Figma 연결 방식:`, modeOptions);

  const config = readClaudeJson();
  config.mcpServers = config.mcpServers || {};

  if (mode === 'remote') {
    config.mcpServers.figma = {
      type: 'http',
      url: 'https://mcp.figma.com/mcp',
    };
    status('Figma MCP', true, 'Remote (OAuth)');
    console.log(colors.dim('  Claude Code에서 /mcp → figma → Authenticate로 인증하세요.'));
  } else {
    config.mcpServers.figma = {
      type: 'http',
      url: 'http://127.0.0.1:3845/mcp',
    };
    status('Figma MCP', true, 'Desktop (localhost:3845)');
    console.log(colors.dim('  Figma 앱에서 MCP 서버를 활성화하세요.'));
  }

  writeClaudeJson(config);
}

/**
 * MCP 서버 설정 (Atlassian + Figma)
 */
async function configureMcpServers() {
  // 기존 설정 확인
  const config = readClaudeJson();
  const mcpServers = config.mcpServers || {};
  const hasAtlassian = Object.keys(mcpServers).some(k => k.includes('atlassian'));
  const hasFigma = Object.keys(mcpServers).some(k => k.includes('figma'));

  if (hasAtlassian) {
    const names = Object.keys(mcpServers).filter(k => k.includes('atlassian'));
    status('Atlassian MCP', true, `이미 설정됨 (${names.join(', ')})`);
  } else {
    await configureAtlassianMcp();
  }

  console.log();

  if (hasFigma) {
    status('Figma MCP', true, '이미 설정됨');
  } else {
    await configureFigmaMcp();
  }
}

// ─────────────────────────────────────────────
// 다이어그램 도구 설정
// ─────────────────────────────────────────────

/**
 * 다이어그램 생성 도구를 설치합니다 (Graphviz + Python diagrams + atlassian-python-api).
 */
async function configureDiagramTools() {
  // 이미 설치된 도구 확인
  const hasDot = commandExists('dot');
  let hasDiagrams = false;
  try {
    const r = spawnSync('python3', ['-c', 'import diagrams'], { stdio: 'pipe', timeout: 10000 });
    hasDiagrams = r.status === 0;
  } catch { /* ignore */ }

  if (hasDot && hasDiagrams) {
    status('다이어그램 도구', true, 'graphviz + diagrams 설치됨');
    return;
  }

  if (!await confirm(`  ${sym.arr} 다이어그램 생성 도구를 설치하시겠습니까?`)) {
    console.log(colors.dim('  건너뜀. Confluence 퍼블리싱 시 다이어그램 생성 기능을 사용할 수 없습니다.'));
    return;
  }

  // Graphviz 설치
  if (!hasDot) {
    if (isMac && commandExists('brew')) {
      console.log(colors.dim('  brew install graphviz 실행 중...'));
      const r = spawnSync('brew', ['install', 'graphviz'], { stdio: 'inherit' });
      if (r.status === 0) {
        status('Graphviz', true, '설치 완료');
      } else {
        status('Graphviz', false, '설치 실패');
      }
    } else {
      status('Graphviz', false, '수동 설치 필요 — https://graphviz.org/download/');
    }
  } else {
    status('Graphviz', true, '이미 설치됨');
  }

  // Python diagrams + atlassian-python-api 설치
  if (!hasDiagrams) {
    if (commandExists('pip3')) {
      console.log(colors.dim('  pip3 install diagrams graphviz atlassian-python-api 실행 중...'));
      const r = spawnSync('pip3', [
        'install', '--user', '--break-system-packages',
        '--trusted-host', 'pypi.org',
        '--trusted-host', 'files.pythonhosted.org',
        'diagrams', 'graphviz', 'atlassian-python-api',
      ], { stdio: 'inherit', timeout: 120000 });
      if (r.status === 0) {
        status('Python diagrams', true, '설치 완료');
      } else {
        status('Python diagrams', false, '설치 실패');
      }
    } else {
      status('Python diagrams', false, 'pip3 없음 — 수동 설치 필요');
    }
  } else {
    status('Python diagrams', true, '이미 설치됨');
  }
}

// ─────────────────────────────────────────────
// install
// ─────────────────────────────────────────────

export async function runInstaller() {
  console.log('claude-sdd 플러그인 설치 마법사입니다.');
  console.log(colors.dim('SDD: Claude Code 에이전트 팀을 활용한 스펙 주도 개발 (SDD) 라이프사이클'));

  // 새로 설치된 도구가 PATH에 잡히도록 공통 바이너리 경로 추가
  refreshPath();

  // -- Step 1: Prerequisites --
  section(colors.bold('[1/7] 사전 요구사항'));

  const nodeVer = parseInt(process.version.slice(1), 10);
  if (nodeVer < 18) {
    console.log(colors.red(`  Node.js >= 18 필요 (현재: ${process.version})`));
    console.log('  설치: https://nodejs.org/');
    process.exit(1);
  }
  status('Node.js', true, process.version);

  if (!commandExists('git')) {
    console.log(colors.red('  git이 필요하지만 설치되어 있지 않습니다.'));
    process.exit(1);
  }
  status('git', true);

  // -- Step 2: Claude Code & Agent Teams --
  section(colors.bold('[2/7] Claude Code 및 에이전트 팀'));

  if (commandExists('claude')) {
    const ver = run('claude --version 2>/dev/null', { ignoreError: true }) || 'installed';
    status('Claude Code', true, ver);
  } else {
    status('Claude Code', false, '설치되지 않음');
    console.log(`  ${sym.arr} 설치: https://docs.anthropic.com/en/docs/claude-code`);
  }

  if (isAgentTeamsEnabled()) {
    status('Agent Teams', true, '활성화됨');
  } else {
    status('Agent Teams', false, '비활성화');
    if (await confirm(`  ${sym.arr} 자동으로 Agent Teams를 활성화하시겠습니까?`)) {
      try {
        const settingsFile = enableAgentTeams();
        process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
        status('Agent Teams', true, `${settingsFile}에 설정 완료`);
      } catch (e) {
        status('Agent Teams', false, `설정 실패: ${e.message}`);
        console.log(`  ${sym.arr} 수동으로 설정 파일에 추가:`);
        console.log(colors.dim('    { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }'));
      }
    } else {
      console.log(colors.dim('  건너뜀. 수동으로 설정 파일에 추가하세요:'));
      console.log(colors.dim('    { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }'));
    }
  }

  // -- Step 3: GitHub CLI --
  section(colors.bold('[3/7] GitHub CLI'));

  let ghInstalled = commandExists('gh');

  if (ghInstalled) {
    const ver = run('gh --version 2>/dev/null | head -1', { ignoreError: true });
    status('gh CLI', true, ver);
  } else {
    status('gh CLI', false, '설치되지 않음 (PR 생성에 필요)');
    if (isMac && commandExists('brew')) {
      if (await confirm(`  ${sym.arr} Homebrew로 gh CLI를 설치하시겠습니까?`)) {
        console.log(colors.dim('  brew install gh 실행 중...'));
        const result = spawnSync('brew', ['install', 'gh'], { stdio: 'inherit' });
        if (result.status === 0) {
          ghInstalled = true;
          status('gh CLI', true, '설치 완료');
        } else {
          status('gh CLI', false, '설치 실패');
        }
      } else {
        console.log(colors.dim('  건너뜀.'));
        console.log(`  ${sym.arr} 설치: https://cli.github.com/`);
      }
    } else {
      console.log(`  ${sym.arr} 설치: https://cli.github.com/`);
    }
  }

  if (ghInstalled) {
    let ghAuth = false;
    try { run('gh auth status 2>&1'); ghAuth = true; } catch { /* not authed */ }
    if (ghAuth) {
      status('gh auth', true, '인증됨');
    } else {
      status('gh auth', false, '인증되지 않음');
      if (await confirm(`  ${sym.arr} 지금 GitHub에 로그인하시겠습니까?`)) {
        spawnSync('gh', ['auth', 'login'], { stdio: 'inherit' });
        try { run('gh auth status 2>&1'); ghAuth = true; } catch { /* still not authed */ }
        if (ghAuth) {
          status('gh auth', true, '인증 완료');
        } else {
          status('gh auth', false, '인증 실패 — 나중에 gh auth login을 실행하세요');
        }
      } else {
        console.log(colors.dim('  건너뜀.'));
        console.log(`  ${sym.arr} 나중에 실행: ${colors.bold('gh auth login')}`);
      }
    }
  }

  // -- Step 4: Code Analysis Tools (optional) --
  section(colors.bold('[4/7] 코드 분석 도구 (선택)'));

  if (commandExists('sg')) {
    const ver = run('sg --version 2>/dev/null', { ignoreError: true }) || 'installed';
    status('ast-grep (sg)', true, ver);
  } else {
    status('ast-grep (sg)', false, '설치되지 않음 (선택 사항)');

    const installOptions = [];
    if (isMac && commandExists('brew')) {
      installOptions.push({ label: 'Homebrew로 설치 (brew install ast-grep)', value: 'brew' });
    }
    if (commandExists('npm')) {
      installOptions.push({ label: 'npm으로 설치 (npm i -g @ast-grep/cli)', value: 'npm' });
    }
    installOptions.push({ label: '건너뛰기', value: 'skip' });

    const choice = installOptions.length === 1
      ? 'skip'
      : await select(`  ${sym.arr} ast-grep를 설치하시겠습니까?`, installOptions);

    if (choice === 'brew') {
      console.log(colors.dim('  brew install ast-grep 실행 중...'));
      const result = spawnSync('brew', ['install', 'ast-grep'], { stdio: 'inherit' });
      status('ast-grep (sg)', result.status === 0, result.status === 0 ? '설치 완료' : '설치 실패');
    } else if (choice === 'npm') {
      console.log(colors.dim('  npm i -g @ast-grep/cli 실행 중...'));
      const result = spawnSync('npm', ['i', '-g', '@ast-grep/cli'], { stdio: 'inherit' });
      status('ast-grep (sg)', result.status === 0, result.status === 0 ? '설치 완료' : '설치 실패');
    } else {
      console.log(colors.dim('  건너뜀. /claude-sdd:sdd-lint의 ast-grep 기능은 사용할 수 없습니다.'));
    }
  }

  // -- Claude Code LSP 플러그인 (선택) --
  console.log();
  console.log(colors.dim('  Claude Code LSP 플러그인 — goToDefinition, findReferences, 자동 진단 등 활성화'));
  console.log(colors.dim('  https://github.com/boostvolt/claude-code-lsps'));
  console.log();

  if (!commandExists('claude')) {
    status('LSP 플러그인', false, 'Claude Code CLI 없음 — LSP 플러그인 설치 불가');
  } else {
    // 1. 마켓플레이스 등록 (실패해도 계속 진행 — 이미 등록되어 있을 수 있음)
    const lspMp = spawnSync('claude', ['plugin', 'marketplace', 'add', 'boostvolt/claude-code-lsps'], {
      stdio: 'pipe', timeout: 30000,
    });
    if (lspMp.status !== 0) {
      // 이미 등록되어 있는지 확인
      let alreadyRegistered = false;
      try {
        const known = readFileSync(join(home, '.claude', 'plugins', 'known_marketplaces.json'), 'utf8');
        alreadyRegistered = known.includes('claude-code-lsps');
      } catch { /* ignore */ }

      if (alreadyRegistered) {
        status('LSP 마켓플레이스', true, 'boostvolt/claude-code-lsps (이미 등록됨)');
      } else {
        status('LSP 마켓플레이스', false, '등록 실패');
        console.log(colors.dim('  수동: claude plugin marketplace add boostvolt/claude-code-lsps'));
      }
    } else {
      status('LSP 마켓플레이스', true, 'boostvolt/claude-code-lsps');
    }

    // 2. 언어별 LSP 플러그인 + 서버 설치
    const lspEntries = [
      { label: 'TypeScript / JavaScript', value: 'typescript', plugin: 'vtsls', bin: 'vtsls',
        install: { npm: '@vtsls/language-server typescript' } },
      { label: 'Python', value: 'python', plugin: 'pyright', bin: 'pyright',
        install: { pip: 'pyright', npm: 'pyright' } },
      { label: 'Go', value: 'go', plugin: 'gopls', bin: 'gopls',
        install: { go: 'golang.org/x/tools/gopls@latest' } },
      { label: 'Java', value: 'java', plugin: 'jdtls', bin: 'jdtls',
        install: { brew: 'jdtls' }, note: 'Java 21+ 필요' },
      { label: 'Kotlin', value: 'kotlin', plugin: 'kotlin-lsp', bin: 'kotlin-lsp',
        install: { brew: 'JetBrains/utils/kotlin-lsp' }, note: 'Java 17+ 필요' },
      { label: 'Lua', value: 'lua', plugin: 'lua-language-server', bin: 'lua-language-server',
        install: { brew: 'lua-language-server' } },
      { label: 'Terraform', value: 'terraform', plugin: 'terraform-ls', bin: 'terraform-ls',
        install: { brew: 'terraform-ls' } },
      { label: 'YAML', value: 'yaml', plugin: 'yaml-language-server', bin: 'yaml-language-server',
        install: { npm: 'yaml-language-server', brew: 'yaml-language-server' } },
    ];

    let lspInstalled = 0;

    for (const entry of lspEntries) {
      const noteStr = entry.note ? ` (${entry.note})` : '';

      // 이미 설치된 플러그인 확인
      let alreadyInstalled = false;
      try {
        const installed = readFileSync(join(home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8');
        alreadyInstalled = installed.includes(`"${entry.plugin}@claude-code-lsps"`);
      } catch { /* ignore */ }

      if (alreadyInstalled) {
        status(`${entry.label} 플러그인`, true, '이미 설치됨');
        lspInstalled++;

        // jdtls: 이미 설치되어 있어도 Java 21 패치 확인
        if (entry.value === 'java') {
          await configureJdtlsJava21();
        }
        // gopls: 이미 설치되어 있어도 PATH 패치 확인
        if (entry.value === 'go') {
          await configureGoplsPath();
        }
        // kotlin-lsp: 이미 설치되어 있어도 JVM 튜닝 확인
        if (entry.value === 'kotlin') {
          await configureKotlinLspTuning();
        }
        continue;
      }

      if (!await confirm(`  ${sym.arr} ${entry.label} LSP를 설치하시겠습니까?${noteStr}`)) {
        console.log(colors.dim(`  건너뜀: ${entry.label}`));
        continue;
      }

      // 2-a. LSP 서버 설치 (미설치 시)
      if (commandExists(entry.bin)) {
        status(`${entry.label} 서버`, true, '이미 설치됨');
      } else {
        let serverInstalled = false;
        const inst = entry.install;

        if (inst.npm && commandExists('npm')) {
          console.log(colors.dim(`  npm i -g ${inst.npm} 실행 중...`));
          const r = spawnSync('npm', ['i', '-g', ...inst.npm.split(' ')], { stdio: 'inherit' });
          serverInstalled = r.status === 0;
        } else if (inst.pip && commandExists('pip')) {
          console.log(colors.dim(`  pip install ${inst.pip} 실행 중...`));
          const r = spawnSync('pip', ['install', inst.pip], { stdio: 'inherit' });
          serverInstalled = r.status === 0;
        } else if (inst.go && commandExists('go')) {
          console.log(colors.dim(`  go install ${inst.go} 실행 중...`));
          const r = spawnSync('go', ['install', inst.go], { stdio: 'inherit' });
          serverInstalled = r.status === 0;
        } else if (inst.brew && isMac && commandExists('brew')) {
          console.log(colors.dim(`  brew install ${inst.brew} 실행 중...`));
          const r = spawnSync('brew', ['install', inst.brew], { stdio: 'inherit' });
          serverInstalled = r.status === 0;
        }

        if (serverInstalled) {
          status(`${entry.label} 서버`, true, '설치 완료');
        } else {
          status(`${entry.label} 서버`, false, '설치 실패 또는 패키지 매니저 없음');
          continue; // 서버 없으면 플러그인 설치 건너뜀
        }
      }

      // 2-b. Claude Code LSP 플러그인 설치
      const pi = spawnSync('claude', ['plugin', 'install', `${entry.plugin}@claude-code-lsps`], {
        stdio: 'pipe', timeout: 30000,
      });
      const pluginOk = pi.status === 0;
      if (!pluginOk) {
        const errMsg = (pi.stderr?.toString() || pi.stdout?.toString() || '').trim();
        const reason = errMsg ? ` — ${errMsg.split('\n')[0]}` : '';
        status(`${entry.label} 플러그인`, false, `설치 실패${reason}`);
      } else {
        status(`${entry.label} 플러그인`, true, `${entry.plugin}@claude-code-lsps`);
      }

      if (pluginOk) lspInstalled++;

      // 2-c. jdtls: 기본 Java가 22+이면 Java 21로 .lsp.json 패치
      if (entry.value === 'java' && pluginOk) {
        await configureJdtlsJava21();
      }

      // 2-d. gopls: PATH에 없으면 풀 패스로 .lsp.json 패치
      if (entry.value === 'go' && pluginOk) {
        await configureGoplsPath();
      }

      // 2-e. kotlin-lsp: JVM 튜닝으로 콜드 스타트 시간 단축
      if (entry.value === 'kotlin' && pluginOk) {
        await configureKotlinLspTuning();
      }
    }

    // 3. LSP Tool 활성화 (ENABLE_LSP_TOOL=1)
    if (lspInstalled > 0) {
      await configureLspToolEnv();
    }
  }

  // -- Step 5: MCP Servers (optional) --
  section(colors.bold('[5/7] MCP 서버 설정 (선택)'));

  await configureMcpServers();

  // -- Step 6: Diagram Tools (optional) --
  section(colors.bold('[6/7] 다이어그램 도구 (선택)'));

  await configureDiagramTools();

  // -- Step 7: Plugin Registration --
  section(colors.bold('[7/7] 플러그인 등록'));

  let pluginRegistered = false;

  if (await confirm(`  ${sym.arr} Claude Code에 플러그인을 등록/업데이트하시겠습니까?`)) {
    const result = registerPlugin();
    pluginRegistered = result.marketplace && result.plugin;
  } else {
    pluginRegistered = isPluginInstalled();
    if (pluginRegistered) {
      status('플러그인 등록', true, '기존 설치 유지');
    } else {
      console.log(colors.dim('  건너뜀.'));
    }
  }

  // -- Verification --
  section(colors.bold('검증'));
  console.log();

  const results = checkAll();
  const missing = printResults(results);

  console.log();
  if (missing.length === 0) {
    console.log(colors.green(colors.bold('설치 완료! 모든 구성 요소가 준비되었습니다.')));
  } else {
    console.log(colors.yellow(`${missing.length}개의 필수 구성 요소가 구성되지 않았습니다.`));
    const cli = process.env.SDD_CLI_NAME || 'claude-sdd';
    console.log(colors.dim(`위 항목을 수정한 후 다시 실행하세요: ${cli} check`));
  }

  console.log();
  console.log(colors.bold('다음 단계:'));
  console.log(`  1. ${colors.bold('claude')} 을 실행하세요 (플러그인이 자동으로 로드됩니다)`);
  console.log(`  2. ${colors.bold('/claude-sdd:sdd-init new')} 을 입력하여 SDD 프로젝트를 초기화하세요`);
  console.log(`  3. ${colors.bold('/claude-sdd:sdd-next')} 를 사용하여 개발 라이프사이클을 시작하세요`);
  console.log();
  const cli = process.env.SDD_CLI_NAME || 'claude-sdd';
  console.log(colors.dim(`제거하려면: ${cli} uninstall`));
}

// 기존 runUninstaller는 lib/uninstaller.mjs로 이동됨
