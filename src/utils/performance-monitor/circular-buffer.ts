/**
 * 効率的な統計計算を行うCircularBufferクラス
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private size: number;
  private head: number = 0;
  private count: number = 0;
  private sum: number = 0;
  private numericExtractor: (item: T) => number;

  constructor(size: number, numericExtractor: (item: T) => number) {
    this.size = size;
    this.buffer = new Array(size);
    this.numericExtractor = numericExtractor;
  }

  /**
   * 要素を追加（O(1)）
   */
  push(item: T): void {
    const newValue = this.numericExtractor(item);
    
    if (this.count < this.size) {
      // バッファーがまだ満杯でない場合
      this.buffer[this.head] = item;
      this.sum += newValue;
      this.count++;
    } else {
      // バッファーが満杯の場合、古い値を削除
      const oldValue = this.numericExtractor(this.buffer[this.head]);
      this.sum -= oldValue;
      this.buffer[this.head] = item;
      this.sum += newValue;
    }
    
    this.head = (this.head + 1) % this.size;
  }

  /**
   * 平均値を取得（O(1)）
   */
  getAverage(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  /**
   * 最新の値を取得（O(1)）
   */
  getLatest(): T | undefined {
    if (this.count === 0) return undefined;
    const latestIndex = this.head === 0 ? this.size - 1 : this.head - 1;
    return this.buffer[latestIndex];
  }

  /**
   * 合計値を取得（O(1)）
   */
  getSum(): number {
    return this.sum;
  }

  /**
   * 要素数を取得（O(1)）
   */
  getCount(): number {
    return this.count;
  }

  /**
   * 最大値を取得（O(n)）
   */
  getMax(): number {
    if (this.count === 0) return 0;
    let max = this.numericExtractor(this.buffer[0]);
    for (let i = 1; i < this.count; i++) {
      const value = this.numericExtractor(this.buffer[i]);
      if (value > max) {
        max = value;
      }
    }
    return max;
  }

  /**
   * 最小値を取得（O(n)）
   */
  getMin(): number {
    if (this.count === 0) return 0;
    let min = this.numericExtractor(this.buffer[0]);
    for (let i = 1; i < this.count; i++) {
      const value = this.numericExtractor(this.buffer[i]);
      if (value < min) {
        min = value;
      }
    }
    return min;
  }

  /**
   * 最新のN個の要素を取得（O(n)）
   */
  getLatestN(n: number): T[] {
    if (this.count === 0) return [];
    
    const result: T[] = [];
    const actualN = Math.min(n, this.count);
    
    for (let i = 0; i < actualN; i++) {
      const index = (this.head - 1 - i + this.size) % this.size;
      result.push(this.buffer[index]);
    }
    
    return result;
  }

  /**
   * バッファーをクリア
   */
  clear(): void {
    this.head = 0;
    this.count = 0;
    this.sum = 0;
  }

  /**
   * バッファーが満杯かどうか判定
   */
  isFull(): boolean {
    return this.count >= this.size;
  }

  /**
   * バッファーが空かどうか判定
   */
  isEmpty(): boolean {
    return this.count === 0;
  }
} 