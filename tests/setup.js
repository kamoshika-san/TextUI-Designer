/**
 * テスト共通セットアップ
 * すべてのテストで使用されるモックとグローバル設定
 */

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const outEntryMarker = path.join(workspaceRoot, 'out', 'extension.js');
if (process.env.TEXTUI_TEST_SKIP_OUT_CHECK !== '1' && !fs.existsSync(outEntryMarker)) {
  // eslint-disable-next-line no-console
  console.error(
    '[tests/setup] コンパイル成果物が見つかりません: out/extension.js\n' +
      '先に `npm run compile` を実行するか、`npm run test:quick` / `npm test` を利用してください。\n' +
      '（意図的にスキップする場合は TEXTUI_TEST_SKIP_OUT_CHECK=1）'
  );
  process.exit(1);
}

const { expect } = require('chai');

// テスト環境変数を設定
process.env.NODE_ENV = 'test';
// T-019: allow HtmlExporter fallback lane only in test runs (runtime hard gate in exporter)
process.env.TEXTUI_ENABLE_FALLBACK = '1';
if (!process.env.TEXTUI_LOG_LEVEL) {
  process.env.TEXTUI_LOG_LEVEL = 'error';
}

// コンソールメソッドを保護
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console)
};


const NOISY_LOG_PATTERNS = [
  /^\[CommandManager\]/,
  /^\[CacheManager\]/,
  /^\[UpdateQueueManager\]/,
  /^\[WebView(?:ErrorHandler|UpdateManager)?\]/,
  /^\[YamlParser\]/,
  /^\[PerformanceMonitor\]/,
  /^\[TextUIMemoryTracker\]/,
  /^strict mode:/
];

const shouldSuppressTestLog = (args) => {
  if (process.env.TEXTUI_TEST_VERBOSE === '1') {
    return false;
  }

  const message = args
    .map((arg) => (typeof arg === 'string' ? arg : ''))
    .find((text) => text.length > 0) || '';

  return NOISY_LOG_PATTERNS.some((pattern) => pattern.test(message));
};

const filteredConsole = {
  log: (...args) => {
    if (!shouldSuppressTestLog(args)) {
      originalConsole.log(...args);
    }
  },
  error: (...args) => originalConsole.error(...args),
  warn: (...args) => {
    if (!shouldSuppressTestLog(args)) {
      originalConsole.warn(...args);
    }
  },
  info: (...args) => {
    if (!shouldSuppressTestLog(args)) {
      originalConsole.info(...args);
    }
  },
  debug: (...args) => {
    if (!shouldSuppressTestLog(args)) {
      originalConsole.debug(...args);
    }
  }
};

// コンソールメソッドを強制的に保護
Object.defineProperty(global, 'console', {
  value: filteredConsole,
  writable: false,
  configurable: false
});

// Node.jsのconsoleも保護
Object.defineProperty(console, 'log', {
  value: filteredConsole.log,
  writable: false,
  configurable: false
});

Object.defineProperty(console, 'error', {
  value: filteredConsole.error,
  writable: false,
  configurable: false
});

Object.defineProperty(console, 'warn', {
  value: filteredConsole.warn,
  writable: false,
  configurable: false
});

Object.defineProperty(console, 'info', {
  value: filteredConsole.info,
  writable: false,
  configurable: false
});

Object.defineProperty(console, 'debug', {
  value: filteredConsole.debug,
  writable: false,
  configurable: false
});

// VSCodeモックをグローバルに設定
const mockVscode = require('./mocks/vscode-mock');

// Module requireをフックしてVSCodeモジュールをモック化
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

// グローバルにvscodeを設定（念のため）
global.vscode = mockVscode;

// コンソールメソッドをグローバルに保護
global.console = filteredConsole;

// Chaiの設定
global.expect = expect;

// テストヘルパー関数
global.createMockVscode = (overrides = {}) => {
  const mock = { ...mockVscode };
  
  // 設定値のオーバーライド
  if (overrides.config) {
    const originalGetConfig = mock.workspace.getConfiguration;
    mock.workspace.getConfiguration = (section) => {
      const config = originalGetConfig(section);
      if (section in overrides.config) {
        Object.assign(config.values, overrides.config[section]);
      }
      return config;
    };
  }
  
  return mock;
};

