import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import { YamlIncludeResolverSync } from './yaml-include-resolver-sync';

export type SupportedDslDocument = TextUIDSL | NavigationFlowDSL;
export type SupportedDslKind = 'ui' | 'navigation-flow';

export function isNavigationFlowDslPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.tui.flow.yml') || lower.endsWith('.tui.flow.yaml');
}

/**
 * DSL ファイルを読み、`$include` を WebView と同じ規則で展開する（同期）。
 * CLI の `loadDslFromFile`・プレビューキャプチャの `parseDslFile` の共通入口。
 */
export function loadDslWithIncludesFromPath<T extends SupportedDslDocument = TextUIDSL>(
  filePath: string
): { dsl: T; sourcePath: string; raw: string; kind: SupportedDslKind } {
  const sourcePath = path.resolve(filePath);
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const parsed = YAML.parse(raw);
  const resolver = new YamlIncludeResolverSync((content, _fileName) => YAML.parse(content));
  const dsl = resolver.resolve(parsed, sourcePath) as SupportedDslDocument;
  const kind: SupportedDslKind = isNavigationFlowDslPath(sourcePath) || isNavigationFlowDSL(dsl)
    ? 'navigation-flow'
    : 'ui';
  return { dsl: dsl as T, sourcePath, raw, kind };
}
