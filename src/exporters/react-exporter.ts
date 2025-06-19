import type { TextUIDSL, ComponentDef, FormComponent, FormField, FormAction } from '../renderer/types';
import type { ExportOptions, Exporter } from './index';

export class ReactExporter implements Exporter {
  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n\n');
    
    return `import React from 'react';

export default function GeneratedUI() {
  return (
    <div className="p-6">
${componentCode}
    </div>
  );
}`;
  }

  getFileExtension(): string {
    return '.tsx';
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
    
    return `      {/* 未対応コンポーネント: ${Object.keys(comp)[0]} */}`;
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
    
    return `      <p key={${key}} className=\"${sizeClasses[size as keyof typeof sizeClasses]} ${weightClasses[weight as keyof typeof weightClasses]} ${color}\">{\"${value}\"}</p>`;
  }

  private renderInput(props: any, key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return `      <div key={${key}} className="mb-4">
        ${label ? `<label className="block text-sm font-medium text-gray-700 mb-2">${label}</label>` : ''}
        <input
          type="${type}"
          placeholder="${placeholder || ''}"
          ${required ? 'required' : ''}
          ${disabled ? 'disabled' : ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"
        />
      </div>`;
  }

  private renderButton(props: any, key: number): string {
    const { label, variant = 'primary', size = 'md', disabled = false, onClick } = props;
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
    
    return `      <button
        key={${key}}
        ${disabled ? 'disabled' : ''}
        className=\"inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${variantClasses[variant as keyof typeof variantClasses]} ${sizeClasses[size as keyof typeof sizeClasses]} ${disabledClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500\"
      >
        ${label}
      </button>`;
  }

  private renderCheckbox(props: any, key: number): string {
    const { label, checked = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return `      <div key={${key}} className="flex items-center mb-4">
        <input
          type="checkbox"
          defaultChecked={${checked}}
          ${disabled ? 'disabled' : ''}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${disabledClass}"
        />
        <label className="ml-2 block text-sm text-gray-900">
          ${label}
        </label>
      </div>`;
  }

  private renderRadio(props: any, key: number): string {
    const { label, value, name, checked = false, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return `      <div key={${key}} className="flex items-center mb-4">
        <input
          type="radio"
          name="${name || 'radio'}"
          value="${value || ''}"
          defaultChecked={${checked}}
          ${disabled ? 'disabled' : ''}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${disabledClass}"
        />
        <label className="ml-2 block text-sm text-gray-900">
          ${label}
        </label>
      </div>`;
  }

  private renderSelect(props: any, key: number): string {
    const { label, options = [], placeholder, disabled = false } = props;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const optionsCode = options.map((opt: any) => 
      `          <option key="${opt.value}" value="${opt.value}">${opt.label}</option>`
    ).join('\n');
    
    return `      <div key={${key}} className="mb-4">
        ${label ? `<label className="block text-sm font-medium text-gray-700 mb-2">${label}</label>` : ''}
        <select
          ${disabled ? 'disabled' : ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"
        >
          ${placeholder ? `<option value="">${placeholder}</option>` : ''}
${optionsCode}
        </select>
      </div>`;
  }

  private renderDivider(props: any, key: number): string {
    const { orientation = 'horizontal', spacing = 'md' } = props;
    const spacingClasses = {
      'sm': 'my-2',
      'md': 'my-4',
      'lg': 'my-6'
    };
    
    if (orientation === 'vertical') {
      return `      <div key={${key}} className="inline-block w-px h-6 bg-gray-300 mx-4"></div>`;
    }
    
    return `      <hr key={${key}} className="border-gray-300 ${spacingClasses[spacing as keyof typeof spacingClasses]}" />`;
  }

  private renderAlert(props: any, key: number): string {
    const { message, type = 'info', title } = props;
    const typeClasses = {
      'info': 'bg-blue-50 border-blue-200 text-blue-800',
      'success': 'bg-green-50 border-green-200 text-green-800',
      'warning': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'error': 'bg-red-50 border-red-200 text-red-800'
    };
    
    return `      <div key={${key}} className="p-4 border rounded-md ${typeClasses[type as keyof typeof typeClasses]}">
        ${title ? `<h3 className="text-sm font-medium mb-1">${title}</h3>` : ''}
        <p className="text-sm">${message}</p>
      </div>`;
  }

  private renderContainer(props: any, key: number): string {
    const { layout = 'vertical', components = [] } = props;
    const layoutClasses = {
      'vertical': 'flex flex-col space-y-4',
      'horizontal': 'flex space-x-4',
      'grid': 'grid grid-cols-1 gap-4'
    };
    
    const childrenCode = components.map((child: ComponentDef, index: number) => 
      this.renderComponent(child, index)
    ).join('\n');
    
    return `      <div key={${key}} className="${layoutClasses[layout as keyof typeof layoutClasses]}">
${childrenCode}
      </div>`;
  }

  private renderForm(props: FormComponent, key: number): string {
    const { id, fields = [], actions = [] } = props;
    
    const fieldsCode = fields.map((field: FormField, index: number) => {
      if (field.Input) return this.renderInput(field.Input, index);
      if (field.Checkbox) return this.renderCheckbox(field.Checkbox, index);
      if (field.Radio) return this.renderRadio(field.Radio, index);
      if (field.Select) return this.renderSelect(field.Select, index);
      return '';
    }).join('\n');
    
    const actionsCode = actions.map((action: FormAction, index: number) => {
      if (action.Button) return this.renderButton(action.Button, index);
      return '';
    }).join('\n');
    
    return `      <form key={${key}} id="${id}" className="space-y-4">
${fieldsCode}
        <div className="flex space-x-4">
${actionsCode}
        </div>
      </form>`;
  }
} 