import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export interface SchemaPaths {
  schemaPath: string;
  templateSchemaPath: string;
  themeSchemaPath: string;
  searchedPaths: string[];
}

export function resolveSchemaPaths(context: vscode.ExtensionContext): SchemaPaths {
  const possiblePaths = [
    path.join(context.extensionPath, 'schemas', 'schema.json'),
    path.join(__dirname, '..', '..', '..', 'schemas', 'schema.json'),
    path.join(process.cwd(), 'schemas', 'schema.json')
  ];

  const foundSchemaPath = possiblePaths.find(schemaPath => fs.existsSync(schemaPath))
    ?? path.join(context.extensionPath, 'schemas', 'schema.json');

  const baseDir = path.dirname(foundSchemaPath);
  return {
    schemaPath: foundSchemaPath,
    templateSchemaPath: path.join(baseDir, 'template-schema.json'),
    themeSchemaPath: path.join(baseDir, 'theme-schema.json'),
    searchedPaths: possiblePaths
  };
}
