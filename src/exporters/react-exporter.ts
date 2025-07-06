import type { TextUIDSL, ComponentDef, FormComponent, FormField, FormAction } from '../renderer/types';
import { 
  isInputField,
  isCheckboxField,
  isRadioField,
  isSelectField,
  isButtonAction
} from '../renderer/types';
import type { ExportOptions } from './index';
import { BaseComponentRenderer } from './base-component-renderer';
import { StyleManager } from '../utils/style-manager';

export class ReactExporter extends BaseComponentRenderer {
  constructor() {
    super('react');
  }

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

  protected renderText(props: any, key: number): string {
    const { value, variant = 'p' } = props;
    
    // StyleManagerを使用してスタイルを取得
    const styleManager = this.getStyleManager();
    const config = styleManager.getTextVariantConfig(variant, this.format);
    
    return `      <${config.element} key={${key}} className="${config.className}">${value}</${config.element}>`;
  }

  protected renderInput(props: any, key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false } = props;
    const disabledClass = this.getDisabledClass(disabled);
    
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

  protected renderButton(props: any, key: number): string {
    const { label, kind = 'primary' } = props;
    
    // StyleManagerを使用してスタイルを取得
    const styleManager = this.getStyleManager();
    const className = styleManager.getButtonKindClass(kind, this.format);
    
    return `      <button
        key={${key}}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${className} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        ${label}
      </button>`;
  }

  protected renderCheckbox(props: any, key: number): string {
    const { label, checked = false, disabled = false } = props;
    const disabledClass = this.getDisabledClass(disabled);
    
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

  protected renderRadio(props: any, key: number): string {
    const { label, value, name, checked = false, disabled = false } = props;
    const disabledClass = this.getDisabledClass(disabled);
    
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

  protected renderSelect(props: any, key: number): string {
    const { label, options = [], placeholder, disabled = false } = props;
    const disabledClass = this.getDisabledClass(disabled);
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

  protected renderDivider(props: any, key: number): string {
    const { orientation = 'horizontal', spacing = 'md' } = props;
    const styleManager = this.getStyleManager();
    const spacingClasses = styleManager.getSpacingClasses(this.format);
    
    if (orientation === 'vertical') {
      return `      <div key={${key}} className="inline-block w-px h-6 bg-gray-300 mx-4"></div>`;
    }
    
    return `      <hr key={${key}} className="border-gray-300 ${spacingClasses[spacing as keyof typeof spacingClasses]}" />`;
  }

  protected renderAlert(props: any, key: number): string {
    const { message, variant = 'info' } = props;
    
    // StyleManagerを使用してスタイルを取得
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getAlertVariantClasses(this.format);
    const className = variantClasses[variant as keyof typeof variantClasses] || variantClasses.info;
    
    return `      <div key={${key}} className="p-4 border rounded-md ${className}">
        <p className="text-sm">${message}</p>
      </div>`;
  }

  protected renderContainer(props: any, key: number): string {
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

  protected renderForm(props: { type: 'Form' } & FormComponent, key: number): string {
    const { id, fields = [], actions = [] } = props;
    
    const fieldsCode = fields.map((field: FormField, index: number) => {
      if (isInputField(field)) {return this.renderInput(field, index);}
      if (isCheckboxField(field)) {return this.renderCheckbox(field, index);}
      if (isRadioField(field)) {return this.renderRadio(field, index);}
      if (isSelectField(field)) {return this.renderSelect(field, index);}
      return '';
    }).join('\n');
    
    const actionsCode = actions.map((action: FormAction, index: number) => {
      if (isButtonAction(action)) {return this.renderButton(action, index);}
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