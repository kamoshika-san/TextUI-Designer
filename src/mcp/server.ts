import { StdioJsonRpcTransport, type JsonRpcMessage, type JsonRpcRequest, type JsonRpcResponse } from './stdio-jsonrpc';
import * as path from 'path';
import { CliRunner, type CliRunResponse } from './cli-runner';
import { TOOLS } from './tool-manifest';
import { createToolHandlers } from './tools/tool-handlers';

const SERVER_INFO = {
  name: 'textui-designer-mcp',
  version: '0.1.0'
} as const;

const RESOURCE_DEFINITIONS = [
  {
    uri: 'textui://schema/main',
    name: 'TextUI Main Schema',
    description: 'DSL本体のJSON Schema',
    mimeType: 'application/json'
  },
  {
    uri: 'textui://schema/template',
    name: 'TextUI Template Schema',
    description: 'テンプレート定義のJSON Schema',
    mimeType: 'application/json'
  },
  {
    uri: 'textui://schema/theme',
    name: 'TextUI Theme Schema',
    description: 'テーマ定義のJSON Schema',
    mimeType: 'application/json'
  },
  {
    uri: 'textui://components/catalog',
    name: 'TextUI Components Catalog',
    description: '利用可能コンポーネント一覧',
    mimeType: 'application/json'
  },
  {
    uri: 'textui://cli/run',
    name: 'TextUI CLI Runner Resource',
    description: 'resource-onlyクライアント向け。queryでCLIを実行します（args/cwd/timeoutMs/parseJson）。',
    mimeType: 'application/json'
  }
] as const;

const PROMPT_DEFINITIONS = [
  {
    name: 'design_screen',
    description: '要件からTextUI DSLを設計するための指示テンプレート'
  },
  {
    name: 'fix_validation_error',
    description: '診断結果からDSL修正案を作るための指示テンプレート'
  }
] as const;

type RequestHandler = (params: unknown) => Promise<unknown>;


export class TextUiMcpServer {
  private coreEnginePromise: Promise<import('../core/textui-core-engine').TextUICoreEngine> | null = null;
  private catalogPromise: Promise<ReturnType<typeof import('../core/component-catalog').getTextUiComponentCatalog>> | null = null;
  private readonly cliRunner: CliRunner;
  private readonly requestHandlers: Record<string, RequestHandler>;

