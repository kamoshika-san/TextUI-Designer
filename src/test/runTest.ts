import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // 拡張機能のルートディレクトリ
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    // テストスイートのエントリポイント（index.jsに変更）
    const extensionTestsPath = path.resolve(__dirname, './index.js');
    
    console.log('Starting VS Code extension tests...');
    console.log('Extension development path:', extensionDevelopmentPath);
    console.log('Extension tests path:', extensionTestsPath);
    
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main(); 