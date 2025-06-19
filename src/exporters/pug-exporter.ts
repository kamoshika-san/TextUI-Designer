import type { TextUIDSL, ComponentDef, FormComponent, FormField, FormAction } from '../renderer/types';
import type { ExportOptions, Exporter } from './index';

export class PugExporter implements Exporter {
  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n');
    
    return `doctype html
html(lang="ja")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title Generated UI
    script(src="https://cdn.tailwindcss.com")
  
  body.bg-gray-50
    .container.mx-auto.p-6
${componentCode}`;
  }

  getFileExtension(): string {
    return '.pug';
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
    
    return `      //- 未対応コンポーネント: ${Object.keys(comp)[0]}`;
  }

  private renderText(props: any, key: number): string {
    const { value, size = 'base', weight = 'normal', color = 'text-gray-900' } = props;
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
    
    return `      p(class="${sizeClasses[size as keyof typeof sizeClasses]} ${weightClasses[weight as keyof typeof weightClasses]} ${color}") ${value}`;
  }

  private renderInput(props: any, key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const requiredAttr = required ? 'required' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    
    let code = `      .mb-4`;
    if (label) {
      code += `\n        label.block.text-sm.font-medium.text-gray-700.mb-2 ${label}`;
    }
    code += `\n        input(type="${type}" placeholder="${placeholder || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}" ${requiredAttr} ${disabledAttr})`;
    
    return code;
  }

  private renderButton(props: any, key: number): string {
    const { label, variant = 'primary', size = 'md', disabled = false } = props;
    const variantClasses = {
      'primary': 'bg-blue-600 hover:bg-blue-700 text-white',
      'secondary': 'bg-gray-600 hover:bg-gray-700 text-white',
      'outline': 'border border-gray-300 hover:bg-gray-50 text-gray-700'
    };
    const sizeClasses = {
      'sm': 'px-3 py-1.5 text-sm',
      'md': 'px-4 py-2 text-base',
      'lg': 'px-6 py-3 text-lg'
    };
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    
    return `      button(class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${variantClasses[variant as keyof typeof variantClasses]} ${sizeClasses[size as keyof typeof sizeClasses]} ${disabledClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" ${disabledAttr}) ${label}`;
  }

  private renderCheckbox(props: any, key: number): string {
    const { label, checked = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const checkedAttr = checked ? 'checked' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    
    return `      .flex.items-center.mb-4
        input(type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${disabledClass}" ${checkedAttr} ${disabledAttr})
        label.ml-2.block.text-sm.text-gray-900 ${label}`;
  }

  private renderRadio(props: any, key: number): string {
    const { label, value, name, checked = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const checkedAttr = checked ? 'checked' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    
    return `      .flex.items-center.mb-4
        input(type="radio" name="${name || 'radio'}" value="${value || ''}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${disabledClass}" ${checkedAttr} ${disabledAttr})
        label.ml-2.block.text-sm.text-gray-900 ${label}`;
  }

  private renderSelect(props: any, key: number): string {
    const { label, options = [], placeholder, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    
    let code = `      .mb-4`;
    if (label) {
      code += `\n        label.block.text-sm.font-medium.text-gray-700.mb-2 ${label}`;
    }
    code += `\n        select(class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}" ${disabledAttr})`;
    
    if (placeholder) {
      code += `\n          option(value="") ${placeholder}`;
    }
    
    options.forEach((opt: any) => {
      code += `\n          option(value="${opt.value}") ${opt.label}`;
    });
    
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
      return `      .inline-block.w-px.h-6.bg-gray-300.mx-4`;
    }
    
    return `      hr(class="border-gray-300 ${spacingClasses[spacing as keyof typeof spacingClasses]}")`;
  }

  private renderAlert(props: any, key: number): string {
    const { message, type = 'info', title } = props;
    const typeClasses = {
      'info': 'bg-blue-50 border-blue-200 text-blue-800',
      'success': 'bg-green-50 border-green-200 text-green-800',
      'warning': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'error': 'bg-red-50 border-red-200 text-red-800'
    };
    
    let code = `      .p-4.border.rounded-md(class="${typeClasses[type as keyof typeof typeClasses]}")`;
    if (title) {
      code += `\n        h3.text-sm.font-medium.mb-1 ${title}`;
    }
    code += `\n        p.text-sm ${message}`;
    
    return code;
  }

  private renderContainer(props: any, key: number): string {
    const { layout = 'vertical', components = [] } = props;
    const layoutClasses = {
      'vertical': 'flex flex-col space-y-4',
      'horizontal': 'flex space-x-4',
      'grid': 'grid grid-cols-1 gap-4'
    };
    
    let code = `      .${layoutClasses[layout as keyof typeof layoutClasses]}`;
    components.forEach((child: ComponentDef, index: number) => {
      const childCode = this.renderComponent(child, index);
      // インデントを調整
      const indentedCode = childCode.split('\n').map(line => `  ${line}`).join('\n');
      code += `\n${indentedCode}`;
    });
    
    return code;
  }

  private renderForm(props: FormComponent, key: number): string {
    const { id, fields = [], actions = [] } = props;
    
    let code = `      form(id="${id}" class="space-y-4")`;
    
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
    
    code += `\n        .flex.space-x-4`;
    actions.forEach((action: FormAction, index: number) => {
      if (action.Button) {
        const actionCode = this.renderButton(action.Button, index);
        const indentedCode = actionCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });
    
    return code;
  }
} 