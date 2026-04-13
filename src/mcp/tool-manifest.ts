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
    description: 'TextUIスキーマを返します。jsonPointerで部分取得できます。schema: "navigation" で .tui.flow.yml の JSON Schema を取得できます。',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          enum: ['main', 'template', 'theme', 'navigation']
        },
        jsonPointer: { type: 'string' }
      }
    }
  },
  {
    name: 'validate_flow',
    description: 'Navigation flow DSL file を検証し、diagnostics を返します。',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: '.tui.flow.yml / .tui.flow.yaml file path' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'compare_flow',
    description: 'Navigation flow DSL file を git base/head 間で比較し、machine-readable な flow diff を返します。',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        baseRef: { type: 'string' },
        headRef: { type: 'string' }
      },
      required: ['filePath', 'baseRef', 'headRef']
    }
  },
  {
    name: 'analyze_flow',
    description: 'Navigation flow DSL file を graph-aware に解析し、terminal / reachability 情報を返します。',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        entryId: { type: 'string' },
        screenId: { type: 'string' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'route_flow',
    description: 'Navigation flow DSL file から entry-to-screen または entry-to-terminal route を返します。',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        entryId: { type: 'string' },
        toScreenId: { type: 'string' },
        toTerminalKind: { type: 'string', enum: ['success', 'failure', 'cancel', 'handoff'] }
      },
      required: ['filePath']
    }
  },
  {
    name: 'export_flow',
    description: 'Navigation flow DSL file を flow exporter で出力します。',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        format: { type: 'string', description: 'react-router/react-flow/vue-flow/svelte-flow/html-flow など' },
        outputPath: { type: 'string' }
      },
      required: ['filePath']
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
    name: 'list_providers',
    description: '利用可能なエクスポートprovider一覧を構造化データで返します。',
    inputSchema: {
      type: 'object',
      properties: {
        providerModulePath: {
          type: 'string',
          description: '外部providerモジュールを含めたい場合のパス'
        }
      }
    }
  },
  {
    name: 'inspect_state',
    description: 'TextUI stateファイルを読み取り、現在の同期状態を構造化データで返します。',
    inputSchema: {
      type: 'object',
      properties: {
        statePath: {
          type: 'string',
          description: '対象stateファイルのパス。省略時は既定のstateパス'
        }
      }
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
    name: 'suggest_fix',
    description: 'Finding を受け取り、fixHint と人間可読な修正提案を返します。read-only。DSL を変更しません。',
    inputSchema: {
      type: 'object',
      properties: {
        finding: {
          type: 'object',
          description: 'TextUI Rule の Finding オブジェクト',
          properties: {
            ruleId:      { type: 'string' },
            severity:    { type: 'string', enum: ['error', 'warning', 'info'] },
            message:     { type: 'string' },
            entityPath:  { type: 'string' },
            fixHint:     { type: 'string' },
            tags:        { type: 'array', items: { type: 'string' } }
          },
          required: ['ruleId', 'severity', 'message', 'entityPath']
        }
      },
      required: ['finding']
    }
  },
  {
    name: 'diff_ui',
    description: 'DSL ファイルを git base/head 間で意味差分比較し、DiffResultExternal（schemaVersion: diff-result-external/v1）を返します。read-only。',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: '比較対象の .tui.yml ファイルパス' },
        baseRef:  { type: 'string', description: 'base git ref（例: HEAD~1, main）' },
        headRef:  { type: 'string', description: 'head git ref（例: HEAD）' }
      },
      required: ['filePath', 'baseRef', 'headRef']
    }
  },
  {
    name: 'explain_change',
    description: 'DiffResultExternal の change エントリを受け取り、人間可読な説明（title / description / impact）を返します。read-only。',
    inputSchema: {
      type: 'object',
      properties: {
        change: {
          type: 'object',
          description: 'DiffResultExternal.changes[] の 1 エントリ',
          properties: {
            changeId:    { type: 'string' },
            type:        { type: 'string' },
            componentId: { type: 'string' },
            layer:       { type: 'string' },
            impact:      { type: 'string' },
            humanReadable: {
              type: 'object',
              properties: {
                title:       { type: 'string' },
                description: { type: 'string' }
              }
            }
          },
          required: ['changeId', 'type', 'componentId']
        }
      },
      required: ['change']
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
  },
  {
    name: 'generate_flow',
    description: 'screen IDs と transition hints から .tui.flow.yml DSL を scaffold します。generate_ui と対称形。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'フロータイトル' },
        flowId: { type: 'string', description: 'フロー ID（省略時はタイトルから自動生成）' },
        entry: { type: 'string', description: 'エントリスクリーン ID（省略時は screens[0].id）' },
        screens: {
          type: 'array',
          description: 'スクリーン定義',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              file: { type: 'string', description: '対応する .tui.yml ファイルパス（省略時は {id}.tui.yml）' }
            },
            required: ['id']
          }
        },
        transitions: {
          type: 'array',
          description: '画面遷移定義',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              trigger: { type: 'string' },
              to: { type: 'string' }
            },
            required: ['from', 'trigger', 'to']
          }
        }
      },
      required: ['title', 'screens']
    }
  }
];
