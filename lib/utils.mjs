import { execSync, exec as execCb } from 'node:child_process';
import { createInterface } from 'node:readline';
import { platform } from 'node:os';

// -- Colors --
const isColorSupported = process.env.NO_COLOR == null && process.stdout.isTTY;

const c = (code) => isColorSupported ? `\x1b[${code}m` : '';

export const colors = {
  red:    (s) => `${c('0;31')}${s}${c('0')}`,
  green:  (s) => `${c('0;32')}${s}${c('0')}`,
  yellow: (s) => `${c('1;33')}${s}${c('0')}`,
  blue:   (s) => `${c('0;34')}${s}${c('0')}`,
  cyan:   (s) => `${c('0;36')}${s}${c('0')}`,
  bold:   (s) => `${c('1')}${s}${c('0')}`,
  dim:    (s) => `${c('2')}${s}${c('0')}`,
};

// -- Symbols --
export const sym = {
  ok:   colors.green('\u2713'),
  fail: colors.red('\u2717'),
  warn: colors.yellow('!'),
  arr:  colors.blue('\u2192'),
  dot:  colors.yellow('\u2022'),
};

// -- Shell helpers --
export function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
  } catch (e) {
    if (opts.ignoreError) return '';
    throw e;
  }
}

export function runAsync(cmd) {
  return new Promise((resolve, reject) => {
    execCb(cmd, { encoding: 'utf8' }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

// -- Prompt --
export function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`${question} ${hint} `);
  if (answer === '') return defaultYes;
  return /^y(es)?$/i.test(answer);
}

export async function select(question, options) {
  console.log(question);
  options.forEach((opt, i) => console.log(`  ${i + 1}) ${opt.label}`));
  const answer = await prompt('선택 (번호): ');
  const idx = parseInt(answer, 10) - 1;
  return options[idx]?.value ?? options[0]?.value;
}

// -- Display --
export function status(name, ok, detail = '') {
  const icon = ok ? sym.ok : sym.fail;
  const padded = name.padEnd(28);
  console.log(`  ${icon} ${padded} ${detail}`);
}

export function header(title) {
  const line = '\u2550'.repeat(50);
  console.log();
  console.log(colors.bold(`\u2554${line}\u2557`));
  console.log(colors.bold(`\u2551  ${title.padEnd(48)}\u2551`));
  console.log(colors.bold(`\u255A${line}\u255D`));
  console.log();
}

export function section(title) {
  console.log();
  console.log(colors.bold(title));
}

// -- Platform --
export const isMac = platform() === 'darwin';
export const isLinux = platform() === 'linux';
