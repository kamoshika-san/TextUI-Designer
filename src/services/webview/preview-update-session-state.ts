/**
 * WebViewUpdateManager に散在していたプレビュー更新の隠れ状態を第1スライスで束ねる。
 * 次スライスで queue / cache / error 等を段階的に取り込む。
 */
export class PreviewUpdateSessionState {
  lastTuiFile: string | undefined = undefined;
  isUpdating = false;
}

/** パネル無し、またはパイプライン実行中は YAML 送信を開始しない */
export function shouldBlockYamlSend(params: { hasPanel: boolean; isUpdating: boolean }): boolean {
  return !params.hasPanel || params.isUpdating;
}
