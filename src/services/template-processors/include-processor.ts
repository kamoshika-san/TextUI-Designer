import * as yaml from 'yaml';
import * as path from 'path';
import { BaseTemplateProcessor } from './base-processor';
import { TemplateError, TemplateException } from '../template-parser';
import { TemplateCacheService } from '../template-cache';

/**
 * テンプレート参照情報
 */
interface IncludeReference {
  template: string;
  params?: Record<string, any>;
}

/**
 * $include構文を処理するクラス
 */
export class IncludeProcessor extends BaseTemplateProcessor {
  private templateCacheService: TemplateCacheService;

  constructor(templateCacheService: TemplateCacheService) {
    super();
    this.templateCacheService = templateCacheService;
  }

  async process(
    includeRef: IncludeReference,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    parentParams: Record<string, any> = {}
  ): Promise<any> {
    this.checkDepth(depth, basePath);

    const templatePath = this.resolveTemplatePath(includeRef.template, basePath);
    
    // 循環参照チェック（$includeのみ）
    if (visitedFiles.has(templatePath)) {
      throw new TemplateException(
        TemplateError.CIRCULAR_REFERENCE,
        templatePath
      );
    }

    visitedFiles.add(templatePath);

    try {
      // テンプレートファイルを読み込み
      const templateContent = await this.loadTemplateFile(templatePath);
      const templateData = yaml.parse(templateContent);

      // includeRef.paramsと親paramsをマージ
      const mergedParams = { ...parentParams, ...(includeRef.params || {}) };

      // テンプレートを解決（他のProcessorに委譲）
      // ここでは基本的な解決のみ行い、他の$include、$if、$foreachは
      // 上位のTemplateParserで処理される
      visitedFiles.delete(templatePath);
      return { 
        templateData, 
        mergedParams, 
        templatePath,
        depth: depth + 1
      };
    } catch (error) {
      visitedFiles.delete(templatePath);
      throw error;
    }
  }

  /**
   * テンプレートパスを解決
   */
  private resolveTemplatePath(templatePath: string, basePath: string): string {
    if (path.isAbsolute(templatePath)) {
      return templatePath;
    }

    // 相対パスの場合、basePathからの相対パスとして解決
    const baseDir = path.dirname(basePath);
    const resolvedPath = path.resolve(baseDir, templatePath);
    
    // .template.yml拡張子を自動補完
    if (!resolvedPath.endsWith('.template.yml')) {
      return resolvedPath + '.template.yml';
    }
    
    return resolvedPath;
  }

  /**
   * テンプレートファイルを読み込み
   */
  private async loadTemplateFile(templatePath: string): Promise<string> {
    try {
      // キャッシュサービス経由でテンプレートを取得
      const cachedTemplate = await this.templateCacheService.getTemplate(templatePath);
      return cachedTemplate.content;
    } catch (error) {
      throw new TemplateException(
        TemplateError.FILE_NOT_FOUND,
        templatePath
      );
    }
  }

  /**
   * テンプレートパスが有効かどうかを検証
   */
  async validateTemplatePath(templatePath: string, basePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolveTemplatePath(templatePath, basePath);
      await this.loadTemplateFile(resolvedPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 循環参照を検出
   */
  detectCircularReferences(content: string, basePath: string): string[] {
    const circularRefs: string[] = [];
    const visited = new Set<string>();

    const checkCircular = (data: any, currentPath: string) => {
      if (visited.has(currentPath)) {
        circularRefs.push(currentPath);
        return;
      }

      visited.add(currentPath);

      if (Array.isArray(data)) {
        data.forEach(item => checkCircular(item, currentPath));
      } else if (typeof data === 'object' && data !== null) {
        if ('$include' in data && typeof data.$include === 'object') {
          const includeRef = data.$include as IncludeReference;
          if (includeRef.template) {
            const templatePath = this.resolveTemplatePath(includeRef.template, currentPath);
            checkCircular(data, templatePath);
          }
        }
        
        Object.values(data).forEach(value => checkCircular(value, currentPath));
      }

      visited.delete(currentPath);
    };

    try {
      const yamlData = yaml.parse(content);
      checkCircular(yamlData, basePath);
    } catch (error) {
      // YAMLパースエラーは無視
    }

    return circularRefs;
  }
} 