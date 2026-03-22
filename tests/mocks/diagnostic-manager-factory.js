/**
 * DiagnosticManager用のファクトリ
 * SchemaManagerとVSCode診断APIのモックを含む
 */

class DiagnosticManagerFactory {
  static createForTest(vscode, options = {}) {
    // デフォルト設定
    const defaultOptions = {
      enableCache: true,
      maxCacheSize: 100,
      cacheTTL: 300000,
      enablePerformanceMonitoring: true,
      ...options
    };

    // Mock SchemaManagerを作成（実際のDiagnosticManagerに合わせる）
    const createMainSchema = () => ({
      type: 'object',
      additionalProperties: false,
      properties: {
        page: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            layout: {
              type: 'string',
              enum: ['vertical', 'horizontal']
            },
            components: {
              type: 'array',
              items: {
                type: 'object'
              }
            }
          },
          required: ['id', 'title', 'layout']
        }
      },
      required: ['page']
    });
    const createTemplateSchema = () => ({
      type: 'array',
      items: { type: 'object' }
    });
    const createThemeSchema = () => ({
      type: 'object',
      properties: {
        theme: {
          type: 'object',
          properties: {
            tokens: { type: 'object' },
            components: { type: 'object' }
          }
        }
      }
    });

    const mockSchemaManager = {
      loadSchema: async () => createMainSchema(),
      loadTemplateSchema: async () => createTemplateSchema(),
      loadThemeSchema: async () => createThemeSchema(),
      getSchema: () => {
        return createMainSchema();
      }
    };

    // グローバル診断ストレージ
    const globalDiagnostics = new Map();

    // Mock DiagnosticCollectionを作成
    const mockDiagnosticCollection = {
      set: function(uri, diagnostics) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        if (diagnostics && diagnostics.length > 0) {
          globalDiagnostics.set(uriString, [...diagnostics]);
        } else {
          globalDiagnostics.delete(uriString);
        }
      },
      delete: function(uri) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        globalDiagnostics.delete(uriString);
      },
      clear: function() {
        globalDiagnostics.clear();
      },
      get: function(uri) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        return globalDiagnostics.get(uriString) || [];
      },
      has: function(uri) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        return globalDiagnostics.has(uriString);
      },
      forEach: function(callback) {
        globalDiagnostics.forEach((diagnostics, uri) => {
          callback(vscode.Uri.parse(uri), diagnostics);
        });
      },
      dispose: function() {
        globalDiagnostics.clear();
      }
    };

    // DiagnosticManager は ctor で diagnosticCollection を注入可能（require フック不要）
    const diagnosticManagerModulePath = require.resolve('../../out/services/diagnostic-manager.js');
    delete require.cache[diagnosticManagerModulePath];
    const { DiagnosticManager } = require(diagnosticManagerModulePath);
    const diagnosticManager = new DiagnosticManager(mockSchemaManager, {
      diagnosticCollection: mockDiagnosticCollection
    });

    // 実際の診断コレクションにアクセスできるようにする
    const originalDiagnosticCollection = diagnosticManager.diagnosticCollection || mockDiagnosticCollection;

    // テスト用のヘルパーメソッドを追加
    diagnosticManager._testHelpers = {
      mockSchemaManager,
      mockDiagnosticCollection,
      globalDiagnostics,
      originalDiagnosticCollection,
      resetAllMocks: () => {
        // 診断コレクションをクリア
        mockDiagnosticCollection.clear();
        globalDiagnostics.clear();
        if (originalDiagnosticCollection && originalDiagnosticCollection.clear) {
          originalDiagnosticCollection.clear();
        }
        // キャッシュをクリア
        if (diagnosticManager.clearCache) {
          diagnosticManager.clearCache();
        }
      },
      restoreRequire: () => {
        // RF2-S2-T1: Module.prototype.require フックは廃止（noop で互換）
      },
      // スキーマ読み込み動作を設定するヘルパー
      setSchemaLoadBehavior: (behavior) => {
        if (behavior === 'error') {
          mockSchemaManager.loadSchema = async () => {
            throw new Error('Schema load failed for testing');
          };
          mockSchemaManager.loadTemplateSchema = async () => {
            throw new Error('Template schema load failed for testing');
          };
          mockSchemaManager.loadThemeSchema = async () => {
            throw new Error('Theme schema load failed for testing');
          };
        } else {
          // デフォルトの動作に戻す
          mockSchemaManager.loadSchema = async () => createMainSchema();
          mockSchemaManager.loadTemplateSchema = async () => createTemplateSchema();
          mockSchemaManager.loadThemeSchema = async () => createThemeSchema();
        }
      },
      // テスト用ドキュメント作成ヘルパー
      createTestDocument: (content, uri = '/test/test.tui.yml') => {
        return {
          uri: vscode.Uri.file(uri),
          getText: () => content,
          fileName: uri,
          languageId: 'yaml',
          version: 1,
          isDirty: false,
          isClosed: false,
          save: async () => true,
          eol: 1,
          lineCount: content.split('\n').length,
          positionAt: (offset) => {
            const safeOffset = Math.max(0, Math.min(offset, content.length));
            const lines = content.slice(0, safeOffset).split('\n');
            const line = lines.length - 1;
            const character = lines[lines.length - 1].length;
            return new vscode.Position(line, character);
          }
        };
      },
      // 診断結果を取得するヘルパー
      getDiagnostics: (uri) => {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        return globalDiagnostics.get(uriString) || [];
      },
      // 全ての診断結果を取得するヘルパー
      getAllDiagnostics: () => {
        const result = {};
        globalDiagnostics.forEach((diagnostics, uri) => {
          result[uri] = diagnostics;
        });
        return result;
      }
    };

    return diagnosticManager;
  }
}

module.exports = { DiagnosticManagerFactory }; 
