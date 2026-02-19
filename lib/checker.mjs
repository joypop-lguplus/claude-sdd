import { commandExists, run, status, section, colors } from './utils.mjs';

/**
 * Run all SDD dependency checks and return a results array.
 * Each item: { name, ok, detail, category }
 */
export function checkAll() {
  const results = [];

  // -- Core Tools --
  const nodeOk = commandExists('node');
  const nodeVer = nodeOk ? run('node --version', { ignoreError: true }) : '';
  results.push({ name: 'Node.js', ok: nodeOk, detail: nodeVer || '설치되지 않음', category: 'core' });

  // -- Claude Code --
  const claudeOk = commandExists('claude');
  const claudeVer = claudeOk ? run('claude --version 2>/dev/null', { ignoreError: true }) || '설치됨' : '';
  results.push({ name: 'Claude Code', ok: claudeOk, detail: claudeVer || '설치되지 않음', category: 'claude' });

  // -- Agent Teams --
  const agentTeamsEnv = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  const agentTeamsOk = agentTeamsEnv === '1' || agentTeamsEnv === 'true';
  results.push({
    name: 'Agent Teams',
    ok: agentTeamsOk,
    detail: agentTeamsOk ? '활성화됨' : '비활성화 (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 설정 필요)',
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

  // -- LSP Servers (optional) --
  const lspServers = [
    { name: 'typescript-language-server', label: 'TypeScript LSP', install: 'npm i -g typescript-language-server typescript' },
    { name: 'pyright-langserver', label: 'Python LSP (Pyright)', install: 'npm i -g pyright' },
    { name: 'gopls', label: 'Go LSP (gopls)', install: 'go install golang.org/x/tools/gopls@latest' },
    { name: 'rust-analyzer', label: 'Rust LSP', install: 'rustup component add rust-analyzer' },
    { name: 'clangd', label: 'C/C++ LSP (clangd)', install: 'OS 패키지 매니저로 설치' },
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

  // -- Confluence MCP (optional) --
  let confluenceOk = false;
  if (claudeOk) {
    const mcpList = run('claude mcp list 2>/dev/null', { ignoreError: true });
    confluenceOk = mcpList.includes('confluence') || mcpList.includes('atlassian');
  }
  results.push({
    name: 'Confluence MCP',
    ok: confluenceOk,
    detail: confluenceOk ? '구성됨' : '구성되지 않음 (선택 사항)',
    category: 'mcp',
  });

  // -- Jira MCP (optional) --
  let jiraOk = false;
  if (claudeOk) {
    const mcpList = run('claude mcp list 2>/dev/null', { ignoreError: true });
    jiraOk = mcpList.includes('jira') || mcpList.includes('atlassian');
  }
  results.push({
    name: 'Jira MCP',
    ok: jiraOk,
    detail: jiraOk ? '구성됨' : '구성되지 않음 (선택 사항)',
    category: 'mcp',
  });

  return results;
}

/**
 * Print check results to console in a formatted table.
 */
export function printResults(results) {
  const categories = [
    { key: 'core',    title: '[1/5] 핵심 도구' },
    { key: 'claude',  title: '[2/5] Claude Code 및 에이전트 팀' },
    { key: 'github',  title: '[3/5] GitHub CLI' },
    { key: 'tools',   title: '[4/5] 코드 분석 도구 (선택 사항)' },
    { key: 'mcp',     title: '[5/5] MCP 서버 (선택 사항)' },
  ];

  for (const cat of categories) {
    const items = results.filter(r => r.category === cat.key);
    if (items.length === 0) continue;
    section(cat.title);
    for (const item of items) {
      status(item.name, item.ok, item.detail);
    }
  }

  const required = results.filter(r => r.category !== 'mcp' && r.category !== 'tools');
  const missing = required.filter(r => !r.ok);
  const optional = results.filter(r => (r.category === 'mcp' || r.category === 'tools') && !r.ok);

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
