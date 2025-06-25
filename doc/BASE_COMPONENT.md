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

  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, i) => this.renderComponent(comp, i)).join('\n');
    // ... 生成したコードをHTMLテンプレートに埋め込んで返す
  }

  // 各コンポーネントの具体的なレンダリング処理を実装
  protected renderText(props: TextComponent, key: number): string {
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getVariantClasses(this.format);
    // ...
  }
  // ... その他のメソッド
}
```

このように `BaseComponentRenderer` を基底とすることで、追加のエクスポーターを実装する際も共通のインターフェースを保ったまま必要な部分だけを記述できます。
