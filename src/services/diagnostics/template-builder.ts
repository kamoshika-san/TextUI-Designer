import * as vscode from 'vscode';
import type { ErrorObject } from 'ajv';

export type DiagnosticMessageTemplate = {
  code: string;
  summary: string;
  cause: string;
  fix: string;
  severity: vscode.DiagnosticSeverity;
};

export function buildDiagnosticTemplate(error: ErrorObject, suggestedKeys: string[] = []): DiagnosticMessageTemplate {
  switch (error.keyword) {
    case 'required': {
      const missingProperty = (error.params as { missingProperty?: string }).missingProperty || 'unknown';
      return {
        code: 'TUI001',
        summary: `必須キー "${missingProperty}" が不足しています。`,
        cause: `このオブジェクトでは "${missingProperty}" が必須ですが、定義されていません。`,
        fix: `"${missingProperty}" キーを追加し、必要な値を設定してください。`,
        severity: vscode.DiagnosticSeverity.Error
      };
    }
    case 'type': {
      const expectedType = (error.params as { type?: string }).type || 'unknown';
      return {
        code: 'TUI002',
        summary: '値の型が一致していません。',
        cause: `このキーには ${expectedType} 型が必要ですが、別の型が指定されています。`,
        fix: `値を ${expectedType} 型に修正してください。`,
        severity: vscode.DiagnosticSeverity.Error
      };
    }
    case 'additionalProperties': {
      const additionalProperty = (error.params as { additionalProperty?: string }).additionalProperty || 'unknown';
      const suggestionText = suggestedKeys.length > 0
        ? `候補: ${suggestedKeys.map(key => `"${key}"`).join(', ')}。`
        : '';

      return {
        code: 'TUI003',
        summary: `未定義のキー "${additionalProperty}" が含まれています。`,
        cause: 'スキーマで定義されていないキーが指定されています。',
        fix: `キー名を見直すか、不要であれば "${additionalProperty}" を削除してください。${suggestionText}`,
        severity: vscode.DiagnosticSeverity.Warning
      };
    }
    case 'enum': {
      const allowedValues = (error.params as { allowedValues?: unknown[] }).allowedValues;
      const allowed = Array.isArray(allowedValues) ? allowedValues.join(', ') : '定義済みの値';
      return {
        code: 'TUI004',
        summary: '許可されていない値が指定されています。',
        cause: `このキーには決められた値のみ指定できます（許可値: ${allowed}）。`,
        fix: `値を次のいずれかに変更してください: ${allowed}。`,
        severity: vscode.DiagnosticSeverity.Error
      };
    }
    default:
      return {
        code: 'TUI999',
        summary: 'DSLスキーマに一致しない記述があります。',
        cause: error.message || 'スキーマ違反が検出されました。',
        fix: '該当箇所をスキーマ定義に合わせて修正してください。',
        severity: vscode.DiagnosticSeverity.Information
      };
  }
}
