import type { ComponentBlueprint } from '../core/textui-core-engine';
import { StdioJsonRpcTransport, type JsonRpcMessage, type JsonRpcRequest, type JsonRpcResponse } from './stdio-jsonrpc';
import * as path from 'path';
import { spawn } from 'child_process';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const SERVER_INFO = {
  name: 'textui-designer-mcp',
  version: '0.1.0'
} as const;

const CLI_SUPPORTED_ROOT_COMMANDS = new Set([
  'validate',
  'plan',
  'apply',
  'export',
  'capture',
  'import',
  'state',
  'providers',
  'version',
  'help',
  '--help',
  '-h'
]);

const TOOLS: ToolDefinition[] = [
  {
    name: 'generate_ui',
    description: 'コンポーネント定義からTextUI DSLを生成し、必要ならコードへ変換します。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '画面タイトル' },
        pageId: { type: 'string', description: 'ページID(省略時はタイトルから自動生成)' },
        layout: { type: 'string', description: 'レイアウト名(例: vertical)' },
        components: {
          type: 'array',
          description: 'コンポーネント青写真',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              props: { type: 'object' },
              components: { type: 'array' },
              fields: { type: 'array' },
              actions: { type: 'array' },
              items: { type: 'array' }
            },
            required: ['type']
          }
        },
        format: { type: 'string', description: 'html/react/pug/vue/svelteなど' },
        providerModulePath: { type: 'string', description: '外部providerモジュールパス' }
      },
      required: ['title']
    }
  },
  {
    name: 'validate_ui',
    description: 'YAML/JSON DSLを検証し、診断と修正ヒントを返します。',
    inputSchema: {
      type: 'object',
      properties: {
        dsl: {
          oneOf: [
            { type: 'string' },
            { type: 'object' }
          ]
        },
        sourcePath: { type: 'string' },
        skipTokenValidation: { type: 'boolean' }
      },
      required: ['dsl']
    }
  },
  {
    name: 'explain_error',
    description: '診断結果を短い原因説明と修正候補に要約します。',
    inputSchema: {
      type: 'object',
      properties: {
        diagnostics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string' },
              path: { type: 'string' },
              message: { type: 'string' }
            },
            required: ['message']
          }
        }
      },
      required: ['diagnostics']
    }
  },
  {
    name: 'preview_schema',
    description: 'TextUIスキーマを返します。jsonPointerで部分取得できます。',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          enum: ['main', 'template', 'theme']
        },
        jsonPointer: { type: 'string' }
      }
    }
  },
  {
    name: 'list_components',
    description: '利用可能なTextUIコンポーネント一覧を返します。',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'run_cli',
    description: 'TextUI CLIコマンドをMCP経由で実行します（validate/plan/apply/export/capture/import/state/providers/version対応）。',
    inputSchema: {
      type: 'object',
      properties: {
        args: {
          type: 'array',
          description: 'textui のサブコマンド以降の引数配列。例: ["validate", "--file", "sample.tui.yml", "--json"]',
          items: { type: 'string' }
        },
        cwd: {
          type: 'string',
          description: 'CLIを実行するカレントディレクトリ。省略時はMCPサーバープロセスのcwd。'
        },
        timeoutMs: {
          type: 'number',
          description: 'CLI実行タイムアウト(ms)。省略時は120000。'
        },
        parseJson: {
          type: 'boolean',
          description: 'stdoutをJSONとして解析して返す（既定: true）。'
        }
      },
      required: ['args']
    }
  },
  {
    name: 'capture_preview',
    description: 'DSLファイルからプレビュー画像(PNG)を生成します。',
    inputSchema: {
      type: 'object',
      properties: {
        dslFile: {
          type: 'string',
          description: '対象の .tui.yml / .tui.yaml ファイルパス'
        },
        output: {
          type: 'string',
          description: '出力PNGファイルパス'
        },
        cwd: {
          type: 'string',
          description: '相対パス解決に使うカレントディレクトリ'
        },
        width: {
          type: 'number',
          description: 'キャプチャ幅(px)'
        },
        height: {
          type: 'number',
          description: 'キャプチャ高さ(px)'
        },
        scale: {
          type: 'number',
          description: 'device scale factor'
        },
        waitMs: {
          type: 'number',
          description: '描画待機時間(ms)'
        },
        timeoutMs: {
          type: 'number',
          description: 'CLI実行タイムアウト(ms)。省略時120000'
        }
      },
      required: ['dslFile']
    }
  }
];

