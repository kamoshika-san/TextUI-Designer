# BaseComponentRenderer とは

`BaseComponentRenderer` は、エクスポーターで共通となるコンポーネントレンダリング処理をまとめた基底クラスです。HTML/React/Pug など各フォーマットへの出力ロジックを一元化することで、重複コードを削減し保守性を高めます。

## 基本プロパティ

```typescript
export abstract class BaseComponentRenderer implements Exporter {
  protected format: ExportFormat;

  constructor(format: ExportFormat) {
    this.format = format;
  }

  abstract export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  abstract getFileExtension(): string;
  // ... コンポーネント別の抽象メソッド
}
```

`format` プロパティに出力形式 (`'html'`, `'react'`, `'pug'`) を保持し、各コンポーネントのレンダリング処理は抽象メソッドとして定義します。

## 拡張方法

各エクスポーターはこの基底クラスを継承し、抽象メソッドを実装します。以下は `HtmlExporter` の例です。

```typescript
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
