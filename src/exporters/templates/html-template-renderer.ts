import type { ComponentDef } from '../../renderer/types';
import { StyleManager } from '../../utils/style-manager';

/**
 * HTMLテンプレートの置換可能なプレースホルダー
 */
export interface TemplateContext {
  [key: string]: any;
  // 基本的なプレースホルダー
  className?: string;
  content?: string;
  attributes?: string;
  children?: string;
  // コンポーネント固有のプレースホルダー
  label?: string;
  placeholder?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
}

/**
 * コンポーネントテンプレート定義
 */
export interface ComponentTemplate {
  /** HTMLテンプレート文字列 */
  template: string;
  /** デフォルトのCSSクラス */
  defaultClasses?: string;
  /** 条件付きクラス（variant、size等による） */
  conditionalClasses?: Record<string, string>;
  /** 必要な属性のバリデーション */
  requiredProps?: string[];
}

/**
 * テンプレートベースのHTMLレンダリングシステム
 * 文字列連結の複雑さを解決し、保守しやすいテンプレート管理を提供
 */
export class HtmlTemplateRenderer {
  private styleManager: StyleManager;
  private templates: Map<string, ComponentTemplate> = new Map();
  private format: string = 'html';

  constructor() {
    this.styleManager = new StyleManager();
    this.initializeTemplates();
  }

  /**
   * コンポーネントテンプレートを初期化
   */
  private initializeTemplates(): void {
    // Text Component Template
    this.templates.set('text', {
      template: '<{{tag}} class="{{className}}">{{content}}</{{tag}}>',
      defaultClasses: 'text-gray-300',
      conditionalClasses: {
        h1: 'text-3xl font-bold text-white',
        h2: 'text-2xl font-semibold text-white',
        h3: 'text-xl font-medium text-white',
        h4: 'text-lg font-medium text-white',
        h5: 'text-base font-medium text-white',
        h6: 'text-sm font-medium text-white',
        p: 'text-base text-gray-300',
        small: 'text-sm text-gray-400',
        caption: 'text-xs text-gray-500'
      }
    });

    // Input Component Template
    this.templates.set('input', {
      template: `<div class="mb-4">
  {{#if label}}<label class="block text-sm font-medium text-gray-400 mb-2">{{label}}</label>{{/if}}
  <input type="{{type}}" placeholder="{{placeholder}}" class="{{className}}" {{attributes}}>
</div>`,
      defaultClasses: 'w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      requiredProps: ['type']
    });

    // Button Component Template
    this.templates.set('button', {
      template: '<button {{attributes}} class="{{className}}">{{content}}</button>',
      defaultClasses: 'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2',
      conditionalClasses: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
        outline: 'border border-gray-600 text-gray-300 hover:bg-gray-800 focus:ring-gray-500'
      }
    });

    // Checkbox Component Template
    this.templates.set('checkbox', {
      template: `<div class="flex items-center mb-4">
  <input type="checkbox" class="{{className}}" {{attributes}}>
  <label class="ml-2 block text-sm text-gray-400">{{label}}</label>
</div>`,
      defaultClasses: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800'
    });

    // Select Component Template
    this.templates.set('select', {
      template: `<div class="mb-4">
  {{#if label}}<label class="block text-sm font-medium text-gray-400 mb-2">{{label}}</label>{{/if}}
  <select class="{{className}}" {{attributes}}>
    {{#if placeholder}}<option value="" class="bg-gray-800 text-gray-400">{{placeholder}}</option>{{/if}}
    {{children}}
  </select>
</div>`,
      defaultClasses: 'w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
    });

    // Radio Component Template
    this.templates.set('radio', {
      template: `<div class="mb-4">
  {{#if label}}<label class="block text-sm font-medium text-gray-400 mb-2">{{label}}</label>{{/if}}
  {{children}}
</div>`,
      defaultClasses: ''
    });

    // Radio Option Template
    this.templates.set('radio-option', {
      template: `<div class="flex items-center mb-2">
  <input type="radio" name="{{name}}" value="{{value}}" class="{{className}}" {{attributes}}>
  <label class="ml-2 block text-sm text-gray-400">{{label}}</label>
</div>`,
      defaultClasses: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800'
    });

    // Alert Component Template
    this.templates.set('alert', {
      template: `<div class="p-4 border rounded-md {{className}}">
  {{#if title}}<h3 class="text-sm font-medium mb-1">{{title}}</h3>{{/if}}
  <p class="text-sm">{{content}}</p>
</div>`,
      defaultClasses: 'border-gray-600 bg-gray-800 text-gray-300',
      conditionalClasses: {
        info: 'border-blue-600 bg-blue-900 text-blue-200',
        success: 'border-green-600 bg-green-900 text-green-200',
        warning: 'border-yellow-600 bg-yellow-900 text-yellow-200',
        error: 'border-red-600 bg-red-900 text-red-200'
      }
    });

    // Container Component Template
    this.templates.set('container', {
      template: '<div class="{{className}}">{{children}}</div>',
      defaultClasses: 'textui-container',
      conditionalClasses: {
        vertical: 'flex flex-col space-y-4',
        horizontal: 'flex flex-row space-x-4',
        flex: 'flex flex-wrap gap-4',
        grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      }
    });

