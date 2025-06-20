const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// Alertコンポーネントの修正テスト
async function testAlertFixed() {
  try {
    // Alertコンポーネントのテスト用DSL
    const testDsl = {
      page: {
        id: "alert-test",
        title: "Alert コンポーネントテスト",
        layout: "vertical",
        components: [
          {
            Text: {
              variant: "h1",
              value: "Alert コンポーネントテスト"
            }
          },
          {
            Text: {
              variant: "p",
              value: "プレビュー画面とエクスポートHTMLのAlertの色が一致することを確認します。"
            }
          },
          {
            Alert: {
              variant: "info",
              message: "これは情報メッセージです。青色の背景とボーダーで表示されます。"
            }
          },
          {
            Alert: {
              variant: "success",
              message: "これは成功メッセージです。緑色の背景とボーダーで表示されます。"
            }
          },
          {
            Alert: {
              variant: "warning",
              message: "これは警告メッセージです。黄色の背景とボーダーで表示されます。"
            }
          },
          {
            Alert: {
              variant: "error",
              message: "これはエラーメッセージです。赤色の背景とボーダーで表示されます。"
            }
          }
        ]
      }
    };
    
    console.log('📄 テスト用DSLの内容:');
    console.log(JSON.stringify(testDsl, null, 2));
    console.log('');
    
    // Alertコンポーネントを解析
    const components = testDsl.page?.components || [];
    console.log('🔍 Alertコンポーネントの分析:');
    
    components.forEach((comp, index) => {
      if ('Alert' in comp) {
        const alertProps = comp.Alert;
        console.log(`  ${index + 1}. variant: ${alertProps.variant || 'info'}`);
        console.log(`     message: "${alertProps.message}"`);
        console.log(`     title: ${alertProps.title || 'なし'}`);
        console.log('');
      }
    });
    
    // 修正されたHTMLエクスポーターの実装
    class FixedAlertExporter {
      async export(dsl, options) {
        const components = dsl.page?.components || [];
        const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n');
        
        return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert コンポーネントテスト - 修正版</title>
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
    <!-- Alert修正テスト -->
    <div class="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
      <h2 class="text-2xl font-medium mb-2 text-gray-300">Alert コンポーネント修正テスト</h2>
      <p class="text-base mb-2 text-gray-300">プレビュー画面とエクスポートHTMLのAlertの色が一致することを確認します。</p>
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
        if ('Alert' in comp) {
          return this.renderAlert(comp.Alert, key);
        }
        
        return `    <!-- 未対応コンポーネント: ${Object.keys(comp)[0]} -->`;
      }

      renderText(props, key) {
        const { value, variant = 'p', size = 'base', weight = 'normal', color = 'text-gray-300' } = props;
        
        // variantに基づいてHTMLタグとTailwind CSSクラスを決定
        const variantClasses = {
          h1: 'text-4xl font-bold mb-4 text-gray-300',
          h2: 'text-3xl font-semibold mb-3 text-gray-300',
          h3: 'text-2xl font-medium mb-2 text-gray-300',
          p: 'text-base mb-2 text-gray-300',
          small: 'text-sm text-gray-400',
          caption: 'text-xs text-gray-500',
        };
        
        // フォールバック用のサイズとウェイトクラス
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
        
        // variantが指定されている場合はそれを使用、そうでなければsizeとweightを使用
        let className;
        let tag;
        
        if (variant && variantClasses[variant]) {
          className = variantClasses[variant];
          tag = variant.startsWith('h') ? variant : 'p';
        } else {
          className = `${sizeClasses[size]} ${weightClasses[weight]} ${color}`;
          tag = 'p';
        }
        
        return `    <${tag} class="${className}">${value}</${tag}>`;
      }

      renderAlert(props, key) {
        const { message, variant = 'info', title } = props;
        const variantClasses = {
          'info': 'bg-blue-900 border-blue-700 text-blue-200',
          'success': 'bg-green-900 border-green-700 text-green-200',
          'warning': 'bg-yellow-900 border-yellow-700 text-yellow-200',
          'error': 'bg-red-900 border-red-700 text-red-200'
        };
        
        console.log(`  🚨 Alert ${key + 1}: variant=${variant}, class="${variantClasses[variant]}"`);
        
        let code = `    <div class="p-4 border rounded-md ${variantClasses[variant]}">`;
        if (title) {
          code += `\n      <h3 class="text-sm font-medium mb-1">${title}</h3>`;
        }
        code += `\n      <p class="text-sm">${message}</p>`;
        code += `\n    </div>`;
        
        return code;
      }
    }
    
    // HTMLエクスポート
    const exporter = new FixedAlertExporter();
    const html = await exporter.export(testDsl, { format: 'html' });
    
    // 出力ファイルに保存
    const outputPath = path.join(__dirname, 'alert-fixed-test.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    console.log('✅ Alert修正テスト用HTML生成成功！');
    console.log(`📁 出力ファイル: ${outputPath}`);
    console.log('🌐 ブラウザで開いて確認してください');
    console.log('');
    console.log('🔧 修正内容:');
    console.log('   - Alertコンポーネントでvariantプロパティを正しく処理');
    console.log('   - プレビュー画面と同じTailwind CSSクラスを適用');
    console.log('   - プレビュー画面と同じ色をエクスポートHTMLで再現');
    console.log('');
    console.log('🎨 期待される色:');
    console.log('   - info: bg-blue-900 border-blue-700 text-blue-200 (青色)');
    console.log('   - success: bg-green-900 border-green-700 text-green-200 (緑色)');
    console.log('   - warning: bg-yellow-900 border-yellow-700 text-yellow-200 (黄色)');
    console.log('   - error: bg-red-900 border-red-700 text-red-200 (赤色)');
    
  } catch (error) {
    console.error('❌ エクスポート失敗:', error.message);
  }
}

testAlertFixed(); 