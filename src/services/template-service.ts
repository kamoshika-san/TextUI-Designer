import * as vscode from 'vscode';
import { ErrorHandler } from '../utils/error-handler';
import { RefactoredTemplateParser } from './template-parser/refactored-template-parser';
import { logger } from '../utils/logger';

/**
 * テンプレートサービス
 * テンプレートパーサーの管理とテンプレート処理を担当
 */
export class TemplateService {
  private parser: RefactoredTemplateParser;
  private isInitialized: boolean = false;

  constructor() {
    this.parser = new RefactoredTemplateParser();
  }

  /**
   * サービスを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.debug('TemplateServiceを初期化中...');
      // 初期化処理（必要に応じて追加）
      this.isInitialized = true;
      logger.debug('TemplateServiceの初期化完了');
    } catch (error) {
      logger.error('TemplateServiceの初期化に失敗しました:', error);
      throw error;
    }
  }

  /**
   * YAMLコンテンツをテンプレート展開付きでパース
   */
  async parseWithTemplates(yamlContent: string, basePath: string): Promise<any> {
    return await ErrorHandler.withErrorHandling(async () => {
      return await this.parser.parseWithTemplates(yamlContent, basePath);
    }, 'テンプレート処理');
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats(): any {
    return this.parser.getCacheStats();
  }

  /**
   * 特定のテンプレートファイルのキャッシュを無効化
   */
  invalidateTemplateCache(filePath: string): void {
    this.parser.invalidateTemplateCache(filePath);
  }

  /**
   * キャッシュを完全にクリア
   */
  clearCache(): void {
    this.parser.clearCache();
  }

  /**
   * テンプレートパスが有効かどうかを検証
   */
  async validateTemplatePath(templatePath: string, basePath: string): Promise<boolean> {
    return await this.parser.validateTemplatePath(templatePath, basePath);
  }

  /**
   * 循環参照を検出
   */
  detectCircularReferences(content: string, basePath: string): string[] {
    return this.parser.detectCircularReferences(content, basePath);
  }

  /**
   * テンプレートを作成（コマンド用）
   */
  async createTemplate(): Promise<void> {
    return await ErrorHandler.withErrorHandling(async () => {
      // テンプレート作成の実装
      logger.info('テンプレート作成機能は未実装です');
      vscode.window.showInformationMessage('テンプレート作成機能は開発中です');
    }, 'テンプレート作成');
  }

  /**
   * テンプレートを挿入（コマンド用）
   */
  async insertTemplate(): Promise<void> {
    return await ErrorHandler.withErrorHandling(async () => {
      // テンプレート挿入の実装
      logger.info('テンプレート挿入機能は未実装です');
      vscode.window.showInformationMessage('テンプレート挿入機能は開発中です');
    }, 'テンプレート挿入');
  }

  /**
   * サービスを破棄
   */
  dispose(): void {
    if (this.parser) {
      this.parser.dispose();
    }
    this.isInitialized = false;
    logger.debug('TemplateServiceを破棄しました');
  }
} 