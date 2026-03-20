/**
 * React エクスポート時の既定ページ（import + GeneratedUI ラッパー）文字列を組み立てる。
 */
export function buildReactPageDocument(componentCode: string): string {
  return `import React from 'react';

export default function GeneratedUI() {
  return (
    <div className="p-6">
${componentCode}
    </div>
  );
}`;
}
