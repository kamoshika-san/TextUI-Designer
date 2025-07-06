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
import { 
  isTextComponent,
  isInputComponent,
  isButtonComponent,
  isCheckboxComponent,
  isRadioComponent,
  isSelectComponent,
  isDividerComponent,
  isAlertComponent,
  isContainerComponent,
  isFormComponent
} from '../renderer/types';
import type { ExportOptions, Exporter } from './index';
import { StyleManager, type ExportFormat } from '../utils/style-manager';

/**
 * コンポーネントレンダリングの基底クラス
 * 共通のレンダリングロジックを提供し、重複コードを削減
 */
export abstract class BaseComponentRenderer implements Exporter {
  protected format: ExportFormat;

  constructor(format: ExportFormat) {
    this.format = format;
  }

  /**
   * エクスポート処理の抽象メソッド
   */
  abstract export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;

  /**
   * ファイル拡張子を取得する抽象メソッド
   */
  abstract getFileExtension(): string;

  /**
   * 共通のコンポーネントレンダリングロジック
   * 各エクスポーターで重複していた条件分岐を一元化
   * 型ガード関数を使用して型安全性を向上
   */
  protected renderComponent(comp: ComponentDef, key: number): string {
    if (isTextComponent(comp)) {
      return this.renderText(comp, key);
    }
    if (isInputComponent(comp)) {
      return this.renderInput(comp, key);
    }
    if (isButtonComponent(comp)) {
      return this.renderButton(comp, key);
    }
    if (isCheckboxComponent(comp)) {
      return this.renderCheckbox(comp, key);
    }
    if (isRadioComponent(comp)) {
      return this.renderRadio(comp, key);
    }
    if (isSelectComponent(comp)) {
      return this.renderSelect(comp, key);
    }
    if (isDividerComponent(comp)) {
      return this.renderDivider(comp, key);
    }
    if (isAlertComponent(comp)) {
      return this.renderAlert(comp, key);
    }
    if (isContainerComponent(comp)) {
      return this.renderContainer(comp, key);
    }
    if (isFormComponent(comp)) {
      return this.renderForm(comp, key);
    }
    
    return this.renderUnsupportedComponent(comp, key);
  }

  /**
   * 未対応コンポーネントのレンダリング
   */
  protected renderUnsupportedComponent(comp: ComponentDef, key: number): string {
    const componentName = Object.keys(comp)[0];
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

  /**
   * テキストコンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderText(props: { type: 'Text' } & TextComponent, key: number): string;

  /**
   * 入力コンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderInput(props: { type: 'Input' } & InputComponent, key: number): string;

  /**
   * ボタンコンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderButton(props: { type: 'Button' } & ButtonComponent, key: number): string;

  /**
   * チェックボックスコンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderCheckbox(props: { type: 'Checkbox' } & CheckboxComponent, key: number): string;

  /**
   * ラジオボタンコンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderRadio(props: { type: 'Radio' } & RadioComponent, key: number): string;

  /**
   * セレクトコンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderSelect(props: { type: 'Select' } & SelectComponent, key: number): string;

  /**
   * 区切り線コンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderDivider(props: { type: 'Divider' } & DividerComponent, key: number): string;

  /**
   * アラートコンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderAlert(props: { type: 'Alert' } & AlertComponent, key: number): string;

  /**
   * コンテナコンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderContainer(props: { type: 'Container' } & ContainerComponent, key: number): string;

  /**
   * フォームコンポーネントのレンダリング（抽象メソッド）
   */
  protected abstract renderForm(props: { type: 'Form' } & FormComponent, key: number): string;

  /**
   * スタイルマネージャーを取得
   */
  protected getStyleManager(): typeof StyleManager {
    return StyleManager;
  }

  /**
   * 無効化クラスを取得
   */
  protected getDisabledClass(disabled: boolean = false): string {
    return disabled ? 'opacity-50 cursor-not-allowed' : '';
  }

  /**
   * インデントを調整
   */
  protected adjustIndentation(code: string, baseIndent: string = '    '): string {
    return code.split('\n').map(line => `${baseIndent}${line}`).join('\n');
  }

  /**
   * コンポーネントの子要素を再帰的にレンダリング
   */
  protected renderChildren(children: ComponentDef[], baseIndent: string = '  '): string {
    return children.map((child, index) => {
      const childCode = this.renderComponent(child, index);
      return this.adjustIndentation(childCode, baseIndent);
    }).join('\n');
  }
} 