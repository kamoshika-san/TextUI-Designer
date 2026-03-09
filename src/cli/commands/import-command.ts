import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectoryForFile } from '../io';
import { importAllOpenApiToDsl, importOpenApiToDsl } from '../openapi-importer';
import type { ExitCode } from '../types';
import { getArg, hasFlag, printJson } from '../command-support';

export async function handleImportCommand(): Promise<ExitCode> {
  const sub = process.argv[3];
  if (sub !== 'openapi') {
    process.stderr.write(`unsupported import target: ${sub ?? '(missing)'}\n`);
    return 1;
  }

  const inputPathArg = getArg('--input');
  if (!inputPathArg) {
    process.stderr.write('import openapi requires --input <path>\n');
    return 1;
  }

  const inputPath = path.resolve(inputPathArg);
  const importAll = hasFlag('--all');
  const operationId = getArg('--operation');
  if (importAll && operationId) {
    process.stderr.write('import openapi: --all and --operation cannot be used together\n');
    return 1;
  }

  if (importAll) {
    const outputDir = path.resolve(getArg('--output-dir') ?? getArg('--output') ?? 'generated/from-openapi');
    fs.mkdirSync(outputDir, { recursive: true });
    const importedList = importAllOpenApiToDsl({ inputPath });
    const files = importedList.map(item => {
      const safeName = item.operationId.replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '');
      const filePath = path.join(outputDir, `${safeName || 'operation'}.tui.yml`);
      ensureDirectoryForFile(filePath);
      fs.writeFileSync(filePath, item.yaml, 'utf8');
      return {
        operationId: item.operationId,
        sourceOperation: item.sourceOperation,
        fields: item.fields,
        output: filePath
      };
    });

    if (hasFlag('--json')) {
      printJson({
        imported: true,
        mode: 'all',
        input: inputPath,
        generated: files.length,
        files
      });
    } else {
      process.stdout.write(`Imported ${files.length} OpenAPI operations -> ${outputDir}\n`);
      files.forEach(file => {
        process.stdout.write(`  - ${file.operationId} (${file.sourceOperation}) -> ${file.output} [fields=${file.fields}]\n`);
      });
    }
    return 0;
  }

  const imported = importOpenApiToDsl({
    inputPath,
    operationId
  });
  const output = path.resolve(getArg('--output') ?? 'generated/from-openapi.tui.yml');
  ensureDirectoryForFile(output);
  fs.writeFileSync(output, imported.yaml, 'utf8');

  if (hasFlag('--json')) {
    printJson({
      imported: true,
      mode: 'single',
      input: inputPath,
      output,
      operationId: imported.operationId,
      sourceOperation: imported.sourceOperation,
      fields: imported.fields
    });
  } else {
    process.stdout.write(`Imported OpenAPI operation ${imported.operationId} -> ${output}\n`);
    process.stdout.write(`  source: ${imported.sourceOperation}\n`);
    process.stdout.write(`  fields: ${imported.fields}\n`);
  }

  return 0;
}
