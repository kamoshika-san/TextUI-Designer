import * as yaml from 'yaml';
import { ErrorHandler } from '../../utils/error-handler';
import { TemplateCacheService } from '../template-cache';
import { TemplateResolver } from './template-resolver';
import { TemplateValidator } from './template-validator';
import { TemplateCoordinator } from './template-coordinator';
import { TemplateError, TemplateException } from '../template-parser';

/**
 * リファクタリングされたテンプレートパーサー
 * 責任を分離し、より小さく保守しやすい構造
 */
export class RefactoredTemplateParser {
  private readonly coordinator: TemplateCoordinator;
  private readonly resolver: TemplateResolver;
  private readonly validator: TemplateValidator;
  private readonly cacheService: TemplateCacheService;

  constructor(errorHandler: typeof ErrorHandler = ErrorHandler) {
    this.cacheService = new TemplateCacheService();
    this.validator = new TemplateValidator();
    this.resolver = new TemplateResolver(this.cacheService, this.validator);
    this.coordinator = new TemplateCoordinator(this.resolver, this.validator);
  }

  /**
   * DSLテキストをテンプレート展開付きでパース
   */
  async parseWithTemplates(yamlContent: string, basePath: string): Promise<any> {
    return await ErrorHandler.withErrorHandling(async () => {
      const yamlData = yaml.parse(yamlContent);
      return await this.coordinator.resolveTemplates(yamlData, basePath);
    }, 'テンプレートパース処理');
  }

  /**
   * テンプレートパーサーを破棄
   */
  dispose(): void {
    this.cacheService.dispose();
  }

  /**
   * キャッシュ統計情報を取得
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * 特定のテンプレートファイルのキャッシュを無効化
   */
  invalidateTemplateCache(filePath: string): void {
    this.cacheService.invalidateTemplate(filePath);
  }

  /**
   * キャッシュを完全にクリア
   */
  clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * テンプレートパスが有効かどうかを検証
   */
  async validateTemplatePath(templatePath: string, basePath: string): Promise<boolean> {
    return await this.validator.validateTemplatePath(templatePath, basePath);
  }

  /**
   * 循環参照を検出
   */
  detectCircularReferences(content: string, basePath: string): string[] {
    return this.validator.detectCircularReferences(content, basePath);
  }
} 