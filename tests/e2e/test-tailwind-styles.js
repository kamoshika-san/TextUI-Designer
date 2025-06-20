const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// Tailwind CSSスタイルテスト用のHTMLエクスポーター
class HtmlExporter {
  async export(dsl, options) {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n');
    
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailwind CSS Style Test - Fixed</title>
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
    
    /* 画像の基本リセット */
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* テーブルの基本リセット */
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    
    /* 引用の基本リセット */
    blockquote,
    q {
      quotes: none;
    }
    
    blockquote:before,
    blockquote:after,
    q:before,
    q:after {
      content: '';
      content: none;
    }
    
    /* プレースホルダーの基本リセット */
    ::placeholder {
      opacity: 1;
    }
    
    /* スクロールバーの非表示 */
    ::-webkit-scrollbar {
      width: 0;
      height: 0;
    }
    
    /* Tailwind CSSが確実に適用されるように */
    .container {
      display: block;
    }
  </style>
</head>
<body class="bg-gray-900 text-gray-300 min-h-screen">
  <div class="container mx-auto p-6">
    <!-- Tailwind CSSスタイルテスト -->
    <div class="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
      <h2 class="text-2xl font-medium mb-2 text-gray-300">Tailwind CSS スタイルテスト - 修正版</h2>
      <p class="text-base mb-2 text-gray-300">このセクションでTailwind CSSのスタイルが正しく適用されているか確認できます。</p>
      
      <div class="space-y-4 mt-4">
        <div>
          <h3 class="text-xl font-semibold mb-2 text-gray-300">テキストサイズテスト</h3>
          <p class="text-xs text-gray-500 mb-1">text-xs (12px)</p>
          <p class="text-sm text-gray-400 mb-1">text-sm (14px)</p>
          <p class="text-base text-gray-300 mb-1">text-base (16px)</p>
          <p class="text-lg text-gray-300 mb-1">text-lg (18px)</p>
          <p class="text-xl text-gray-300 mb-1">text-xl (20px)</p>
          <p class="text-2xl text-gray-300 mb-1">text-2xl (24px) - これが正しく表示されるはず</p>
          <p class="text-3xl text-gray-300 mb-1">text-3xl (30px)</p>
          <p class="text-4xl text-gray-300">text-4xl (36px)</p>
        </div>
        
        <div>
          <h3 class="text-xl font-semibold mb-2 text-gray-300">フォントウェイトテスト</h3>
          <p class="text-base font-normal text-gray-300 mb-1">font-normal (400)</p>
          <p class="text-base font-medium text-gray-300 mb-1">font-medium (500) - これが正しく表示されるはず</p>
          <p class="text-base font-semibold text-gray-300 mb-1">font-semibold (600)</p>
          <p class="text-base font-bold text-gray-300">font-bold (700)</p>
        </div>
        
        <div>
          <h3 class="text-xl font-semibold mb-2 text-gray-300">マージンテスト</h3>
          <div class="bg-blue-600 text-white p-2 mb-1">mb-1 (4px)</div>
          <div class="bg-blue-600 text-white p-2 mb-2">mb-2 (8px) - これが正しく表示されるはず</div>
          <div class="bg-blue-600 text-white p-2 mb-3">mb-3 (12px)</div>
          <div class="bg-blue-600 text-white p-2 mb-4">mb-4 (16px)</div>
        </div>
        
        <div>
          <h3 class="text-xl font-semibold mb-2 text-gray-300">パディングテスト</h3>
          <div class="bg-green-600 text-white p-1 mb-1">p-1 (4px)</div>
          <div class="bg-green-600 text-white p-2 mb-1">p-2 (8px)</div>
          <div class="bg-green-600 text-white p-3 mb-1">p-3 (12px)</div>
          <div class="bg-green-600 text-white p-4">p-4 (16px)</div>
        </div>
      </div>
    </div>
    
    <!-- 実際のコンポーネント -->
${componentCode}
  </div>
</body>
</html>`;
  }

  renderComponent(comp, key) {
    if ('Text' in comp) {
      return this.renderText(comp.Text, key);
    }
    if ('Input' in comp) {
      return this.renderInput(comp.Input, key);
    }
    if ('Button' in comp) {
      return this.renderButton(comp.Button, key);
    }
    if ('Checkbox' in comp) {
      return this.renderCheckbox(comp.Checkbox, key);
    }
    if ('Radio' in comp) {
      return this.renderRadio(comp.Radio, key);
    }
    if ('Select' in comp) {
      return this.renderSelect(comp.Select, key);
    }
    if ('Divider' in comp) {
      return this.renderDivider(comp.Divider, key);
    }
    if ('Alert' in comp) {
      return this.renderAlert(comp.Alert, key);
    }
    if ('Container' in comp) {
      return this.renderContainer(comp.Container, key);
    }
    
    return `    <!-- 未対応コンポーネント: ${Object.keys(comp)[0]} -->`;
  }

  renderText(props, key) {
    const { value, variant = 'p', size = 'base', weight = 'normal', color = 'text-gray-300' } = props;
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
    
    const tag = variant === 'h1' ? 'h1' : variant === 'h2' ? 'h2' : 'p';
    return `    <${tag} class="${sizeClasses[size]} ${weightClasses[weight]} ${color}">${value}</${tag}>`;
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
    const { label, kind = 'primary', size = 'md', disabled = false } = props;
    const variantClasses = {
      'primary': 'bg-blue-600 hover:bg-blue-700 text-white',
      'secondary': 'bg-gray-700 hover:bg-gray-600 text-gray-300',
      'submit': 'bg-green-600 hover:bg-green-700 text-white',
      'outline': 'border border-gray-600 hover:bg-gray-800 text-gray-300'
    };
    const sizeClasses = {
      'sm': 'px-3 py-1.5 text-sm',
      'md': 'px-4 py-2 text-base',
      'lg': 'px-6 py-3 text-lg'
    };
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    return `    <button class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${variantClasses[kind]} ${sizeClasses[size]} ${disabledClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"${disabledAttr}>${label}</button>`;
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
    const { label, name, options = [], disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    let code = `    <div class="mb-4">`;
    if (label) {
      code += `\n      <label class="block text-sm font-medium text-gray-400 mb-2">${label}</label>`;
    }
    
    options.forEach((opt, index) => {
      code += `\n      <div class="flex items-center mb-2">
        <input type="radio" name="${name || 'radio'}" value="${opt.value}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${disabledAttr}>
        <label class="ml-2 block text-sm text-gray-400">${opt.label}</label>
      </div>`;
    });
    
    code += `\n    </div>`;
    return code;
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
    const typeClasses = {
      'info': 'bg-blue-900 border-blue-700 text-blue-200',
      'success': 'bg-green-900 border-green-700 text-green-200',
      'warning': 'bg-yellow-900 border-yellow-700 text-yellow-200',
      'error': 'bg-red-900 border-red-700 text-red-200'
    };
    
    let code = `    <div class="p-4 border rounded-md ${typeClasses[variant]}">`;
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
      'vertical': 'flex flex-col space-y-4',
      'horizontal': 'flex space-x-4',
      'grid': 'grid grid-cols-1 gap-4',
      'flex': 'flex space-x-4'
    };
    
    let code = `    <div class="${layoutClasses[layout]}">`;
    components.forEach((child, index) => {
      const childCode = this.renderComponent(child, index);
      // インデントを調整
      const indentedCode = childCode.split('\n').map(line => `  ${line}`).join('\n');
      code += `\n${indentedCode}`;
    });
    code += `\n    </div>`;
    
    return code;
  }
}

// テスト実行
async function testExport() {
  try {
    // サンプルファイルを読み込み
    const samplePath = path.join(__dirname, '..', 'sample.tui.yml');
    const content = fs.readFileSync(samplePath, 'utf-8');
    const dsl = YAML.parse(content);
    
    // HTMLエクスポート
    const exporter = new HtmlExporter();
    const html = await exporter.export(dsl, { format: 'html' });
    
    // 出力ファイルに保存
    const outputPath = path.join(__dirname, 'tailwind-styles-test-fixed.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    console.log('✅ Tailwind CSSスタイルテスト用HTML生成成功！（修正版）');
    console.log(`📁 出力ファイル: ${outputPath}`);
    console.log('🌐 ブラウザで開いて確認してください');
    console.log('🎨 以下のTailwind CSSクラスが正しく適用されているはずです:');
    console.log('   - text-2xl font-medium mb-2');
    console.log('   - text-3xl font-semibold mb-3');
    console.log('   - text-4xl font-bold mb-4');
    console.log('   - text-base mb-2');
    console.log('   - text-sm text-gray-400');
    console.log('   - text-xs text-gray-500');
    console.log('   - その他のマージン、パディング、色クラス');
    console.log('');
    console.log('🔧 修正内容:');
    console.log('   - 強力なスタイルリセット（all: unset）を削除');
    console.log('   - VS Codeテーマ変数の影響のみを排除');
    console.log('   - Tailwind CSSのスタイルが正しく適用されるように調整');
    
  } catch (error) {
    console.error('❌ エクスポート失敗:', error.message);
  }
}

testExport(); 