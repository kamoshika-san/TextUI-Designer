import type { FormComponent, FormField, FormAction, TextComponent, InputComponent } from '../../renderer/types';
import { 
  isInputField,
  isCheckboxField,
  isRadioField,
  isSelectField,
  isButtonAction
} from '../../renderer/types';
import { HtmlTemplateRenderer, TemplateContext } from './html-template-renderer';

/**
 * Textコンポーネント専用ハンドラー
 */
export class TextTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Text' } & TextComponent, key: number): string {
    const { value, variant = 'p', size = 'base', weight = 'normal', color = 'text-gray-900' } = props;
    
    const context: TemplateContext = {
      content: value,
      variant,
      size,
      weight,
      color
    };

    return this.renderer.renderComponent('text', props, context);
  }
}

/**
 * Inputコンポーネント専用ハンドラー
 */
export class InputTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Input' } & InputComponent, key: number): string {
    const { type = 'text', placeholder = '', label } = props;
    
    const context: TemplateContext = {
      type,
      placeholder,
      label
    };

    return this.renderer.renderComponent('input', props, context);
  }
}

/**
 * Buttonコンポーネント専用ハンドラー
 */
export class ButtonTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Button' } & any, key: number): string {
    const { label, kind = 'primary', size = 'md', disabled = false } = props;
    
    const context: TemplateContext = {
      content: label,
      kind,
      size,
      disabled
    };

    return this.renderer.renderComponent('button', props, context);
  }
}

/**
 * Checkboxコンポーネント専用ハンドラー
 */
export class CheckboxTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Checkbox' } & any, key: number): string {
    const { label } = props;
    
    const context: TemplateContext = {
      label
    };

    return this.renderer.renderComponent('checkbox', props, context);
  }
}

/**
 * Radioコンポーネント専用ハンドラー
 */
export class RadioTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Radio' } & any, key: number): string {
    const { label, name, options = [] } = props;
    
    let childrenHtml = '';
    
    if (options && options.length > 0) {
      // 複数オプション
      childrenHtml = options.map((opt: any, index: number) => {
        const optionContext: TemplateContext = {
          name: name || 'radio',
          value: opt.value || '',
          label: opt.label,
          checked: opt.checked
        };
        return this.renderer.renderComponent('radio-option', opt, optionContext);
      }).join('\n    ');
    } else {
      // 単一オプション（後方互換性）
      const optionContext: TemplateContext = {
        name: name || 'radio',
        value: props.value || '',
        label,
        checked: props.checked
      };
      childrenHtml = this.renderer.renderComponent('radio-option', props, optionContext);
    }
    
    const context: TemplateContext = {
      label,
      children: childrenHtml
    };

    return this.renderer.renderComponent('radio', props, context);
  }
}

/**
 * Selectコンポーネント専用ハンドラー
 */
export class SelectTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Select' } & any, key: number): string {
    const { label, options = [], placeholder, multiple = false } = props;
    
    // オプションHTMLを生成
    const optionsHtml = options.map((opt: any) => {
      const selectedAttr = opt.selected ? ' selected' : '';
      return `    <option value="${opt.value}" class="bg-gray-800 text-gray-400"${selectedAttr}>${opt.label}</option>`;
    }).join('\n');
    
    // multipleの場合はクラスを調整
    const selectClasses = multiple 
      ? 'w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-32'
      : undefined; // デフォルトクラスを使用
    
    const context: TemplateContext = {
      label,
      placeholder: !multiple ? placeholder : undefined,
      children: optionsHtml,
      className: selectClasses || undefined
    };

    return this.renderer.renderComponent('select', props, context);
  }
}

/**
 * Alertコンポーネント専用ハンドラー
 */
export class AlertTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Alert' } & any, key: number): string {
    const { message, variant = 'info', title } = props;
    
    const context: TemplateContext = {
      content: message,
      title,
      variant
    };

    return this.renderer.renderComponent('alert', props, context);
  }
}

/**
 * Containerコンポーネント専用ハンドラー
 */
export class ContainerTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Container' } & any, key: number, renderChildComponent: (comp: any, index: number) => string): string {
    const { layout = 'vertical', components = [] } = props;
    
    // 子コンポーネントをレンダリング
    const childrenHtml = components.map((child: any, index: number) => {
      const childCode = renderChildComponent(child, index);
      // インデントを調整
      return childCode.split('\n').map(line => `  ${line}`).join('\n');
    }).join('\n');
    
    const context: TemplateContext = {
      layout,
      children: childrenHtml
    };

    return this.renderer.renderComponent('container', props, context);
  }
}

/**
 * Formコンポーネント専用ハンドラー
 */
