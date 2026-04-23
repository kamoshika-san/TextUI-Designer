import type { TextUIDSL } from '../domain/dsl-types';

/**
 * sourcePath ごとの直近 export DSL スナップショットを調停する。
 */
export class ExportSnapshotState {
  private readonly snapshots = new Map<string, TextUIDSL>();

  hasSnapshot(sourcePath: string | undefined): sourcePath is string {
    return typeof sourcePath === 'string' && sourcePath.length > 0 && this.snapshots.has(sourcePath);
  }

  getSnapshot(sourcePath: string): TextUIDSL | undefined {
    return this.snapshots.get(sourcePath);
  }

  rememberSnapshot(sourcePath: string | undefined, dsl: TextUIDSL): void {
    if (!sourcePath) {
      return;
    }
    this.snapshots.set(sourcePath, dsl);
  }

  clear(): void {
    this.snapshots.clear();
  }
}
