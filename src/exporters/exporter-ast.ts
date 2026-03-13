export interface ExporterAstNode {
  line: string;
  children?: ExporterAstNode[];
}

export class IndentWriter {
  private readonly lines: string[] = [];

  constructor(private readonly unit: string = '  ') {}

  write(line: string, depth: number = 0): void {
    this.lines.push(`${this.unit.repeat(depth)}${line}`);
  }

  toString(): string {
    return this.lines.join('\n');
  }
}

export class AttributeSerializer {
  constructor(private readonly escapeAttribute: (value: string) => string = defaultEscapeAttribute) {}

  serialize(attrs: Record<string, string | boolean | undefined>): string {
    return Object.entries(attrs)
      .map(([name, value]) => {
        if (typeof value === 'boolean') {
          return value ? ` ${name}` : '';
        }

        if (!value) {
          return '';
        }

        return ` ${name}="${this.escapeAttribute(value)}"`;
      })
      .join('');
  }

}


function defaultEscapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderExporterAst(
  node: ExporterAstNode,
  indentUnit: string = '  ',
  baseDepth: number = 0
): string {
  const writer = new IndentWriter(indentUnit);
  renderNode(node, writer, baseDepth);
  return writer.toString();
}

function renderNode(node: ExporterAstNode, writer: IndentWriter, depth: number): void {
  for (const line of node.line.split('\n')) {
    writer.write(line, depth);
  }
  for (const child of node.children || []) {
    renderNode(child, writer, depth + 1);
  }
}
