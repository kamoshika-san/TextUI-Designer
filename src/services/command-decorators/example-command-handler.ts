import { Command } from './command-decorator';
import { SafeCommand } from './safe-command-decorator';
import { ErrorHandler } from '../../utils/error-handler';

/**
 * 例示用コマンドハンドラー
 * CommandデコレーターとCommandRegistryの正しい使用方法を示す
 */
export class ExampleCommandHandler {
  private counter: number = 0;
  private name: string = 'ExampleHandler';

  constructor() {
    // Commands are registered via @Command decorators
    // No manual registration needed
  }

  /**
   * カウンターをインクリメント
   * Commandデコレーターを使用してメタデータを追加
   */
  @Command({ commandId: 'textui-designer.example.increment' })
  @SafeCommand({ 
    errorMessage: 'カウンターのインクリメントに失敗しました',
    successMessage: 'カウンターをインクリメントしました'
  })
  async incrementCounter(): Promise<void> {
    this.counter++;
    console.log(`[${this.name}] カウンター: ${this.counter}`);
  }

  /**
   * 現在のステータスを表示
   */
  @Command({ commandId: 'textui-designer.example.showStatus' })
  @SafeCommand({ 
    errorMessage: 'ステータス表示に失敗しました'
  })
  async showStatus(): Promise<void> {
    const status = `現在のカウンター値: ${this.counter}`;
    console.log(`[${this.name}] ${status}`);
    ErrorHandler.showInfo(status);
  }

  /**
   * カウンターをリセット
   */
  @Command({ commandId: 'textui-designer.example.reset' })
  @SafeCommand({ 
    errorMessage: 'カウンターのリセットに失敗しました',
    successMessage: 'カウンターをリセットしました'
  })
  async resetCounter(): Promise<void> {
    this.counter = 0;
    console.log(`[${this.name}] カウンターをリセット: ${this.counter}`);
  }

  /**
   * インスタンスプロパティにアクセスするメソッド
   * このメソッドが正しくthisコンテキストを持つことを確認
   */
  @Command({ commandId: 'textui-designer.example.accessProperty' })
  async accessProperty(): Promise<void> {
    // 以前の実装では、このthis.nameがundefinedになっていた
    // 修正後は正しくインスタンスプロパティにアクセスできる
    console.log(`[${this.name}] インスタンスプロパティにアクセス成功`);
    ErrorHandler.showInfo(`ハンドラー名: ${this.name}, カウンター: ${this.counter}`);
  }

  /**
   * インスタンスメソッドを呼び出すメソッド
   * このメソッドが正しくthisコンテキストを持つことを確認
   */
  @Command({ commandId: 'textui-designer.example.callInstanceMethod' })
  async callInstanceMethod(): Promise<void> {
    // 以前の実装では、このthis.incrementCounter()がエラーになっていた
    // 修正後は正しくインスタンスメソッドを呼び出せる
    await this.incrementCounter();
    await this.showStatus();
  }
}