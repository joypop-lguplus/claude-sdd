import { existsSync, mkdirSync, symlinkSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  commandExists, run, confirm, select,
  colors, sym, status, section,
  isMac,
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

/**
 * 새로 설치된 도구가 PATH에 잡히도록 공통 바이너리 경로를 추가합니다.
 */
function refreshPath() {
  const extraPaths = [
    join(home, '.local', 'bin'),             // pip install --user
    join(home, 'go', 'bin'),                 // go install
    join(home, '.cargo', 'bin'),             // rustup / cargo install
    '/opt/homebrew/bin',                     // Homebrew (Apple Silicon)
    '/usr/local/bin',                        // Homebrew (Intel) / npm -g
  ];
  const currentPath = process.env.PATH || '';
  const missing = extraPaths.filter((p) => !currentPath.includes(p));
  if (missing.length > 0) {
    process.env.PATH = [...missing, currentPath].join(':');
  }
}

function enableAgentTeams(scope, projectRoot) {
  const settingsPath = scope === 'project'
    ? join(projectRoot, '.claude', 'settings.local.json')
    : join(home, '.claude', 'settings.json');

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

/**
 * 심볼릭 링크를 생성합니다. 이미 존재하면 상태만 표시합니다.
 * @returns {boolean} 등록 여부
 */
function registerPlugin(targetDir) {
  if (existsSync(targetDir)) {
    status('플러그인 디렉토리', true, targetDir);
    return true;
  }
  try {
    mkdirSync(dirname(targetDir), { recursive: true });
    symlinkSync(PLUGIN_ROOT, targetDir);
    status('플러그인 심볼릭 링크', true, `${targetDir} -> ${PLUGIN_ROOT}`);
    return true;
  } catch (e) {
    status('플러그인 심볼릭 링크', false, e.message);
    return false;
  }
}

// ─────────────────────────────────────────────
// install
// ─────────────────────────────────────────────

export async function runInstaller(options = {}) {
  console.log('claude-sdd 플러그인 설치 마법사입니다.');
  console.log(colors.dim('SDD: Claude Code 에이전트 팀을 활용한 스펙 주도 개발 (SDD) 라이프사이클'));

  // 새로 설치된 도구가 PATH에 잡히도록 공통 바이너리 경로 추가
  refreshPath();

  // -- 설치 범위 결정 --
  let scope = options.scope; // 'global' | 'project' | undefined
  let projectRoot = null;

  if (!scope) {
    const scopeChoice = await select(
      `  ${sym.arr} 설치 범위를 선택하세요`,
      [
        { label: '글로벌 — 모든 프로젝트에서 사용 (권장)', value: 'global' },
        { label: '프로젝트 — 현재 프로젝트에서만 사용', value: 'project' },
      ],
    );
    scope = scopeChoice;
  }

  if (scope === 'project') {
    projectRoot = detectProjectRoot();
    console.log(colors.dim(`  프로젝트 루트: ${projectRoot}`));
  }

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
        const settingsFile = enableAgentTeams(scope, projectRoot);
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
      console.log(colors.dim('  건너뜀. /sdd-lint의 ast-grep 기능은 사용할 수 없습니다.'));
    }
  }

  // -- LSP Servers (optional) --
  console.log();
  console.log(colors.dim('  Language Server (LSP) — /sdd-lsp 의미 분석에 사용'));
  console.log();

  const lspServers = [
    { name: 'typescript-language-server', label: 'TypeScript LSP', brew: null, npm: 'typescript-language-server typescript', pip: null, hint: 'npm i -g typescript-language-server typescript' },
    { name: 'pyright-langserver', label: 'Python LSP (Pyright)', brew: null, npm: 'pyright', pip: 'pyright', hint: 'npm i -g pyright' },
    { name: 'gopls', label: 'Go LSP (gopls)', brew: null, npm: null, pip: null, goInstall: 'golang.org/x/tools/gopls@latest', hint: 'go install golang.org/x/tools/gopls@latest' },
    { name: 'rust-analyzer', label: 'Rust LSP', brew: null, npm: null, pip: null, rustup: 'rust-analyzer', hint: 'rustup component add rust-analyzer' },
    { name: 'clangd', label: 'C/C++ LSP (clangd)', brew: 'llvm', npm: null, pip: null, hint: 'brew install llvm (macOS) 또는 OS 패키지 매니저' },
  ];

  for (const server of lspServers) {
    if (commandExists(server.name)) {
      status(server.label, true, '설치됨');
    } else {
      status(server.label, false, '설치되지 않음 (선택 사항)');

      const installOptions = [];
      if (server.npm && commandExists('npm')) {
        installOptions.push({ label: `npm으로 설치 (npm i -g ${server.npm})`, value: 'npm', cmd: server.npm });
      }
      if (server.pip && commandExists('pip')) {
        installOptions.push({ label: `pip으로 설치 (pip install ${server.pip})`, value: 'pip', cmd: server.pip });
      }
      if (server.goInstall && commandExists('go')) {
        installOptions.push({ label: `go install (${server.goInstall})`, value: 'go', cmd: server.goInstall });
      }
      if (server.rustup && commandExists('rustup')) {
        installOptions.push({ label: `rustup (rustup component add ${server.rustup})`, value: 'rustup', cmd: server.rustup });
      }
      if (server.brew && isMac && commandExists('brew')) {
        installOptions.push({ label: `brew (brew install ${server.brew})`, value: 'brew', cmd: server.brew });
      }
      installOptions.push({ label: '건너뛰기', value: 'skip' });

      if (installOptions.length > 1) {
        const choice = await select(`  ${sym.arr} ${server.label}를 설치하시겠습니까?`, installOptions);
        const selected = installOptions.find((o) => o.value === choice);
        if (choice === 'npm') {
          console.log(colors.dim(`  npm i -g ${selected.cmd} 실행 중...`));
          const result = spawnSync('npm', ['i', '-g', ...selected.cmd.split(' ')], { stdio: 'inherit' });
          status(server.label, result.status === 0, result.status === 0 ? '설치 완료' : '설치 실패');
        } else if (choice === 'pip') {
          console.log(colors.dim(`  pip install ${selected.cmd} 실행 중...`));
          const result = spawnSync('pip', ['install', selected.cmd], { stdio: 'inherit' });
          status(server.label, result.status === 0, result.status === 0 ? '설치 완료' : '설치 실패');
        } else if (choice === 'go') {
          console.log(colors.dim(`  go install ${selected.cmd} 실행 중...`));
          const result = spawnSync('go', ['install', selected.cmd], { stdio: 'inherit' });
          status(server.label, result.status === 0, result.status === 0 ? '설치 완료' : '설치 실패');
        } else if (choice === 'rustup') {
          console.log(colors.dim(`  rustup component add ${selected.cmd} 실행 중...`));
          const result = spawnSync('rustup', ['component', 'add', selected.cmd], { stdio: 'inherit' });
          status(server.label, result.status === 0, result.status === 0 ? '설치 완료' : '설치 실패');
        } else if (choice === 'brew') {
          console.log(colors.dim(`  brew install ${selected.cmd} 실행 중...`));
          const result = spawnSync('brew', ['install', selected.cmd], { stdio: 'inherit' });
          status(server.label, result.status === 0, result.status === 0 ? '설치 완료' : '설치 실패');
        } else {
          console.log(colors.dim('  건너뜀.'));
        }
      } else {
        console.log(colors.dim(`  ${sym.arr} 수동 설치: ${server.hint}`));
      }
    }
  }

  // -- Step 5: Plugin Registration --
  section(colors.bold('[5/5] 플러그인 등록'));

  const targetDir = scope === 'project'
    ? projectPluginDir(projectRoot)
    : GLOBAL_PLUGIN_DIR;

  let pluginRegistered = false;

  if (scope === 'project') {
    console.log(colors.dim(`  범위: 프로젝트 (${projectRoot})`));
    pluginRegistered = registerPlugin(targetDir);

    // .gitignore에 .claude/ 추가 안내
    const gitignorePath = join(projectRoot, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf8');
      if (!gitignore.includes('.claude/plugins')) {
        console.log();
        console.log(colors.yellow(`  주의: .gitignore에 플러그인 심볼릭 링크를 추가하세요:`));
        console.log(colors.dim('    .claude/plugins/'));
      }
    }
  } else {
    console.log(colors.dim('  범위: 글로벌'));
    if (existsSync(targetDir)) {
      status('플러그인 디렉토리', true, targetDir);
      pluginRegistered = true;
    } else {
      if (await confirm(`  ${sym.arr} ${targetDir}에 플러그인을 등록하시겠습니까?`)) {
        pluginRegistered = registerPlugin(targetDir);
      } else {
        console.log(colors.dim('  건너뜀. 다음 명령어를 사용할 수 있습니다: claude --plugin-dir .'));
      }
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
    console.log(colors.dim('위 항목을 수정한 후 다시 실행하세요: claude-sdd check'));
  }

  console.log();
  console.log(colors.bold('다음 단계:'));
  if (pluginRegistered) {
    if (scope === 'project') {
      console.log(`  1. ${colors.bold('claude')} 을 ${colors.cyan(projectRoot)} 에서 실행하세요`);
    } else {
      console.log(`  1. ${colors.bold('claude')} 을 실행하세요 (플러그인이 자동으로 로드됩니다)`);
    }
  } else {
    console.log(`  1. ${colors.bold('claude --plugin-dir ' + PLUGIN_ROOT)}`);
  }
  console.log(`  2. ${colors.bold('/sdd-init new')} 을 입력하여 SDD 프로젝트를 초기화하세요`);
  console.log(`  3. ${colors.bold('/sdd')} 를 사용하여 개발 라이프사이클을 시작하세요`);
  console.log();
  console.log(colors.dim(`제거하려면: claude-sdd uninstall`));
}

// ─────────────────────────────────────────────
// uninstall
// ─────────────────────────────────────────────

export async function runUninstaller() {
  console.log('claude-sdd 플러그인 제거를 시작합니다.');
  console.log();

  let removed = false;
  const projectRoot = detectProjectRoot();
  const projectDir = projectPluginDir(projectRoot);

  // 설치 위치 탐지
  const globalExists = existsSync(GLOBAL_PLUGIN_DIR);
  const projectExists = existsSync(projectDir);

  if (!globalExists && !projectExists) {
    console.log(colors.dim('  등록된 플러그인을 찾을 수 없습니다.'));
    console.log();
    return;
  }

  // 1. 글로벌 플러그인 제거
  if (globalExists) {
    section('글로벌 플러그인');
    if (await confirm(`  ${sym.arr} 글로벌 플러그인을 제거하시겠습니까? (${GLOBAL_PLUGIN_DIR})`)) {
      try {
        unlinkSync(GLOBAL_PLUGIN_DIR);
        status('글로벌 심볼릭 링크', true, '제거 완료');
        removed = true;
      } catch (e) {
        status('글로벌 심볼릭 링크', false, `제거 실패: ${e.message}`);
      }
    } else {
      console.log(colors.dim('  건너뜀.'));
    }
  }

  // 2. 프로젝트 플러그인 제거
  if (projectExists) {
    section(`프로젝트 플러그인 (${projectRoot})`);
    if (await confirm(`  ${sym.arr} 프로젝트 플러그인을 제거하시겠습니까? (${projectDir})`)) {
      try {
        unlinkSync(projectDir);
        status('프로젝트 심볼릭 링크', true, '제거 완료');
        removed = true;

        // 빈 디렉토리 정리
        const pluginsDir = dirname(projectDir);
        try {
          const { readdirSync, rmdirSync } = await import('node:fs');
          if (readdirSync(pluginsDir).length === 0) rmdirSync(pluginsDir);
        } catch { /* ignore */ }
      } catch (e) {
        status('프로젝트 심볼릭 링크', false, `제거 실패: ${e.message}`);
      }
    } else {
      console.log(colors.dim('  건너뜀.'));
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
