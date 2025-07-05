import type { Stats } from 'fs';

export declare class TestHtmlExporter {
  constructor(options?: any);
  export(dsl: any, options?: any): Promise<string>;
  // 必要に応じて他のメソッドも追加
}

export declare function loadYamlFile(filePath: string): any;
export declare function saveHtmlFile(html: string, filePath: string): void;
export declare function containsPattern(content: string, pattern: string | RegExp): boolean;
export declare function validateHtml(
  html: string,
  expectedPatterns?: Array<string | RegExp>,
  unexpectedPatterns?: Array<string | RegExp>
): void;
export declare function removeDirectoryRecursive(
  dirPath: string,
  maxRetries?: number,
  retryDelay?: number
): void;
export declare function createTestDirectory(
  baseDir: string,
  dirName: string
): { path: string; cleanup: () => void };
export declare function createTestFile(filePath: string, content: string): void;
export declare function removeTestFile(filePath: string): void;
export declare function createTempFile(
  dir: string,
  filename: string,
  content: string
): { path: string; cleanup: () => void };
export declare function isTestEnvironment(): boolean;
export declare function createMockObject(methods?: Record<string, any>): any; 