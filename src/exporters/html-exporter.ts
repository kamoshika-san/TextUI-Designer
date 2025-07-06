import type { TextUIDSL, ComponentDef, FormComponent, TextComponent, InputComponent } from '../renderer/types';
import type { ExportOptions } from './index';
import { BaseComponentRenderer } from './base-component-renderer';
import { ComponentTemplateHandlers, HtmlTemplateRenderer } from './templates';

/**
 * HTML エクスポーター（テンプレートシステム対応版）
 * 
 * リファクタリング後：
 * - 長大なメソッドをテンプレートハンドラーに分離
 * - 文字列連結を統一されたテンプレートシステムで処理
 * - スタイル管理をテンプレートに集約
 */
export class HtmlExporter extends BaseComponentRenderer {
  private templateHandlers: ComponentTemplateHandlers;
  private templateRenderer: HtmlTemplateRenderer;

  constructor() {
    super('html');
    this.templateHandlers = new ComponentTemplateHandlers();
    this.templateRenderer = this.templateHandlers.getRenderer();
  }

  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n');
    
    // テンプレートレンダラーでページ全体を生成
    const pageTemplate = this.templateRenderer.generatePageTemplate(dsl.page?.title || 'TextUI Export');
    return pageTemplate.replace('{{content}}', componentCode);
  }

  getFileExtension(): string {
    return '.html';
  }

  /**
   * コンポーネントレンダリング（テンプレートハンドラーに委譲）
   */
  protected renderText(props: { type: 'Text' } & TextComponent, key: number): string {
    return this.templateHandlers.getTextHandler().render(props, key);
  }

  protected renderInput(props: { type: 'Input' } & InputComponent, key: number): string {
    return this.templateHandlers.getInputHandler().render(props, key);
  }

  protected renderButton(props: { type: 'Button' } & any, key: number): string {
    return this.templateHandlers.getButtonHandler().render(props, key);
  }

  protected renderCheckbox(props: { type: 'Checkbox' } & any, key: number): string {
    return this.templateHandlers.getCheckboxHandler().render(props, key);
  }

  protected renderRadio(props: { type: 'Radio' } & any, key: number): string {
    return this.templateHandlers.getRadioHandler().render(props, key);
  }

  protected renderSelect(props: { type: 'Select' } & any, key: number): string {
    return this.templateHandlers.getSelectHandler().render(props, key);
  }

  protected renderDivider(props: { type: 'Divider' } & any, key: number): string {
    return this.templateHandlers.getDividerHandler().render(props, key);
  }

  protected renderAlert(props: { type: 'Alert' } & any, key: number): string {
    return this.templateHandlers.getAlertHandler().render(props, key);
  }

  protected renderContainer(props: { type: 'Container' } & any, key: number): string {
    return this.templateHandlers.getContainerHandler().render(
      props, 
      key, 
      (comp: ComponentDef, index: number) => this.renderComponent(comp, index)
    );
  }

  protected renderForm(props: { type: 'Form' } & FormComponent, key: number): string {
    return this.templateHandlers.getFormHandler().render(
      props, 
      key, 
      (comp: ComponentDef, index: number) => this.renderComponent(comp, index)
    );
  }

  /**
   * カスタムテンプレートの追加
   */
  addCustomTemplate(componentType: string, templateConfig: {
    template: string;
    defaultClasses?: string;
    conditionalClasses?: Record<string, string>;
  }): void {
    this.templateRenderer.addTemplate(componentType, templateConfig);
  }

  /**
   * 利用可能なテンプレート一覧を取得
   */
  getAvailableTemplates(): string[] {
    return this.templateRenderer.getAvailableTemplates();
  }

  /**
   * テンプレートレンダラーを取得（高度なカスタマイズ用）
   */
  getTemplateRenderer(): HtmlTemplateRenderer {
    return this.templateRenderer;
  }
} 