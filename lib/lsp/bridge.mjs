/**
 * lib/lsp/bridge.mjs — 고수준 LSP 브릿지
 *
 * LspClient를 래핑하여 10개 LSP 오퍼레이션을 제공합니다.
 * Per-request 수명주기: connect → 쿼리 → disconnect.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LspClient } from './client.mjs';
import { getServerForFile, getServerByLanguage, isServerInstalled } from './servers.mjs';

export class LspBridge {
  #client = null;
  #rootPath = null;
  #rootUri = null;
  #openDocs = new Set();
  #diagnosticsMap = new Map();
  #serverName = null;

  /**
   * 언어 서버에 연결하고 initialize 핸드셰이크를 수행합니다.
   * @param {string} language - 언어명 또는 파일 경로
   * @param {string} rootPath - 프로젝트 루트 경로
   */
  async connect(language, rootPath) {
    this.#rootPath = resolve(rootPath);
    this.#rootUri = pathToFileURL(this.#rootPath).href;

    // 서버 결정 (파일 경로 또는 언어명)
    let serverInfo;
    if (language.includes('.')) {
      serverInfo = getServerForFile(language);
    } else {
      serverInfo = getServerByLanguage(language);
    }

    if (!serverInfo) {
      throw new Error(`지원되지 않는 언어: ${language}`);
    }

    const { name, config } = serverInfo;
    this.#serverName = name;

    if (!isServerInstalled(config.command)) {
      throw new Error(`언어 서버가 설치되어 있지 않습니다: ${config.command}`);
    }

    this.#client = new LspClient();

    // diagnostics 이벤트 수집
    this.#client.on('textDocument/publishDiagnostics', (params) => {
      this.#diagnosticsMap.set(params.uri, params.diagnostics || []);
    });

    this.#client.start(config.command, config.args, { cwd: this.#rootPath });

    // initialize 핸드셰이크
    const initResult = await this.#client.request('initialize', {
      processId: process.pid,
      rootUri: this.#rootUri,
      rootPath: this.#rootPath,
      capabilities: {
        textDocument: {
          synchronization: { didOpen: true, didClose: true },
          completion: { completionItem: {} },
          hover: { contentFormat: ['plaintext', 'markdown'] },
          definition: {},
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          publishDiagnostics: {},
          implementation: {},
          callHierarchy: {},
        },
        workspace: {
          symbol: {},
          workspaceFolders: true,
        },
      },
      workspaceFolders: [{ uri: this.#rootUri, name: 'root' }],
      initializationOptions: config.initializationOptions || {},
    });

    this.#client.notify('initialized', {});

    return { serverName: name, capabilities: initResult?.capabilities || {} };
  }

  /**
   * 연결을 종료합니다.
   */
  async disconnect() {
    if (!this.#client) return;

    // 열린 문서 닫기
    for (const uri of this.#openDocs) {
      this.#client.notify('textDocument/didClose', {
        textDocument: { uri },
      });
    }
    this.#openDocs.clear();

    await this.#client.stop();
    this.#client = null;
  }

  /**
   * 파일의 진단 결과를 수집합니다.
   * @param {string} filePath - 대상 파일 경로
   * @param {number} waitMs - 진단 대기 시간 (기본 3000ms)
   */
  async diagnostics(filePath, waitMs = 3000) {
    const absPath = resolve(this.#rootPath, filePath);
    const uri = pathToFileURL(absPath).href;

    this.#openDocument(absPath, uri);

    // 서버가 진단을 보낼 때까지 대기
    await this.#waitForDiagnostics(uri, waitMs);

    const diags = this.#diagnosticsMap.get(uri) || [];
    return diags.map((d) => ({
      file: filePath,
      range: {
        start: { line: d.range.start.line + 1, character: d.range.start.character + 1 },
        end: { line: d.range.end.line + 1, character: d.range.end.character + 1 },
      },
      severity: this.#severityToString(d.severity),
      message: d.message,
      source: d.source || this.#serverName,
      code: d.code,
    }));
  }

  /**
   * 정의 위치로 이동합니다.
   * @param {string} filePath
   * @param {number} line - 1-based
   * @param {number} col - 1-based
   */
  async definition(filePath, line, col) {
    const absPath = resolve(this.#rootPath, filePath);
    const uri = pathToFileURL(absPath).href;
    this.#openDocument(absPath, uri);

    const result = await this.#client.request('textDocument/definition', {
      textDocument: { uri },
      position: { line: line - 1, character: col - 1 },
    });

    return this.#normalizeLocations(result);
  }

  /**
   * 참조를 찾습니다.
   * @param {string} filePath
   * @param {number} line - 1-based
   * @param {number} col - 1-based
   */
  async references(filePath, line, col) {
    const absPath = resolve(this.#rootPath, filePath);
    const uri = pathToFileURL(absPath).href;
    this.#openDocument(absPath, uri);

    const result = await this.#client.request('textDocument/references', {
      textDocument: { uri },
      position: { line: line - 1, character: col - 1 },
      context: { includeDeclaration: true },
    });

    return this.#normalizeLocations(result);
  }

  /**
   * 호버 정보를 가져옵니다.
   * @param {string} filePath
   * @param {number} line - 1-based
   * @param {number} col - 1-based
   */
  async hover(filePath, line, col) {
    const absPath = resolve(this.#rootPath, filePath);
    const uri = pathToFileURL(absPath).href;
    this.#openDocument(absPath, uri);

    const result = await this.#client.request('textDocument/hover', {
      textDocument: { uri },
      position: { line: line - 1, character: col - 1 },
    });

    if (!result) return null;

    const contents = result.contents;
    let value = '';
    if (typeof contents === 'string') {
      value = contents;
    } else if (contents?.value) {
      value = contents.value;
    } else if (Array.isArray(contents)) {
      value = contents.map((c) => (typeof c === 'string' ? c : c.value || '')).join('\n');
    }

    return { contents: value, range: result.range ? this.#normalizeRange(result.range) : null };
  }

  /**
   * 문서 심볼을 추출합니다.
   * @param {string} filePath
   */
  async documentSymbols(filePath) {
    const absPath = resolve(this.#rootPath, filePath);
    const uri = pathToFileURL(absPath).href;
    this.#openDocument(absPath, uri);

    const result = await this.#client.request('textDocument/documentSymbol', {
      textDocument: { uri },
    });

    return this.#flattenSymbols(result || [], filePath);
  }

  /**
   * 워크스페이스 심볼을 검색합니다.
   * @param {string} query
   */
  async workspaceSymbols(query) {
    const result = await this.#client.request('workspace/symbol', { query });
    return (result || []).map((s) => ({
      name: s.name,
      kind: this.#symbolKindToString(s.kind),
      file: this.#uriToRelative(s.location.uri),
      line: s.location.range.start.line + 1,
      containerName: s.containerName || null,
    }));
  }

  /**
   * 구현을 찾습니다.
   * @param {string} filePath
   * @param {number} line - 1-based
   * @param {number} col - 1-based
   */
  async implementations(filePath, line, col) {
    const absPath = resolve(this.#rootPath, filePath);
    const uri = pathToFileURL(absPath).href;
    this.#openDocument(absPath, uri);

    const result = await this.#client.request('textDocument/implementation', {
      textDocument: { uri },
      position: { line: line - 1, character: col - 1 },
    });

    return this.#normalizeLocations(result);
  }

  /**
   * 호출 계층을 준비합니다.
   * @param {string} filePath
   * @param {number} line - 1-based
   * @param {number} col - 1-based
   */
  async prepareCallHierarchy(filePath, line, col) {
    const absPath = resolve(this.#rootPath, filePath);
    const uri = pathToFileURL(absPath).href;
    this.#openDocument(absPath, uri);

    const result = await this.#client.request('textDocument/prepareCallHierarchy', {
      textDocument: { uri },
      position: { line: line - 1, character: col - 1 },
    });

    if (!result || result.length === 0) return null;
    return result.map((item) => ({
      name: item.name,
      kind: this.#symbolKindToString(item.kind),
      file: this.#uriToRelative(item.uri),
      line: item.range.start.line + 1,
      detail: item.detail || null,
      _raw: item, // incomingCalls/outgoingCalls에서 사용
    }));
  }

  /**
   * 수신 호출을 탐색합니다.
   * @param {object} item - prepareCallHierarchy의 _raw 항목
   */
  async incomingCalls(item) {
    const rawItem = item._raw || item;
    const result = await this.#client.request('callHierarchy/incomingCalls', { item: rawItem });
    return (result || []).map((call) => ({
      from: {
        name: call.from.name,
        kind: this.#symbolKindToString(call.from.kind),
        file: this.#uriToRelative(call.from.uri),
        line: call.from.range.start.line + 1,
      },
      fromRanges: call.fromRanges?.map((r) => this.#normalizeRange(r)) || [],
    }));
  }

  /**
   * 발신 호출을 탐색합니다.
   * @param {object} item - prepareCallHierarchy의 _raw 항목
   */
  async outgoingCalls(item) {
    const rawItem = item._raw || item;
    const result = await this.#client.request('callHierarchy/outgoingCalls', { item: rawItem });
    return (result || []).map((call) => ({
      to: {
        name: call.to.name,
        kind: this.#symbolKindToString(call.to.kind),
        file: this.#uriToRelative(call.to.uri),
        line: call.to.range.start.line + 1,
      },
      fromRanges: call.fromRanges?.map((r) => this.#normalizeRange(r)) || [],
    }));
  }

  // -- 내부 헬퍼 --

  #openDocument(absPath, uri) {
    if (this.#openDocs.has(uri)) return;
    const serverInfo = getServerForFile(absPath);
    const languageId = serverInfo?.languageId || 'plaintext';
    const text = readFileSync(absPath, 'utf8');

    this.#client.notify('textDocument/didOpen', {
      textDocument: { uri, languageId, version: 1, text },
    });
    this.#openDocs.add(uri);
  }

  #waitForDiagnostics(uri, waitMs) {
    return new Promise((resolve) => {
      const handler = (params) => {
        if (params.uri === uri) {
          clearTimeout(timer);
          this.#client.removeListener('textDocument/publishDiagnostics', handler);
          // 약간의 추가 대기 (서버가 여러 번 보낼 수 있음)
          setTimeout(resolve, 500);
        }
      };
      this.#client.on('textDocument/publishDiagnostics', handler);
      const timer = setTimeout(() => {
        this.#client.removeListener('textDocument/publishDiagnostics', handler);
        resolve();
      }, waitMs);
    });
  }

  #severityToString(severity) {
    switch (severity) {
      case 1: return 'error';
      case 2: return 'warning';
      case 3: return 'information';
      case 4: return 'hint';
      default: return 'unknown';
    }
  }

  #symbolKindToString(kind) {
    const kinds = {
      1: 'file', 2: 'module', 3: 'namespace', 4: 'package',
      5: 'class', 6: 'method', 7: 'property', 8: 'field',
      9: 'constructor', 10: 'enum', 11: 'interface', 12: 'function',
      13: 'variable', 14: 'constant', 15: 'string', 16: 'number',
      17: 'boolean', 18: 'array', 19: 'object', 20: 'key',
      21: 'null', 22: 'enumMember', 23: 'struct', 24: 'event',
      25: 'operator', 26: 'typeParameter',
    };
    return kinds[kind] || 'unknown';
  }

  #normalizeLocations(result) {
    if (!result) return [];
    const locations = Array.isArray(result) ? result : [result];
    return locations.map((loc) => {
      // Location 또는 LocationLink 형식 처리
      const uri = loc.uri || loc.targetUri;
      const range = loc.range || loc.targetRange;
      if (!uri || !range) return null;
      return {
        file: this.#uriToRelative(uri),
        line: range.start.line + 1,
        character: range.start.character + 1,
        endLine: range.end.line + 1,
        endCharacter: range.end.character + 1,
      };
    }).filter(Boolean);
  }

  #normalizeRange(range) {
    return {
      start: { line: range.start.line + 1, character: range.start.character + 1 },
      end: { line: range.end.line + 1, character: range.end.character + 1 },
    };
  }

  #uriToRelative(uri) {
    try {
      const filePath = new URL(uri).pathname;
      if (filePath.startsWith(this.#rootPath)) {
        return filePath.slice(this.#rootPath.length + 1);
      }
      return filePath;
    } catch {
      return uri;
    }
  }

  #flattenSymbols(symbols, filePath, container = null) {
    const result = [];
    for (const sym of symbols) {
      result.push({
        name: sym.name,
        kind: this.#symbolKindToString(sym.kind),
        file: filePath,
        line: sym.range?.start?.line != null ? sym.range.start.line + 1 : (sym.location?.range?.start?.line != null ? sym.location.range.start.line + 1 : null),
        detail: sym.detail || null,
        containerName: container,
      });
      if (sym.children) {
        result.push(...this.#flattenSymbols(sym.children, filePath, sym.name));
      }
    }
    return result;
  }
}
