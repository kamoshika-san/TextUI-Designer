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
    const includeResult = await this.includeProcessor.process(
      includeRef, basePath, depth, visitedFiles, parentParams
    );

    // includeProcessorから返される情報を使って再帰的に解決
    return await resolveTemplates(
      includeResult.templateData,
      includeResult.templatePath,
      includeResult.depth,
      visitedFiles,
      includeResult.mergedParams
    );
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