// テスト後のクリーンアップ
global.cleanupMocks = () => {
  // ファクトリをグローバルに設定（モジュールキャッシュ問題を回避）
  const path = require('path');
  
  // Module requireフックを一時的に無効化
  const tempRequire = Module.prototype.require;
  Module.prototype.require = originalRequire;
  
  try {
    // ConfigManagerファクトリをグローバルに設定
    try {
      const configFactoryPath = path.resolve(__dirname, 'mocks', 'config-manager-factory.js');
      delete require.cache[configFactoryPath];
      const configFactoryModule = originalRequire.call(this, configFactoryPath);
      
      if (!configFactoryModule || !configFactoryModule.ConfigManagerFactory) {
        throw new Error('ConfigManagerFactory not found in module exports');
      }
      
      global.ConfigManagerFactory = configFactoryModule.ConfigManagerFactory;
      
      if (configFactoryModule.TestConfigManager && typeof configFactoryModule.TestConfigManager.reset === 'function') {
        configFactoryModule.TestConfigManager.reset();
      }
    } catch (error) {
      console.warn('ConfigManager factory setup failed:', error.message);
    }
    
    // ErrorHandlerファクトリをグローバルに設定
    try {
      const errorFactoryPath = path.resolve(__dirname, 'mocks', 'error-handler-factory.js');
      delete require.cache[errorFactoryPath];
      const errorFactoryModule = originalRequire.call(this, errorFactoryPath);
      
      if (!errorFactoryModule || !errorFactoryModule.ErrorHandlerFactory) {
        throw new Error('ErrorHandlerFactory not found in module exports');
      }
      
      global.ErrorHandlerFactory = errorFactoryModule.ErrorHandlerFactory;
      
      if (errorFactoryModule.TestErrorHandler && typeof errorFactoryModule.TestErrorHandler.reset === 'function') {
        errorFactoryModule.TestErrorHandler.reset();
      }
    } catch (error) {
      console.warn('ErrorHandler factory setup failed:', error.message);
    }
    
    // PerformanceMonitorファクトリをグローバルに設定
    try {
      const perfFactoryPath = path.resolve(__dirname, 'mocks', 'performance-monitor-factory.js');
      delete require.cache[perfFactoryPath];
      const perfFactoryModule = originalRequire.call(this, perfFactoryPath);
      
      if (!perfFactoryModule || !perfFactoryModule.PerformanceMonitorFactory) {
        throw new Error('PerformanceMonitorFactory not found in module exports');
      }
      
      global.PerformanceMonitorFactory = perfFactoryModule.PerformanceMonitorFactory;
      
      if (perfFactoryModule.TestPerformanceMonitor && typeof perfFactoryModule.TestPerformanceMonitor.reset === 'function') {
        perfFactoryModule.TestPerformanceMonitor.reset();
      }
    } catch (error) {
      console.warn('PerformanceMonitor factory setup failed:', error.message);
    }
    
    // DiagnosticManagerファクトリをグローバルに設定
    try {
      const diagnosticFactoryPath = path.resolve(__dirname, 'mocks', 'diagnostic-manager-factory.js');
      delete require.cache[diagnosticFactoryPath];
      const diagnosticFactoryModule = originalRequire.call(this, diagnosticFactoryPath);
      
      if (!diagnosticFactoryModule || !diagnosticFactoryModule.DiagnosticManagerFactory) {
        throw new Error('DiagnosticManagerFactory not found in module exports');
      }
      
      global.DiagnosticManagerFactory = diagnosticFactoryModule.DiagnosticManagerFactory;
    } catch (error) {
      console.warn('DiagnosticManager factory setup failed:', error.message);
    }
    
  } finally {
    // Module requireフックを復元
    Module.prototype.require = tempRequire;
  }
  
  // その他のモックリセット
  if (global.vscode && global.vscode.window) {
    global.vscode.window.activeTextEditor = null;
    global.vscode.window.visibleTextEditors = [];
  }
  
  // コンソールメソッドを復元
  global.console = filteredConsole;
};

// 初回セットアップでもファクトリを設定
global.cleanupMocks();

console.log('✓ Test setup completed - VSCode mocks initialized'); 