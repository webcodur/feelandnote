// Shared official stdio transport for authorized Aside REPL jobs.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Official Aside stdio MCP transport. It never calls the paid exec tool. */
export class AsideClient {
  constructor({ account = 'u1', executable = 'C:\\Users\\webco\\AppData\\Local\\Aside\\CLI\\current\\aside.exe', timeoutMs = 135000 } = {}) {
    this.timeoutMs = timeoutMs;
    this.pending = new Map();
    this.nextId = 1;
    this.buffer = Buffer.alloc(0);
    this.stderr = '';
    this.child = spawn(executable, ['mcp', '--account', account], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this.child.stdout.on('data', chunk => this.consume(chunk));
    this.child.stderr.on('data', chunk => { this.stderr = (this.stderr + chunk.toString()).slice(-8000); });
    this.child.on('error', error => this.rejectAll(error));
    this.child.on('exit', (code, signal) => this.rejectAll(new Error(`Aside MCP exited (${code ?? signal})`)));
    this.ready = this.initialize();
    this.queue = Promise.resolve();
  }

  rejectAll(error) {
    for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    this.pending.clear();
  }

  consume(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length) {
      let payload;
      if (this.buffer.toString('ascii', 0, 15).toLowerCase().startsWith('content-length:')) {
        const boundary = this.buffer.indexOf('\r\n\r\n');
        if (boundary < 0) return;
        const length = Number(/content-length:\s*(\d+)/i.exec(this.buffer.subarray(0, boundary).toString())?.[1]);
        if (!Number.isFinite(length)) { this.rejectAll(new Error('Invalid MCP Content-Length')); return; }
        if (this.buffer.length < boundary + 4 + length) return;
        payload = this.buffer.subarray(boundary + 4, boundary + 4 + length).toString('utf8');
        this.buffer = this.buffer.subarray(boundary + 4 + length);
      } else {
        const newline = this.buffer.indexOf(10);
        if (newline < 0) return;
        payload = this.buffer.subarray(0, newline).toString('utf8').trim();
        this.buffer = this.buffer.subarray(newline + 1);
      }
      if (!payload) continue;
      let message;
      try { message = JSON.parse(payload); } catch { continue; }
      const entry = this.pending.get(message.id);
      if (!entry) continue;
      clearTimeout(entry.timer);
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
    }
  }

  request(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Aside MCP ${method} timed out`)); }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', error => {
        if (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
      });
    });
  }

  async initialize() {
    this.server = await this.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'feelandnote-aside-local', version: '1.0.0' } });
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const listed = await this.request('tools/list');
    this.replTool = listed.tools.find(tool => tool.name === 'repl');
    if (!this.replTool) throw new Error('Aside MCP does not expose repl');
    this.tools = listed.tools;
    return this;
  }

  callRepl(script, title = 'Run browser JavaScript') {
    const operation = this.queue.then(async () => {
      await this.ready;
      const properties = this.replTool.inputSchema?.properties ?? {};
      const key = ['code', 'script', 'expression'].find(name => properties[name]?.type === 'string');
      if (!key) throw new Error(`Unrecognized repl schema: ${JSON.stringify(this.replTool.inputSchema)}`);
      const argumentsValue = { [key]: script };
      if (properties.title) argumentsValue.title = title;
      const result = await this.request('tools/call', { name: this.replTool.name, arguments: argumentsValue });
      if (result.isError) throw new Error(result.content?.filter(item => item.type === 'text').map(item => item.text).join('\n') || 'Aside repl failed');
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }

  /** Save the complete reply privately on the host; caller receives small metadata. */
  async saveRepl(script, outputPath, { format = 'text', extract } = {}) {
    const reply = await this.callRepl(script);
    let value = reply.content?.filter(item => item.type === 'text').map(item => item.text).join('\n') ?? '';
    if (extract) value = await extract(value, reply);
    if (format === 'json') value = JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2) + '\n';
    if (typeof value !== 'string' && !Buffer.isBuffer(value)) throw new TypeError('extract must return text, Buffer, or a JSON value with format=json');
    const destination = path.resolve(outputPath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, value, { flag: 'wx' });
    return { path: destination, bytes: Buffer.byteLength(value), format };
  }

  async close() {
    await this.queue;
    this.child.stdin.end();
    this.child.kill();
  }
}

export default AsideClient;
