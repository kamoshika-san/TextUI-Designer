import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../utils/logger';

/**
 * 解決されたスキーマパス情報
 */
export interface ResolvedSchemaPaths {
  /** メインスキーマファイルのパス */
  schemaPath: string;
  /** テンプレートスキーマファイルのパス */
  templateSchemaPath: string;
  /** テーマスキーマファイルのパス */
  themeSchemaPath: string;
}

/**
 * スキーマファイルのパス解決処理を担当するクラス
 */
export class SchemaPathResolver {
  private context: vscode.ExtensionContext;
  private resolvedPaths: ResolvedSchemaPaths | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * スキーマファイルのパスを解決
   */
  resolvePaths(): ResolvedSchemaPaths {
    if (this.resolvedPaths) {
      return this.resolvedPaths;
    }

    const schemaPath = this.findSchemaFile();
    const schemaDir = path.dirname(schemaPath);
    
    this.resolvedPaths = {
      schemaPath,
      templateSchemaPath: path.join(schemaDir, 'template-schema.json'),
      themeSchemaPath: path.join(schemaDir, 'theme-schema.json')
    };

    logger.debug('パス解決完了');
    logger.debug('スキーマパス:', this.resolvedPaths.schemaPath);
    logger.debug('テンプレートスキーマパス:', this.resolvedPaths.templateSchemaPath);
    logger.debug('テーマスキーマパス:', this.resolvedPaths.themeSchemaPath);

    return this.resolvedPaths;
  }

  /**
   * メインスキーマファイルを検索
   */
  private findSchemaFile(): string {
    const possiblePaths = this.generatePossiblePaths();
    
    // 最初に存在するパスを使用
    for (const schemaPath of possiblePaths) {
      if (fs.existsSync(schemaPath)) {
        logger.debug('スキーマパスを設定:', schemaPath);
        return schemaPath;
      }
    }
    
    logger.error('スキーマファイルが見つかりません。検索したパス:', possiblePaths);
    
    // フォールバックとしてデフォルトパスを使用
    const fallbackPath = path.join(this.context.extensionPath, 'schemas', 'schema.json');
    logger.warn('フォールバックパスを使用:', fallbackPath);
    return fallbackPath;
  }

  /**
   * 検索対象のパス候補を生成
   */
  private generatePossiblePaths(): string[] {
    return [
      // 拡張機能のschemas/schema.json
      path.join(this.context.extensionPath, 'schemas', 'schema.json'),
      // 開発時のパス (out/schemas)
      path.join(__dirname, '..', '..', 'schemas', 'schema.json'),
      // ワークスペースのschemas/schema.json
      path.join(process.cwd(), 'schemas', 'schema.json'),
      // srcディレクトリ基準のパス
      path.join(__dirname, '..', '..', '..', 'schemas', 'schema.json')
    ];
  }

  /**
   * 特定のスキーマファイルが存在するかチェック
   */
  validatePaths(): { valid: boolean; missing: string[] } {
    const paths = this.resolvePaths();
    const missing: string[] = [];
    
    if (!fs.existsSync(paths.schemaPath)) {
      missing.push(`メインスキーマ: ${paths.schemaPath}`);
    }
    
    if (!fs.existsSync(paths.templateSchemaPath)) {
      missing.push(`テンプレートスキーマ: ${paths.templateSchemaPath}`);
    }
    
    if (!fs.existsSync(paths.themeSchemaPath)) {
      missing.push(`テーマスキーマ: ${paths.themeSchemaPath}`);
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * スキーマファイルのURI文字列を取得
   */
  getSchemaUris(): { 
    schemaUri: string; 
    templateSchemaUri: string; 
    themeSchemaUri: string; 
  } {
    const paths = this.resolvePaths();
    
    return {
      schemaUri: vscode.Uri.file(paths.schemaPath).toString(),
      templateSchemaUri: vscode.Uri.file(paths.templateSchemaPath).toString(),
      themeSchemaUri: vscode.Uri.file(paths.themeSchemaPath).toString()
    };
  }

  /**
   * デバッグ情報を出力（開発環境でのみ有効）
   */
  debugPaths(): void {
    if (!logger.isDevMode()) {
      logger.warn('デバッグ機能は開発環境でのみ利用可能です');
      return;
    }

    const paths = this.resolvePaths();
    const validation = this.validatePaths();
    
    logger.schema('デバッグ情報:');
    logger.schema('- スキーマパス:', paths.schemaPath);
    logger.schema('- テンプレートスキーマパス:', paths.templateSchemaPath);
    logger.schema('- テーマスキーマパス:', paths.themeSchemaPath);
    logger.schema('- パス検証結果:', validation.valid ? '正常' : '異常');
    
    if (!validation.valid) {
      logger.schema('- 見つからないファイル:', validation.missing);
    }
    
    logger.schema('- 検索パス候補:', this.generatePossiblePaths());
  }

  /**
   * キャッシュをクリア（パス再解決用）
   */
  clearCache(): void {
    this.resolvedPaths = null;
    logger.debug('パスキャッシュをクリア');
  }
} 