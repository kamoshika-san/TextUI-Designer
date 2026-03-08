import { TextUICoreEngine, type ComponentBlueprint } from '../core/textui-core-engine';
import { getTextUiComponentCatalog } from '../core/component-catalog';
import { StdioJsonRpcTransport, type JsonRpcMessage, type JsonRpcRequest, type JsonRpcResponse } from './stdio-jsonrpc';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const SERVER_INFO = {
  name: 'textui-designer-mcp',
  version: '0.1.0'
} as const;

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
  }
];

export class TextUiMcpServer {
  private readonly coreEngine: TextUICoreEngine;

  constructor(coreEngine: TextUICoreEngine = new TextUICoreEngine()) {
    this.coreEngine = coreEngine;
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

    let structuredContent: unknown;
    if (name === 'generate_ui') {
      structuredContent = await this.coreEngine.generateUi({
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
      structuredContent = this.coreEngine.validateUi({
        dsl: (rawDsl as string | Record<string, unknown>),
        sourcePath: this.getObjectValue(args, 'sourcePath'),
        skipTokenValidation: this.getObjectBoolean(args, 'skipTokenValidation')
      });
    } else if (name === 'explain_error') {
      const diagnostics = this.getObjectUnknown(args, 'diagnostics');
      if (!Array.isArray(diagnostics)) {
        throw new Error('explain_error requires diagnostics');
      }
      structuredContent = this.coreEngine.explainError({
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
      structuredContent = this.coreEngine.previewSchema({
        schema: (this.getObjectValue(args, 'schema') as 'main' | 'template' | 'theme' | undefined),
        jsonPointer: this.getObjectValue(args, 'jsonPointer')
      });
    } else if (name === 'list_components') {
      structuredContent = await this.coreEngine.listComponents();
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

  private async readResource(uri: string): Promise<unknown> {
    if (uri === 'textui://schema/main') {
      return this.coreEngine.previewSchema({ schema: 'main' });
    }
    if (uri === 'textui://schema/template') {
      return this.coreEngine.previewSchema({ schema: 'template' });
    }
    if (uri === 'textui://schema/theme') {
      return this.coreEngine.previewSchema({ schema: 'theme' });
    }
    if (uri === 'textui://components/catalog') {
      return {
        components: getTextUiComponentCatalog()
      };
    }
    throw new Error(`Unknown resource uri: ${uri}`);
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
