import { buildProtectedBlock, extractProtectedRegion, PROTECTED_END, PROTECTED_START } from './protected-region-utils';

/**
 * React エクスポート時の既定ページ（import + GeneratedUI ラッパー）文字列を組み立てる。
 */
export function buildReactPageDocument(componentCode: string, outputPath?: string): string {
  const existingLogic = outputPath ? extractProtectedRegion(outputPath) : undefined;
  const protectedBlock = buildProtectedBlock(existingLogic);

  // For React, we wrap the block in a comment since it's likely outside the component or in a specific spot
  const logicComment = `/**
 * ${protectedBlock.replace(/\n/g, '\n * ')}
 */`;

  return `import React from 'react';

${logicComment}

export default function GeneratedUI() {
  return (
    <div className="p-6">
${componentCode}
    </div>
  );
}`;
}
