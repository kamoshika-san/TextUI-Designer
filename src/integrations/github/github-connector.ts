/**
 * GitHubConnector — GitHub 固有の VCS コネクタ実装（stub）
 *
 * このファイルは src/integrations/github/ ディレクトリに独立配置されている。
 * GitHub 統合を切り離す場合は src/integrations/github/ ディレクトリを削除するだけでよい。
 * 他のコードへの影響はない（review-command.ts は VcsConnector 経由でのみ参照する）。
 *
 * 実際の GitHub API 呼び出しは CI 側（gh コマンド等）が担う想定。
 * このクラスは将来の拡張ポイントとして stub 実装を提供する。
 */

import type { VcsConnector, ReviewCommentPayload, StatusCheckPayload } from '../vcs-connector';

export class GitHubConnector implements VcsConnector {
  readonly name = 'github';

  async postReviewComment(payload: ReviewCommentPayload): Promise<void> {
    // stub: 将来 GitHub API / gh CLI 経由で PR コメントを投稿する
    // 現時点では stdout に出力して CI 側でハンドリングする想定
    process.stdout.write(`[github-connector] postReviewComment: ${payload.filePath ?? '(no file)'}\n`);
    process.stdout.write(payload.body);
    process.stdout.write('\n');
  }

  async setStatusCheck(payload: StatusCheckPayload): Promise<void> {
    // stub: 将来 GitHub Checks API 経由でステータスを設定する
    process.stdout.write(
      `[github-connector] setStatusCheck: ${payload.context} → ${payload.state} (${payload.description})\n`
    );
  }
}
