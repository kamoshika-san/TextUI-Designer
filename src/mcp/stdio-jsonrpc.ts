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

    this.input.on('error', error => {
      this.emit('error', error);
    });
  }

  send(message: JsonRpcMessage): void {
    const body = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
    this.output.write(header, 'utf8');
    this.output.write(body, 'utf8');
  }

  private processBuffer(): void {
    while (true) {
      const headerBoundary = this.findHeaderBoundary(this.buffer);
      if (!headerBoundary) {
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
    const crlfIndex = buffer.indexOf('\r\n\r\n');
    const lfIndex = buffer.indexOf('\n\n');

    if (crlfIndex === -1 && lfIndex === -1) {
      return null;
    }

    if (crlfIndex === -1) {
      return { index: lfIndex, bodyOffset: lfIndex + 2 };
    }
    if (lfIndex === -1) {
      return { index: crlfIndex, bodyOffset: crlfIndex + 4 };
    }

    if (crlfIndex <= lfIndex) {
      return { index: crlfIndex, bodyOffset: crlfIndex + 4 };
    }
    return { index: lfIndex, bodyOffset: lfIndex + 2 };
  }
}