export class TextUiMcpServer {
  private coreEnginePromise: Promise<import('../core/textui-core-engine').TextUICoreEngine> | null = null;
  private catalogPromise: Promise<ReturnType<typeof import('../core/component-catalog').getTextUiComponentCatalog>> | null = null;

  constructor() {}

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
    if (method === 'initialize') {
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

    if (method === 'ping') {
      return {};
    }

    if (method === 'tools/list') {
      return {
        tools: TOOLS
      };
    }

    if (method === 'tools/call') {
      return this.handleToolCall(params);
    }

    if (method === 'resources/list') {
      return {
        resources: [
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
        ]
      };
    }

    if (method === 'resources/read') {
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

    if (method === 'prompts/list') {
      return {
        prompts: [
          {
            name: 'design_screen',
            description: '要件からTextUI DSLを設計するための指示テンプレート'
          },
          {
            name: 'fix_validation_error',
            description: '診断結果からDSL修正案を作るための指示テンプレート'
          }
        ]
      };
    }

    if (method === 'prompts/get') {
      const name = this.getObjectValue(params, 'name');
      const argumentsValue = this.getObject(params, 'arguments');
      if (!name) {
        throw new Error('prompts/get requires name');
      }
      return this.getPrompt(name, argumentsValue);
    }

    throw new Error(`Method not found: ${method}`);
  }

  private async handleToolCall(params: unknown): Promise<unknown> {
    const name = this.getObjectValue(params, 'name');
    const args = this.getObject(params, 'arguments');
    if (!name) {
      throw new Error('tools/call requires name');
    }

    const engine = await this.getCoreEngine();
    let structuredContent: unknown;
    if (name === 'generate_ui') {
      structuredContent = await engine.generateUi({
        title: this.getObjectValue(args, 'title') ?? '',
        pageId: this.getObjectValue(args, 'pageId'),
        layout: this.getObjectValue(args, 'layout'),
        components: this.getObjectArray(args, 'components') as unknown as ComponentBlueprint[] | undefined,
        format: this.getObjectValue(args, 'format'),
        providerModulePath: this.getObjectValue(args, 'providerModulePath')
      });
    } else if (name === 'validate_ui') {
      const rawDsl = this.getObjectUnknown(args, 'dsl');
      if (rawDsl === undefined) {
        throw new Error('validate_ui requires dsl');
      }
      structuredContent = engine.validateUi({
        dsl: (rawDsl as string | Record<string, unknown>),
        sourcePath: this.getObjectValue(args, 'sourcePath'),
        skipTokenValidation: this.getObjectBoolean(args, 'skipTokenValidation')
      });
    } else if (name === 'explain_error') {
      const diagnostics = this.getObjectUnknown(args, 'diagnostics');
      if (!Array.isArray(diagnostics)) {
        throw new Error('explain_error requires diagnostics');
      }
      structuredContent = engine.explainError({
        diagnostics: diagnostics
          .filter(item => item && typeof item === 'object')
          .map(item => {
            const value = item as Record<string, unknown>;
            return {
              message: typeof value.message === 'string' ? value.message : 'unknown error',
              path: typeof value.path === 'string' ? value.path : '/',
              level: value.level === 'warning' ? 'warning' : 'error'
            };
          })
      });
    } else if (name === 'preview_schema') {
      structuredContent = engine.previewSchema({
        schema: (this.getObjectValue(args, 'schema') as 'main' | 'template' | 'theme' | undefined),
        jsonPointer: this.getObjectValue(args, 'jsonPointer')
      });
    } else if (name === 'list_components') {
      structuredContent = await engine.listComponents();
    } else if (name === 'run_cli') {
      structuredContent = await this.runCli(args);
    } else if (name === 'capture_preview') {
      structuredContent = await this.capturePreview(args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

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

  private async capturePreview(args: Record<string, unknown>): Promise<{
    command: string;
    cwd: string;
    exitCode: number;
    timedOut: boolean;
    stdout: string;
    stderr: string;
    parsedJson?: unknown;
  }> {
    const dslFile = this.getObjectValue(args, 'dslFile');
    if (!dslFile) {
      throw new Error('capture_preview requires dslFile');
    }

    const cliArgs: string[] = ['capture', '--file', dslFile, '--json'];
    const output = this.getObjectValue(args, 'output');
    const width = this.getObjectNumber(args, 'width');
    const height = this.getObjectNumber(args, 'height');
    const scale = this.getObjectNumber(args, 'scale');
    const waitMs = this.getObjectNumber(args, 'waitMs');
    if (output) {
      cliArgs.push('--output', output);
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

  private async runCli(args: Record<string, unknown>): Promise<{
    command: string;
    cwd: string;
    exitCode: number;
    timedOut: boolean;
    stdout: string;
    stderr: string;
    parsedJson?: unknown;
  }> {
    const rawArgs = this.getObjectStringArray(args, 'args');
    if (!rawArgs || rawArgs.length === 0) {
      throw new Error('run_cli requires args (string[])');
    }

    const rootCommand = rawArgs[0];
    if (!CLI_SUPPORTED_ROOT_COMMANDS.has(rootCommand)) {
      throw new Error(`run_cli unsupported command: ${rootCommand}`);
    }
    if (rootCommand === 'capture' && hasForbiddenCaptureArg(rawArgs)) {
      throw new Error('run_cli capture does not allow --browser or --allow-no-sandbox via MCP');
    }

    const cwdArg = this.getObjectValue(args, 'cwd');
    const cwd = cwdArg ? path.resolve(cwdArg) : process.cwd();
    const timeoutMs = this.getObjectNumber(args, 'timeoutMs') ?? 120000;
    const parseJson = this.getObjectBoolean(args, 'parseJson') ?? true;
    const cliEntry = path.resolve(__dirname, '../cli/index.js');
    const nodeArgs = [cliEntry, ...rawArgs];

    const { code, stdout, stderr, timedOut } = await new Promise<{
      code: number;
      stdout: string;
      stderr: string;
      timedOut: boolean;
    }>((resolve, reject) => {
      const child = spawn(process.execPath, nodeArgs, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let timeoutHandle: NodeJS.Timeout | undefined;

      if (timeoutMs > 0) {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, timeoutMs);
      }

      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('error', error => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        reject(error);
      });
      child.on('close', code => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        resolve({
          code: code ?? (timedOut ? 124 : 1),
          stdout,
          stderr,
          timedOut
        });
      });
    });

    const response: {
      command: string;
      cwd: string;
      exitCode: number;
      timedOut: boolean;
      stdout: string;
      stderr: string;
      parsedJson?: unknown;
    } = {
      command: `textui ${rawArgs.join(' ')}`.trim(),
      cwd,
      exitCode: code,
      timedOut,
      stdout,
      stderr
    };

    if (parseJson) {
      const trimmed = stdout.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          response.parsedJson = JSON.parse(trimmed) as unknown;
        } catch {
          // 非JSON出力の場合はparsedJsonを未設定のまま返す
        }
      }
    }

    return response;
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

function hasForbiddenCaptureArg(args: string[]): boolean {
  return args.some(arg =>
    arg === '--browser'
    || arg.startsWith('--browser=')
    || arg === '--allow-no-sandbox'
  );
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
