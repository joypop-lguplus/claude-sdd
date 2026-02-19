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
import { checkAll, printResults } from './checker.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..');
const home = homedir();

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
}

export async function runInstaller() {
  console.log('claude-sdd 플러그인 설치 마법사입니다.');
  console.log(colors.dim('SDD: Claude Code 에이전트 팀을 활용한 스펙 주도 개발 (SDD) 라이프사이클'));

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

  const agentTeamsEnv = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  const agentTeamsOk = agentTeamsEnv === '1' || agentTeamsEnv === 'true';
  if (agentTeamsOk) {
    status('Agent Teams', true, '활성화됨');
  } else {
    status('Agent Teams', false, '비활성화');
    if (await confirm(`  ${sym.arr} 자동으로 Agent Teams를 활성화하시겠습니까?`)) {
      try {
        enableAgentTeams();
        // 현재 프로세스에도 반영 (검증 단계에서 감지되도록)
        process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
        status('Agent Teams', true, '~/.claude/settings.json에 설정 완료');
      } catch (e) {
        status('Agent Teams', false, `설정 실패: ${e.message}`);
        console.log(`  ${sym.arr} 수동으로 ~/.claude/settings.json에 추가:`);
        console.log(colors.dim('    { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }'));
      }
    } else {
      console.log(colors.dim('  건너뜀. 수동으로 ~/.claude/settings.json에 추가하세요:'));
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
        // 로그인 후 재확인
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
      if (result.status === 0) {
        status('ast-grep (sg)', true, '설치 완료');
      } else {
        status('ast-grep (sg)', false, '설치 실패');
      }
    } else if (choice === 'npm') {
      console.log(colors.dim('  npm i -g @ast-grep/cli 실행 중...'));
      const result = spawnSync('npm', ['i', '-g', '@ast-grep/cli'], { stdio: 'inherit' });
      if (result.status === 0) {
        status('ast-grep (sg)', true, '설치 완료');
      } else {
        status('ast-grep (sg)', false, '설치 실패');
      }
    } else {
      console.log(colors.dim('  건너뜀. /sdd-lint의 ast-grep 기능은 사용할 수 없습니다.'));
    }
  }

  // -- LSP Servers (optional) --
  console.log();
  console.log(colors.dim('  Language Server (LSP) — /sdd-lsp 의미 분석에 사용'));
  console.log();

  const lspServers = [
    { name: 'typescript-language-server', label: 'TypeScript LSP', brew: null, npm: 'typescript-language-server typescript', pip: null },
    { name: 'pyright-langserver', label: 'Python LSP (Pyright)', brew: null, npm: 'pyright', pip: 'pyright' },
    { name: 'gopls', label: 'Go LSP (gopls)', brew: null, npm: null, pip: null, goInstall: 'golang.org/x/tools/gopls@latest' },
    { name: 'rust-analyzer', label: 'Rust LSP', brew: null, npm: null, pip: null, rustup: 'rust-analyzer' },
    { name: 'clangd', label: 'C/C++ LSP (clangd)', brew: 'llvm', npm: null, pip: null },
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
      }
    }
  }

  // -- Step 5: Plugin Registration --
  section(colors.bold('[5/5] 플러그인 등록'));

  const pluginDir = join(home, '.claude', 'plugins', 'claude-sdd');
  let pluginRegistered = false;

  if (existsSync(pluginDir)) {
    status('플러그인 디렉토리', true, pluginDir);
    pluginRegistered = true;
  } else {
    if (await confirm(`  ${sym.arr} ${pluginDir}에 플러그인을 등록하시겠습니까?`)) {
      try {
        mkdirSync(dirname(pluginDir), { recursive: true });
        symlinkSync(PLUGIN_ROOT, pluginDir);
        status('플러그인 심볼릭 링크', true, `${pluginDir} -> ${PLUGIN_ROOT}`);
        pluginRegistered = true;
      } catch (e) {
        status('플러그인 심볼릭 링크', false, e.message);
      }
    } else {
      console.log(colors.dim('  건너뜀. 다음 명령어를 사용할 수 있습니다: claude --plugin-dir .'));
    }
  }

  // -- Verification --
  section(colors.bold('검증'));
  console.log();

  // 새로 설치된 도구가 PATH에 잡히도록 갱신
  refreshPath();

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
    console.log(`  1. ${colors.bold('claude')} 을 실행하세요 (플러그인이 자동으로 로드됩니다)`);
  } else {
    console.log(`  1. ${colors.bold('claude --plugin-dir ' + PLUGIN_ROOT)}`);
  }
  console.log(`  2. ${colors.bold('/sdd-init new')} 을 입력하여 SDD 프로젝트를 초기화하세요`);
  console.log(`  3. ${colors.bold('/sdd')} 를 사용하여 개발 라이프사이클을 시작하세요`);
  console.log();
  console.log(colors.dim(`제거하려면: claude-sdd uninstall`));
}

/**
 * 플러그인을 제거합니다.
 */
export async function runUninstaller() {
  console.log('claude-sdd 플러그인 제거를 시작합니다.');
  console.log();

  const pluginDir = join(home, '.claude', 'plugins', 'claude-sdd');
  let removed = false;

  // 1. 플러그인 심볼릭 링크 제거
  if (existsSync(pluginDir)) {
    if (await confirm(`  ${sym.arr} 플러그인 등록을 해제하시겠습니까? (${pluginDir})`)) {
      try {
        unlinkSync(pluginDir);
        status('플러그인 심볼릭 링크', true, '제거 완료');
        removed = true;
      } catch (e) {
        status('플러그인 심볼릭 링크', false, `제거 실패: ${e.message}`);
      }
    } else {
      console.log(colors.dim('  건너뜀.'));
    }
  } else {
    status('플러그인 심볼릭 링크', true, '이미 없음');
  }

  // 2. Agent Teams 설정 제거 (선택)
  const settingsPath = join(home, '.claude', 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (settings?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) {
        if (await confirm(`  ${sym.arr} Agent Teams 환경 변수도 제거하시겠습니까? (settings.json)`)) {
          delete settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
          if (Object.keys(settings.env).length === 0) delete settings.env;
          writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
          status('Agent Teams 설정', true, '제거 완료');
          removed = true;
        } else {
          console.log(colors.dim('  건너뜀. Agent Teams 설정이 유지됩니다.'));
        }
      }
    } catch { /* settings.json 파싱 실패, 무시 */ }
  }

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
