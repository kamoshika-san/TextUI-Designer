/**
 * Review Engine — DecisionJsonStore
 * T-RE1-008 / T-RE1-009 / T-RE1-010
 *
 * Decision を `.textui/decisions/<fileKey>.json` に保存する。
 * Git 管理対象（.gitignore に含めない）。
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ChangeId } from './diff-ir';
import type { Decision, DecisionStore } from './decision';

/** JSON ファイルのスキーマ */
interface DecisionFile {
  schemaVersion: 'decision-store/v1';
  fileKey: string;
  decisions: Decision[];
}

/**
 * DecisionJsonStore — ファイルシステムベースの DecisionStore 実装。
 *
 * @param repoRoot  リポジトリルートの絶対パス
 * @param fileKey   DSL ファイルを識別するキー（例: "screens/home.tui.yml"）
 */
export class DecisionJsonStore implements DecisionStore {
  private readonly filePath: string;
  private readonly store = new Map<ChangeId, Decision>();

  constructor(repoRoot: string, fileKey: string) {
    // fileKey のスラッシュをアンダースコアに変換してファイル名を安全にする
    const safeKey = fileKey.replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '-');
    this.filePath = path.join(repoRoot, '.textui', 'decisions', `${safeKey}.json`);
  }

  get(changeId: ChangeId): Decision | undefined {
    return this.store.get(changeId);
  }

  set(decision: Decision): void {
    this.store.set(decision.changeId, decision);
  }

  list(): Decision[] {
    return Array.from(this.store.values());
  }

  async persist(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data: DecisionFile = {
      schemaVersion: 'decision-store/v1',
      fileKey: path.basename(this.filePath, '.json'),
      decisions: this.list()
    };

    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  async load(): Promise<void> {
    if (!fs.existsSync(this.filePath)) {
      return;
    }

    const raw = fs.readFileSync(this.filePath, 'utf8');
    let data: DecisionFile;

    try {
      data = JSON.parse(raw) as DecisionFile;
    } catch {
      // 破損ファイルは無視して空ストアとして扱う
      return;
    }

    if (data.schemaVersion !== 'decision-store/v1' || !Array.isArray(data.decisions)) {
      return;
    }

    this.store.clear();
    for (const decision of data.decisions) {
      this.store.set(decision.changeId, decision);
    }
  }

  /** テスト用: 保存先ファイルパスを返す */
  getFilePath(): string {
    return this.filePath;
  }
}
