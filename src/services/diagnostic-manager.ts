import * as vscode from 'vscode';
import { ISchemaManager } from '../types';
import { TemplateParser } from './template-parser';
import { 
  YamlSyntaxValidator,
  SchemaValidator,
  TemplateReferenceValidator,
  DiagnosticCacheManager,
  ValidationResult,
  ValidationOptions
} from './validators';

/**
 * 診断管理サービス
 * 各バリデーターを統合して包括的な診断を提供
 */
export class DiagnosticManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private yamlSyntaxValidator: YamlSyntaxValidator;
  private schemaValidator: SchemaValidator;
  private templateReferenceValidator: TemplateReferenceValidator;
  private cacheManager: DiagnosticCacheManager;
  private templateParser: TemplateParser;
  private diagnosticTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 300; // 300ms
  
  constructor(schemaManager: ISchemaManager) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('textui-designer');
    this.templateParser = new TemplateParser();
    
    // バリデーターの初期化
    this.yamlSyntaxValidator = new YamlSyntaxValidator();
    this.schemaValidator = new SchemaValidator(schemaManager);
    this.templateReferenceValidator = new TemplateReferenceValidator(this.templateParser);
    this.cacheManager = new DiagnosticCacheManager();
    
    // 定期的なメンテナンス
    setInterval(() => {
      this.cacheManager.performMaintenance();
    }, 30000); // 30秒ごと
  }

  /**
   * 診断を実行（デバウンス付き）
   */
  async validateAndReportDiagnostics(document: vscode.TextDocument): Promise<void> {
    // 既存のタイマーをクリア
    if (this.diagnosticTimeout) {
      clearTimeout(this.diagnosticTimeout);
    }

    // デバウンスでリアルタイム性を向上
    this.diagnosticTimeout = setTimeout(async () => {
      try {
        await this.performDiagnostics(document);
      } catch (error) {
        console.error('[DiagnosticManager] 診断実行中にエラーが発生しました:', error);
      }
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * 診断を実行
   */
  private async performDiagnostics(document: vscode.TextDocument): Promise<void> {
    const text = document.getText();
    const uri = document.uri.toString();
    
    // キャッシュから検証結果を取得
    const cachedResult = this.cacheManager.get(uri, text);
    if (cachedResult) {
      this.diagnosticCollection.set(document.uri, cachedResult.diagnostics);
      return;
    }

    // 検証オプションを設定
    const options: ValidationOptions = {
      isTemplate: this.isTemplateFile(document.fileName),
      async: true,
      useCache: true
    };

    // 包括的な検証を実行
    const validationResult = await this.performComprehensiveValidation(text, document, options);
    
    // 結果をキャッシュに保存
    this.cacheManager.set(uri, text, validationResult);
    
    // 診断結果をVS Codeに設定
    this.diagnosticCollection.set(document.uri, validationResult.diagnostics);
  }

  /**
   * 包括的な検証を実行
   */
  private async performComprehensiveValidation(
    text: string,
    document: vscode.TextDocument,
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const allDiagnostics: vscode.Diagnostic[] = [];
    let parsedYaml: any = null;
    
    try {
      // 1. YAML構文検証
      const yamlResult = await this.yamlSyntaxValidator.validate(text, document, options);
      allDiagnostics.push(...yamlResult.diagnostics);
      
      // YAML構文エラーがない場合のみ、後続の検証を実行
      if (yamlResult.valid) {
        parsedYaml = require('yaml').parse(text);
        options.parsedYaml = parsedYaml;
        
        // 2. テンプレート参照検証
        const templateResult = await this.templateReferenceValidator.validate(text, document, options);
        allDiagnostics.push(...templateResult.diagnostics);
        
        // 3. テンプレート展開後のスキーマ検証
        if (!options.isTemplate) {
          try {
            const expandedYaml = await this.templateParser.parseWithTemplates(text, document.fileName);
            if (expandedYaml !== null && expandedYaml !== undefined) {
              options.parsedYaml = expandedYaml;
            }
          } catch (error) {
            // テンプレート展開エラーは既にTemplateReferenceValidatorで検出済み
          }
        }
        
        // 4. スキーマ検証
        const schemaResult = await this.schemaValidator.validate(text, document, options);
        allDiagnostics.push(...schemaResult.diagnostics);
      }
      
      return {
        valid: allDiagnostics.length === 0,
        diagnostics: allDiagnostics,
        errors: []
      };
      
    } catch (error) {
      const errorDiagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        `診断エラー: ${error instanceof Error ? error.message : String(error)}`,
        vscode.DiagnosticSeverity.Error
      );
      allDiagnostics.push(errorDiagnostic);
      
      return {
        valid: false,
        diagnostics: allDiagnostics,
        errors: [error]
      };
    }
  }

  /**
   * テンプレートファイルかどうかを判定
   */
  private isTemplateFile(fileName: string): boolean {
    return fileName.endsWith('.template.yml') || fileName.endsWith('.template.yaml');
  }

  /**
   * 診断コレクションをクリア
   */
  clearDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.cacheManager.clear();
  }

  /**
   * 特定のURIの診断をクリア
   */
  clearDiagnosticsForUri(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
    this.cacheManager.deleteByUri(uri.toString());
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cacheManager.clear();
    this.schemaValidator.clearCache();
  }

  /**
   * テンプレートキャッシュを無効化
   */
  invalidateTemplateCache(filePath: string): void {
    this.templateParser.invalidateTemplateCache(filePath);
    this.cacheManager.deleteByUri(filePath);
  }

  /**
   * テンプレートキャッシュの統計情報を取得
   */
  getTemplateCacheStats() {
    return this.templateParser.getCacheStats();
  }

  /**
   * テンプレートキャッシュをクリア
   */
  clearTemplateCache(): void {
    this.templateParser.clearCache();
  }

  /**
   * 診断キャッシュの統計情報を取得
   */
  getDiagnosticCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    if (this.diagnosticTimeout) {
      clearTimeout(this.diagnosticTimeout);
    }
    
    this.diagnosticCollection.dispose();
    this.cacheManager.dispose();
    this.templateParser.dispose();
  }
} 