const assert = require('assert');
const { PassThrough } = require('stream');

describe('StdioJsonRpcTransport', () => {
  let StdioJsonRpcTransport;

  before(() => {
    ({ StdioJsonRpcTransport } = require('../../out/mcp/stdio-jsonrpc'));
  });

  it('CRLF区切りのJSON-RPCメッセージを受信できる', done => {
    const input = new PassThrough();
    const output = new PassThrough();
    const transport = new StdioJsonRpcTransport(input, output);
    transport.start();

    transport.on('message', message => {
      assert.strictEqual(message.method, 'initialize');
      assert.strictEqual(message.id, 1);
      done();
    });

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });
    const payload = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
    input.write(payload);
  });

  it('LF区切りのJSON-RPCメッセージを受信できる', done => {
    const input = new PassThrough();
    const output = new PassThrough();
    const transport = new StdioJsonRpcTransport(input, output);
    transport.start();

    transport.on('message', message => {
      assert.strictEqual(message.method, 'initialize');
      assert.strictEqual(message.id, 2);
      done();
    });

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });
    const payload = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\n\n${body}`;
    input.write(payload);
  });

  it('単一CRLF区切り（ヘッダ直後がJSON）のメッセージを受信できる', done => {
    const input = new PassThrough();
    const output = new PassThrough();
    const transport = new StdioJsonRpcTransport(input, output);
    transport.start();

    transport.on('message', message => {
      assert.strictEqual(message.method, 'initialize');
      assert.strictEqual(message.id, 3);
      done();
    });

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });
    const payload = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n${body}`;
    input.write(payload);
  });

  it('単一LF区切り（ヘッダ直後がJSON）のメッセージを受信できる', done => {
    const input = new PassThrough();
    const output = new PassThrough();
    const transport = new StdioJsonRpcTransport(input, output);
    transport.start();

    transport.on('message', message => {
      assert.strictEqual(message.method, 'initialize');
      assert.strictEqual(message.id, 4);
      done();
    });

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });
    const payload = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\n${body}`;
    input.write(payload);
  });
});
