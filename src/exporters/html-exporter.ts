import type { TextUIDSL, ComponentDef, FormComponent, FormField, FormAction } from '../renderer/types';
import type { ExportOptions, Exporter } from './index';

export class HtmlExporter implements Exporter {
  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n');
    
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Export</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* VS Codeテーマの影響を排除 */
    :root {
      all: unset;
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
    
    /* multipleセレクトの選択項目ハイライト保持 */
    select[multiple] option:checked {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }
    
    select[multiple] option:checked:not(:focus) {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }
    
    /* フォーカス時のスタイル（選択項目のハイライトを妨げない） */
    select[multiple]:focus option:checked {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }
  </style>
</head>
<body class="bg-gray-900 text-gray-300 min-h-screen">
  <div class="container mx-auto p-6">
${componentCode}
  </div>
</body>
</html>`;
  }

  getFileExtension(): string {
    return '.html';
  }

  private renderComponent(comp: ComponentDef, key: number): string {
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
    if ('Form' in comp) {
      return this.renderForm(comp.Form, key);
    }
    
    return `    <!-- 未対応コンポーネント: ${Object.keys(comp)[0]} -->`;
  }

  private renderText(props: any, key: number): string {
    const { value, variant = 'p', size = 'base', weight = 'normal', color = 'text-gray-300' } = props;
    
    // variantに基づいてHTMLタグとTailwind CSSクラスを決定
    const variantClasses: Record<string, string> = {
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
    let className: string;
    let tag: string;
    
    if (variant && variantClasses[variant]) {
      className = variantClasses[variant];
      tag = variant.startsWith('h') ? variant : 'p';
    } else {
      className = `${sizeClasses[size as keyof typeof sizeClasses]} ${weightClasses[weight as keyof typeof weightClasses]} ${color}`;
      tag = 'p';
    }
    
    return `    <${tag} class="${className}">${value}</${tag}>`;
  }

  private renderInput(props: any, key: number): string {
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

  private renderButton(props: any, key: number): string {
    const { label, kind = 'primary', disabled = false, submit = false } = props;
    const kindClasses = {
      'primary': 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      'secondary': 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-gray-700 hover:bg-gray-600 text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
      'submit': 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
    };
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    const typeAttr = submit ? ' type="submit"' : '';
    
    return `    <button${typeAttr} class="${kindClasses[kind as keyof typeof kindClasses]} ${disabledClass}"${disabledAttr}>${label}</button>`;
  }

  private renderCheckbox(props: any, key: number): string {
    const { label, checked = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const checkedAttr = checked ? ' checked' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    return `    <div class="flex items-center mb-4">
      <input type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800 ${disabledClass}"${checkedAttr}${disabledAttr}>
      <label class="ml-2 block text-sm text-gray-400">${label}</label>
    </div>`;
  }

  private renderRadio(props: any, key: number): string {
    const { label, name, options = [], disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    let code = `    <div class="mb-4">`;
    if (label) {
      code += `\n      <label class="block text-sm font-medium text-gray-400 mb-2">${label}</label>`;
    }
    
    // options配列がある場合は、各オプションをラジオボタンとしてレンダリング
    if (options && options.length > 0) {
      options.forEach((opt: any, index: number) => {
        const checkedAttr = opt.checked ? ' checked' : '';
        code += `\n      <div class="flex items-center mb-2">
        <input type="radio" name="${name || 'radio'}" value="${opt.value || ''}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${checkedAttr}${disabledAttr}>
        <label class="ml-2 block text-sm text-gray-400">${opt.label}</label>
      </div>`;
      });
    } else {
      // 単一のラジオボタン（後方互換性のため）
      const { value, checked = false } = props;
      const checkedAttr = checked ? ' checked' : '';
      code += `\n      <div class="flex items-center mb-2">
        <input type="radio" name="${name || 'radio'}" value="${value || ''}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${checkedAttr}${disabledAttr}>
        <label class="ml-2 block text-sm text-gray-400">${label}</label>
      </div>`;
    }
    
    code += `\n    </div>`;
    return code;
  }

  private renderSelect(props: any, key: number): string {
    const { label, options = [], placeholder, disabled = false, multiple = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    const multipleAttr = multiple ? ' multiple' : '';
    
    // multipleの場合は高さを調整
    const selectClass = multiple 
      ? `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-32 ${disabledClass}`
      : `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}`;
    
    let code = `    <div class="mb-4">`;
    if (label) {
      code += `\n      <label class="block text-sm font-medium text-gray-400 mb-2">${label}</label>`;
    }
    code += `\n      <select class="${selectClass}"${disabledAttr}${multipleAttr}>`;
    
    if (placeholder && !multiple) {
      code += `\n        <option value="" class="bg-gray-800 text-gray-400">${placeholder}</option>`;
    }
    
    options.forEach((opt: any) => {
      const selectedAttr = opt.selected ? ' selected' : '';
      code += `\n        <option value="${opt.value}" class="bg-gray-800 text-gray-400"${selectedAttr}>${opt.label}</option>`;
    });
    
    code += `\n      </select>`;
    code += `\n    </div>`;
    
    return code;
  }

  private renderDivider(props: any, key: number): string {
    const { orientation = 'horizontal', spacing = 'md' } = props;
    const spacingClasses = {
      'sm': 'my-2',
      'md': 'my-4',
      'lg': 'my-6'
    };
    
    if (orientation === 'vertical') {
      return `    <div class="inline-block w-px h-6 bg-gray-700 mx-4"></div>`;
    }
    
    return `    <hr class="border-gray-700 ${spacingClasses[spacing as keyof typeof spacingClasses]}">`;
  }

  private renderAlert(props: any, key: number): string {
    const { message, variant = 'info', title } = props;
    const variantClasses = {
      'info': 'bg-blue-900 border-blue-700 text-blue-200',
      'success': 'bg-green-900 border-green-700 text-green-200',
      'warning': 'bg-yellow-900 border-yellow-700 text-yellow-200',
      'error': 'bg-red-900 border-red-700 text-red-200'
    };
    
    let code = `    <div class="p-4 border rounded-md ${variantClasses[variant as keyof typeof variantClasses]}">`;
    if (title) {
      code += `\n      <h3 class="text-sm font-medium mb-1">${title}</h3>`;
    }
    code += `\n      <p class="text-sm">${message}</p>`;
    code += `\n    </div>`;
    
    return code;
  }

  private renderContainer(props: any, key: number): string {
    const { layout = 'vertical', components = [] } = props;
    const layoutClasses = {
      'vertical': 'textui-container flex flex-col space-y-4',
      'horizontal': 'textui-container flex flex-row space-x-4',
      'flex': 'textui-container flex flex-wrap gap-4',
      'grid': 'textui-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    };
    
    let code = `    <div class="${layoutClasses[layout as keyof typeof layoutClasses]}">`;
    components.forEach((child: ComponentDef, index: number) => {
      const childCode = this.renderComponent(child, index);
      // インデントを調整
      const indentedCode = childCode.split('\n').map(line => `  ${line}`).join('\n');
      code += `\n${indentedCode}`;
    });
    code += `\n    </div>`;
    
    return code;
  }

  private renderForm(props: FormComponent, key: number): string {
    const { id, fields = [], actions = [] } = props;
    
    let code = `    <form id="${id}" class="textui-container space-y-4">`;
    
    fields.forEach((field: FormField, index: number) => {
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
    actions.forEach((action: FormAction, index: number) => {
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