export class FormTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Form' } & FormComponent, key: number, renderChildComponent: (comp: any, index: number) => string): string {
    const { id, fields = [], actions = [] } = props;
    
    // フィールドをレンダリング
    const fieldsHtml = fields.map((field: FormField, index: number) => {
      let fieldCode = '';
      
      if (isInputField(field)) {
        fieldCode = new InputTemplateHandler(this.renderer).render(field, index);
      } else if (isCheckboxField(field)) {
        fieldCode = new CheckboxTemplateHandler(this.renderer).render(field, index);
      } else if (isRadioField(field)) {
        fieldCode = new RadioTemplateHandler(this.renderer).render(field, index);
      } else if (isSelectField(field)) {
        fieldCode = new SelectTemplateHandler(this.renderer).render(field, index);
      }
      
      // インデントを調整
      return fieldCode.split('\n').map(line => `  ${line}`).join('\n');
    }).join('\n');
    
    // アクションをレンダリング
    const actionsHtml = actions.map((action: FormAction, index: number) => {
      if (isButtonAction(action)) {
        return new ButtonTemplateHandler(this.renderer).render(action, index);
      }
      return '';
    }).filter(Boolean).join('\n  ');
    
    const context: TemplateContext = {
      id,
      children: fieldsHtml,
      actions: actionsHtml,
      attributes: id ? `id="${id}"` : ''
    };

    return this.renderer.renderComponent('form', props, context);
  }
}

/**
 * Dividerコンポーネント専用ハンドラー
 */
export class DividerTemplateHandler {
  constructor(private renderer: HtmlTemplateRenderer) {}

  render(props: { type: 'Divider' } & any, key: number): string {
    const { orientation = 'horizontal', spacing = 'md' } = props;
    
    const context: TemplateContext = {
      vertical: orientation === 'vertical',
      spacing
    };

    // spacing用のクラスを追加
    let spacingClass = '';
    const spacingMap: Record<string, string> = {
      'sm': 'my-2',
      'md': 'my-4',
      'lg': 'my-6',
      'xl': 'my-8'
    };
    
    if (orientation === 'horizontal' && spacingMap[spacing]) {
      spacingClass = spacingMap[spacing];
    }

    const modifiedProps = {
      ...props,
      className: spacingClass
    };

    return this.renderer.renderComponent('divider', modifiedProps, context);
  }
}

/**
 * 全ハンドラーをまとめた統合クラス
 */
export class ComponentTemplateHandlers {
  private renderer: HtmlTemplateRenderer;
  private textHandler: TextTemplateHandler;
  private inputHandler: InputTemplateHandler;
  private buttonHandler: ButtonTemplateHandler;
  private checkboxHandler: CheckboxTemplateHandler;
  private radioHandler: RadioTemplateHandler;
  private selectHandler: SelectTemplateHandler;
  private alertHandler: AlertTemplateHandler;
  private containerHandler: ContainerTemplateHandler;
  private formHandler: FormTemplateHandler;
  private dividerHandler: DividerTemplateHandler;

  constructor() {
    this.renderer = new HtmlTemplateRenderer();
    this.textHandler = new TextTemplateHandler(this.renderer);
    this.inputHandler = new InputTemplateHandler(this.renderer);
    this.buttonHandler = new ButtonTemplateHandler(this.renderer);
    this.checkboxHandler = new CheckboxTemplateHandler(this.renderer);
    this.radioHandler = new RadioTemplateHandler(this.renderer);
    this.selectHandler = new SelectTemplateHandler(this.renderer);
    this.alertHandler = new AlertTemplateHandler(this.renderer);
    this.containerHandler = new ContainerTemplateHandler(this.renderer);
    this.formHandler = new FormTemplateHandler(this.renderer);
    this.dividerHandler = new DividerTemplateHandler(this.renderer);
  }

  getRenderer(): HtmlTemplateRenderer {
    return this.renderer;
  }

  getTextHandler(): TextTemplateHandler {
    return this.textHandler;
  }

  getInputHandler(): InputTemplateHandler {
    return this.inputHandler;
  }

  getButtonHandler(): ButtonTemplateHandler {
    return this.buttonHandler;
  }

  getCheckboxHandler(): CheckboxTemplateHandler {
    return this.checkboxHandler;
  }

  getRadioHandler(): RadioTemplateHandler {
    return this.radioHandler;
  }

  getSelectHandler(): SelectTemplateHandler {
    return this.selectHandler;
  }

  getAlertHandler(): AlertTemplateHandler {
    return this.alertHandler;
  }

  getContainerHandler(): ContainerTemplateHandler {
    return this.containerHandler;
  }

  getFormHandler(): FormTemplateHandler {
    return this.formHandler;
  }

  getDividerHandler(): DividerTemplateHandler {
    return this.dividerHandler;
  }
} 