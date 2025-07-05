import * as vscode from 'vscode';
import { ConfigSchema, CONFIG_DEFAULTS, ConfigCategory, ConfigKeysOfCategory } from './config-schema';

/**
 * 型安全な設定管理クラス
 * 
 * リファクタリング後：
 * - 完全な型安全性（コンパイル時エラー検出）
 * - デフォルト値の一元管理
 * - 設定追加時の単一箇所修正
 */
export class TypedConfigManager {
  static readonly CONFIG_SECTION = 'textui-designer';

  /**
   * 型安全な設定値取得
   * 
   * @example
   * ```typescript
   * // 型安全：戻り値の型が自動推論される
   * const theme: 'auto' | 'light' | 'dark' = TypedConfigManager.get('webview.theme');
   * const enabled: boolean = TypedConfigManager.get('autoPreview.enabled');
   * 
   * // コンパイル時エラー：存在しないキー
   * const invalid = TypedConfigManager.get('nonexistent.key'); // ❌ Type Error
   * ```
   */
  static get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    try {
      const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
      const value = config.get<ConfigSchema[K]>(key, CONFIG_DEFAULTS[key]);
      return value;
    } catch (error) {
      console.error(`[TypedConfigManager] 設定取得エラー: ${key}`, error);
      return CONFIG_DEFAULTS[key];
    }
  }

  /**
   * 型安全な設定値設定
   * 
   * @example
   * ```typescript
   * // 型安全：値の型チェックが自動で行われる
   * await TypedConfigManager.set('webview.theme', 'dark'); // ✅ OK
   * await TypedConfigManager.set('webview.theme', 'invalid'); // ❌ Type Error
   * ```
   */
  static async set<K extends keyof ConfigSchema>(
    key: K, 
    value: ConfigSchema[K]
  ): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
      await config.update(key, value, vscode.ConfigurationTarget.Global);
      console.log(`[TypedConfigManager] 設定更新: ${key} = ${JSON.stringify(value)}`);
    } catch (error) {
      console.error(`[TypedConfigManager] 設定更新エラー: ${key}`, error);
      throw error;
    }
  }

  /**
   * カテゴリー別設定取得
   * 
   * @example
   * ```typescript
   * const webviewSettings = TypedConfigManager.getCategory('webview');
   * // 型安全：webviewSettingsには'webview.theme', 'webview.fontSize'等のプロパティが含まれる
   * ```
   */
  static getCategory<T extends ConfigCategory>(category: T): Pick<ConfigSchema, ConfigKeysOfCategory<T>> {
    const prefix = category === 'file' ? '' : `${category}.`;
    const result = {} as any;
    
    for (const [key, _] of Object.entries(CONFIG_DEFAULTS)) {
      const configKey = key as keyof ConfigSchema;
      if (category === 'file' && configKey === 'supportedFileExtensions') {
        result[configKey] = this.get(configKey);
      } else if (configKey.startsWith(prefix)) {
        result[configKey] = this.get(configKey);
      }
    }
    
    return result;
  }

  /**
   * 設定の妥当性検証
   */
  static validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // 各設定項目の型チェック
      const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
      
      // WebViewテーマの検証
      const theme = config.get('webview.theme');
      if (theme !== undefined && !['auto', 'light', 'dark'].includes(theme as string)) {
        errors.push(`webview.theme: 無効な値 "${theme}". 有効値: auto, light, dark`);
      }
      
      // エクスポート形式の検証
      const exportFormat = config.get('export.defaultFormat');
      if (exportFormat !== undefined && !['html', 'react', 'pug'].includes(exportFormat as string)) {
        errors.push(`export.defaultFormat: 無効な値 "${exportFormat}". 有効値: html, react, pug`);
      }
      
      // 数値設定の検証
      const numericSettings: (keyof ConfigSchema)[] = [
        'webview.fontSize',
        'diagnostics.maxProblems',
        'performance.webviewDebounceDelay',
        'performance.diagnosticDebounceDelay',
        'performance.completionDebounceDelay',
        'performance.cacheTTL',
        'performance.schemaCacheTTL',
        'performance.memoryMonitorInterval',
        'performance.minUpdateInterval',
        'performance.maxConcurrentOperations',
        'performance.memoryMeasurementInterval',
        'performance.memoryCleanupInterval'
      ];
      
      for (const key of numericSettings) {
        const value = config.get(key);
        if (value !== undefined && (typeof value !== 'number' || value < 0)) {
          errors.push(`${key}: 正の数値である必要があります. 現在値: ${value}`);
        }
      }
      
      // 配列設定の検証
      const supportedExtensions = config.get('supportedFileExtensions');
      if (supportedExtensions !== undefined && !Array.isArray(supportedExtensions)) {
        errors.push(`supportedFileExtensions: 配列である必要があります. 現在値: ${typeof supportedExtensions}`);
      }
      
      const customTemplates = config.get('templates.customTemplates');
      if (customTemplates !== undefined && !Array.isArray(customTemplates)) {
        errors.push(`templates.customTemplates: 配列である必要があります. 現在値: ${typeof customTemplates}`);
      }
      
    } catch (error) {
      errors.push(`設定検証中にエラーが発生: ${error}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 全設定のリセット（デフォルト値に戻す）
   */
  static async resetConfiguration(): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    
    // 全設定キーを自動で取得してリセット
    for (const key of Object.keys(CONFIG_DEFAULTS) as (keyof ConfigSchema)[]) {
      await config.update(key, undefined, vscode.ConfigurationTarget.Global);
    }
    
    console.log('[TypedConfigManager] 全設定をリセットしました');
  }

  /**
   * 特定カテゴリーの設定をリセット
   */
  static async resetCategory<T extends ConfigCategory>(category: T): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    const prefix = category === 'file' ? '' : `${category}.`;
    
    for (const key of Object.keys(CONFIG_DEFAULTS) as (keyof ConfigSchema)[]) {
      if (category === 'file' && key === 'supportedFileExtensions') {
        await config.update(key, undefined, vscode.ConfigurationTarget.Global);
      } else if (key.startsWith(prefix)) {
        await config.update(key, undefined, vscode.ConfigurationTarget.Global);
      }
    }
    
    console.log(`[TypedConfigManager] ${category}カテゴリーの設定をリセットしました`);
  }

  /**
   * 設定変更の監視
   */
  static onConfigurationChanged<K extends keyof ConfigSchema>(
    keys: K | K[],
    callback: (changedKeys: K[]) => void
  ): vscode.Disposable {
    const targetKeys = Array.isArray(keys) ? keys : [keys];
    
    return vscode.workspace.onDidChangeConfiguration(event => {
      const changedKeys = targetKeys.filter(key => 
        event.affectsConfiguration(`${this.CONFIG_SECTION}.${key}`)
      );
      
      if (changedKeys.length > 0) {
        callback(changedKeys);
      }
    });
  }

  /**
   * 現在の設定をJSON形式でエクスポート
   */
  static exportConfiguration(): ConfigSchema {
    const exported = {} as any;
    
    for (const key of Object.keys(CONFIG_DEFAULTS) as (keyof ConfigSchema)[]) {
      exported[key] = this.get(key);
    }
    
    return exported as ConfigSchema;
  }

  /**
   * 設定をJSONからインポート
   * 注意: 型安全性のため、個別設定メソッドの使用を推奨
   */
  static async importConfiguration(settings: Partial<ConfigSchema>): Promise<void> {
    console.log('[TypedConfigManager] 設定インポートを開始します');
    
    // 型安全性を保つため、設定の存在チェックのみ実行
    const validKeys = Object.keys(settings).filter(key => key in CONFIG_DEFAULTS);
    const invalidKeys = Object.keys(settings).filter(key => !(key in CONFIG_DEFAULTS));
    
    if (invalidKeys.length > 0) {
      console.warn(`[TypedConfigManager] 不明な設定キー:`, invalidKeys);
    }
    
    console.log(`[TypedConfigManager] 有効な設定項目: ${validKeys.length}個`);
    console.log('[TypedConfigManager] 型安全性のため、個別にTypedConfigManager.set()を使用してください');
  }

  /**
   * 設定の統計情報を取得
   */
  static getConfigurationStats(): {
    totalSettings: number;
    modifiedSettings: number;
    defaultSettings: number;
    categories: Record<ConfigCategory, number>;
  } {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    let modifiedCount = 0;
    const categoryStats: Record<ConfigCategory, number> = {
      file: 0,
      autoPreview: 0,
      devTools: 0,
      webview: 0,
      export: 0,
      diagnostics: 0,
      schema: 0,
      templates: 0,
      performance: 0
    };
    
    for (const key of Object.keys(CONFIG_DEFAULTS) as (keyof ConfigSchema)[]) {
      const currentValue = this.get(key);
      const defaultValue = CONFIG_DEFAULTS[key];
      
      if (JSON.stringify(currentValue) !== JSON.stringify(defaultValue)) {
        modifiedCount++;
      }
      
      // カテゴリー統計
      if (key === 'supportedFileExtensions') {
        categoryStats.file++;
      } else if (key.startsWith('autoPreview.')) {
        categoryStats.autoPreview++;
      } else if (key.startsWith('devTools.')) {
        categoryStats.devTools++;
      } else if (key.startsWith('webview.')) {
        categoryStats.webview++;
      } else if (key.startsWith('export.')) {
        categoryStats.export++;
      } else if (key.startsWith('diagnostics.')) {
        categoryStats.diagnostics++;
      } else if (key.startsWith('schema.')) {
        categoryStats.schema++;
      } else if (key.startsWith('templates.')) {
        categoryStats.templates++;
      } else if (key.startsWith('performance.')) {
        categoryStats.performance++;
      }
    }
    
    const totalSettings = Object.keys(CONFIG_DEFAULTS).length;
    
    return {
      totalSettings,
      modifiedSettings: modifiedCount,
      defaultSettings: totalSettings - modifiedCount,
      categories: categoryStats
    };
  }
} 