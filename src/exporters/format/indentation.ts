export function adjustIndentation(code: string, baseIndent: string = '    '): string {
  return code.split('\n').map(line => `${baseIndent}${line}`).join('\n');
}

