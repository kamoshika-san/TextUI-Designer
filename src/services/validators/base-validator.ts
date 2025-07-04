import * as vscode from 'vscode';

/**
 * 検証結果の型定義
 */
export interface ValidationResult {
  valid: boolean;
  diagnostics: vscode.Diagnostic[];
  errors?: any[];
}

/**
 * バリデーターの基本インターフェース
 */
export interface IValidator {
  /**
   * 検証を実行
   */
  validate(
    text: string,
    document: vscode.TextDocument,
    options?: ValidationOptions
  ): Promise<ValidationResult>;
}

/**
 * 検証オプション
 */
export interface ValidationOptions {
  /** テンプレートファイルかどうか */
  isTemplate?: boolean;
  /** 非同期処理で実行するかどうか */
  async?: boolean;
  /** キャッシュを使用するかどうか */
  useCache?: boolean;
  /** 追加のパラメータ */
  [key: string]: any;
}

/**
 * 基本的なバリデーター実装
 */
export abstract class BaseValidator implements IValidator {
  
  abstract validate(
    text: string,
    document: vscode.TextDocument,
    options?: ValidationOptions
  ): Promise<ValidationResult>;

  /**
   * 診断情報を作成
   */
  protected createDiagnostic(
    message: string,
    range: vscode.Range,
    severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error
  ): vscode.Diagnostic {
    return new vscode.Diagnostic(range, message, severity);
  }

  /**
   * 文字列が含まれる行番号を検索
   */
  protected findLineNumber(text: string, searchString: string): number {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchString)) {
        return i;
      }
    }
    return 0;
  }

  /**
   * 文字列の位置から範囲を作成
   */
  protected createRangeFromPosition(
    document: vscode.TextDocument,
    text: string,
    searchString: string
  ): vscode.Range {
    const start = text.indexOf(searchString);
    if (start === -1) {
      return new vscode.Range(0, 0, 0, 1);
    }
    
    const startPos = document.positionAt(start);
    const endPos = document.positionAt(start + searchString.length);
    return new vscode.Range(startPos, endPos);
  }
} 