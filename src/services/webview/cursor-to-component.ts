/**
 * YAML カーソル行 → コンポーネントインデックス解決ユーティリティ（T-U02）
 *
 * page.components の各要素は `  - ` で始まる行が先頭。
 * YAML パースライブラリを使わず行スキャンのみで解決する。
 */

/**
 * YAML テキストの指定行番号（0-based）から、
 * page.components 配列内のコンポーネントインデックスを返す。
 *
 * - カーソルが components: セクション外にある場合は null
 * - カーソルがコンポーネント要素またはそのプロパティ行にある場合はインデックスを返す
 */
export function cursorLineToComponentIndex(
  yamlContent: string,
  lineNumber: number,
): number | null {
  const lines = yamlContent.split('\n');
  let componentIndex = -1;
  let inComponents = false;

  for (let i = 0; i <= Math.min(lineNumber, lines.length - 1); i++) {
    const line = lines[i];

    // components: セクションの開始を検出
    if (/^\s+components\s*:/.test(line) || /^components\s*:/.test(line)) {
      inComponents = true;
      continue;
    }

    if (inComponents) {
      // インデント 0 の新セクション → components を抜ける
      if (/^\S/.test(line)) {
        inComponents = false;
        continue;
      }
      // `  - ` 形式のリストアイテム先頭
      if (/^\s+- /.test(line)) {
        componentIndex++;
      }
    }
  }

  if (!inComponents || componentIndex < 0) {
    return null;
  }
  return componentIndex;
}
