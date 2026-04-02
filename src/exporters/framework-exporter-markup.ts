export function trimTrailingWhitespace(value: string): string {
  return value
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

export function indentBlock(content: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return content
    .split('\n')
    .map(line => `${indent}${line}`)
    .join('\n');
}

export function extractPrimaryMarkup(staticHtml: string): string {
  const normalizedHtml = trimTrailingWhitespace(staticHtml);
  const matched = normalizedHtml.match(/^<div\b[^>]*>([\s\S]*)<\/div>$/i);

  if (!matched) {
    return normalizedHtml;
  }

  return trimTrailingWhitespace(matched[1]);
}
