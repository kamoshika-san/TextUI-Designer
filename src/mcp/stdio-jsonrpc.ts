import { EventEmitter } from 'events';
import type { Readable, Writable } from 'stream';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse;

export class StdioJsonRpcTransport extends EventEmitter {
  private readonly input: Readable;
  private readonly output: Writable;
  private buffer: Buffer = Buffer.alloc(0);
  private responseFormatHeaderless = false;

  constructor(input: Readable, output: Writable) {
    super();
    this.input = input;
    this.output = output;
  }

  start(): void {
    this.input.on('data', chunk => {
      this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
      this.processBuffer();
    });

    this.input.on('end', () => {
      this.emit('end');
    });

    this.input.on('error', error => {
      this.emit('error', error);
    });
  }

  send(message: JsonRpcMessage, callback?: () => void): void {
    const body = JSON.stringify(message);
    if (this.responseFormatHeaderless) {
      this.output.write(body + '\n', 'utf8', () => callback?.());
      return;
    }
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
    this.output.write(header, 'utf8', () => {
      this.output.write(body, 'utf8', () => {
        callback?.();
      });
    });
  }

  private processBuffer(): void {
    while (true) {
      const headerBoundary = this.findHeaderBoundary(this.buffer);
      if (!headerBoundary) {
        const headerless = this.tryConsumeHeaderlessJson();
        if (headerless) {
          continue;
        }
        return;
      }

      const headerBlock = this.buffer.slice(0, headerBoundary.index).toString('utf8');
      const headers = this.parseHeaders(headerBlock);
      const contentLengthHeader = headers['content-length'];
      if (!contentLengthHeader) {
        this.buffer = this.buffer.slice(headerBoundary.bodyOffset);
        this.emit('error', new Error('Content-Length header is missing'));
        continue;
      }

      const contentLength = Number(contentLengthHeader);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        this.buffer = this.buffer.slice(headerBoundary.bodyOffset);
        this.emit('error', new Error(`Invalid Content-Length: ${contentLengthHeader}`));
        continue;
      }

      const totalLength = headerBoundary.bodyOffset + contentLength;
      if (this.buffer.length < totalLength) {
        return;
      }

      const body = this.buffer.slice(headerBoundary.bodyOffset, totalLength).toString('utf8');
      this.buffer = this.buffer.slice(totalLength);

      try {
        const parsed = JSON.parse(body) as JsonRpcMessage;
        this.emit('message', parsed);
      } catch (error) {
        this.emit('error', new Error(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }

  private parseHeaders(headerBlock: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const lines = headerBlock.split(/\r?\n/);
    lines.forEach(line => {
      const separator = line.indexOf(':');
      if (separator === -1) {
        return;
      }
      const name = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();
      headers[name] = value;
    });
    return headers;
  }

  private findHeaderBoundary(buffer: Buffer): { index: number; bodyOffset: number } | null {
    const crlfCrlf = buffer.indexOf('\r\n\r\n');
    const lfLf = buffer.indexOf('\n\n');
    const crlfJson = this.findCrlfBeforeJson(buffer);
    const lfJson = this.findLfBeforeJson(buffer);

    const candidates: { index: number; bodyOffset: number }[] = [];
    if (crlfCrlf !== -1) {
      candidates.push({ index: crlfCrlf, bodyOffset: crlfCrlf + 4 });
    }
    if (lfLf !== -1) {
      candidates.push({ index: lfLf, bodyOffset: lfLf + 2 });
    }
    if (crlfJson !== null) {
      candidates.push(crlfJson);
    }
    if (lfJson !== null) {
      candidates.push(lfJson);
    }
    if (candidates.length === 0) {
      return null;
    }
    return candidates.reduce((a, b) => (a.index <= b.index ? a : b));
  }

  private findLfBeforeJson(buffer: Buffer): { index: number; bodyOffset: number } | null {
    let i = 0;
    while (i < buffer.length - 2) {
      const lf = buffer.indexOf('\n', i);
      if (lf === -1) {
        return null;
      }
      const next = buffer[lf + 1];
      if (next === 0x7b || next === 0x5b) {
        return { index: lf, bodyOffset: lf + 1 };
      }
      i = lf + 1;
    }
    return null;
  }

  private findCrlfBeforeJson(buffer: Buffer): { index: number; bodyOffset: number } | null {
    let i = 0;
    while (i < buffer.length - 3) {
      const crlf = buffer.indexOf('\r\n', i);
      if (crlf === -1) {
        return null;
      }
      const next = buffer[crlf + 2];
      if (next === 0x7b || next === 0x5b) {
        return { index: crlf, bodyOffset: crlf + 2 };
      }
      i = crlf + 2;
    }
    return null;
  }

  private tryConsumeHeaderlessJson(): boolean {
    if (this.buffer.length === 0) {
      return false;
    }
    const first = this.buffer[0];
    if (first !== 0x7b && first !== 0x5b) {
      return false;
    }
    try {
      const body = this.buffer.toString('utf8');
      const parsed = JSON.parse(body) as JsonRpcMessage;
      this.responseFormatHeaderless = true;
      this.emit('message', parsed);
      this.buffer = Buffer.alloc(0);
      return true;
    } catch {
      return false;
    }
  }
}