  constructor() {
    this.cliRunner = new CliRunner();
    this.requestHandlers = {
      initialize: params => this.handleInitialize(params),
      ping: async () => ({}),
      'tools/list': async () => ({ tools: TOOLS }),
      'tools/call': params => this.handleToolCall(params),
      'resources/list': async () => ({ resources: RESOURCE_DEFINITIONS }),
      'resources/read': params => this.handleResourcesRead(params),
      'prompts/list': async () => ({ prompts: PROMPT_DEFINITIONS }),
      'prompts/get': params => this.handlePromptsGet(params)
    };
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

  private async handleInitialize(params: unknown): Promise<unknown> {
    const protocolVersion = this.getObjectValue(params, 'protocolVersion') ?? '2024-11-05';
    return {
      protocolVersion,
      capabilities: {
        tools: {
          listChanged: false
        },
        resources: {
          subscribe: false,
          listChanged: false
        },
        prompts: {
          listChanged: false
        }
      },
      serverInfo: SERVER_INFO
    };
  }

  private async handleResourcesRead(params: unknown): Promise<unknown> {
    const uri = this.getObjectValue(params, 'uri');
    if (!uri) {
      throw new Error('resources/read requires uri');
    }

    const payload = await this.readResource(uri);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(payload, null, 2)
        }
      ]
    };
  }

  private async handlePromptsGet(params: unknown): Promise<unknown> {
    const name = this.getObjectValue(params, 'name');
    const argumentsValue = this.getObject(params, 'arguments');
    if (!name) {
      throw new Error('prompts/get requires name');
    }
    return this.getPrompt(name, argumentsValue);
  }

  private async handleToolCall(params: unknown): Promise<unknown> {
    const name = this.getObjectValue(params, 'name');
    const args = this.getObject(params, 'arguments');
    if (!name) {
      throw new Error('tools/call requires name');
    }

    const toolHandlers = createToolHandlers({
      engine: await this.getCoreEngine(),
      args,
      getObjectValue: this.getObjectValue.bind(this),
      getObjectUnknown: this.getObjectUnknown.bind(this),
      getObjectBoolean: this.getObjectBoolean.bind(this),
      getObjectArray: this.getObjectArray.bind(this),
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
    const dslFile = this.getObjectValue(args, 'dslFile');
    if (!dslFile) {
      throw new Error('capture_preview requires dslFile');
    }

    const cliArgs: string[] = ['capture', '--file', dslFile, '--json'];
    const output = this.getObjectValue(args, 'output');
    const themePath = this.getObjectValue(args, 'themePath');
    const width = this.getObjectNumber(args, 'width');
    const height = this.getObjectNumber(args, 'height');
    const scale = this.getObjectNumber(args, 'scale');
    const waitMs = this.getObjectNumber(args, 'waitMs');
    if (output) {
      cliArgs.push('--output', output);
    }
    if (themePath) {
      cliArgs.push('--theme', themePath);
    }
    if (width !== undefined) {
      cliArgs.push('--width', String(width));
    }
    if (height !== undefined) {
      cliArgs.push('--height', String(height));
    }
    if (scale !== undefined) {
      cliArgs.push('--scale', String(scale));
    }
    if (waitMs !== undefined) {
      cliArgs.push('--wait-ms', String(waitMs));
    }

    const response = await this.runCli({
      args: cliArgs,
      cwd: this.getObjectValue(args, 'cwd'),
      timeoutMs: this.getObjectNumber(args, 'timeoutMs'),
      parseJson: true
    });

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
      const request = this.parseCliResourceUri(uri);
      return this.runCli(request);
    }
    throw new Error(`Unknown resource uri: ${uri}`);
  }

  private parseCliResourceUri(uri: string): Record<string, unknown> {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new Error(`invalid cli resource uri: ${uri}`);
    }

    const argsParam = parsed.searchParams.get('args');
    if (!argsParam) {
      throw new Error('cli resource requires args query param');
    }

    let args: unknown;
    try {
      args = JSON.parse(argsParam);
    } catch {
      throw new Error('cli resource args must be JSON string array');
    }
    if (!Array.isArray(args) || !args.every(item => typeof item === 'string')) {
      throw new Error('cli resource args must be JSON string array');
    }

    const request: Record<string, unknown> = {
      args
    };
    const cwd = parsed.searchParams.get('cwd');
    if (cwd) {
      request.cwd = cwd;
    }
    const timeoutMsRaw = parsed.searchParams.get('timeoutMs');
    if (timeoutMsRaw) {
      const timeoutMs = Number(timeoutMsRaw);
      if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
        throw new Error(`invalid timeoutMs: ${timeoutMsRaw}`);
      }
      request.timeoutMs = timeoutMs;
    }
    const parseJsonRaw = parsed.searchParams.get('parseJson');
    if (parseJsonRaw) {
      request.parseJson = parseJsonRaw !== 'false';
    }
    return request;
  }

  private getPrompt(name: string, args: Record<string, unknown>): unknown {
    if (name === 'design_screen') {
      const requirements = typeof args.requirements === 'string'
        ? args.requirements
        : '要件未指定';

      return {
        description: '画面要件からTextUI DSLを作るプロンプト',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `以下の要件に基づいてTextUI DSLを設計してください。\n要件:\n${requirements}\n\n手順:\n1) list_componentsで使える部品を確認\n2) generate_uiで最初のDSLを作成\n3) validate_uiで検証し、必要ならexplain_errorで修正方針を作る`
            }
          }
        ]
      };
    }

    if (name === 'fix_validation_error') {
      const diagnostics = typeof args.diagnostics === 'string'
        ? args.diagnostics
        : '[]';
      return {
        description: '検証エラーの修正支援プロンプト',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `次の診断を原因別に分類し、最小修正パッチを提案してください。\n${diagnostics}`
            }
          }
        ]
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  }

  private async runCli(args: Record<string, unknown>): Promise<CliRunResponse> {
    const rawArgs = this.getObjectStringArray(args, 'args');
    if (!rawArgs || rawArgs.length === 0) {
      throw new Error('run_cli requires args (string[])');
    }
    return this.cliRunner.run({
      args: rawArgs,
      cwd: this.getObjectValue(args, 'cwd'),
      timeoutMs: this.getObjectNumber(args, 'timeoutMs'),
      parseJson: this.getObjectBoolean(args, 'parseJson')
    });
  }

  private getObject(value: unknown, key: string): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const candidate = (value as Record<string, unknown>)[key];
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return {};
    }
    return candidate as Record<string, unknown>;
  }

  private getObjectArray(value: Record<string, unknown>, key: string): Array<Record<string, unknown>> | undefined {
    const candidate = value[key];
    if (!Array.isArray(candidate)) {
      return undefined;
    }
    return candidate.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as Array<Record<string, unknown>>;
  }

  private getObjectValue(value: unknown, key: string): string | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const candidate = (value as Record<string, unknown>)[key];
    return typeof candidate === 'string' ? candidate : undefined;
  }

  private getObjectBoolean(value: Record<string, unknown>, key: string): boolean | undefined {
    const candidate = value[key];
    return typeof candidate === 'boolean' ? candidate : undefined;
  }

  private getObjectNumber(value: Record<string, unknown>, key: string): number | undefined {
    const candidate = value[key];
    return typeof candidate === 'number' ? candidate : undefined;
  }

  private getObjectStringArray(value: Record<string, unknown>, key: string): string[] | undefined {
    const candidate = value[key];
    if (!Array.isArray(candidate)) {
      return undefined;
    }
    if (!candidate.every(item => typeof item === 'string')) {
      return undefined;
    }
    return candidate as string[];
  }

  private getObjectUnknown(value: Record<string, unknown>, key: string): unknown {
    return value[key];
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
