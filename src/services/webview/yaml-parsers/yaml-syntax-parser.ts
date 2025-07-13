import * as YAML from 'yaml';
import { PerformanceMonitor } from '../../../utils/performance-monitor';

export interface YamlParseResult {
  data: any;
  content: string;
}

export interface YamlParseError {
  message: string;
  line: number;
  column: number;
  errorLine: string;
  suggestions: string[];
}

/**
 * YAML構文解析専用クラス
 * YAMLのパース処理とエラーハンドリングを担当
 */
export class YamlSyntaxParser {
  private performanceMonitor: PerformanceMonitor;
  private readonly MAX_YAML_SIZE: number = 1024 * 1024; // 1MB制限

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * YAMLコンテンツをパース
   */
  async parseYamlContent(yamlContent: string, fileName: string): Promise<YamlParseResult> {
    return this.performanceMonitor.measureRenderTime(async () => {
      // ファイルサイズ制限をチェック
      this.validateFileSize(yamlContent, fileName);

      try {
        const parsed = YAML.parse(yamlContent);
        return {
          data: parsed,
          content: yamlContent
        };
      } catch (parseError) {
        throw this.createParseError(parseError, yamlContent, fileName);
      }
    });
  }

  /**
   * ファイルサイズを検証
   */
  private validateFileSize(yamlContent: string, fileName: string): void {
    if (yamlContent.length > this.MAX_YAML_SIZE) {
      const error = new Error(`YAMLファイルが大きすぎます（${Math.round(yamlContent.length / 1024)}KB）。1MB以下にしてください。`);
      error.name = 'FileSizeError';
      throw error;
    }
  }

  /**
   * パースエラーを作成
   */
  private createParseError(error: any, yamlContent: string, fileName: string): YamlParseError {
    const errorMessage = error.message || 'Unknown error';
    const lines = yamlContent.split('\n');
    
    // エラーメッセージから行番号を抽出
    const lineMatch = errorMessage.match(/line (\d+)/i);
    const lineNumber = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;
    
    const errorLine = lines[lineNumber] || '';
    const suggestions = this.generateParseErrorSuggestions(errorMessage, errorLine);
    
    const yamlError = new Error(errorMessage);
    yamlError.name = 'YamlParseError';
    (yamlError as any).details = {
      message: errorMessage,
      line: lineNumber + 1,
      column: 0,
      errorLine: errorLine,
      suggestions: suggestions,
      fileName: fileName
    };
    
    throw yamlError;
  }

  /**
   * パースエラー修正の提案を生成
   */
  private generateParseErrorSuggestions(errorMessage: string, errorLine: string): string[] {
    const suggestions: string[] = [];
    
    if (errorMessage.includes('duplicate key')) {
      suggestions.push('重複したキーが存在します。キー名を確認してください。');
    } else if (errorMessage.includes('mapping values')) {
      suggestions.push('YAMLの構文エラーです。インデントとコロンの使用を確認してください。');
    } else if (errorMessage.includes('unexpected end')) {
      suggestions.push('YAMLファイルが不完全です。閉じ括弧やクォートを確認してください。');
    } else if (errorMessage.includes('invalid character')) {
      suggestions.push('無効な文字が含まれています。特殊文字やエンコーディングを確認してください。');
    }
    
    return suggestions;
  }
}