import type { YamlParser, ParsedYamlResult } from './yaml-parser';

/**
 * Preview 更新パイプラインの **PreviewParserValidator** ポート。
 * YAML の読取・パース・include 解決・スキーマ検証は {@link YamlParser} に集約し、
 * Manager はオーケストレーションのみとする（T-106 第2波スライス）。
 */
export async function parseValidateYamlForPreview(
  yamlParser: YamlParser,
  filePath: string | undefined
): Promise<ParsedYamlResult> {
  return yamlParser.parseYamlFile(filePath);
}
