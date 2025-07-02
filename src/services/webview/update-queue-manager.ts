import { ConfigManager } from '../../utils/config-manager';

export interface UpdateTask {
  id: string;
  execute: () => Promise<void>;
  priority: number;
  timestamp: number;
}

/**
 * 更新キュー管理専用クラス
 * 更新処理のキュー管理、デバウンス処理、競合状態の防止を担当
 */
export class UpdateQueueManager {
  private updateQueue: UpdateTask[] = [];
  private isProcessingQueue: boolean = false;
  private lastUpdateTime: number = 0;
  private updateTimeout: NodeJS.Timeout | undefined = undefined;
  private readonly MAX_QUEUE_SIZE: number = 5; // キューサイズ制限
  private taskIdCounter: number = 0;

  constructor() {
    // コンストラクタで初期化
  }

  /**
   * 更新処理をキューに追加（デバウンス付き）
   */
  async queueUpdate(
    updateFunction: () => Promise<void>, 
    forceUpdate: boolean = false,
    priority: number = 0
  ): Promise<void> {
    // 設定から最小更新間隔を取得
    const performanceSettings = ConfigManager.getPerformanceSettings();
    const minInterval = performanceSettings.minUpdateInterval;
    
    // 最小更新間隔をチェック
    const now = Date.now();
    if (!forceUpdate && now - this.lastUpdateTime < minInterval) {
      console.log(`[UpdateQueueManager] 最小更新間隔（${minInterval}ms）を待機中...`);
      return;
    }

    // キューサイズ制限をチェック
    if (this.updateQueue.length >= this.MAX_QUEUE_SIZE) {
      // 優先度の低い古い処理を削除
      this.removeLowestPriorityTask();
    }

    // タスクを作成
    const task: UpdateTask = {
      id: `task_${++this.taskIdCounter}`,
      execute: updateFunction,
      priority: priority,
      timestamp: now
    };

    // キューに追加（優先度順）
    this.insertTaskByPriority(task);

    // 既に処理中でない場合は処理を開始
    if (!this.isProcessingQueue) {
      await this.processUpdateQueue();
    }
  }

  /**
   * デバウンス付きで更新処理をキューに追加
   */
  queueUpdateWithDebounce(
    updateFunction: () => Promise<void>,
    debounceDelay: number = 200
  ): void {
    // 既存のタイマーをクリア
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // デバウンス処理
    this.updateTimeout = setTimeout(async () => {
      await this.queueUpdate(updateFunction, false, 0);
    }, debounceDelay);
  }

  /**
   * 更新キューを処理
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.updateQueue.length > 0) {
        const task = this.updateQueue.shift();
        if (task) {
          try {
            console.log(`[UpdateQueueManager] タスク実行中: ${task.id} (優先度: ${task.priority})`);
            await task.execute();
            this.lastUpdateTime = Date.now();
            
            // 処理間に少し間隔を空ける
            if (this.updateQueue.length > 0) {
              await new Promise(resolve => setTimeout(resolve, 20));
            }
          } catch (error) {
            console.error(`[UpdateQueueManager] タスク実行でエラーが発生しました: ${task.id}`, error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 優先度順にタスクを挿入
   */
  private insertTaskByPriority(task: UpdateTask): void {
    // 優先度の高い順にソート（降順）
    let insertIndex = 0;
    for (let i = 0; i < this.updateQueue.length; i++) {
      if (task.priority > this.updateQueue[i].priority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    
    this.updateQueue.splice(insertIndex, 0, task);
  }

  /**
   * 優先度の低い古いタスクを削除
   */
  private removeLowestPriorityTask(): void {
    if (this.updateQueue.length === 0) {
      return;
    }

    // 優先度が最も低く、最も古いタスクを削除
    let lowestPriorityIndex = 0;
    let lowestPriority = this.updateQueue[0].priority;
    let oldestTimestamp = this.updateQueue[0].timestamp;

    for (let i = 1; i < this.updateQueue.length; i++) {
      const task = this.updateQueue[i];
      if (task.priority < lowestPriority || 
          (task.priority === lowestPriority && task.timestamp < oldestTimestamp)) {
        lowestPriorityIndex = i;
        lowestPriority = task.priority;
        oldestTimestamp = task.timestamp;
      }
    }

    const removedTask = this.updateQueue.splice(lowestPriorityIndex, 1)[0];
    console.log(`[UpdateQueueManager] 古いタスクを削除: ${removedTask.id} (優先度: ${removedTask.priority})`);
  }

  /**
   * キューをクリア
   */
  clearQueue(): void {
    const queueSize = this.updateQueue.length;
    this.updateQueue = [];
    console.log(`[UpdateQueueManager] キューをクリアしました (${queueSize}個のタスク)`);
  }

  /**
   * キューの状態を取得
   */
  getQueueStatus(): {
    queueSize: number;
    isProcessing: boolean;
    lastUpdateTime: number;
  } {
    return {
      queueSize: this.updateQueue.length,
      isProcessing: this.isProcessingQueue,
      lastUpdateTime: this.lastUpdateTime
    };
  }

  /**
   * 特定のタスクをキャンセル
   */
  cancelTask(taskId: string): boolean {
    const index = this.updateQueue.findIndex(task => task.id === taskId);
    if (index !== -1) {
      this.updateQueue.splice(index, 1);
      console.log(`[UpdateQueueManager] タスクをキャンセル: ${taskId}`);
      return true;
    }
    return false;
  }

  /**
   * デバウンスタイマーをクリア
   */
  clearDebounceTimer(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = undefined;
      console.log('[UpdateQueueManager] デバウンスタイマーをクリアしました');
    }
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.clearDebounceTimer();
    this.clearQueue();
    this.isProcessingQueue = false;
  }
} 