import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { TextUIDSL } from '../domain/dsl-types';
import { YamlIncludeResolverSync } from './yaml-include-resolver-sync';

/**
 * DSL ファイルを読み、`$include` を WebView と同じ規則で展開する（同期）。
 * CLI の `loadDslFromFile`・プレビューキャプチャの `parseDslFile` の共通入口。
 */
export function loadDslWithIncludesFromPath(filePath: string): { dsl: TextUIDSL; sourcePath: string; raw: string } {
  const sourcePath = path.resolve(filePath);
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const parsed = YAML.parse(raw);
  const resolver = new YamlIncludeResolverSync((content, _fileName) => YAML.parse(content));
  const dsl = resolver.resolve(parsed, sourcePath) as TextUIDSL;
  return { dsl, sourcePath, raw };
}
