'use strict';

/**
 * WebViewManager 内部の WebViewUpdateManager へ、単体テストからのみ到達するためのヘルパー。
 * 本番ファサード（IWebViewManager 実装）にはテスト用メソッドを載せない（T-064）。
 */
function getWebViewUpdateManagerForTest(webViewManager) {
  const um = webViewManager.updateManager;
  if (!um) {
    throw new Error('WebViewManager.updateManager が見つかりません');
  }
  return um;
}

module.exports = { getWebViewUpdateManagerForTest };
