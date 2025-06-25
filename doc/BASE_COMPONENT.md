# BaseComponentRendererについて

## 目的
`BaseComponentRenderer` は、HTML/React/Pug など複数のエクスポーターに共通するレンダリング処理をまとめる基底クラスです。各エクスポーターはこのクラスを継承し、個々のコンポーネントをどのように出力するかを実装します。重複コードの削減と型安全性の向上が主な目的です。

## インターフェース
`BaseComponentRenderer` は `Exporter` インターフェースを実装し、以下の抽象メソッドを持ちます。

```ts
export abstract class BaseComponentRenderer implements Exporter {
  protected renderComponent(comp: ComponentDef, key: number): string {
    // 型ガードで各コンポーネントを判定
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
}
```

これらのメソッドにより、各エクスポーターは必要なコンポーネントのみを実装すればよくなります。共通処理は `renderComponent` が自動的に呼び分けます。

## 拡張例
HTML 形式を出力する `HtmlExporter` は次のように `BaseComponentRenderer` を継承します。

```ts
export class HtmlExporter extends BaseComponentRenderer {
  constructor() {
    super('html');
  }

  protected renderText(props: TextComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getVariantClasses(this.format);
    // ...スタイルを組み立ててHTMLタグを返す
    return `<p class="${variantClasses[props.variant ?? 'p']}">${props.value}</p>`;
  }

  // 他のコンポーネントも同様に実装
}
```

このように、各エクスポーターは必要なメソッドだけを実装することで、統一されたインターフェースでレンダリング処理を拡張できます。
