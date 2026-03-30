/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function safeReadTextFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return readTextFile(filePath);
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const stylesDir = path.join(repoRoot, 'src', 'renderer', 'components', 'styles');
  const outCssPath = path.join(repoRoot, 'src', 'renderer', 'index.css');

  const header = [
    '/* Tailwind CSS */',
    '@tailwind base;',
    '@tailwind components;',
    '@tailwind utilities;',
    '',
    '/* VS Codeテーマ変数を無効化 */',
    ':root {',
    '  --vscode-foreground: unset !important;',
    '  --vscode-background: unset !important;',
    '  --vscode-editor-foreground: unset !important;',
    '  --vscode-editor-background: unset !important;',
    '  --vscode-font-family: unset !important;',
    '  --vscode-font-size: unset !important;',
    '  --vscode-font-weight: unset !important;',
    '}',
    ''
  ].join('\n');

  // 既存 `src/renderer/index.css` の“見た目の override順”を極力維持する目的で、連結順を固定します。
  // 空の partial（未実装コンポーネント）はコンテンツが無いため意味的影響はありません。
  const order = [
    'Text.css',
    'Breadcrumb.css',
    'Link.css',
    'Badge.css',
    'Unsupported.css',
    'Progress.css',
    'Image.css',
    'Alert.css',
    'Input.css',
    'Select.css',
    'DatePicker.css',
    'Checkbox.css',
    'Radio.css',
    'Divider.css',
    'Spacer.css',
    'Accordion.css',
    'Tabs.css',
    'TreeView.css',
    'Table.css',
    'Button.css',
    'Globals.css',
    'Form.css',
    'Container.css',
    'ButtonExtras.css',
    'Icon.css',
    'Modal.css'
  ];

  const chunks = [];
  chunks.push(header);

  for (const fileName of order) {
    const partialPath = path.join(stylesDir, fileName);
    const partialName = fileName.replace(/\.css$/, '');
    const content = safeReadTextFile(partialPath).trimEnd();

    chunks.push(`/* --- ${partialName} partial --- */`);
    chunks.push(content ? `${content}\n` : '\n');
  }

  // 常に末尾改行を付与
  const finalCss = `${chunks.join('\n').trimEnd()}\n`;
  fs.writeFileSync(outCssPath, finalCss, 'utf8');

  console.log(`[generate-renderer-index-css] wrote ${path.relative(repoRoot, outCssPath)}`);
}

main();

