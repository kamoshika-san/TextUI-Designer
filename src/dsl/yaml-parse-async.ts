import * as YAML from 'yaml';

/**
 * エディタ／診断／補完など複数経路で共有する YAML 構文パース（非同期スケジューリング付き）。
 * `setImmediate` でメインスレッドを譲り、`yaml` パッケージの `parse` を 1 箇所に集約する（T-067 第1スライス）。
 */
export function parseYamlTextAsync(text: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        resolve(YAML.parse(text));
      } catch (error) {
        reject(error);
      }
    });
  });
}
