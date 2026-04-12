/**
 * VCS Connector — プラットフォーム非依存のインターフェース契約
 *
 * TextUI Core は VcsConnector だけを知る。
 * 具体実装（GitHub / GitLab 等）は src/integrations/<platform>/ に独立配置し、
 * そのディレクトリを削除するだけで切り離せる。
 *
 * Platform 戦略: Core → Protocol → Surface の Protocol 層に位置する。
 */

export interface ReviewCommentPayload {
  /** Markdown テキスト（プラットフォーム固有記法を含まない標準 Markdown） */
  body: string;
  /** 対象 DSL ファイルパス（任意） */
  filePath?: string;
}

export interface StatusCheckPayload {
  state: 'success' | 'failure' | 'pending';
  /** 人間可読な説明（例: "2 undecided UI changes"） */
  description: string;
  /** チェック識別子（例: "textui/review"） */
  context: string;
}

/**
 * VCS プラットフォームへの書き込み操作を抽象化するコネクタ。
 * 実装は NullConnector（デフォルト）または各プラットフォーム固有クラスが提供する。
 */
export interface VcsConnector {
  /** コネクタ識別名（例: "null", "github"） */
  readonly name: string;

  /** レビューコメントを投稿する */
  postReviewComment(payload: ReviewCommentPayload): Promise<void>;

  /** CI ステータスチェックを設定する */
  setStatusCheck(payload: StatusCheckPayload): Promise<void>;
}
