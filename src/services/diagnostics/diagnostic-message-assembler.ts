import type { DiagnosticMessageTemplate } from './template-builder';

/**
 * AJV エラー由来のテンプレートから VS Code 診断用の複数行メッセージを組み立てる（DiagnosticManager から分離）。
 */
export function assembleDiagnosticMarkdownMessage(
  template: DiagnosticMessageTemplate,
  locationLabel: string
): string {
  return [`[${template.code}] ${template.summary}`, `原因: ${template.cause}`, `修正: ${template.fix}`, `場所: ${locationLabel}`].join('\n');
}
