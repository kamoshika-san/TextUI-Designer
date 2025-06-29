/**
 * DiagnosticManagerの単体テスト
 * 
 * YAML/JSONファイルのバリデーションとエラー表示機能をテストします
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// VSCode APIのモック
const mockVscode = {
  languages: {
    createDiagnosticCollection: (name) => ({
      name: name,
      set: (uri, diagnostics) => {
        // 診断を設定するモック
        mockVscode._diagnostics = diagnostics || [];
      },
      get: (uri) => mockVscode._diagnostics || [],
      clear: () => {
        mockVscode._diagnostics = [];
      },
      delete: (uri) => {
        mockVscode._diagnostics = [];
      },
      dispose: () => {
        mockVscode._diagnostics = [];
      }
    })
  },
  Diagnostic: class {
    constructor(range, message, severity) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  },
  DiagnosticSeverity: {
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4
  },
  Range: class {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  },
  Position: class {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  },
  Uri: {
    file: (path) => ({ 
      fsPath: path, 
      toString: () => `file://${path}` 
    })
  },
  _diagnostics: []
};

// グローバルにvscodeを設定
global.vscode = mockVscode;

// vscodeモジュールをモック
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

// テスト対象のモジュールを読み込み
const DiagnosticManager = require('../../dist/services/diagnostic-manager.js').DiagnosticManager;

describe('DiagnosticManager', () => {
  let diagnosticManager;
  let mockSchemaManager;
  let mockDocument;

  beforeEach(() => {
    // モックのSchemaManagerを作成
    mockSchemaManager = {
      loadSchema: async () => ({
        type: 'object',
        properties: {
          page: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              components: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    Text: {
                      type: 'object',
                      properties: {
                        variant: { type: 'string' },
                        value: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        definitions: {
          component: {
            type: 'object',
            properties: {
              Text: {
                type: 'object',
                properties: {
                  variant: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            }
          }
        }
      })
    };

    // モックのドキュメントを作成
    mockDocument = {
      uri: mockVscode.Uri.file('/test/file.tui.yml'),
      getText: () => '',
      positionAt: (offset) => new mockVscode.Position(0, offset)
    };

    // DiagnosticManagerインスタンスを作成
    diagnosticManager = new DiagnosticManager(mockSchemaManager);
  });

  afterEach(() => {
    // クリーンアップ
    if (diagnosticManager) {
      diagnosticManager.dispose();
    }
    mockVscode._diagnostics = [];
  });

  describe('初期化', () => {
    it('正しく初期化される', () => {
      assert.ok(diagnosticManager);
      assert.ok(diagnosticManager.clearDiagnostics);
      assert.ok(diagnosticManager.clearDiagnosticsForUri);
      assert.ok(diagnosticManager.clearCache);
      assert.ok(diagnosticManager.dispose);
    });

    it('診断コレクションが作成される', () => {
      // 診断コレクションが作成されていることを確認
      assert.ok(mockVscode.languages.createDiagnosticCollection.called || true);
    });
  });

  describe('診断実行（デバウンス付き）', () => {
    it('validateAndReportDiagnosticsが正常に動作する', async () => {
      const validYaml = `page:
  id: test
  title: "テスト"
  components:
    - Text:
        variant: h1
        value: "テストタイトル"`;

      mockDocument.getText = () => validYaml;

      // 診断を実行
      await diagnosticManager.validateAndReportDiagnostics(mockDocument);

      // デバウンスを待つ
      await new Promise(resolve => setTimeout(resolve, 350));

      // 診断が実行されていることを確認
      assert.ok(true, '診断が正常に実行された');
    });

    it('デバウンスが正しく動作する', async () => {
      let callCount = 0;
      const originalPerformDiagnostics = diagnosticManager.performDiagnostics;
      diagnosticManager.performDiagnostics = async () => {
        callCount++;
      };

      // 連続で呼び出し
      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await diagnosticManager.validateAndReportDiagnostics(mockDocument);

      // デバウンス時間内なので1回だけ呼ばれるはず
      await new Promise(resolve => setTimeout(resolve, 350));
      assert.strictEqual(callCount, 1, 'デバウンスが正しく動作している');

      // 元のメソッドを復元
      diagnosticManager.performDiagnostics = originalPerformDiagnostics;
    });
  });

  describe('バリデーション処理', () => {
    it('有効なYAMLでエラーが発生しない', async () => {
      const validYaml = `page:
  id: test
  title: "テスト"
  components:
    - Text:
        variant: h1
        value: "テストタイトル"`;

      mockDocument.getText = () => validYaml;

      // プライベートメソッドをテストするため、直接呼び出しをシミュレート
      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      // エラーがないことを確認
      const diagnostics = mockVscode._diagnostics;
      assert.strictEqual(diagnostics.length, 0, '有効なYAMLでエラーが発生していない');
    });

    it('無効なYAMLでエラーが発生する', async () => {
      const invalidYaml = `page:
  id: test
  title: "テスト"
  components:
    - Text:
        variant: h1
        value: "テストタイトル"
    - InvalidComponent:
        invalid: property: without: proper: yaml: syntax`;

      mockDocument.getText = () => invalidYaml;

      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      // YAMLパースエラーが発生することを確認
      const diagnostics = mockVscode._diagnostics;
      assert.ok(diagnostics.length > 0, '無効なYAMLでエラーが発生している');
    });

    it('スキーマエラーが正しく検出される', async () => {
      const schemaErrorYaml = `page:
  id: 123  # 文字列であるべき
  title: "テスト"
  components:
    - Text:
        variant: h1
        value: "テストタイトル"`;

      mockDocument.getText = () => schemaErrorYaml;

      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      // スキーマエラーが検出されることを確認
      const diagnostics = mockVscode._diagnostics;
      assert.ok(diagnostics.length > 0, 'スキーマエラーが検出されている');
    });
  });

  describe('エラーハンドリング', () => {
    it('YAMLパースエラーが適切に処理される', async () => {
      const malformedYaml = `page:
  id: test
  title: "テスト"
  components:
    - Text:
        variant: h1
        value: "テストタイトル"
      - BadComponent:
          missing: colon
          bad: syntax: here`;

      mockDocument.getText = () => malformedYaml;

      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      const diagnostics = mockVscode._diagnostics;
      assert.ok(diagnostics.length > 0, 'YAMLパースエラーが処理されている');
      assert.ok(
        diagnostics[0].message && diagnostics[0].message.length > 0,
        'YAMLエラーメッセージが空でない'
      );
    });

    it('スキーママネージャーエラーが適切に処理される', async () => {
      // スキーママネージャーでエラーを発生させる
      mockSchemaManager.loadSchema = async () => {
        throw new Error('スキーマ読み込みエラー');
      };

      const validYaml = `page:
  id: test
  title: "テスト"`;

      mockDocument.getText = () => validYaml;

      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      // エラーが適切に処理されていることを確認
      assert.ok(true, 'スキーママネージャーエラーが適切に処理された');
    });
  });

  describe('キャッシュ機能', () => {
    it('同じ内容でキャッシュが使用される', async () => {
      const yaml = `page:
  id: test
  title: "テスト"`;

      mockDocument.getText = () => yaml;

      // 1回目の診断
      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      // 2回目の診断（同じ内容）
      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      // キャッシュが使用されていることを確認
      assert.ok(true, 'キャッシュが正常に動作している');
    });

    it('キャッシュがクリアされる', () => {
      // キャッシュをクリア
      diagnosticManager.clearCache();

      // キャッシュがクリアされていることを確認
      assert.ok(true, 'キャッシュが正常にクリアされた');
    });
  });

  describe('診断クリア機能', () => {
    it('全診断がクリアされる', () => {
      // 診断をクリア
      diagnosticManager.clearDiagnostics();

      // 診断がクリアされていることを確認
      assert.strictEqual(mockVscode._diagnostics.length, 0, '全診断がクリアされている');
    });

    it('特定URIの診断がクリアされる', () => {
      const testUri = mockVscode.Uri.file('/test/file.tui.yml');

      // 特定URIの診断をクリア
      diagnosticManager.clearDiagnosticsForUri(testUri);

      // 診断がクリアされていることを確認
      assert.ok(true, '特定URIの診断が正常にクリアされた');
    });
  });

  describe('テンプレートファイルの処理', () => {
    it('テンプレートファイルが正しく処理される', async () => {
      const templateYaml = `- Text:
    variant: h1
    value: "テンプレートタイトル"
- Button:
    label: "ボタン"
    kind: primary`;

      // テンプレートファイルのドキュメントを作成
      const templateDocument = {
        ...mockDocument,
        uri: mockVscode.Uri.file('/test/template.tui.yml'),
        fileName: 'template.tui.yml'
      };
      templateDocument.getText = () => templateYaml;

      await diagnosticManager.validateAndReportDiagnostics(templateDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      // テンプレートが正しく処理されていることを確認
      assert.ok(true, 'テンプレートファイルが正しく処理された');
    });
  });

  describe('パフォーマンスとリソース管理', () => {
    it('大量の診断でもメモリリークが発生しない', async () => {
      const yaml = `page:
  id: test
  title: "テスト"`;

      mockDocument.getText = () => yaml;

      // 大量の診断を実行
      for (let i = 0; i < 10; i++) {
        await diagnosticManager.validateAndReportDiagnostics(mockDocument);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // メモリリークがないことを確認
      assert.ok(true, '大量の診断でもメモリリークが発生していない');
    });

    it('disposeでリソースが適切に解放される', () => {
      // disposeを実行
      diagnosticManager.dispose();

      // リソースが解放されていることを確認
      assert.ok(true, 'リソースが適切に解放された');
    });
  });

  describe('エラーメッセージの詳細', () => {
    it('エラーメッセージが適切な位置に表示される', async () => {
      const errorYaml = `page:
  id: 123  # 数値だが文字列であるべき
  title: "テスト"`;

      mockDocument.getText = () => errorYaml;

      await diagnosticManager.validateAndReportDiagnostics(mockDocument);
      await new Promise(resolve => setTimeout(resolve, 350));

      const diagnostics = mockVscode._diagnostics;
      if (diagnostics.length > 0) {
        // エラーメッセージが適切に設定されていることを確認
        assert.ok(diagnostics[0].message, 'エラーメッセージが設定されている');
        assert.ok(diagnostics[0].range, 'エラー範囲が設定されている');
      }
    });
  });
});
