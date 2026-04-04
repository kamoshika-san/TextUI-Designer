import type { ErrorObject } from 'ajv';
import { parseYamlTextAsync } from '../../dsl/yaml-parse-async';

export interface SemanticDiagnostic {
  path: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

/**
 * 意味論的なデザイン診断（アクセシビリティ、規約チェックなど）を実行するエンジン
 */
export class SemanticDiagnosticEngine {
  async analyze(text: string): Promise<SemanticDiagnostic[]> {
    const diagnostics: SemanticDiagnostic[] = [];
    try {
      const dsl = await parseYamlTextAsync(text);
      if (!dsl || typeof dsl !== 'object') {
        return [];
      }

      this.analyzeNode(dsl, '', diagnostics);
    } catch (e) {
      // パースエラーは Schema バリデーション側に任せる
    }
    return diagnostics;
  }

  private analyzeNode(node: any, path: string, diagnostics: SemanticDiagnostic[]): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // 1. Image の alt 属性チェック
    if (node.Image) {
      const img = node.Image;
      if (!img.alt || img.alt.trim() === '') {
        diagnostics.push({
          path: `${path}/Image`,
          message: '画像に代替テキスト（alt）が設定されていません。アクセシビリティ向上のために設定を推奨します。',
          severity: 'warning',
          code: 'TUI_DESIGN_001'
        });
      }
    }

    // 2. Button のラベルチェック
    if (node.Button) {
      const btn = node.Button;
      if (!btn.label || btn.label.trim() === '') {
        diagnostics.push({
          path: `${path}/Button`,
          message: 'ボタンにラベルが設定されていません。何をするボタンか明確にする必要があります。',
          severity: 'error',
          code: 'TUI_DESIGN_002'
        });
      }
    }

    // 再帰的に探索
    for (const key in node) {
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((item, index) => {
          this.analyzeNode(item, `${path}/${key}/${index}`, diagnostics);
        });
      } else if (child && typeof child === 'object') {
        this.analyzeNode(child, `${path}/${key}`, diagnostics);
      }
    }
  }
}
