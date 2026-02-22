import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { commandExists, run, status, section, colors, refreshPath } from './utils.mjs';

/**
 * Agent Teams 활성화 여부를 확인합니다.
 * process.env, ~/.claude/settings.json, 프로젝트 .claude/settings.local.json 순으로 확인합니다.
 */
export function isAgentTeamsEnabled() {
  // 1. 환경 변수 확인
  const envVal = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  if (envVal === '1' || envVal === 'true') return true;

  // 2. 글로벌 settings.json 확인
  try {
    const settingsPath = join(homedir(), '.claude', 'settings.json');
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      const val = settings?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
      if (val === '1' || val === 'true') return true;
    }
  } catch { /* ignore */ }

  // 3. 프로젝트 settings.local.json 확인
  try {
    const localPath = join(process.cwd(), '.claude', 'settings.local.json');
    if (existsSync(localPath)) {
      const settings = JSON.parse(readFileSync(localPath, 'utf8'));
      const val = settings?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
      if (val === '1' || val === 'true') return true;
    }
  } catch { /* ignore */ }

  return false;
}

/**
 * Run all SDD dependency checks and return a results array.
 * Each item: { name, ok, detail, category }
 */
export function checkAll() {
  refreshPath();
  const results = [];

  // -- Core Tools --
  const nodeOk = commandExists('node');
  const nodeVer = nodeOk ? run('node --version', { ignoreError: true }) : '';
  results.push({ name: 'Node.js', ok: nodeOk, detail: nodeVer || '설치되지 않음', category: 'core' });

  // -- Claude Code --
  const claudeOk = commandExists('claude');
  const claudeVer = claudeOk ? run('claude --version 2>/dev/null', { ignoreError: true, timeout: 5000 }) || '설치됨' : '';
  results.push({ name: 'Claude Code', ok: claudeOk, detail: claudeVer || '설치되지 않음', category: 'claude' });

  // -- Agent Teams --
  const agentTeamsOk = isAgentTeamsEnabled();
  results.push({
    name: 'Agent Teams',
    ok: agentTeamsOk,
    detail: agentTeamsOk
      ? '활성화됨 (팀 모드 — 병렬 빌드)'
      : '비활성화 (솔로 모드 — 순차 빌드)',
    category: 'claude',
  });

  // -- GitHub CLI --
  const ghOk = commandExists('gh');
  const ghVer = ghOk ? run('gh --version 2>/dev/null | head -1', { ignoreError: true }) : '';
  results.push({ name: 'gh CLI', ok: ghOk, detail: ghVer || '설치되지 않음', category: 'github' });

  if (ghOk) {
    let ghAuth = false;
    try { run('gh auth status 2>&1'); ghAuth = true; } catch { /* not authed */ }
    results.push({ name: 'gh auth', ok: ghAuth, detail: ghAuth ? '인증됨' : '인증되지 않음', category: 'github' });
  }

  // -- ast-grep (optional) --
  const sgOk = commandExists('sg');
  const sgVer = sgOk ? run('sg --version 2>/dev/null', { ignoreError: true }) : '';
  results.push({
    name: 'ast-grep (sg)',
    ok: sgOk,
    detail: sgVer || '설치되지 않음 (선택 사항 — /sdd-lint 검색 및 심볼 추출 향상)',
    category: 'tools',
  });

  // -- LSP Servers (boostvolt/claude-code-lsps) --
  const lspServers = [
    { name: 'vtsls', label: 'TypeScript/JS LSP (vtsls)', install: 'npm i -g @vtsls/language-server typescript' },
    { name: 'pyright', label: 'Python LSP (Pyright)', install: 'pip install pyright' },
    { name: 'gopls', label: 'Go LSP (gopls)', install: 'go install golang.org/x/tools/gopls@latest' },
    { name: 'jdtls', label: 'Java LSP (jdtls)', install: 'brew install jdtls' },
    { name: 'kotlin-lsp', label: 'Kotlin LSP', install: 'brew install JetBrains/utils/kotlin-lsp' },
    { name: 'lua-language-server', label: 'Lua LSP', install: 'brew install lua-language-server' },
    { name: 'terraform-ls', label: 'Terraform LSP', install: 'brew install terraform-ls' },
    { name: 'yaml-language-server', label: 'YAML LSP', install: 'npm i -g yaml-language-server' },
  ];

  let anyLspInstalled = false;
  for (const server of lspServers) {
    const installed = commandExists(server.name);
    if (installed) anyLspInstalled = true;
    results.push({
      name: server.label,
      ok: installed,
      detail: installed ? '설치됨' : `설치되지 않음 (선택 사항 — ${server.install})`,
      category: 'tools',
    });
  }

  // -- MCP Servers (optional, structured check) --
  // ~/.claude.json에서 MCP 서버를 구조화하여 확인합니다.
  const claudeJsonPath = join(homedir(), '.claude.json');
  let mcpServers = {};
  if (existsSync(claudeJsonPath)) {
    try {
      const claudeJson = JSON.parse(readFileSync(claudeJsonPath, 'utf8'));
      mcpServers = claudeJson.mcpServers || {};
    } catch { /* ignore */ }
  }

  // 설정 파일 기반 추가 검사 (하위 호환)
  let mcpConfigText = '';
  const mcpPaths = [
    join(homedir(), '.claude', 'settings.json'),
    join(process.cwd(), '.claude', 'settings.local.json'),
    join(process.cwd(), '.mcp.json'),
  ];
  for (const p of mcpPaths) {
    if (existsSync(p)) {
      try { mcpConfigText += readFileSync(p, 'utf8'); } catch { /* ignore */ }
    }
  }

  const atlassianServers = Object.entries(mcpServers)
    .filter(([k]) => k.includes('atlassian'));
  const hasAtlassian = atlassianServers.length > 0 || mcpConfigText.includes('atlassian');

  if (atlassianServers.length > 0) {
    for (const [name] of atlassianServers) {
      results.push({
        name: `Atlassian MCP (${name})`,
        ok: true,
        detail: '구성됨',
        category: 'mcp',
      });
    }
  } else {
    results.push({
      name: 'Atlassian MCP',
      ok: hasAtlassian,
      detail: hasAtlassian ? '구성됨' : '구성되지 않음 (선택 사항 — claude-sdd install로 설정)',
      category: 'mcp',
    });
  }

  const hasFigma = Object.keys(mcpServers).some(k => k.includes('figma'))
    || mcpConfigText.includes('figma');
  results.push({
    name: 'Figma MCP',
    ok: hasFigma,
    detail: hasFigma ? '구성됨' : '구성되지 않음 (선택 사항)',
    category: 'mcp',
  });

  // -- Diagram Tools (optional) --
  let hasMmdc = false;
  try {
    const r = spawnSync('npx', ['mmdc', '--version'], { stdio: 'pipe', timeout: 15000 });
    hasMmdc = r.status === 0;
  } catch { /* ignore */ }
  results.push({
    name: 'mmdc (Mermaid CLI)',
    ok: hasMmdc,
    detail: hasMmdc ? '설치됨' : '설치되지 않음 (선택 사항 — 다이어그램 PNG 생성: npm i -g @mermaid-js/mermaid-cli)',
    category: 'tools',
  });

  // claude-mermaid MCP 확인
  const hasMermaidMcp = Object.keys(mcpServers).some(k => k.includes('mermaid'));
  results.push({
    name: 'claude-mermaid MCP',
    ok: hasMermaidMcp,
    detail: hasMermaidMcp ? '구성됨' : '구성되지 않음 (선택 사항 — 다이어그램 브라우저 프리뷰)',
    category: 'mcp',
  });

  return results;
}

