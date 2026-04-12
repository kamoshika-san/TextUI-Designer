/**
 * NullConnector — デフォルトの no-op VCS コネクタ
 *
 * VCS 統合が不要な場合（ローカル実行・テスト等）のデフォルト実装。
 * 全操作を無視して正常終了する。
 */

import type { VcsConnector, ReviewCommentPayload, StatusCheckPayload } from './vcs-connector';

export class NullConnector implements VcsConnector {
  readonly name = 'null';

  async postReviewComment(_payload: ReviewCommentPayload): Promise<void> {
    // no-op
  }

  async setStatusCheck(_payload: StatusCheckPayload): Promise<void> {
    // no-op
  }
}
