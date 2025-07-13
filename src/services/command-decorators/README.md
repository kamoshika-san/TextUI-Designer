# Command Decorators and Registry

このディレクトリには、VS Code拡張のコマンド登録と実行を管理するためのデコレーターとレジストリが含まれています。

## バグ修正: Command デコレーターの this コンテキスト問題

### 問題
以前の実装では、`Command` デコレーターがコマンドハンドラーをクラスプロトタイプ（`target`）に誤ってバインドしていました：

```typescript
// 間違った実装（以前）
const boundMethod = method.bind(target); // ❌ クラスプロトタイプにバインド
```

これにより、コマンド実行時に `this` コンテキストが正しく設定されず、インスタンスプロパティやメソッドにアクセスする際にランタイムエラーが発生していました。

### 修正
新しい実装では、メソッドを実際のインスタンスに正しくバインドします：

```typescript
// 正しい実装（修正後）
const boundMethod = method.bind(instance); // ✅ インスタンスにバインド
```

これにより、コマンド実行時に正しい `this` コンテキストが維持され、インスタンスプロパティやメソッドに正常にアクセスできるようになります。

## 使用方法

### 1. Command デコレーターの使用

```typescript
import { Command } from './command-decorators';
import { SafeCommand } from './command-decorators';

export class MyCommandHandler {
  private counter: number = 0;

  @Command({ commandId: 'myExtension.increment' })
  @SafeCommand({ 
    errorMessage: 'インクリメントに失敗しました',
    successMessage: 'インクリメントしました'
  })
  async incrementCounter(): Promise<void> {
    this.counter++; // ✅ 正しくthisコンテキストが維持される
    console.log(`カウンター: ${this.counter}`);
  }
}
```

### 2. CommandRegistry を使用した自動登録

```typescript
import { CommandRegistry } from './command-decorators';

export class MyCommandHandler {
  constructor() {
    // CommandRegistryを使用してコマンドを自動登録
    const registry = CommandRegistry.getInstance();
    registry.registerCommandsFromClass(this, [
      {
        commandId: 'myExtension.increment',
        methodName: 'incrementCounter'
      }
    ]);
  }

  // ... メソッドの実装
}
```

### 3. メタデータを使用した登録

```typescript
import { getCommandMetadata, registerCommandsFromClass } from './command-decorators';

const handler = new MyCommandHandler();
const metadata = getCommandMetadata(handler);
const registry = CommandRegistry.getInstance();

// メタデータを使用して自動登録
registerCommandsFromClass(handler, registry);
```

## ファイル構成

- `command-decorator.ts` - Command デコレーターとメタデータ管理
- `command-registry.ts` - コマンド登録と管理のレジストリ
- `safe-command-decorator.ts` - 安全なコマンド実行のためのデコレーター
- `example-command-handler.ts` - 使用例とテスト用ハンドラー

## 重要な変更点

1. **正しいバインド**: `method.bind(instance)` を使用してインスタンスにバインド
2. **メタデータ管理**: reflect-metadata を使用したメタデータの保存と取得
3. **自動登録**: CommandRegistry による自動的なコマンド登録
4. **エラーハンドリング**: SafeCommand デコレーターとの組み合わせ

## テスト

修正が正しく動作することを確認するには、`ExampleCommandHandler` を使用してテストしてください：

```typescript
const handler = new ExampleCommandHandler();
// コマンドが正しくthisコンテキストを持つことを確認
```

この修正により、コマンドハンドラーが正しい `this` コンテキストを持つようになり、インスタンスプロパティやメソッドに正常にアクセスできるようになります。