/**
 * Print check results to console in a formatted table.
 */
export function printResults(results) {
  const categories = [
    { key: 'core',    title: '[1/7] 핵심 도구' },
    { key: 'claude',  title: '[2/7] Claude Code 및 에이전트 팀' },
    { key: 'github',  title: '[3/7] GitHub CLI' },
    { key: 'tools',   title: '[4/7] 코드 분석 / 다이어그램 도구' },
    { key: 'mcp',     title: '[5/7] MCP 서버' },
  ];

  for (const cat of categories) {
    const items = results.filter(r => r.category === cat.key);
    if (items.length === 0) continue;
    section(cat.title);
    for (const item of items) {
      status(item.name, item.ok, item.detail);
    }
  }

  const required = results.filter(r => r.category !== 'mcp' && r.category !== 'tools' && r.name !== 'Agent Teams');
  const missing = required.filter(r => !r.ok);
  const optional = results.filter(r => (r.category === 'mcp' || r.category === 'tools' || r.name === 'Agent Teams') && !r.ok);

  console.log();
  console.log(colors.bold('\u2501'.repeat(50)));

  if (missing.length === 0) {
    console.log();
    console.log(colors.green(colors.bold('모든 필수 의존성이 준비되었습니다!')));
  } else {
    console.log();
    console.log(colors.yellow(colors.bold(`누락된 필수 구성 요소 (${missing.length}개):`)));
    for (const m of missing) {
      console.log(`  ${colors.yellow('\u2022')} ${m.name} \u2014 ${m.detail}`);
    }
  }

  if (optional.length > 0) {
    console.log();
    console.log(colors.dim(`선택 사항: ${optional.map(o => o.name).join(', ')} 구성되지 않음`));
  }

  return missing;
}
