import * as vscode from 'vscode';
import { PerformanceMonitor } from '../../utils/performance-monitor';
import { TemplateParser } from '../template-parser';
import { SchemaManager } from '../schema-manager';
import { DIContainer, ServiceTokens } from '../../utils/di-container';
import { YamlSyntaxParser } from './yaml-parsers/yaml-syntax-parser';
import { YamlSchemaValidator } from './yaml-parsers/yaml-schema-validator';
import { YamlTemplateResolver } from './yaml-parsers/yaml-template-resolver';

export interface ParsedYamlResult {
  data: any;
  fileName: string;
  content: string;
}

export interface YamlErrorInfo {
  message: string;
  line: number;
  column: number;
  errorLine: string;
  suggestions: string[];
  fileName: string;
}

export interface SchemaErrorInfo {
  message: string;
  errors: any[];
  suggestions: string[];
  fileName: string;
}

/**
 * リファクタリングされたYAML解析クラス
 * 責任を分離し、各処理を専用クラスに委譲
 */
export class YamlParserRefactored {
  private performanceMonitor: PerformanceMonitor;
  private templateParser: TemplateParser;
  private schemaManager: SchemaManager;
  
  // 分割された処理クラス
  private syntaxParser: YamlSyntaxParser;
  private schemaValidator: YamlSchemaValidator;
  private templateResolver: YamlTemplateResolver;

  constructor(schemaManager?: SchemaManager) {
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.templateParser = new TemplateParser();
    
    // DIコンテナからSchemaManagerを取得、または引数で渡されたものを使用
    if (schemaManager) {
      this.schemaManager = schemaManager;
    } else {
      const container = DIContainer.getInstance();
      if (container.has(ServiceTokens.SCHEMA_MANAGER)) {
        this.schemaManager = container.resolve<SchemaManager>(ServiceTokens.SCHEMA_MANAGER);
      } else {
        throw new Error('SchemaManager not available in DI container');
      }
    }

    // 分割された処理クラスを初期化
    this.syntaxParser = new YamlSyntaxParser();
    this.schemaValidator = new YamlSchemaValidator(this.schemaManager);
    this.templateResolver = new YamlTemplateResolver(this.templateParser);
  }

  /**
   * YAMLファイルを解析
   */
  async parseYamlFile(filePath?: string): Promise<ParsedYamlResult> {
    return this.performanceMonitor.measureRenderTime(async () => {
      const activeEditor = vscode.window.activeTextEditor;
      let yamlContent = '';
      let fileName = '';

      if (activeEditor && activeEditor.document.fileName.endsWith('.tui.yml')) {
        yamlContent = activeEditor.document.getText();
        fileName = activeEditor.document.fileName;
      } else if (filePath) {
        // 指定されたファイルを使用
        const document = await vscode.workspace.openTextDocument(filePath);
        yamlContent = document.getText();
        fileName = filePath;
      } else {
        // デフォルトのサンプルデータ
        yamlContent = this.getDefaultSampleYaml();
        fileName = 'sample.tui.yml';
      }

      console.log(`[YamlParserRefactored] 解析対象ファイル: ${fileName}`);
      console.log(`[YamlParserRefactored] ファイル拡張子: ${fileName.split('.').pop()}`);
      console.log(`[YamlParserRefactored] $include含む: ${yamlContent.includes('$include:')}`);
      console.log(`[YamlParserRefactored] $if含む: ${yamlContent.includes('$if:')}`);

      // 1. YAML構文解析
      const parseResult = await this.syntaxParser.parseYamlContent(yamlContent, fileName);

      // 2. テンプレート参照解決
      const resolvedData = await this.templateResolver.resolveTemplates(parseResult.data, fileName);

      // 3. スキーマバリデーション
      await this.schemaValidator.validateYamlSchema(resolvedData, yamlContent, fileName);

      return {
        data: resolvedData,
        fileName: fileName,
        content: yamlContent
      };
    });
  }

  /**
   * パラメータ付きでYAMLファイルを解析
   */
  async parseYamlFileWithParameters(filePath?: string, parameters: Record<string, any> = {}): Promise<ParsedYamlResult> {
    return this.performanceMonitor.measureRenderTime(async () => {
      const activeEditor = vscode.window.activeTextEditor;
      let yamlContent = '';
      let fileName = '';

      if (activeEditor && activeEditor.document.fileName.endsWith('.tui.yml')) {
        yamlContent = activeEditor.document.getText();
        fileName = activeEditor.document.fileName;
      } else if (filePath) {
        // 指定されたファイルを使用
        const document = await vscode.workspace.openTextDocument(filePath);
        yamlContent = document.getText();
        fileName = filePath;
      } else {
        // デフォルトのサンプルデータ
        yamlContent = this.getDefaultSampleYaml();
        fileName = 'sample.tui.yml';
      }

      console.log(`[YamlParserRefactored] パラメータ付き解析対象ファイル: ${fileName}`);
      console.log(`[YamlParserRefactored] パラメータ:`, parameters);

      // 1. YAML構文解析
      const parseResult = await this.syntaxParser.parseYamlContent(yamlContent, fileName);

      // 2. パラメータ付きテンプレート参照解決
      const resolvedData = await this.templateResolver.resolveTemplatesWithParameters(
        parseResult.data, 
        fileName, 
        parameters
      );

      // 3. スキーマバリデーション
      await this.schemaValidator.validateYamlSchema(resolvedData, yamlContent, fileName);

      return {
        data: resolvedData,
        fileName: fileName,
        content: yamlContent
      };
    });
  }

  /**
   * デフォルトのサンプルYAMLを取得
   */
  private getDefaultSampleYaml(): string {
    return `page:
  title: "サンプルページ"
  components:
    - type: Text
      content: "Hello, World!"
      style:
        fontSize: 16
        color: "#333"
    
    - type: Button
      text: "クリックしてください"
      onClick: "handleClick"
      style:
        backgroundColor: "#007bff"
        color: "white"
        padding: "10px 20px"`;
  }
}