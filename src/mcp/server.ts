import { StdioJsonRpcTransport, type JsonRpcMessage, type JsonRpcRequest, type JsonRpcResponse } from './stdio-jsonrpc';
import { CliRunner, type CliRunResponse } from './cli-runner';
import { createToolHandlers } from './tools/tool-handlers';
import {
  getObject,
  getObjectArray,
  getObjectBoolean,
  getObjectNumber,
  getObjectStringArray,
  getObjectUnknown,
  getObjectValue,
  parseCliResourceUri,
  requireStringParam
} from './params';
import { createRequestHandlers, type RequestHandler } from './request-handlers';
import { resolvePrompt } from './registry';
import { mapCapturePreviewRequest } from './tools/capture-preview-mapper';
import { toCapturePreviewCliArgs } from './tools/capture-preview-cli-adapter';

export class TextUiMcpServer {
  private coreEnginePromise: Promise<import('../core/textui-core-engine').TextUICoreEngine> | null = null;
  private catalogPromise: Promise<ReturnType<typeof import('../core/component-catalog').getTextUiComponentCatalog>> | null = null;
  private readonly cliRunner: CliRunner;
  private readonly requestHandlers: Record<string, RequestHandler>;

  constructor() {
    this.cliRunner = new CliRunner();
    this.requestHandlers = createRequestHandlers({
      handleToolCall: this.handleToolCall.bind(this),
      readResource: this.readResource.bind(this),
      resolvePrompt
    });
  }

  private async getCoreEngine(): Promise<import('../core/textui-core-engine').TextUICoreEngine> {
    if (!this.coreEnginePromise) {
      this.coreEnginePromise = import('../core/textui-core-engine').then(m => new m.TextUICoreEngine());
    }
    return this.coreEnginePromise;
  }

  private async getCatalog(): Promise<ReturnType<typeof import('../core/component-catalog').getTextUiComponentCatalog>> {
    if (!this.catalogPromise) {
      this.catalogPromise = import('../core/component-catalog').then(m => m.getTextUiComponentCatalog());
    }
    return this.catalogPromise;
  }

  async handleMessage(message: JsonRpcMessage): Promise<JsonRpcResponse | undefined> {
    if (!('method' in message) || typeof message.method !== 'string') {
      return undefined;
    }

    const request = message as JsonRpcRequest;
    const hasId = Object.prototype.hasOwnProperty.call(request, 'id');
    if (!hasId) {
      return undefined;
    }

    try {
      const result = await this.dispatch(request.method, request.params);
      return {
        jsonrpc: '2.0',
        id: request.id ?? null,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private async dispatch(method: string, params: unknown): Promise<unknown> {
    const handler = this.requestHandlers[method];
    if (!handler) {
      throw new Error(`Method not found: ${method}`);
    }
    return handler(params);
  }

  private async handleToolCall(params: unknown): Promise<unknown> {
    const name = requireStringParam(params, 'name', 'tools/call requires name');
    const args = getObject(params, 'arguments') ?? {};

    const toolHandlers = createToolHandlers({
      engine: await this.getCoreEngine(),
      args,
      getObjectValue,
      getObjectUnknown,
      getObjectBoolean,
      getObjectArray,
      runCli: this.runCli.bind(this),
      capturePreview: this.capturePreview.bind(this)
    });
    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const structuredContent = await handler();
    return {
      structuredContent,
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredContent, null, 2)
        }
      ]
    };
  }

  private async capturePreview(args: Record<string, unknown>): Promise<CliRunResponse> {
    const request = mapCapturePreviewRequest(args);
    const response = await this.runCli(toCapturePreviewCliArgs(request));

    if (response.exitCode !== 0) {
      throw new Error(`capture_preview failed: ${response.stderr || response.stdout}`.trim());
    }

    return response;
  }

  private async readResource(uri: string): Promise<unknown> {
    const engine = await this.getCoreEngine();
    if (uri === 'textui://schema/main') {
      return engine.previewSchema({ schema: 'main' });
    }
    if (uri === 'textui://schema/template') {
      return engine.previewSchema({ schema: 'template' });
    }
    if (uri === 'textui://schema/theme') {
      return engine.previewSchema({ schema: 'theme' });
    }
    if (uri === 'textui://components/catalog') {
      return {
        components: await this.getCatalog()
      };
    }
    if (uri.startsWith('textui://cli/run')) {
      const request = parseCliResourceUri(uri);
      return this.runCli(request);
    }
    throw new Error(`Unknown resource uri: ${uri}`);
  }

  private async runCli(args: Record<string, unknown>): Promise<CliRunResponse> {
    const rawArgs = getObjectStringArray(args, 'args');
    return this.cliRunner.run({
      args: rawArgs,
      cwd: getObjectValue(args, 'cwd'),
      timeoutMs: getObjectNumber(args, 'timeoutMs'),
      parseJson: getObjectBoolean(args, 'parseJson')
    });
  }
}

export function runMcpServer(): void {
  const transport = new StdioJsonRpcTransport(process.stdin, process.stdout);
  const server = new TextUiMcpServer();

  transport.on('message', async (message: JsonRpcMessage) => {
    const response = await server.handleMessage(message);
    if (response) {
      transport.send(response);
    }
  });

  transport.on('error', error => {
    process.stderr.write(`[textui-mcp] ${error instanceof Error ? error.message : String(error)}\n`);
  });

  transport.start();
}

if (require.main === module) {
  runMcpServer();
}
