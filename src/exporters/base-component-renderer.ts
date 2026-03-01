import type { 
  TextUIDSL, 
  ComponentDef, 
  FormComponent, 
  FormField, 
  FormAction,
  TextComponent,
  InputComponent,
  ButtonComponent,
  CheckboxComponent,
  RadioComponent,
  SelectComponent,
  DividerComponent,
  AlertComponent,
  ContainerComponent
} from '../renderer/types';
import type { ExportOptions, Exporter } from './index';
import { StyleManager, type ExportFormat } from '../utils/style-manager';
import { getComponentName, BUILT_IN_COMPONENTS, type BuiltInComponentName } from '../registry/component-registry';

export type ComponentHandler = (props: any, key: number) => string;

/**
 * コンポーネントレンダリングの基底クラス
 * Mapベースのディスパッチにより、新コンポーネント追加時の変更箇所を最小化
 */
export abstract class BaseComponentRenderer implements Exporter {
  protected format: ExportFormat;
  private componentHandlers: Map<string, ComponentHandler> = new Map();

  constructor(format: ExportFormat) {
    this.format = format;
    this.initializeHandlers();
  }

  /**
   * 組み込みコンポーネントのハンドラーを登録
   * サブクラスでオーバーライドして追加コンポーネントを登録可能
   */
  protected initializeHandlers(): void {
    const builtInHandlers: Record<BuiltInComponentName, ComponentHandler> = {
      Text: (props, key) => this.renderText(props, key),
      Input: (props, key) => this.renderInput(props, key),
      Button: (props, key) => this.renderButton(props, key),
      Checkbox: (props, key) => this.renderCheckbox(props, key),
      Radio: (props, key) => this.renderRadio(props, key),
      Select: (props, key) => this.renderSelect(props, key),
      Divider: (props, key) => this.renderDivider(props, key),
      Alert: (props, key) => this.renderAlert(props, key),
      Container: (props, key) => this.renderContainer(props, key),
      Form: (props, key) => this.renderForm(props, key)
    };

    for (const componentName of BUILT_IN_COMPONENTS) {
      this.componentHandlers.set(componentName, builtInHandlers[componentName]);
    }
  }

  abstract export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  abstract getFileExtension(): string;

  /**
   * コンポーネントのレンダリング（Mapベースのディスパッチ）
   * if-else連鎖を排除し、レジストリに登録されたハンドラーで処理
   */
  protected renderComponent(comp: ComponentDef, key: number): string {
    const componentRecord = comp as unknown as Record<string, unknown>;
    const name = getComponentName(componentRecord);
    const props = name ? componentRecord[name] : undefined;

    if (name && props !== undefined) {
      const handler = this.componentHandlers.get(name);
      if (handler) {
        return handler(props, key);
      }
    }

    return this.renderUnsupportedComponent(comp, key);
  }

  /**
   * FormFieldのレンダリング（Mapベースのディスパッチ）
   * FormField / FormAction も同じハンドラーMapで処理し、if-else連鎖を排除
   */
  protected renderFormField(field: FormField, index: number): string {
    const fieldRecord = field as unknown as Record<string, unknown>;
    const name = getComponentName(fieldRecord);
    const props = name ? fieldRecord[name] : undefined;

    if (name && props !== undefined) {
      const handler = this.componentHandlers.get(name);
      if (handler) {
        return handler(props, index);
      }
    }
    return '';
  }

  /**
   * FormActionのレンダリング
   */
  protected renderFormAction(action: FormAction, index: number): string {
    if (action.Button) {
      const handler = this.componentHandlers.get('Button');
      if (handler) {
        return handler(action.Button, index);
      }
    }
    return '';
  }

  /**
   * カスタムコンポーネントハンドラーを登録
   * 外部から新しいコンポーネントタイプを追加するための公開API
   */
  public registerComponentHandler(name: string, handler: ComponentHandler): void {
    this.componentHandlers.set(name, handler);
  }

  /**
   * 登録済みコンポーネント名の一覧を取得
   */
  public getRegisteredComponents(): string[] {
    return Array.from(this.componentHandlers.keys());
  }

  protected renderUnsupportedComponent(comp: ComponentDef, key: number): string {
    const componentName = getComponentName(comp as Record<string, unknown>) || 'unknown';
    switch (this.format) {
      case 'html':
        return `    <!-- 未対応コンポーネント: ${componentName} -->`;
      case 'react':
        return `      {/* 未対応コンポーネント: ${componentName} */}`;
      case 'pug':
        return `      //- 未対応コンポーネント: ${componentName}`;
      default:
        return `<!-- 未対応コンポーネント: ${componentName} -->`;
    }
  }

  protected abstract renderText(props: TextComponent, key: number): string;
  protected abstract renderInput(props: InputComponent, key: number): string;
  protected abstract renderButton(props: ButtonComponent, key: number): string;
  protected abstract renderCheckbox(props: CheckboxComponent, key: number): string;
  protected abstract renderRadio(props: RadioComponent, key: number): string;
  protected abstract renderSelect(props: SelectComponent, key: number): string;
  protected abstract renderDivider(props: DividerComponent, key: number): string;
  protected abstract renderAlert(props: AlertComponent, key: number): string;
  protected abstract renderContainer(props: ContainerComponent, key: number): string;
  protected abstract renderForm(props: FormComponent, key: number): string;

  protected getStyleManager(): typeof StyleManager {
    return StyleManager;
  }

  protected getDisabledClass(disabled: boolean = false): string {
    return disabled ? 'opacity-50 cursor-not-allowed' : '';
  }

  protected adjustIndentation(code: string, baseIndent: string = '    '): string {
    return code.split('\n').map(line => `${baseIndent}${line}`).join('\n');
  }

  protected renderChildren(children: ComponentDef[], baseIndent: string = '  '): string {
    return children.map((child, index) => {
      const childCode = this.renderComponent(child, index);
      return this.adjustIndentation(childCode, baseIndent);
    }).join('\n');
  }
}
