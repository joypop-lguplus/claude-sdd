import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  colors, sym, status, section,
} from './utils.mjs';
import { checkAll, printResults } from './checker.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, '..');

export async function runDoctor() {
  console.log('claude-sdd 플러그인 정밀 진단을 실행합니다.');
  console.log();

  // -- 1. Basic checks --
  section(colors.bold('[1/3] 의존성 상태'));
  const results = checkAll();
  printResults(results);

  // -- 2. File integrity --
  section(colors.bold('[2/3] 플러그인 파일 무결성'));
  console.log();

  const requiredFiles = [
    '.claude-plugin/plugin.json',
    'agents/sdd-requirements-analyst.md',
    'agents/sdd-spec-writer.md',
    'agents/sdd-implementer.md',
    'agents/sdd-reviewer.md',
    'agents/sdd-code-analyzer.md',
    'skills/sdd/SKILL.md',
    'skills/sdd-init/SKILL.md',
    'skills/sdd-intake/SKILL.md',
    'skills/sdd-spec/SKILL.md',
    'skills/sdd-plan/SKILL.md',
    'skills/sdd-build/SKILL.md',
    'skills/sdd-review/SKILL.md',
    'skills/sdd-integrate/SKILL.md',
    'skills/sdd-status/SKILL.md',
    'skills/sdd-lint/SKILL.md',
    'hooks/hooks.json',
    'scripts/sdd-session-init.sh',
    'templates/claude-md/sdd-leader.md.tmpl',
    'templates/claude-md/sdd-member.md.tmpl',
    'templates/specs/architecture-new.md.tmpl',
    'templates/specs/api-spec.md.tmpl',
    'templates/specs/data-model.md.tmpl',
    'templates/specs/component-breakdown.md.tmpl',
    'templates/specs/change-impact.md.tmpl',
    'templates/checklists/spec-checklist.md.tmpl',
    'templates/checklists/quality-gate.md.tmpl',
    'templates/project-init/sdd-config.yaml.tmpl',
    'templates/project-init/lsp-config.yaml.tmpl',
    'lib/lsp/client.mjs',
    'lib/lsp/servers.mjs',
    'lib/lsp/bridge.mjs',
    'scripts/sdd-lsp.mjs',
    'skills/sdd-lsp/SKILL.md',
    '.mcp.json',
  ];

  let integrityOk = true;
  for (const file of requiredFiles) {
    const fullPath = join(PLUGIN_ROOT, file);
    const exists = existsSync(fullPath);
    if (!exists) integrityOk = false;
    status(file, exists, exists ? '' : '누락');
  }

  // Check executable permissions on scripts
  const scripts = ['scripts/sdd-session-init.sh', 'scripts/sdd-detect-tools.sh', 'scripts/sdd-lsp.mjs'];
  for (const script of scripts) {
    const fullPath = join(PLUGIN_ROOT, script);
    if (existsSync(fullPath)) {
      try {
        const st = statSync(fullPath);
        const isExec = (st.mode & 0o111) !== 0;
        status(`${script} (exec)`, isExec, isExec ? 'OK' : '실행 권한 없음');
        if (!isExec) integrityOk = false;
      } catch {
        status(`${script} (exec)`, false, '상태 확인 불가');
      }
    }
  }

  // -- 3. JSON validation --
  section(colors.bold('[3/3] JSON 유효성 검사'));
  console.log();

  const jsonFiles = [
    '.claude-plugin/plugin.json',
    'hooks/hooks.json',
    '.mcp.json',
    'package.json',
  ];

  if (existsSync(join(PLUGIN_ROOT, 'marketplace.json'))) {
    jsonFiles.push('marketplace.json');
  }

  for (const file of jsonFiles) {
    const fullPath = join(PLUGIN_ROOT, file);
    if (!existsSync(fullPath)) {
      status(file, false, '누락');
      continue;
    }
    try {
      JSON.parse(readFileSync(fullPath, 'utf8'));
      status(file, true, '유효한 JSON');
    } catch (e) {
      status(file, false, `유효하지 않음: ${e.message}`);
      integrityOk = false;
    }
  }

  // -- Summary --
  console.log();
  console.log(colors.bold('\u2501'.repeat(50)));
  console.log();

  const missing = results.filter(r => r.ok === false && r.category !== 'mcp' && r.category !== 'tools');
  if (missing.length === 0 && integrityOk) {
    console.log(colors.green(colors.bold('모든 진단을 통과했습니다!')));
  } else {
    if (!integrityOk) {
      console.log(colors.yellow('일부 플러그인 파일에 문제가 있습니다. 플러그인 루트 디렉토리에서 실행하세요.'));
    }
    if (missing.length > 0) {
      console.log(colors.yellow(`${missing.length}개의 구성 요소가 누락되었습니다. 실행: claude-sdd install`));
    }
  }
  console.log();
}
