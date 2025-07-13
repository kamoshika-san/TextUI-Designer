import 'reflect-metadata';

/**
 * コマンドデコレーターのメタデータキー
 */
const COMMAND_METADATA_KEY = Symbol('command:metadata');

/**
 * コマンドデコレーターのオプション
 */
export interface CommandOptions {
  /** コマンドID */
  commandId: string;
  /** コマンドの説明 */
  description?: string;
  /** コマンドのカテゴリー */
  category?: string;
}

/**
 * コマンドメタデータのインターフェース
 */
export interface CommandMetadata {
  commandId: string;
  methodName: string;
  options?: CommandOptions;
}

/**
 * コマンドデコレーター
 * メソッドにコマンドメタデータを追加し、自動登録の準備をする
 * 
 * @param options コマンドオプション
 * @returns デコレーター関数
 * 
 * @example
 * ```typescript
 * class MyCommands {
 *   @Command({ commandId: 'myExtension.doSomething' })
 *   async doSomething(): Promise<void> {
 *     // コマンドの実装
 *   }
 * }
 * ```
 */
export function Command(options: CommandOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    // メタデータを保存
    const metadata: CommandMetadata = {
      commandId: options.commandId,
      methodName: propertyName,
      options: options
    };

    // クラスのメタデータを取得または初期化
    let classMetadata: CommandMetadata[] = Reflect.getMetadata(COMMAND_METADATA_KEY, target.constructor) || [];
    
    // 既存のメタデータを更新または新しいメタデータを追加
    const existingIndex = classMetadata.findIndex(cmd => cmd.methodName === propertyName);
    if (existingIndex >= 0) {
      classMetadata[existingIndex] = metadata;
    } else {
      classMetadata.push(metadata);
    }

    // クラスにメタデータを保存
    Reflect.defineMetadata(COMMAND_METADATA_KEY, classMetadata, target.constructor);

    return descriptor;
  };
}

/**
 * クラスからコマンドメタデータを取得
 * 
 * @param target クラスのコンストラクタまたはインスタンス
 * @returns コマンドメタデータの配列
 */
export function getCommandMetadata(target: any): CommandMetadata[] {
  const constructor = typeof target === 'function' ? target : target.constructor;
  return Reflect.getMetadata(COMMAND_METADATA_KEY, constructor) || [];
}

/**
 * クラスからコマンドを自動登録するヘルパー関数
 * 
 * @param instance クラスのインスタンス
 * @param registry コマンドレジストリのインスタンス
 */
export function registerCommandsFromClass(instance: any, registry: any): void {
  const metadata = getCommandMetadata(instance);
  if (metadata.length > 0 && registry.registerCommandsFromClass) {
    registry.registerCommandsFromClass(instance, metadata);
  }
}