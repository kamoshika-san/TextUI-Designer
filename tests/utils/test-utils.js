/**
 * テストユーティリティ関数
 * 
 * テストで共通して使用する関数を提供します。
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

/**
 * テスト用のHTMLエクスポータークラス
 * 実際のエクスポーターと同じロジックを使用してテストを実行します
 */
class TestHtmlExporter {
  async export(dsl, options) {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n');
    
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Export Test</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* VS Codeダークテーマスタイル */
    body {
      background-color: #1e1e1e;
      color: #cccccc;
    }
    
    /* テーマ変数の影響を排除 */
    :root {
      --vscode-foreground: unset;
      --vscode-background: unset;
      --vscode-button-background: unset;
      --vscode-button-foreground: unset;
      --vscode-input-background: unset;
      --vscode-input-foreground: unset;
      --vscode-border: unset;
      --vscode-font-family: unset;
      --vscode-font-size: unset;
      --vscode-font-weight: unset;
      --vscode-line-height: unset;
      --vscode-letter-spacing: unset;
      --vscode-text-decoration: unset;
      --vscode-text-transform: unset;
      --vscode-text-align: unset;
      --vscode-vertical-align: unset;
      --vscode-white-space: unset;
      --vscode-word-break: unset;
      --vscode-word-wrap: unset;
      --vscode-overflow-wrap: unset;
      --vscode-text-overflow: unset;
      --vscode-text-indent: unset;
      --vscode-text-shadow: unset;
      --vscode-box-shadow: unset;
      --vscode-border-radius: unset;
      --vscode-border-width: unset;
      --vscode-border-style: unset;
      --vscode-border-color: unset;
      --vscode-outline: unset;
      --vscode-outline-offset: unset;
      --vscode-margin: unset;
      --vscode-padding: unset;
      --vscode-width: unset;
      --vscode-height: unset;
      --vscode-min-width: unset;
      --vscode-max-width: unset;
      --vscode-min-height: unset;
      --vscode-max-height: unset;
      --vscode-display: unset;
      --vscode-position: unset;
      --vscode-top: unset;
      --vscode-right: unset;
      --vscode-bottom: unset;
      --vscode-left: unset;
      --vscode-z-index: unset;
      --vscode-float: unset;
      --vscode-clear: unset;
      --vscode-overflow: unset;
      --vscode-overflow-x: unset;
      --vscode-overflow-y: unset;
      --vscode-clip: unset;
      --vscode-zoom: unset;
      --vscode-opacity: unset;
      --vscode-visibility: unset;
      --vscode-cursor: unset;
      --vscode-pointer-events: unset;
      --vscode-user-select: unset;
      --vscode-resize: unset;
      --vscode-transition: unset;
      --vscode-animation: unset;
      --vscode-transform: unset;
      --vscode-transform-origin: unset;
      --vscode-backface-visibility: unset;
      --vscode-perspective: unset;
      --vscode-perspective-origin: unset;
      --vscode-filter: unset;
      --vscode-backdrop-filter: unset;
      --vscode-mix-blend-mode: unset;
      --vscode-isolation: unset;
      --vscode-object-fit: unset;
      --vscode-object-position: unset;
      --vscode-image-rendering: unset;
      --vscode-image-orientation: unset;
      --vscode-image-resolution: unset;
      --vscode-shape-image-threshold: unset;
      --vscode-shape-margin: unset;
      --vscode-shape-outside: unset;
      --vscode-clip-path: unset;
      --vscode-mask: unset;
      --vscode-mask-clip: unset;
      --vscode-mask-composite: unset;
      --vscode-mask-image: unset;
      --vscode-mask-mode: unset;
      --vscode-mask-origin: unset;
      --vscode-mask-position: unset;
      --vscode-mask-repeat: unset;
      --vscode-mask-size: unset;
      --vscode-mask-type: unset;
      --vscode-paint-order: unset;
      --vscode-vector-effect: unset;
      --vscode-d: unset;
      --vscode-calc: unset;
      --vscode-attr: unset;
      --vscode-counter-increment: unset;
      --vscode-counter-reset: unset;
      --vscode-counter-set: unset;
      --vscode-quotes: unset;
      --vscode-content: unset;
      --vscode-target: unset;
      --vscode-tab-size: unset;
      --vscode-text-size-adjust: unset;
      --vscode-text-rendering: unset;
      --vscode-text-orientation: unset;
      --vscode-text-emphasis: unset;
      --vscode-text-emphasis-color: unset;
      --vscode-text-emphasis-style: unset;
      --vscode-text-emphasis-position: unset;
      --vscode-text-underline-position: unset;
      --vscode-text-underline-offset: unset;
      --vscode-text-combine-upright: unset;
      --vscode-text-autospace: unset;
      --vscode-text-justify: unset;
      --vscode-text-align-last: unset;
      --vscode-text-align-all: unset;
      --vscode-text-spacing: unset;
      --vscode-text-spacing-trim: unset;
      --vscode-text-edge: unset;
      --vscode-text-group-align: unset;
      --vscode-text-group-justify: unset;
      --vscode-text-group-kinsoku: unset;
      --vscode-text-group-overflow: unset;
      --vscode-text-group-wrap: unset;
      --vscode-text-group-indent: unset;
      --vscode-text-group-indent-first: unset;
      --vscode-text-group-indent-last: unset;
      --vscode-text-group-indent-hanging: unset;
      --vscode-text-group-indent-negative: unset;
      --vscode-text-group-indent-positive: unset;
      --vscode-text-group-indent-zero: unset;
      --vscode-text-group-indent-inherit: unset;
      --vscode-text-group-indent-initial: unset;
      --vscode-text-group-indent-unset: unset;
      --vscode-text-group-indent-revert: unset;
      --vscode-text-group-indent-revert-layer: unset;
    }
    
    /* 基本的なスタイルリセット（Tailwind CSSを妨げない程度） */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    
    /* HTML要素の基本設定 */
    html {
      font-size: 16px;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #cccccc;
      background-color: #1e1e1e;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* フォーム要素の基本リセット */
    input,
    button,
    textarea,
    select {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }
    
    /* リンクの基本リセット */
    a {
      color: inherit;
      text-decoration: none;
    }
    
    /* textui-containerクラスのスタイル */
    .textui-container {
      max-width: 56rem; /* max-w-4xl */
      margin-left: auto;
      margin-right: auto;
      padding: 1.5rem; /* p-6 */
      background-color: rgb(31 41 55) !important; /* ダークグレー背景 */
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
  </style>
</head>
<body>
  <div class="container mx-auto p-4">
${componentCode}
  </div>
</body>
</html>`;
  }

  renderComponent(comp, key) {
    if (comp.Text) return this.renderText(comp.Text, key);
    if (comp.Input) return this.renderInput(comp.Input, key);
    if (comp.Button) return this.renderButton(comp.Button, key);
    if (comp.Checkbox) return this.renderCheckbox(comp.Checkbox, key);
    if (comp.Radio) return this.renderRadio(comp.Radio, key);
    if (comp.Select) return this.renderSelect(comp.Select, key);
    if (comp.Divider) return this.renderDivider(comp.Divider, key);
    if (comp.Alert) return this.renderAlert(comp.Alert, key);
    if (comp.Container) return this.renderContainer(comp.Container, key);
    if (comp.Form) return this.renderForm(comp.Form, key);
    return '';
  }

  renderText(props, key) {
    const { value, variant, size = 'base', weight = 'normal', color = 'text-gray-300' } = props;
    const variantClasses = {
      'h1': 'text-4xl font-bold text-white',
      'h2': 'text-3xl font-semibold text-white',
      'h3': 'text-2xl font-medium text-gray-100',
      'p': 'text-base text-gray-200',
      'small': 'text-sm text-gray-400',
      'caption': 'text-xs text-gray-500'
    };
    const sizeClasses = {
      'xs': 'text-xs',
      'sm': 'text-sm',
      'base': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
      '2xl': 'text-2xl'
    };
    const weightClasses = {
      'normal': 'font-normal',
      'medium': 'font-medium',
      'semibold': 'font-semibold',
      'bold': 'font-bold'
    };
    
    let className, tag;
    
    if (variant && variantClasses[variant]) {
      className = variantClasses[variant];
      tag = variant.startsWith('h') ? variant : 'p';
    } else {
      className = `${sizeClasses[size]} ${weightClasses[weight]} ${color}`;
      tag = 'p';
    }
    
    return `    <${tag} class="${className}">${value}</${tag}>`;
  }

  renderInput(props, key) {
    const { label, placeholder, type = 'text', required = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const requiredAttr = required ? ' required' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    let code = `    <div class="mb-4">`;
    if (label) {
      code += `\n      <label class="block text-sm font-medium text-gray-400 mb-2">${label}</label>`;
    }
    code += `\n      <input type="${type}" placeholder="${placeholder || ''}" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${requiredAttr}${disabledAttr}>`;
    code += `\n    </div>`;
    
    return code;
  }

  renderButton(props, key) {
    const { label, kind = 'primary', disabled = false, submit = false } = props;
    const kindClasses = {
      'primary': 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      'secondary': 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-gray-700 hover:bg-gray-600 text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
      'submit': 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
    };
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    const typeAttr = submit ? ' type="submit"' : '';
    
    return `    <button${typeAttr} class="${kindClasses[kind]} ${disabledClass}"${disabledAttr}>${label}</button>`;
  }

  renderCheckbox(props, key) {
    const { label, checked = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const checkedAttr = checked ? ' checked' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    return `    <div class="flex items-center mb-4">
      <input type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800 ${disabledClass}"${checkedAttr}${disabledAttr}>
      <label class="ml-2 block text-sm text-gray-400">${label}</label>
    </div>`;
  }

  renderRadio(props, key) {
    const { label, value, name, checked = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const checkedAttr = checked ? ' checked' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    return `    <div class="flex items-center mb-4">
      <input type="radio" name="${name || 'radio'}" value="${value || ''}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${checkedAttr}${disabledAttr}>
      <label class="ml-2 block text-sm text-gray-400">${label}</label>
    </div>`;
  }

  renderSelect(props, key) {
    const { label, options = [], placeholder, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    let code = `    <div class="mb-4">`;
    if (label) {
      code += `\n      <label class="block text-sm font-medium text-gray-400 mb-2">${label}</label>`;
    }
    code += `\n      <select class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${disabledAttr}>`;
    
    if (placeholder) {
      code += `\n        <option value="" class="bg-gray-800 text-gray-400">${placeholder}</option>`;
    }
    
    options.forEach((opt) => {
      code += `\n        <option value="${opt.value}" class="bg-gray-800 text-gray-400">${opt.label}</option>`;
    });
    
    code += `\n      </select>`;
    code += `\n    </div>`;
    
    return code;
  }

  renderDivider(props, key) {
    const { orientation = 'horizontal', spacing = 'md' } = props;
    const spacingClasses = {
      'sm': 'my-2',
      'md': 'my-4',
      'lg': 'my-6'
    };
    
    if (orientation === 'vertical') {
      return `    <div class="inline-block w-px h-6 bg-gray-700 mx-4"></div>`;
    }
    
    return `    <hr class="border-gray-700 ${spacingClasses[spacing]}">`;
  }

  renderAlert(props, key) {
    const { message, variant = 'info', title } = props;
    const variantClasses = {
      'info': 'bg-blue-900 border-blue-700 text-blue-200',
      'success': 'bg-green-900 border-green-700 text-green-200',
      'warning': 'bg-yellow-900 border-yellow-700 text-yellow-200',
      'error': 'bg-red-900 border-red-700 text-red-200'
    };
    
    let code = `    <div class="p-4 border rounded-md ${variantClasses[variant]}">`;
    if (title) {
      code += `\n      <h3 class="text-sm font-medium mb-1">${title}</h3>`;
    }
    code += `\n      <p class="text-sm">${message}</p>`;
    code += `\n    </div>`;
    
    return code;
  }

  renderContainer(props, key) {
    const { layout = 'vertical', components = [] } = props;
    const layoutClasses = {
      'vertical': 'textui-container flex flex-col space-y-4',
      'horizontal': 'textui-container flex flex-row space-x-4',
      'flex': 'textui-container flex flex-wrap gap-4',
      'grid': 'textui-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    };
    
    let code = `    <div class="${layoutClasses[layout]}">`;
    components.forEach((child, index) => {
      const childCode = this.renderComponent(child, index);
      const indentedCode = childCode.split('\n').map(line => `  ${line}`).join('\n');
      code += `\n${indentedCode}`;
    });
    code += `\n    </div>`;
    
    return code;
  }

  renderForm(props, key) {
    const { id, fields = [], actions = [] } = props;
    
    let code = `    <form id="${id}" class="textui-container space-y-4">`;
    
    fields.forEach((field, index) => {
      if (field.Input) {
        const fieldCode = this.renderInput(field.Input, index);
        const indentedCode = fieldCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      } else if (field.Checkbox) {
        const fieldCode = this.renderCheckbox(field.Checkbox, index);
        const indentedCode = fieldCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      } else if (field.Radio) {
        const fieldCode = this.renderRadio(field.Radio, index);
        const indentedCode = fieldCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      } else if (field.Select) {
        const fieldCode = this.renderSelect(field.Select, index);
        const indentedCode = fieldCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });
    
    code += `\n      <div class="flex space-x-4">`;
    actions.forEach((action, index) => {
      if (action.Button) {
        const actionCode = this.renderButton(action.Button, index);
        const indentedCode = actionCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });
    code += `\n      </div>`;
    code += `\n    </form>`;
    
    return code;
  }
}

/**
 * YAMLファイルを読み込む関数
 * @param {string} filePath - YAMLファイルのパス
 * @returns {Object} パースされたYAMLオブジェクト
 */
function loadYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return YAML.parse(content);
  } catch (error) {
    throw new Error(`YAMLファイルの読み込みに失敗しました: ${error.message}`);
  }
}

/**
 * HTMLファイルを保存する関数
 * @param {string} html - HTMLコンテンツ
 * @param {string} filePath - 保存先ファイルパス
 */
function saveHtmlFile(html, filePath) {
  try {
    fs.writeFileSync(filePath, html, 'utf8');
  } catch (error) {
    throw new Error(`HTMLファイルの保存に失敗しました: ${error.message}`);
  }
}

/**
 * 文字列に特定のパターンが含まれているかをチェックする関数
 * @param {string} content - チェック対象の文字列
 * @param {string|RegExp} pattern - 検索パターン
 * @returns {boolean} パターンが含まれているかどうか
 */
function containsPattern(content, pattern) {
  if (typeof pattern === 'string') {
    return content.includes(pattern);
  } else if (pattern instanceof RegExp) {
    return pattern.test(content);
  }
  return false;
}

/**
 * テスト結果を検証する関数
 * @param {string} html - 生成されたHTML
 * @param {Array} expectedPatterns - 期待されるパターンの配列
 * @param {Array} unexpectedPatterns - 期待されないパターンの配列
 */
function validateHtml(html, expectedPatterns = [], unexpectedPatterns = []) {
  const errors = [];
  
  // 期待されるパターンをチェック
  expectedPatterns.forEach((pattern, index) => {
    if (!containsPattern(html, pattern)) {
      errors.push(`期待されるパターン ${index + 1} が見つかりません: ${pattern}`);
    }
  });
  
  // 期待されないパターンをチェック
  unexpectedPatterns.forEach((pattern, index) => {
    if (containsPattern(html, pattern)) {
      errors.push(`期待されないパターン ${index + 1} が見つかりました: ${pattern}`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`HTML検証に失敗しました:\n${errors.join('\n')}`);
  }
}

/**
 * テスト用のユーティリティ関数
 */

/**
 * ディレクトリとその内容を再帰的に削除する
 * Windows環境でのファイルハンドル解放の遅延に対応
 */
function removeDirectoryRecursive(dirPath, maxRetries = 3, retryDelay = 100) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  function removeWithRetry(currentPath, retriesLeft) {
    try {
      const stats = fs.statSync(currentPath);
      
      if (stats.isDirectory()) {
        // ディレクトリの場合は、まず内容を削除
        const files = fs.readdirSync(currentPath);
        for (const file of files) {
          const filePath = path.join(currentPath, file);
          removeWithRetry(filePath, retriesLeft);
        }
        
        // 空になったディレクトリを削除
        fs.rmdirSync(currentPath);
      } else {
        // ファイルの場合は直接削除
        fs.unlinkSync(currentPath);
      }
    } catch (error) {
      if (retriesLeft > 0 && (error.code === 'ENOTEMPTY' || error.code === 'EBUSY' || error.code === 'EACCES')) {
        // リトライ可能なエラーの場合、少し待ってから再試行
        setTimeout(() => {
          removeWithRetry(currentPath, retriesLeft - 1);
        }, retryDelay);
      } else {
        // リトライ回数が尽きたか、リトライ不可能なエラーの場合
        console.warn(`ファイル/ディレクトリの削除に失敗しました: ${currentPath}`, error.message);
      }
    }
  }

  removeWithRetry(dirPath, maxRetries);
}

/**
 * テスト用ディレクトリを作成し、クリーンアップ関数を返す
 */
function createTestDirectory(baseDir, dirName) {
  const testDir = path.join(baseDir, dirName);
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  return {
    path: testDir,
    cleanup: () => removeDirectoryRecursive(testDir)
  };
}

/**
 * テスト用ファイルを作成
 */
function createTestFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

/**
 * テスト用ファイルを削除
 */
function removeTestFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.warn(`テストファイルの削除に失敗しました: ${filePath}`, error.message);
    }
  }
}

/**
 * テスト用の一時ファイルを作成し、クリーンアップ関数を返す
 */
function createTempFile(dir, filename, content) {
  const filePath = path.join(dir, filename);
  createTestFile(filePath, content);
  
  return {
    path: filePath,
    cleanup: () => removeTestFile(filePath)
  };
}

/**
 * テスト環境かどうかを判定
 */
function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' || 
         process.env.MOCHA_RUNNING === 'true' ||
         process.argv.some(arg => arg.includes('mocha') || arg.includes('test'));
}

/**
 * テスト用のモックオブジェクトを作成
 */
function createMockObject(methods = {}) {
  return new Proxy({}, {
    get(target, prop) {
      if (prop in methods) {
        return methods[prop];
      }
      if (typeof prop === 'string' && !prop.startsWith('_')) {
        return () => Promise.resolve();
      }
      return undefined;
    }
  });
}

module.exports = {
  TestHtmlExporter,
  loadYamlFile,
  saveHtmlFile,
  containsPattern,
  validateHtml,
  removeDirectoryRecursive,
  createTestDirectory,
  createTestFile,
  removeTestFile,
  createTempFile,
  isTestEnvironment,
  createMockObject
}; 