    // Form Component Template
    this.templates.set('form', {
      template: `<form {{attributes}} class="textui-container space-y-4">
  {{children}}
  {{#if actions}}<div class="flex space-x-4">{{actions}}</div>{{/if}}
</form>`,
      defaultClasses: 'textui-container space-y-4'
    });

    // Divider Component Template
    this.templates.set('divider', {
      template: '{{#if vertical}}<div class="{{className}}"></div>{{else}}<hr class="{{className}}">{{/if}}',
      defaultClasses: 'border-gray-700',
      conditionalClasses: {
        vertical: 'inline-block w-px h-6 bg-gray-700 mx-4',
        horizontal: 'border-gray-700'
      }
    });
  }

  /**
   * コンポーネントをレンダリング
   */
  renderComponent(componentType: string, props: any, context: TemplateContext = {}): string {
    const template = this.templates.get(componentType);
    if (!template) {
      console.warn(`[HtmlTemplateRenderer] テンプレートが見つかりません: ${componentType}`);
      return `<!-- Unknown component: ${componentType} -->`;
    }

    // スタイルクラスを解決
    const className = this.resolveClassName(componentType, props, template);
    
    // 属性を生成
    const attributes = this.generateAttributes(props);
    
    // テンプレートコンテキストを準備
    const templateContext: TemplateContext = {
      ...context,
      ...props,
      className,
      attributes,
      content: props.value || props.message || props.content || ''
    };

    // テンプレートを処理
    return this.processTemplate(template.template, templateContext);
  }

  /**
   * CSSクラス名を解決
   */
  private resolveClassName(componentType: string, props: any, template: ComponentTemplate): string {
    let className = template.defaultClasses || '';
    
    // 条件付きクラスを適用
    if (template.conditionalClasses && props.variant) {
      const variantClass = template.conditionalClasses[props.variant];
      if (variantClass) {
        className = variantClass;
      }
    }

    // kind、layout等の他の条件も適用
    if (template.conditionalClasses && props.kind) {
      const kindClass = template.conditionalClasses[props.kind];
      if (kindClass) {
        className = kindClass;
      }
    }

    if (template.conditionalClasses && props.layout) {
      const layoutClass = template.conditionalClasses[props.layout];
      if (layoutClass) {
        className = `${template.defaultClasses} ${layoutClass}`;
      }
    }

    // disabled状態の処理
    if (props.disabled) {
      className += ' opacity-50 cursor-not-allowed';
    }

    // カスタムクラスの追加
    if (props.className) {
      className += ` ${props.className}`;
    }

    return className.trim();
  }

  /**
   * HTML属性を生成
   */
  private generateAttributes(props: any): string {
    const attributes: string[] = [];

    if (props.id) attributes.push(`id="${props.id}"`);
    if (props.name) attributes.push(`name="${props.name}"`);
    if (props.required) attributes.push('required');
    if (props.disabled) attributes.push('disabled');
    if (props.checked) attributes.push('checked');
    if (props.selected) attributes.push('selected');
    if (props.multiple) attributes.push('multiple');
    if (props.submit) attributes.push('type="submit"');
    if (props.min !== undefined) attributes.push(`min="${props.min}"`);
    if (props.max !== undefined) attributes.push(`max="${props.max}"`);
    if (props.step !== undefined) attributes.push(`step="${props.step}"`);

    return attributes.join(' ');
  }

  /**
   * シンプルなテンプレート処理（Handlebars風の構文をサポート）
   */
  private processTemplate(template: string, context: TemplateContext): string {
    let result = template;

    // {{variable}} の置換
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : '';
    });

    // {{#if condition}} ... {{/if}} の処理
    result = result.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      return context[condition] ? content : '';
    });

    // {{#else}} の処理
    result = result.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, ifContent, elseContent) => {
      return context[condition] ? ifContent : elseContent;
    });

    return result;
  }

  /**
   * ページ全体のHTMLテンプレートを生成
   */
  generatePageTemplate(title: string = 'TextUI Export'): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* VS Codeテーマの影響を排除 */
    :root { all: unset; }
    
    /* 基本的なスタイルリセット */
    *, *::before, *::after { box-sizing: border-box; }
    
    html {
      font-size: 16px;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #cccccc;
      background-color: #1e1e1e;
      -webkit-font-smoothing: antialiased;
    }
    
    /* フォーム要素のリセット */
    input, button, textarea, select {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }
    
    /* multipleセレクトの選択項目ハイライト */
    select[multiple] option:checked {
      background-color: #3b82f6 !important;
      color: #ffffff !important;
    }
  </style>
</head>
<body class="bg-gray-900 text-gray-300 min-h-screen">
  <div class="container mx-auto p-6">
{{content}}
  </div>
</body>
</html>`;
  }

  /**
   * カスタムテンプレートを追加
   */
  addTemplate(componentType: string, template: ComponentTemplate): void {
    this.templates.set(componentType, template);
  }

  /**
   * 利用可能なテンプレート一覧を取得
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
} 