/**
 * テスト共通セットアップ
 * すべてのテストで使用されるモックとグローバル設定
 */

const { expect } = require('chai');

// テスト環境変数を設定
process.env.NODE_ENV = 'test';

// コンソールメソッドを保護
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console)
};

// コンソールメソッドを強制的に保護
Object.defineProperty(global, 'console', {
  value: originalConsole,
  writable: false,
  configurable: false
});

// Node.jsのconsoleも保護
Object.defineProperty(console, 'log', {
  value: originalConsole.log,
  writable: false,
  configurable: false
});

Object.defineProperty(console, 'error', {
  value: originalConsole.error,
  writable: false,
  configurable: false
});

Object.defineProperty(console, 'warn', {
  value: originalConsole.warn,
  writable: false,
  configurable: false
});

Object.defineProperty(console, 'info', {
  value: originalConsole.info,
  writable: false,
  configurable: false
});

Object.defineProperty(console, 'debug', {
  value: originalConsole.debug,
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
global.console = originalConsole;

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
  global.console = originalConsole;
};

// 初回セットアップでもファクトリを設定
global.cleanupMocks();

console.log('✓ Test setup completed - VSCode mocks initialized'); 