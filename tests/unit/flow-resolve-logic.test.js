/**
 * E-NI-S8: フロー解決ロジック ユニットテスト
 *
 * preview-navigate の trigger + currentScreenId → toScreen 解決ロジックをテストする。
 * webview.tsx 内のロジックを純粋関数として抽出してテスト。
 */

const assert = require('assert');

/**
 * フロー解決ロジック（webview.tsx の useEffect から抽出した純粋関数）
 * @param {object} flowDsl - NavigationFlowDSL
 * @param {string} trigger - action.trigger の値
 * @param {string|null} currentScreenId - 現在の画面 ID
 * @returns {string|null} 遷移先の screenId、解決できない場合は null
 */
function resolveNavigationTarget(flowDsl, trigger, currentScreenId) {
  if (!flowDsl || !flowDsl.flow || !flowDsl.flow.transitions) { return null; }
  const transitions = flowDsl.flow.transitions;

  // from 一致優先
  const matched = transitions.find(t => t.trigger === trigger && t.from === currentScreenId)
    ?? transitions.find(t => t.trigger === trigger);

  return matched ? matched.to : null;
}

const SAMPLE_FLOW = {
  flow: {
    entry: 'home',
    screens: [
      { id: 'home', page: 'home.tui.yml' },
      { id: 'detail', page: 'detail.tui.yml' },
      { id: 'settings', page: 'settings.tui.yml' },
    ],
    transitions: [
      { from: 'home', to: 'detail', trigger: 'go-detail' },
      { from: 'home', to: 'settings', trigger: 'go-settings' },
      { from: 'detail', to: 'home', trigger: 'go-back' },
      // 同一 trigger が複数マッチするケース
      { from: 'settings', to: 'detail', trigger: 'go-detail' },
    ],
  },
};

describe('flow-resolve-logic: resolveNavigationTarget', () => {
  // ケース1: 正常解決
  it('正常解決: trigger と from が一致する遷移先を返す', () => {
    const result = resolveNavigationTarget(SAMPLE_FLOW, 'go-detail', 'home');
    assert.strictEqual(result, 'detail');
  });

  // ケース2: trigger 不一致
  it('trigger 不一致: null を返す', () => {
    const result = resolveNavigationTarget(SAMPLE_FLOW, 'nonexistent-trigger', 'home');
    assert.strictEqual(result, null);
  });

  // ケース3: fromScreen 不一致（from が合わないが trigger は合う → フォールバック）
  it('fromScreen 不一致でも trigger が合えばフォールバックで解決する', () => {
    // 'go-back' は detail→home のみ定義。home から呼んでも trigger 一致でフォールバック
    const result = resolveNavigationTarget(SAMPLE_FLOW, 'go-back', 'home');
    assert.strictEqual(result, 'home');
  });

  // ケース4: 複数マッチ（from 優先）
  it('複数マッチ: from 一致を優先する', () => {
    // 'go-detail' は home→detail と settings→detail の2件
    // currentScreenId が settings の場合は settings→detail が優先
    const result = resolveNavigationTarget(SAMPLE_FLOW, 'go-detail', 'settings');
    assert.strictEqual(result, 'detail');

    // currentScreenId が home の場合は home→detail が優先
    const result2 = resolveNavigationTarget(SAMPLE_FLOW, 'go-detail', 'home');
    assert.strictEqual(result2, 'detail');
  });

  // ケース5: フロー未ロード（null）
  it('フロー未ロード: null を返す', () => {
    assert.strictEqual(resolveNavigationTarget(null, 'go-detail', 'home'), null);
    assert.strictEqual(resolveNavigationTarget(undefined, 'go-detail', 'home'), null);
    assert.strictEqual(resolveNavigationTarget({}, 'go-detail', 'home'), null);
  });

  // ケース6: currentScreenId が null（フォールバック動作）
  it('currentScreenId が null でも trigger 一致でフォールバック解決する', () => {
    const result = resolveNavigationTarget(SAMPLE_FLOW, 'go-detail', null);
    // from 一致なし → 最初の go-detail（home→detail）にフォールバック
    assert.strictEqual(result, 'detail');
  });
});
