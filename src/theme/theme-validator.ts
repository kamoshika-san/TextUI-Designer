import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import * as vscode from 'vscode';

export class ThemeValidator {
  async validateTheme(context: vscode.ExtensionContext, data: unknown): Promise<void> {
    try {
      const schemaPath = path.join(context.extensionPath, 'schemas', 'theme-schema.json');
      if (!fs.existsSync(schemaPath)) {
        console.warn('[ThemeManager] theme schema not found');
        return;
      }

      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      const valid = validate(data);
      if (!valid) {
        console.warn('[ThemeManager] theme validation failed', validate.errors);
      }
    } catch (error) {
      console.warn('[ThemeManager] validation error', error);
    }
  }
}
