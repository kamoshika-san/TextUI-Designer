/**
 * リファクタリングテスト
 * 新しく作成したサービスクラスの基本的な動作をテスト
 */

// runTest関数をローカルで定義
const testResults = { total: 0, passed: 0, failed: 0, errors: [] };
function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 実行中: ${testName}`);
  try {
    testFunction();
    testResults.passed++;
    console.log(`✅ 成功: ${testName}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    console.log(`❌ 失敗: ${testName}`);
    console.log(`   エラー: ${error.message}`);
  }
}

// モック用のVS Code API
const mockVscode = {
  ExtensionContext: class {
    constructor() {
      this.subscriptions = [];
      this.extensionPath = __dirname + '/../../';
    }
  },
  ViewColumn: {
    Two: 2
  },
  Uri: {
    file: (path) => ({ toString: () => `file://${path}` })
  },
  window: {
    createWebviewPanel: () => ({
      webview: {
        html: '',
        postMessage: () => {},
        onDidReceiveMessage: () => {}
      },
      onDidDispose: () => {},
      reveal: () => {}
    }),
    showWarningMessage: () => {},
    showErrorMessage: () => {},
    showInformationMessage: () => {},
    activeTextEditor: null
  },
  workspace: {
    getConfiguration: (section) => ({
      get: (key, defaultValue) => {
        // ConfigManager用の設定値を返す
        const configDefaults = {
          'supportedFileExtensions': ['.tui.yml', '.tui.yaml'],
          'autoPreview.enabled': false,
          'devTools.enabled': false,
          'webview.disableThemeVariables': true,
          'webview.theme': 'auto',
          'webview.fontSize': 14,
          'export.defaultFormat': 'html',
          'export.includeComments': true,
          'export.minify': false,
          'diagnostics.enabled': true,
          'diagnostics.maxProblems': 100,
          'diagnostics.validateOnSave': true,
          'diagnostics.validateOnChange': true,
          'schema.validation.enabled': true,
          'schema.autoReload': true,
          'templates.defaultLocation': '',
          'templates.customTemplates': [],
          'performance.webviewDebounceDelay': 300,
          'performance.diagnosticDebounceDelay': 500,
          'performance.completionDebounceDelay': 200,
          'performance.cacheTTL': 30000,
          'performance.schemaCacheTTL': 60000,
          'performance.memoryMonitorInterval': 30000,
          'performance.enablePerformanceLogs': true,
          'performance.minUpdateInterval': 100,
          'performance.maxConcurrentOperations': 2
        };
        return configDefaults[key] !== undefined ? configDefaults[key] : defaultValue;
      },
      update: () => Promise.resolve()
    }),
    openTextDocument: () => Promise.resolve({
      getText: () => 'test content'
    })
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  },
  languages: {
    createDiagnosticCollection: () => ({
      set: () => {},
      clear: () => {},
      delete: () => {},
      dispose: () => {}
    }),
    registerCompletionItemProvider: () => ({})
  },
  commands: {
    registerCommand: () => ({})
  },
  CompletionItem: class {
    constructor(label, kind) {
      this.label = label;
      this.kind = kind;
    }
  },
  CompletionItemKind: {
    Class: 1,
    Property: 2,
    Snippet: 3
  },
  Diagnostic: class {
    constructor(range, message, severity) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
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

// 注: Mocha が tests/unit/**/*.js を一括読み込みするため、ここで require を上書きすると
// 後続の diagnostic-manager 等のテストを壊す。フックは「単体で node 実行するとき」だけに限定する。

// テスト用のモジュール読み込み
const fs = require('fs');
const path = require('path');

// テスト対象のモジュールを動的に読み込み
function loadModule(modulePath) {
  try {
    // 必ず.js拡張子を付与
    const jsPath = modulePath.endsWith('.js') ? modulePath : modulePath + '.js';
    const fullPath = path.join(__dirname, '..', '..', 'out', jsPath);
    console.log(`[loadModule] modulePath: ${modulePath}`);
    console.log(`[loadModule] jsPath: ${jsPath}`);
    console.log(`[loadModule] fullPath: ${fullPath}`);
    if (fs.existsSync(fullPath)) {
      return require(fullPath);
    } else {
      console.log(`ファイルが見つかりません: ${fullPath}`);
      return null;
    }
  } catch (error) {
    console.error(`モジュール読み込みエラー: ${error.message}`);
    return null;
  }
}

function runRefactoringTests() {
  console.log('🧪 リファクタリングテストを開始します...\n');

  // SchemaManagerのテスト
  runTest('SchemaManager - 基本初期化', () => {
    const SchemaManager = loadModule('services/schema-manager');
    if (!SchemaManager) {
      throw new Error('SchemaManagerが見つかりません');
    }

    const context = new mockVscode.ExtensionContext();
    const schemaManager = new SchemaManager.SchemaManager(context);
    
    // 基本的なプロパティの確認
    if (!schemaManager.getSchemaPath) {
      throw new Error('getSchemaPathメソッドが存在しません');
    }
    
    const schemaPath = schemaManager.getSchemaPath();
    console.log(`[SchemaManager] 実際のパス: ${schemaPath}`);
    console.log(`[SchemaManager] context.extensionPath: ${context.extensionPath}`);
    
    // パスに'schema.json'が含まれているかチェック（より柔軟な検証）
    if (!schemaPath.includes('schema.json')) {
      throw new Error('スキーマパスにschema.jsonが含まれていません');
    }

    console.log('✅ SchemaManagerの基本初期化テスト成功');
  });

  // WebViewManagerのテスト
  runTest('WebViewManager - 基本初期化', () => {
    const WebViewManager = loadModule('services/webview-manager');
    if (!WebViewManager) {
      throw new Error('WebViewManagerが見つかりません');
    }

    const context = new mockVscode.ExtensionContext();
    const webViewManager = new WebViewManager.WebViewManager(context);
    
    // 基本的なメソッドの確認
    if (!webViewManager.setLastTuiFile) {
      throw new Error('setLastTuiFileメソッドが存在しません');
    }
    
    if (!webViewManager.getLastTuiFile) {
      throw new Error('getLastTuiFileメソッドが存在しません');
    }
    
    if (!webViewManager.hasPanel) {
      throw new Error('hasPanelメソッドが存在しません');
    }

    // ファイルパスの設定と取得テスト
    const testPath = '/test/path/file.tui.yml';
    webViewManager.setLastTuiFile(testPath);
    const retrievedPath = webViewManager.getLastTuiFile();
    
    if (retrievedPath !== testPath) {
      throw new Error('ファイルパスの設定・取得が正しく動作しません');
    }

    console.log('✅ WebViewManagerの基本初期化テスト成功');
  });

  // DiagnosticManagerのテスト
  runTest('DiagnosticManager - 基本初期化', () => {
    const DiagnosticManager = loadModule('services/diagnostic-manager');
    if (!DiagnosticManager) {
      throw new Error('DiagnosticManagerが見つかりません');
    }

    // モックのSchemaManager
    const mockSchemaManager = {
      loadSchema: () => Promise.resolve({})
    };

    const diagnosticManager = new DiagnosticManager.DiagnosticManager(mockSchemaManager);
    
    // 基本的なメソッドの確認
    if (!diagnosticManager.clearDiagnostics) {
      throw new Error('clearDiagnosticsメソッドが存在しません');
    }
    
    if (!diagnosticManager.dispose) {
      throw new Error('disposeメソッドが存在しません');
    }

    console.log('✅ DiagnosticManagerの基本初期化テスト成功');
  });

  // CompletionProviderのテスト
  runTest('CompletionProvider - 基本初期化', () => {
    const TextUICompletionProvider = loadModule('services/completion-provider');
    if (!TextUICompletionProvider) {
      throw new Error('TextUICompletionProviderが見つかりません');
    }

    // モックのSchemaManager
    const mockSchemaManager = {
      loadSchema: () => ({})
    };

    const completionProvider = new TextUICompletionProvider.TextUICompletionProvider();
    
    // 基本的なメソッドの確認
    if (!completionProvider.provideCompletionItems) {
      throw new Error('provideCompletionItemsメソッドが存在しません');
    }

    console.log('✅ CompletionProviderの基本初期化テスト成功');
  });

  // CommandManagerのテスト
  runTest('CommandManager - 基本初期化', () => {
    const CommandManager = loadModule('services/command-manager');
    if (!CommandManager) {
      throw new Error('CommandManagerが見つかりません');
    }

    const context = new mockVscode.ExtensionContext();
    
    // モックのWebViewManager
    const mockWebViewManager = {
      getLastTuiFile: () => null
    };
    
    // モックのExportManager
    const mockExportManager = {};

    const commandManager = new CommandManager.CommandManager(
      context,
      mockWebViewManager,
      mockExportManager
    );
    
    // 基本的なメソッドの確認
    if (!commandManager.registerCommands) {
      throw new Error('registerCommandsメソッドが存在しません');
    }

    console.log('✅ CommandManagerの基本初期化テスト成功');
  });

  // WebViewUtilsのテスト
  runTest('WebViewUtils - 基本機能', () => {
    const webviewUtils = loadModule('utils/webview-utils');
    if (!webviewUtils) {
      throw new Error('WebViewUtilsが見つかりません');
    }

    // 基本的な関数の確認
    if (!webviewUtils.getWebviewContent) {
      throw new Error('getWebviewContent関数が存在しません');
    }
    
    if (!webviewUtils.getErrorHtml) {
      throw new Error('getErrorHtml関数が存在しません');
    }

    // getErrorHtmlの動作テスト
    const errorMessage = 'テストエラー';
    const errorHtml = webviewUtils.getErrorHtml(errorMessage);
    
    if (!errorHtml.includes(errorMessage)) {
      throw new Error('getErrorHtmlが正しく動作しません');
    }

    console.log('✅ WebViewUtilsの基本機能テスト成功');
  });

  console.log('\n🎉 すべてのリファクタリングテストが完了しました！');
  
  // PerformanceMonitorのインスタンスをクリーンアップ
  try {
    const { PerformanceMonitor } = require('../../out/utils/performance-monitor');
    const performanceMonitor = PerformanceMonitor.getInstance();
    if (performanceMonitor && typeof performanceMonitor.dispose === 'function') {
      performanceMonitor.dispose();
      console.log('[PerformanceMonitor] クリーンアップ完了');
    }
  } catch (error) {
    console.log('[PerformanceMonitor] クリーンアップエラー:', error.message);
  }
}

// 単体実行時のみ: 一時的に vscode を差し替えてからリファクタテストを走らせ、終了後に復元する
if (require.main === module) {
  const Module = require('module');
  const setupHookRequire = Module.prototype.require;
  global.vscode = mockVscode;
  Module.prototype.require = function (id) {
    if (id === 'vscode') {
      return mockVscode;
    }
    return setupHookRequire.apply(this, arguments);
  };
  try {
    runRefactoringTests();
  } finally {
    Module.prototype.require = setupHookRequire;
  }
}

// 各テスト本体を個別の関数としてexport
module.exports = {
  testSchemaManager: () => {
    const SchemaManager = loadModule('services/schema-manager');
    if (!SchemaManager) throw new Error('SchemaManagerが見つかりません');
    const context = new mockVscode.ExtensionContext();
    const schemaManager = new SchemaManager.SchemaManager(context);
    if (!schemaManager.getSchemaPath) throw new Error('getSchemaPathメソッドが存在しません');
    const schemaPath = schemaManager.getSchemaPath();
    console.log(`[SchemaManager] 実際のパス: ${schemaPath}`);
    console.log(`[SchemaManager] context.extensionPath: ${context.extensionPath}`);
    // パスに'schema.json'が含まれているかチェック（より柔軟な検証）
    if (!schemaPath.includes('schema.json')) throw new Error('スキーマパスにschema.jsonが含まれていません');
  },
  testWebViewManager: () => {
    const WebViewManager = loadModule('services/webview-manager');
    if (!WebViewManager) throw new Error('WebViewManagerが見つかりません');
    const context = new mockVscode.ExtensionContext();
    const webViewManager = new WebViewManager.WebViewManager(context);
    if (!webViewManager.setLastTuiFile) throw new Error('setLastTuiFileメソッドが存在しません');
    if (!webViewManager.getLastTuiFile) throw new Error('getLastTuiFileメソッドが存在しません');
    if (!webViewManager.hasPanel) throw new Error('hasPanelメソッドが存在しません');
    const testPath = '/test/path/file.tui.yml';
    webViewManager.setLastTuiFile(testPath);
    const retrievedPath = webViewManager.getLastTuiFile();
    if (retrievedPath !== testPath) throw new Error('ファイルパスの設定・取得が正しく動作しません');
  },
  testDiagnosticManager: () => {
    const DiagnosticManager = loadModule('services/diagnostic-manager');
    if (!DiagnosticManager) throw new Error('DiagnosticManagerが見つかりません');
    const mockSchemaManager = { loadSchema: () => Promise.resolve({}) };
    const diagnosticManager = new DiagnosticManager.DiagnosticManager(mockSchemaManager);
    if (!diagnosticManager.clearDiagnostics) throw new Error('clearDiagnosticsメソッドが存在しません');
    if (!diagnosticManager.dispose) throw new Error('disposeメソッドが存在しません');
  },
  testCompletionProvider: () => {
    const TextUICompletionProvider = loadModule('services/completion-provider');
    if (!TextUICompletionProvider) throw new Error('TextUICompletionProviderが見つかりません');
    const mockSchemaManager = { loadSchema: () => ({}) };
    const completionProvider = new TextUICompletionProvider.TextUICompletionProvider();
    if (!completionProvider.provideCompletionItems) throw new Error('provideCompletionItemsメソッドが存在しません');
  },
  testCommandManager: () => {
    const CommandManager = loadModule('services/command-manager');
    if (!CommandManager) throw new Error('CommandManagerが見つかりません');
    const context = new mockVscode.ExtensionContext();
    const mockWebViewManager = { getLastTuiFile: () => null };
    const mockExportManager = {};
    const commandManager = new CommandManager.CommandManager(context, mockWebViewManager, mockExportManager);
    if (!commandManager.registerCommands) throw new Error('registerCommandsメソッドが存在しません');
  },
  testWebViewUtils: () => {
    const webviewUtils = loadModule('utils/webview-utils');
    if (!webviewUtils) throw new Error('WebViewUtilsが見つかりません');
    if (!webviewUtils.getWebviewContent) throw new Error('getWebviewContent関数が存在しません');
    if (!webviewUtils.getErrorHtml) throw new Error('getErrorHtml関数が存在しません');
    const errorMessage = 'テストエラー';
    const errorHtml = webviewUtils.getErrorHtml(errorMessage);
    if (!errorHtml.includes(errorMessage)) throw new Error('getErrorHtmlが正しく動作しません');
  }
}; 