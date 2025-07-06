import * as path from 'path';
import { TemplateCacheService } from '../template-cache';
import { TemplateValidator } from './template-validator';
import { ParameterInterpolator } from '../template-processors/parameter-interpolator';
import { IncludeProcessor } from '../template-processors/include-processor';
import { ConditionalProcessor } from '../template-processors/conditional-processor';
import { LoopProcessor } from '../template-processors/loop-processor';
import { TemplateError, TemplateException } from '../template-parser';

/**
 * テンプレート解決関数の型定義
 */
type TemplateResolverFunction = (
  data: any,
  basePath: string,
  depth: number,
  visitedFiles: Set<string>,
  params: Record<string, any>
) => Promise<any>;

/**
 * テンプレート解決の具体的な処理を担当
 * 各プロセッサーを統合し、実際のテンプレート解決を実行
 */
export class TemplateResolver {
  private readonly parameterInterpolator: ParameterInterpolator;
  private readonly includeProcessor: IncludeProcessor;
  private readonly conditionalProcessor: ConditionalProcessor;
  private readonly loopProcessor: LoopProcessor;

  constructor(
    private readonly cacheService: TemplateCacheService,
    private readonly validator: TemplateValidator
  ) {
    this.parameterInterpolator = new ParameterInterpolator();
    this.includeProcessor = new IncludeProcessor(this.cacheService);
    this.conditionalProcessor = new ConditionalProcessor();
    this.loopProcessor = new LoopProcessor();
  }

  /**
   * 文字列補間を実行
   */
  interpolateString(data: string, params: Record<string, any>): string {
    return this.parameterInterpolator.interpolateString(data, params);
  }

  /**
   * パラメータを適用
   */
  applyParameters(data: any, params: Record<string, any>): any {
    return this.parameterInterpolator.applyParameters(data, params);
  }

  /**
   * $include構文を処理
   */
  async processInclude(
    includeRef: any,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    parentParams: Record<string, any>,
    resolveTemplates: TemplateResolverFunction
  ): Promise<any> {
    console.log('[TemplateResolver] processInclude開始:', includeRef);
    const includeResult = await this.includeProcessor.process(
      includeRef, basePath, depth, visitedFiles, parentParams
    );
    console.log('[TemplateResolver] includeProcessor結果:', includeResult);

    // 展開結果をInclude型でラップして返す
    const resolved = await resolveTemplates(
      includeResult.templateData,
      includeResult.templatePath,
      includeResult.depth,
      visitedFiles,
      includeResult.mergedParams
    );
    console.log('[TemplateResolver] resolveTemplates結果:', resolved);
    
    const result = { type: 'Include', components: Array.isArray(resolved) ? resolved : [resolved] };
    console.log('[TemplateResolver] 最終結果:', result);
    return result;
  }

  /**
   * $if構文を処理
   */
  async processConditional(
    conditionalRef: any,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>,
    resolveTemplates: TemplateResolverFunction
  ): Promise<any> {
    return this.parameterInterpolator.applyParameters(
      await this.conditionalProcessor.processConditional(
        conditionalRef, basePath, depth, visitedFiles, params, resolveTemplates
      ), 
      params
    );
  }

  /**
   * $foreach構文を処理
   */
  async processForeach(
    foreachRef: any,
    basePath: string,
    depth: number,
    visitedFiles: Set<string>,
    params: Record<string, any>,
    resolveTemplates: TemplateResolverFunction
  ): Promise<any> {
    return this.parameterInterpolator.applyParameters(
      await this.loopProcessor.processForeach(
        foreachRef, basePath, depth, visitedFiles, params, resolveTemplates
      ), 
      params
    );
  }

  /**
   * テンプレートファイルを読み込み（キャッシュ経由）
   */
  async loadTemplateFile(templatePath: string): Promise<string> {
    try {
      const cachedTemplate = await this.cacheService.getTemplate(templatePath);
      return cachedTemplate.content;
    } catch (error) {
      throw new TemplateException(
        TemplateError.FILE_NOT_FOUND,
        templatePath
      );
    }
  }
} 