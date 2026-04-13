import * as fs from 'fs';
import * as path from 'path';
import { getArg } from '../command-support';
import { scaffoldApp } from '../../mcp/tools/scaffold-app';
import type { ExitCode } from '../types';

export async function handleScaffoldCommand(): Promise<ExitCode> {
  const screensArg = getArg('--screens');
  const outputDir = getArg('--output-dir') ?? './generated';
  const title = getArg('--title') ?? 'Scaffold';

  if (!screensArg) {
    process.stderr.write('scaffold requires --screens <id1,id2,...>\n');
    return 1;
  }

  const screenIds = screensArg.split(',').map(s => s.trim()).filter(s => s.length > 0);
  if (screenIds.length === 0) {
    process.stderr.write('scaffold: --screens must contain at least one screen ID\n');
    return 1;
  }

  const { TextUICoreEngine } = await import('../../core/textui-core-engine');
  const engine = new TextUICoreEngine();

  const result = await scaffoldApp({
    title,
    outputDir,
    screens: screenIds.map(id => ({ id, title: id })),
    transitions: []
  }, engine);

  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of result.files) {
    const filePath = path.resolve(file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf8');
    process.stdout.write(`wrote: ${file.path}\n`);
  }

  const flowFileName = `${outputDir}/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.tui.flow.yml`;
  fs.writeFileSync(path.resolve(flowFileName), result.flowYaml, 'utf8');
  process.stdout.write(`wrote: ${flowFileName}\n`);

  if (!result.valid) {
    process.stderr.write('flow validation warnings:\n');
    for (const d of result.diagnostics) {
      const diag = d as Record<string, unknown>;
      process.stderr.write(`  - ${diag['path'] ?? '/'} ${diag['message'] ?? ''}\n`);
    }
  }

  return result.valid ? 0 : 2;
}
