export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const TOOLS: ToolDefinition[] = [
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
        providerModulePath: { type: 'string', description: '外部providerモジュールパス' },
        themePath: { type: 'string', description: 'HTML出力時に適用するテーマファイルパス' }
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
        themePath: {
          type: 'string',
          description: '適用するテーマファイルパス（CLIの --theme に相当）'
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
