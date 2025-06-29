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
    const mockSchemaManager = {
      loadSchema: async () => {
        // テスト用のスキーマを返す
        return {
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
                    type: 'object'
                  }
                }
              },
              required: ['id', 'title']
            }
          },
          required: ['page']
        };
      },
      getSchema: () => {
        return {
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
                    type: 'object'
                  }
                }
              },
              required: ['id', 'title']
            }
          },
          required: ['page']
        };
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

    // 拡張VSCode APIモック
    const extendedVscode = {
      ...vscode,
      languages: {
        createDiagnosticCollection: (name) => {
          return mockDiagnosticCollection;
        }
      },
      DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
      },
      Diagnostic: class {
        constructor(range, message, severity) {
          this.range = range;
          this.message = message;
          this.severity = severity !== undefined ? severity : 0;
        }
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
      }
    };

    // Module requireフックを設定
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
      if (id === 'vscode') {
        return extendedVscode;
      }
      return originalRequire.apply(this, arguments);
    };

    // VSCode APIをパッチして診断コレクション作成をインターセプト
    const originalCreateDiagnosticCollection = extendedVscode.languages.createDiagnosticCollection;
    extendedVscode.languages.createDiagnosticCollection = (name) => {
      return mockDiagnosticCollection;
    };

    // DiagnosticManagerを作成
    const { DiagnosticManager } = require('../../out/services/diagnostic-manager.js');
    const diagnosticManager = new DiagnosticManager(mockSchemaManager);

    // VSCode APIを元に戻す
    extendedVscode.languages.createDiagnosticCollection = originalCreateDiagnosticCollection;

    // 実際の診断コレクションにアクセスできるようにする
    const originalDiagnosticCollection = diagnosticManager.diagnosticCollection || mockDiagnosticCollection;

    // テスト用のヘルパーメソッドを追加
    diagnosticManager._testHelpers = {
      mockSchemaManager,
      mockDiagnosticCollection,
      extendedVscode,
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
        Module.prototype.require = originalRequire;
      },
      // スキーマ読み込み動作を設定するヘルパー
      setSchemaLoadBehavior: (behavior) => {
        if (behavior === 'error') {
          mockSchemaManager.loadSchema = async () => {
            throw new Error('Schema load failed for testing');
          };
        } else {
          // デフォルトの動作に戻す
          mockSchemaManager.loadSchema = async () => {
            return {
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
                        type: 'object'
                      }
                    }
                  },
                  required: ['id', 'title']
                }
              },
              required: ['page']
            };
          };
        }
      },
      // テスト用ドキュメント作成ヘルパー
      createTestDocument: (content, uri = '/test/test.tui.yml') => {
        return {
          uri: extendedVscode.Uri.file(uri),
          getText: () => content,
          fileName: uri,
          languageId: 'yaml',
          version: 1,
          isDirty: false,
          isClosed: false,
          save: async () => true,
          eol: 1,
          lineCount: content.split('\n').length
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