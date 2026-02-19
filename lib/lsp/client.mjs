/**
 * lib/lsp/client.mjs — JSON-RPC 2.0 LSP 클라이언트
 *
 * child_process.spawn으로 언어 서버를 시작하고,
 * Content-Length 헤더 기반 메시지 프레이밍으로 통신합니다.
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

const DEFAULT_TIMEOUT = 30_000;

export class LspClient extends EventEmitter {
  #process = null;
  #buffer = '';
  #pendingRequests = new Map();
  #nextId = 1;

  /** 언어 서버 프로세스를 시작합니다. */
  start(command, args = [], options = {}) {
    this.#process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });

    this.#process.stdout.on('data', (chunk) => this.#onData(chunk));
    this.#process.stderr.on('data', (chunk) => {
      this.emit('stderr', chunk.toString());
    });
    this.#process.on('error', (err) => this.emit('error', err));
    this.#process.on('exit', (code) => {
      this.emit('exit', code);
      this.#rejectAll(new Error(`서버 프로세스 종료 (code=${code})`));
    });
  }

  /** 요청을 보내고 응답을 대기합니다 (타임아웃 적용). */
  request(method, params = {}, timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const id = this.#nextId++;
      const msg = { jsonrpc: '2.0', id, method, params };
      this.#send(msg);

      const timer = setTimeout(() => {
        this.#pendingRequests.delete(id);
        reject(new Error(`LSP 요청 타임아웃: ${method} (${timeout}ms)`));
      }, timeout);

      this.#pendingRequests.set(id, { resolve, reject, timer });
    });
  }

  /** 알림을 전송합니다 (응답 없음). */
  notify(method, params = {}) {
    const msg = { jsonrpc: '2.0', method, params };
    this.#send(msg);
  }

  /** 서버를 정상 종료합니다. */
  async stop() {
    if (!this.#process) return;
    try {
      await this.request('shutdown', {}, 5_000);
      this.notify('exit');
    } catch {
      // shutdown 실패 시 강제 종료
    }
    // 프로세스가 아직 살아있으면 강제 종료
    setTimeout(() => {
      if (this.#process && !this.#process.killed) {
        this.#process.kill('SIGKILL');
      }
    }, 2_000);
  }

  /** 서버가 실행 중인지 확인합니다. */
  get isRunning() {
    return this.#process != null && !this.#process.killed;
  }

  // -- 내부 메서드 --

  #send(msg) {
    if (!this.#process || !this.#process.stdin.writable) {
      throw new Error('LSP 서버가 실행 중이 아닙니다');
    }
    const body = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
    this.#process.stdin.write(header + body);
  }

  #onData(chunk) {
    this.#buffer += chunk.toString();
    while (true) {
      const headerEnd = this.#buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = this.#buffer.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // 잘못된 헤더, 스킵
        this.#buffer = this.#buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;

      if (this.#buffer.length < bodyStart + contentLength) {
        break; // 아직 전체 본문이 도착하지 않음
      }

      const body = this.#buffer.slice(bodyStart, bodyStart + contentLength);
      this.#buffer = this.#buffer.slice(bodyStart + contentLength);

      try {
        const msg = JSON.parse(body);
        this.#handleMessage(msg);
      } catch {
        // 파싱 실패, 무시
      }
    }
  }

  #handleMessage(msg) {
    // 응답 메시지 (id가 있음)
    if (msg.id != null && this.#pendingRequests.has(msg.id)) {
      const { resolve, reject, timer } = this.#pendingRequests.get(msg.id);
      clearTimeout(timer);
      this.#pendingRequests.delete(msg.id);

      if (msg.error) {
        reject(new Error(`LSP 에러 [${msg.error.code}]: ${msg.error.message}`));
      } else {
        resolve(msg.result);
      }
      return;
    }

    // 서버→클라이언트 알림 (id 없음)
    if (msg.method) {
      this.emit('notification', msg.method, msg.params);
      this.emit(msg.method, msg.params);
    }
  }

  #rejectAll(error) {
    for (const [id, { reject, timer }] of this.#pendingRequests) {
      clearTimeout(timer);
      reject(error);
    }
    this.#pendingRequests.clear();
  }
}
