import * as path from 'path';
import * as fs from 'fs';
import { TemplateError, TemplateException } from '../template-parser';

/**
 * テンプレートの検証を担当
 * 構文チェック、パス検証、循環参照検出などを実行
 */
export class TemplateValidator {
  /**
   * 条件分岐構文の検証
   */
  validateConditionalSyntax(data: any, basePath: string): boolean {
    if (!data.$if || typeof data.$if !== 'object') {
      throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
    }

    const conditional = data.$if;
    if (!conditional.condition || !conditional.template) {
      throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
    }

    return true;
  }

  /**
   * foreach構文の検証
   */
  validateForeachSyntax(data: any, basePath: string): boolean {
    if (!data.$foreach || typeof data.$foreach !== 'object') {
      throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
    }

    const foreach = data.$foreach;
    if (!foreach.items || !foreach.as || !foreach.template) {
      throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
    }

    return true;
  }

  /**
   * 特殊構文の検証
   */
  validateSpecialSyntax(data: any, basePath: string): void {
    const specialKeys = Object.keys(data).filter(key => key.startsWith('$'));
    if (specialKeys.length > 0) {
      const validSpecialKeys = ['$if', '$foreach', '$include'];
      const invalidKeys = specialKeys.filter(key => !validSpecialKeys.includes(key));
      if (invalidKeys.length > 0) {
        throw new TemplateException(TemplateError.SYNTAX_ERROR, basePath);
      }
    }
  }

  /**
   * テンプレートパスが有効かどうかを検証
   */
  async validateTemplatePath(templatePath: string, basePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolveTemplatePath(templatePath, basePath);
      return fs.existsSync(resolvedPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 循環参照を検出
   */
  detectCircularReferences(content: string, basePath: string): string[] {
    // 簡易的な循環参照検出
    // 実際の実装ではより詳細な解析が必要
    const includePattern = /\$include:\s*([^\s]+)/g;
    const includes: string[] = [];
    let match;

    while ((match = includePattern.exec(content)) !== null) {
      includes.push(match[1]);
    }

    return includes;
  }

  /**
   * テンプレートパスを解決
   */
  private resolveTemplatePath(templatePath: string, basePath: string): string {
    if (path.isAbsolute(templatePath)) {
      return templatePath;
    }

    const baseDir = path.dirname(basePath);
    return path.resolve(baseDir, templatePath);
  }
} 