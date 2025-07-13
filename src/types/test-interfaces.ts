// テスト用インターフェース定義ファイル
// テスト環境でのみ使用されるメソッドを定義

import { TextUIDSL } from '../renderer/types';

/**
 * WebViewManagerのテスト用インターフェース
 * テスト環境でのみ使用されるメソッドを定義
 */
export interface IWebViewManagerTest {
  _testMemoryManagement(): void;
  _getYamlCacheContent(): string;
  _clearYamlCache(): void;
  _setYamlCacheContent(content: string): void;
  get lastYamlContent(): string;
  set lastYamlContent(val: string);
  get lastParsedData(): TextUIDSL | null;
  set lastParsedData(val: TextUIDSL | null);
}

/**
 * WebViewManagerの旧API互換インターフェース
 * 後方互換性のためのメソッドを定義
 */
export interface IWebViewManagerLegacy {
  switchTheme(themePath: string): Promise<void>;
  sendAvailableThemes(): Promise<void>;
}

/**
 * WebViewMessageHandlerのテスト用インターフェース
 */
export interface IWebViewMessageHandlerTest {
  switchTheme(themePath: string): Promise<void>;
  sendAvailableThemes(): Promise<void>;
}

/**
 * WebViewUpdateManagerのテスト用インターフェース
 */
export interface IWebViewUpdateManagerTest {
  _testMemoryManagement(): void;
  _getYamlCacheContent(): string;
  _clearYamlCache(): void;
  _setYamlCacheContent(content: string): void;
  get lastYamlContent(): string;
  set lastYamlContent(val: string);
  get lastParsedData(): TextUIDSL | null;
  set lastParsedData(val: TextUIDSL | null);
}

/**
 * CacheManagerのテスト用インターフェース
 */
export interface ICacheManagerTest {
  _getCacheContent(fileName: string): string | null;
  _clearCache(): void;
}

/**
 * SchemaManagerのテスト用インターフェース
 */
export interface ISchemaManagerTest {
  _getSchemaCache(): Map<string, unknown>;
  _clearSchemaCache(): void;
  _setSchemaPath(path: string): void;
  _getRegisteredSchemas(): string[];
}

/**
 * TemplateServiceのテスト用インターフェース
 */
export interface ITemplateServiceTest {
  _getTemplateCache(): Map<string, unknown>;
  _clearTemplateCache(): void;
  _setTemplatePath(path: string): void;
  _getAvailableTemplates(): string[];
}

/**
 * SettingsServiceのテスト用インターフェース
 */
export interface ISettingsServiceTest {
  _getSettingsCache(): Record<string, unknown>;
  _clearSettingsCache(): void;
  _setTestSetting(key: string, value: unknown): void;
  _resetToDefaults(): void;
}

/**
 * PerformanceMonitorのテスト用インターフェース
 */
export interface IPerformanceMonitorTest {
  _getMetrics(): Record<string, unknown>;
  _clearMetrics(): void;
  _setTestMetric(key: string, value: unknown): void;
  _getEventHistory(): unknown[];
}

/**
 * MemoryTrackerのテスト用インターフェース
 */
export interface IMemoryTrackerTest {
  _getTrackedObjects(): unknown[];
  _clearTrackedObjects(): void;
  _setTestObject(id: string, size: number): void;
  _getMemoryUsage(): number;
}

/**
 * ErrorHandlerのテスト用インターフェース
 */
export interface IErrorHandlerTest {
  _getErrorHistory(): unknown[];
  _clearErrorHistory(): void;
  _setTestError(error: Error): void;
  _getErrorStats(): Record<string, unknown>;
}

/**
 * Loggerのテスト用インターフェース
 */
export interface ILoggerTest {
  _getLogHistory(): string[];
  _clearLogHistory(): void;
  _setLogLevel(level: string): void;
  _getLogLevel(): string;
}

/**
 * DIContainerのテスト用インターフェース
 */
export interface IDIContainerTest {
  _getRegisteredServices(): string[];
  _getServiceInstances(): Map<string, unknown>;
  _clearAllServices(): void;
  _setTestService(token: string, service: unknown): void;
}

/**
 * CommandManagerのテスト用インターフェース
 */
export interface ICommandManagerTest {
  _getRegisteredCommands(): string[];
  _clearRegisteredCommands(): void;
  _setTestCommand(command: string, handler: () => void): void;
  _executeCommand(command: string): Promise<void>;
}

/**
 * 統合テスト用インターフェース
 * 複数のサービスを組み合わせたテストに使用
 */
export interface IIntegrationTest {
  _resetAllServices(): Promise<void>;
  _getServiceState(): Record<string, unknown>;
  _setTestScenario(scenario: string): void;
  _validateServiceDependencies(): boolean;
}

/**
 * モック用インターフェース
 * テストでのモック作成に使用
 */
export interface IMockableService {
  _setMockImplementation(method: string, implementation: (...args: unknown[]) => unknown): void;
  _getMockCalls(method: string): unknown[][];
  _clearMockCalls(): void;
  _resetMock(): void;
}