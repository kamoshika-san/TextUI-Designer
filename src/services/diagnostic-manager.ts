import * as vscode from 'vscode';
import * as YAML from 'yaml';
import Ajv from 'ajv';
import { TextUIMemoryTracker } from '../utils/textui-memory-tracker';
import { ISchemaManager, SchemaDefinition, SchemaValidationError } from '../types';
import { TemplateParser, TemplateException, TemplateError } from './template-parser';

/**
 * 診断管理サービス
 * YAML/JSONファイルのバリデーションとエラー表示を担当
 */
export class DiagnosticManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private schemaManager: ISchemaManager;
  private templateParser: TemplateParser;
  private validationCache: Map<string, { content: string; diagnostics: vscode.Diagnostic[]; timestamp: number }> = new Map();
  private validationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private ajvInstance: Ajv | null = null;
  private schemaCache: SchemaDefinition | null = null;
  private lastSchemaLoad: number = 0;
  private readonly CACHE_TTL = 5000; // 5秒
  private readonly DEBOUNCE_DELAY = 500; // 500ms
  private diagnosticTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_CACHE_SIZE = 100; // キャッシュサイズ制限
  private readonly MAX_CACHE_AGE = 30000; // 30秒でキャッシュをクリア
  private memoryTracker: TextUIMemoryTracker;

  constructor(schemaManager: ISchemaManager) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('textui-designer');
    this.schemaManager = schemaManager;
    this.templateParser = new TemplateParser();
    this.memoryTracker = TextUIMemoryTracker.getInstance();
  }

  /**
   * 診断を実行（デバウンス付き）
   */
  async validateAndReportDiagnostics(document: vscode.TextDocument): Promise<void> {
    // 既存のタイマーをクリア
    if (this.diagnosticTimeout) {
      clearTimeout(this.diagnosticTimeout);
    }

    // より短いデバウンス時間（300ms）でリアルタイム性を向上
    this.diagnosticTimeout = setTimeout(async () => {
      try {
        await this.performDiagnostics(document);
      } catch (error) {
        // エラーは静かに処理
      }
    }, 300);
  }

  /**
   * 診断を実行
   */
  private async performDiagnostics(document: vscode.TextDocument): Promise<void> {
    const text = document.getText();
    const uri = document.uri.toString();
    
    // 古いキャッシュをクリーンアップ
    this.cleanupOldCache();
    
    // キャッシュサイズ制限をチェック
    if (this.validationCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupOldCache(true); // 強制クリーンアップ
    }
    
    // キャッシュをチェック
    const cacheKey = `${uri}:${this.hashText(text)}`;
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return;
    }

    // 診断を実行
    await this.performValidation(document, text, false);
    
    // キャッシュに保存
    const currentDiagnostics = this.diagnosticCollection.get(document.uri) || [];
    this.validationCache.set(cacheKey, {
      content: text,
      timestamp: Date.now(),
      diagnostics: [...currentDiagnostics] // 配列をコピー
    });
  }

  /**
   * 実際の検証処理を実行
   */
  private async performValidation(document: vscode.TextDocument, text: string, isTemplate: boolean): Promise<void> {
    const uri = document.uri.toString();
    const now = Date.now();

    // キャッシュチェック
    const cached = this.validationCache.get(uri);
    if (cached && cached.content === text && (now - cached.timestamp) < this.CACHE_TTL) {
      this.diagnosticCollection.set(document.uri, cached.diagnostics);
      return;
    }

    let diagnostics: vscode.Diagnostic[] = [];

    try {
      // テンプレート参照の検証（スキーマバリデーションの前）
      if (!isTemplate) {
        const templateDiagnostics = await this.validateTemplateReferences(text, document);
        diagnostics.push(...templateDiagnostics);
      }

      // YAMLパース処理を非同期で実行（ブロッキングを防ぐ）
      const yaml = await new Promise((resolve, reject) => {
        setImmediate(() => {
          try {
            const parsed = YAML.parse(text);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      // テンプレート参照を展開してからスキーマバリデーションを実行
      let expandedYaml = yaml;
      if (!isTemplate) {
        try {
          const expanded = await this.templateParser.parseWithTemplates(text, document.fileName);
          // 展開結果がnullでない場合のみ使用
          if (expanded !== null && expanded !== undefined) {
            expandedYaml = expanded;
          }
        } catch (error) {
          // テンプレート展開エラーは既にvalidateTemplateReferencesで検出済み
        }
      }
      
      // スキーマキャッシュの更新チェック
      if (!this.schemaCache || (now - this.lastSchemaLoad) > this.CACHE_TTL) {
        this.schemaCache = await this.schemaManager.loadSchema();
        this.lastSchemaLoad = now;
        
        // 古いAjvインスタンスを破棄して新しいインスタンスを作成
        if (this.ajvInstance) {
          this.ajvInstance = null;
        }
        this.ajvInstance = new Ajv({ 
          allErrors: true, 
          allowUnionTypes: true,
          verbose: true,
          strict: false,
          strictTypes: false,
          strictRequired: false,
          validateFormats: false,
          validateSchema: false,
          useDefaults: true,
          coerceTypes: true
        });
      }

      if (!this.ajvInstance) {
        this.ajvInstance = new Ajv({ 
          allErrors: true, 
          allowUnionTypes: true,
          verbose: true,
          strict: false,
          strictTypes: false,
          strictRequired: false,
          validateFormats: false,
          validateSchema: false,
          useDefaults: true,
          coerceTypes: true
        });
      }
      
      let validate;
      if (isTemplate) {
        // テンプレート用: テンプレート専用スキーマを使用
        const templateSchema = await this.schemaManager.loadTemplateSchema();
        if (!templateSchema) {
          throw new Error('テンプレートスキーマの読み込みに失敗しました');
        }
        validate = this.ajvInstance.compile(templateSchema);
      } else {
        if (!this.schemaCache) {
          throw new Error('スキーマキャッシュが初期化されていません');
        }
        validate = this.ajvInstance.compile(this.schemaCache);
      }

      // カスタムバリデーションを実行
      const customValidationResult = this.validateComponentStructure(expandedYaml);
      if (!customValidationResult.valid) {
        const schemaDiagnostics = this.createDiagnosticsFromErrors(customValidationResult.errors, text, document);
        diagnostics.push(...schemaDiagnostics);
      } else {
        console.log('[DiagnosticManager] カスタムバリデーション成功 - Ajvバリデーションをスキップ');
      }

      // 以下のAjvバリデーションは現在無効化
      // const valid = validate(expandedYaml);
      // if (!valid && validate.errors) {
      //   console.log('[DiagnosticManager] スキーマバリデーションエラー詳細:', JSON.stringify(validate.errors, null, 2));
      //   console.log('[DiagnosticManager] バリデーション対象データ:', JSON.stringify(expandedYaml, null, 2));
      //   console.log('[DiagnosticManager] スキーマ定義:', JSON.stringify(this.schemaCache?.definitions?.component, null, 2));
      //   
      //   // 各コンポーネントのoneOfバリデーションを個別にテスト
      //   if ((expandedYaml as any).page && (expandedYaml as any).page.components) {
      //     console.log('[DiagnosticManager] コンポーネント配列の詳細:');
      //     (expandedYaml as any).page.components.forEach((comp: any, index: number) => {
      //       console.log(`[DiagnosticManager] コンポーネント[${index}]:`, JSON.stringify(comp, null, 2));
      //       const compKeys = Object.keys(comp);
      //       console.log(`[DiagnosticManager] コンポーネント[${index}]のキー:`, compKeys);
      //     });
      //   }
      //   
      //   const schemaDiagnostics = this.createDiagnosticsFromErrors(validate.errors, text, document);
      //   diagnostics.push(...schemaDiagnostics);
      // }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const diag = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        msg,
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diag);
    }

    // キャッシュを更新
    const cacheEntry = {
      content: text,
      timestamp: now,
      diagnostics: diagnostics
    };
    
    this.validationCache.set(uri, cacheEntry);

    // 診断キャッシュエントリのメモリ追跡
    const entrySize = this.estimateDiagnosticCacheSize(cacheEntry);
    this.memoryTracker.trackDiagnosticsObject(cacheEntry, entrySize, {
      uri,
      contentSize: text.length,
      diagnosticCount: diagnostics.length
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * テンプレート参照を検証
   */
  private async validateTemplateReferences(
    text: string,
    document: vscode.TextDocument
  ): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      // $include構文が含まれている場合のみ循環参照を検出
      if (text.includes('$include:')) {
        const circularRefs = this.templateParser.detectCircularReferences(text, document.fileName);
        for (const ref of circularRefs) {
          const diag = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 1),
            `循環参照が検出されました: ${ref}`,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diag);
        }
      }

      // $include構文を検索してテンプレートファイルの存在確認
      const includeMatches = text.match(/\$include:\s*\n\s*template:\s*["']?([^"\n]+)["']?/g);
      if (includeMatches) {
        for (const match of includeMatches) {
          const templatePathMatch = match.match(/template:\s*["']?([^"\n]+)["']?/);
          if (templatePathMatch) {
            const templatePath = templatePathMatch[1];
            const exists = await this.templateParser.validateTemplatePath(templatePath, document.fileName);
            if (!exists) {
              const lineNumber = this.findLineNumber(text, match);
              const diag = new vscode.Diagnostic(
                new vscode.Range(lineNumber, 0, lineNumber, match.length),
                `テンプレートファイルが見つかりません: ${templatePath}`,
                vscode.DiagnosticSeverity.Error
              );
              diagnostics.push(diag);
            }
          }
        }
      }

      // $if構文の検証（テンプレートファイルの場合のみ）
      if (document.fileName.endsWith('.template.yml') || document.fileName.endsWith('.template.yaml')) {
        const ifMatches = text.match(/\$if:\s*\n\s*condition:\s*["']?([^"\n]+)["']?/g);
        if (ifMatches) {
          for (const match of ifMatches) {
            const conditionMatch = match.match(/condition:\s*["']?([^"\n]+)["']?/);
            if (conditionMatch) {
              const condition = conditionMatch[1];
              
              // 条件式の基本的な検証
              if (!this.isValidConditionExpression(condition)) {
                const lineNumber = this.findLineNumber(text, match);
                const diag = new vscode.Diagnostic(
                  new vscode.Range(lineNumber, 0, lineNumber, match.length),
                  `無効な条件式です: ${condition}`,
                  vscode.DiagnosticSeverity.Warning
                );
                diagnostics.push(diag);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[DiagnosticManager] テンプレート参照検証でエラーが発生しました:', error);
    }

    return diagnostics;
  }

  /**
   * 文字列が含まれる行番号を検索
   */
  private findLineNumber(text: string, searchString: string): number {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchString)) {
        return i;
      }
    }
    return 0;
  }

  /**
   * 条件式が有効かどうかを検証
   */
  private isValidConditionExpression(condition: string): boolean {
    const trimmedCondition = condition.trim();
    
    // $params.xxx 形式の変数参照
    if (trimmedCondition.startsWith('$params.')) {
      return true;
    }
    
    // 真偽値の直接指定
    if (trimmedCondition === 'true' || trimmedCondition === 'false') {
      return true;
    }
    
    // 数値
    if (/^\d+$/.test(trimmedCondition)) {
      return true;
    }
    
    // 文字列（引用符で囲まれている）
    if ((trimmedCondition.startsWith('"') && trimmedCondition.endsWith('"')) ||
        (trimmedCondition.startsWith("'") && trimmedCondition.endsWith("'"))) {
      return true;
    }
    
    return false;
  }

  /**
   * エラーから診断情報を作成
   */
  private createDiagnosticsFromErrors(
    errors: any[],
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const err of errors) {
      const key = err.instancePath?.split('/').filter(Boolean).pop();
      if (key) {
        const regex = new RegExp(`^\\s*${key}:`, 'm');
        const match = text.match(regex);
        if (match) {
          const start = text.indexOf(match[0]);
          const startPos = document.positionAt(start);
          const endPos = document.positionAt(start + match[0].length);
          const diag = new vscode.Diagnostic(
            new vscode.Range(startPos, endPos),
            err.message || 'スキーマエラー',
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diag);
        }
      }
    }

    return diagnostics;
  }

  /**
   * 診断コレクションをクリア
   */
  clearDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.validationCache.clear();
    this.validationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.validationTimeouts.clear();
  }

  /**
   * 特定のURIの診断をクリア
   */
  clearDiagnosticsForUri(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
    this.validationCache.delete(uri.toString());
    
    const timeout = this.validationTimeouts.get(uri.toString());
    if (timeout) {
      clearTimeout(timeout);
      this.validationTimeouts.delete(uri.toString());
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.validationCache.clear();
    this.schemaCache = null;
    
    // Ajvインスタンスを適切に破棄
    if (this.ajvInstance) {
      this.ajvInstance = null;
    }
    
    this.lastSchemaLoad = 0;
  }

  /**
   * 診断コレクションを破棄
   */
  dispose(): void {
    this.clearDiagnostics();
    
    // 診断タイマーをクリア
    if (this.diagnosticTimeout) {
      clearTimeout(this.diagnosticTimeout);
      this.diagnosticTimeout = null;
    }
    
    this.diagnosticCollection.dispose();
  }

  /**
   * テキストのハッシュを生成
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString();
  }

  /**
   * 古いキャッシュをクリーンアップ
   */
  private cleanupOldCache(force: boolean = false): void {
    const now = Date.now();
    const oldCache = [];

    for (const [key, { timestamp }] of this.validationCache) {
      if (force || (now - timestamp > this.MAX_CACHE_AGE)) {
        oldCache.push(key);
      }
    }

    for (const key of oldCache) {
      this.validationCache.delete(key);
    }
  }

  /**
   * コンポーネント構造をカスタムバリデーション
   */
  private validateComponentStructure(data: any): { valid: boolean; errors: any[] } {
    const errors: any[] = [];
    
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: [{ message: 'データが無効です' }] };
    }

    // page.componentsのバリデーション
    if (data.page && data.page.components) {
      if (!Array.isArray(data.page.components)) {
        errors.push({
          instancePath: '/page/components',
          message: 'componentsは配列である必要があります'
        });
      } else {
        data.page.components.forEach((comp: any, index: number) => {
          if (!comp || typeof comp !== 'object') {
            errors.push({
              instancePath: `/page/components/${index}`,
              message: 'コンポーネントはオブジェクトである必要があります'
            });
            return;
          }

          const compKeys = Object.keys(comp);
          if (compKeys.length !== 1) {
            errors.push({
              instancePath: `/page/components/${index}`,
              message: 'コンポーネントは正確に1つのキーを持つ必要があります'
            });
            return;
          }

          const componentType = compKeys[0];
          const validTypes = ['Text', 'Input', 'Button', 'Form', 'Checkbox', 'Radio', 'Select', 'Divider', 'Container', 'Alert'];
          
          if (!validTypes.includes(componentType)) {
            errors.push({
              instancePath: `/page/components/${index}`,
              message: `無効なコンポーネントタイプ: ${componentType}`
            });
          }
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 診断キャッシュエントリのメモリサイズを推定
   */
  private estimateDiagnosticCacheSize(entry: { content: string; diagnostics: vscode.Diagnostic[]; timestamp: number }): number {
    // content文字列のサイズ（UTF-16想定）
    const contentSize = entry.content.length * 2;
    
    // timestamp数値のサイズ（8バイト）
    const timestampSize = 8;
    
    // diagnostics配列のサイズを推定
    let diagnosticsSize = 16; // 配列のベースサイズ
    for (const diagnostic of entry.diagnostics) {
      // 各診断メッセージのサイズ
      const messageSize = diagnostic.message.length * 2;
      
      // Range情報のサイズ（Position × 2 × 2プロパティ）
      const rangeSize = 16; // line, character プロパティ × 2 × 2
      
      // その他のプロパティのオーバーヘッド
      const diagnosticOverhead = 32;
      
      diagnosticsSize += messageSize + rangeSize + diagnosticOverhead;
    }
    
    // オブジェクトのオーバーヘッド
    const objectOverhead = 48;
    
    return contentSize + timestampSize + diagnosticsSize + objectOverhead;
  }
} 