import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  commandExists, run, confirm, select,
  colors, sym, status, section,
  isMac, refreshPath,
} from './utils.mjs';
import { checkAll, printResults, isAgentTeamsEnabled } from './checker.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..');
const home = homedir();

// -- 경로 헬퍼 --

const GLOBAL_PLUGIN_DIR = join(home, '.claude', 'plugins', 'claude-sdd');

function projectPluginDir(projectRoot) {
  return join(projectRoot, '.claude', 'plugins', 'claude-sdd');
}

/**
 * 프로젝트 루트를 자동 감지합니다 (.git 기준).
 * 찾지 못하면 cwd를 반환합니다.
 */
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
 * Claude Code 플러그인 CLI를 사용하여 마켓플레이스가 등록되어 있는지 확인합니다.
 */
function isMarketplaceRegistered() {
  try {
    const known = readFileSync(
      join(home, '.claude', 'plugins', 'known_marketplaces.json'), 'utf8'
    );
    return known.includes(`"${PLUGIN_NAME}"`);
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
        status('플러그인 설치', false, '실패 — claude plugin install');
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
      status('플러그인 설치', false, '실패 — claude plugin install');
    }
  }

  return result;
}

/**
 * claude plugin uninstall + marketplace remove 로 플러그인을 제거합니다.
 */
function unregisterPlugin() {
  let removed = false;

  if (isPluginInstalled()) {
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

  if (isMarketplaceRegistered()) {
    const mp = spawnSync('claude', ['plugin', 'marketplace', 'remove', PLUGIN_NAME], {
      stdio: 'pipe', timeout: 30000,
    });
    if (mp.status === 0) {
      status('마켓플레이스 제거', true, '제거 완료');
      removed = true;
    } else {
      status('마켓플레이스 제거', false, '실패');
    }
  }

  return removed;
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

  // 기본 Java 버전 확인
  const javaVerOutput = run('java -version 2>&1', { ignoreError: true }) || '';
  const majorMatch = javaVerOutput.match(/version "(\d+)/);
  const defaultMajor = majorMatch ? parseInt(majorMatch[1]) : 0;
  if (defaultMajor <= 21) return; // 패치 불필요

  console.log(colors.dim(`  기본 Java ${defaultMajor} 감지 — jdtls에는 Java 21이 필요합니다.`));

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
// install
// ─────────────────────────────────────────────

export async function runInstaller(options = {}) {
  console.log('claude-sdd 플러그인 설치 마법사입니다.');
  console.log(colors.dim('SDD: Claude Code 에이전트 팀을 활용한 스펙 주도 개발 (SDD) 라이프사이클'));

  // 새로 설치된 도구가 PATH에 잡히도록 공통 바이너리 경로 추가
  refreshPath();

  // -- Step 1: Prerequisites --
  section(colors.bold('[1/5] 사전 요구사항'));

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
  section(colors.bold('[2/5] Claude Code 및 에이전트 팀'));

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
  section(colors.bold('[3/5] GitHub CLI'));

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
  section(colors.bold('[4/5] 코드 분석 도구 (선택)'));

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
    // 1. 마켓플레이스 등록
    const lspMp = spawnSync('claude', ['plugin', 'marketplace', 'add', 'boostvolt/claude-code-lsps'], {
      stdio: 'pipe', timeout: 30000,
    });
    if (lspMp.status !== 0) {
      status('LSP 마켓플레이스', false, '등록 실패');
      console.log(colors.dim('  수동: claude plugin marketplace add boostvolt/claude-code-lsps'));
    } else {
      status('LSP 마켓플레이스', true, 'boostvolt/claude-code-lsps');

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

      for (const entry of lspEntries) {
        const noteStr = entry.note ? ` (${entry.note})` : '';
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
        status(`${entry.label} 플러그인`, pi.status === 0,
          pi.status === 0 ? `${entry.plugin}@claude-code-lsps` : '설치 실패');

        // 2-c. jdtls: 기본 Java가 22+이면 Java 21로 .lsp.json 패치
        if (entry.value === 'java' && pi.status === 0) {
          await configureJdtlsJava21();
        }
      }
    }
  }

  // -- Step 5: Plugin Registration --
  section(colors.bold('[5/5] 플러그인 등록'));

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
  console.log(`  3. ${colors.bold('/claude-sdd:sdd-auto')} 를 사용하여 개발 라이프사이클을 시작하세요`);
  console.log();
  const cli = process.env.SDD_CLI_NAME || 'claude-sdd';
  console.log(colors.dim(`제거하려면: ${cli} uninstall`));
}

// ─────────────────────────────────────────────
// uninstall
// ─────────────────────────────────────────────

export async function runUninstaller() {
  console.log('claude-sdd 플러그인 제거를 시작합니다.');
  console.log();

  let removed = false;

  // 1. 플러그인 등록 해제 (claude plugin CLI 사용)
  section('플러그인 등록 해제');
  if (isPluginInstalled() || isMarketplaceRegistered()) {
    if (await confirm(`  ${sym.arr} Claude Code에서 ${PLUGIN_NAME} 플러그인을 제거하시겠습니까?`)) {
      if (unregisterPlugin()) {
        removed = true;
      }
    } else {
      console.log(colors.dim('  건너뜀.'));
    }
  } else {
    console.log(colors.dim('  등록된 플러그인을 찾을 수 없습니다.'));
  }

  // 2. 기존 심볼릭 링크 정리 (레거시)
  const legacyDirs = [GLOBAL_PLUGIN_DIR];
  const projectRoot = detectProjectRoot();
  if (projectRoot) legacyDirs.push(projectPluginDir(projectRoot));

  for (const dir of legacyDirs) {
    if (existsSync(dir)) {
      section(`레거시 심볼릭 링크: ${dir}`);
      if (await confirm(`  ${sym.arr} 심볼릭 링크를 제거하시겠습니까?`)) {
        try {
          unlinkSync(dir);
          status('심볼릭 링크', true, '제거 완료');
          removed = true;
        } catch (e) {
          status('심볼릭 링크', false, `제거 실패: ${e.message}`);
        }
      }
    }
  }

  // 3. Agent Teams 설정 제거 (선택)
  section('Agent Teams 설정');

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
      if (!settings?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) continue;

      if (await confirm(`  ${sym.arr} ${sf.label}에서 Agent Teams 설정을 제거하시겠습니까?`)) {
        delete settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
        if (Object.keys(settings.env).length === 0) delete settings.env;
        writeFileSync(sf.path, JSON.stringify(settings, null, 2) + '\n');
        status(sf.label, true, 'Agent Teams 제거 완료');
        removed = true;
      } else {
        console.log(colors.dim('  건너뜀.'));
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
