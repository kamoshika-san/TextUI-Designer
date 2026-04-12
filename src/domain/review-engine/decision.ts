/**
 * Review Engine — Decision 型定義と DecisionStore インターフェース
 * T-RE1-001 / T-RE1-002
 */

import type { ChangeId } from './diff-ir';

// ── Decision 型 ───────────────────────────────────────────────────────────────

export type DecisionKind = 'accept' | 'reject' | 'defer' | 'ignore';

/**
 * レビュアーが各変更に対して下す意思決定。
 * reject / defer 時は rationale が必須（UI レベルで強制）。
 */
export interface Decision {
  changeId: ChangeId;
  decision: DecisionKind;
  /** reject / defer 時は必須。accept / ignore 時は任意。 */
  rationale?: string;
  author: string;
  timestamp: number;
}

/** rationale が必須かどうかを判定する */
export function requiresRationale(kind: DecisionKind): boolean {
  return kind === 'reject' || kind === 'defer';
}

/** Decision の入力バリデーション。エラーメッセージを返す（問題なければ null）。 */
export function validateDecision(input: Partial<Decision>): string | null {
  if (!input.changeId) {
    return 'changeId is required';
  }
  if (!input.decision) {
    return 'decision is required';
  }
  if (requiresRationale(input.decision) && !input.rationale?.trim()) {
    return `rationale is required for decision "${input.decision}"`;
  }
  if (!input.author?.trim()) {
    return 'author is required';
  }
  return null;
}

// ── DecisionStore インターフェース ────────────────────────────────────────────

/**
 * Decision の永続化・取得を担うストアのインターフェース。
 * 実装は DecisionJsonStore（ファイル）や InMemoryDecisionStore（テスト用）が提供する。
 */
export interface DecisionStore {
  /** changeId に対応する Decision を取得する。存在しなければ undefined。 */
  get(changeId: ChangeId): Decision | undefined;

  /** Decision を保存する（既存があれば上書き）。 */
  set(decision: Decision): void;

  /** 全 Decision を一覧で返す。 */
  list(): Decision[];

  /** ストアの内容を永続化する（非同期）。 */
  persist(): Promise<void>;

  /** 永続化済みデータをロードする（非同期）。 */
  load(): Promise<void>;
}

// ── InMemoryDecisionStore（テスト・スタブ用） ─────────────────────────────────

export class InMemoryDecisionStore implements DecisionStore {
  private readonly store = new Map<ChangeId, Decision>();

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
    // no-op for in-memory store
  }

  async load(): Promise<void> {
    // no-op for in-memory store
  }
}
