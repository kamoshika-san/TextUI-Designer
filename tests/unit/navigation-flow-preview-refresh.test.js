const assert = require('assert');
const path = require('path');

describe('navigation-flow-preview-refresh', () => {
  let shouldRefreshPreviewForDocumentChange;

  before(() => {
    ({ shouldRefreshPreviewForDocumentChange } = require('../../out/services/file-watcher/navigation-flow-preview-refresh'));
  });

  it('refreshes flow preview when a referenced page file changes', () => {
    const shouldRefresh = shouldRefreshPreviewForDocumentChange(
      path.join('C:\\workspace', 'app.tui.flow.yml'),
      path.join('C:\\workspace', 'screens', 'cart.tui.yml'),
      () => ({
        dsl: {
          flow: {
            screens: [
              { id: 'cart', page: './screens/cart.tui.yml' },
              { id: 'confirm', page: './screens/confirm.tui.yml' }
            ]
          }
        }
      })
    );

    assert.strictEqual(shouldRefresh, true);
  });

  it('skips preview churn for unrelated files while a flow preview is active', () => {
    const shouldRefresh = shouldRefreshPreviewForDocumentChange(
      path.join('C:\\workspace', 'app.tui.flow.yml'),
      path.join('C:\\workspace', 'screens', 'unrelated.tui.yml'),
      () => ({
        dsl: {
          flow: {
            screens: [
              { id: 'cart', page: './screens/cart.tui.yml' }
            ]
          }
        }
      })
    );

    assert.strictEqual(shouldRefresh, false);
  });

  it('refreshes flow preview when a referenced .tui.json page file changes', () => {
    const shouldRefresh = shouldRefreshPreviewForDocumentChange(
      path.join('C:\\workspace', 'app.tui.flow.yml'),
      path.join('C:\\workspace', 'screens', 'review.tui.json'),
      () => ({
        dsl: {
          flow: {
            screens: [
              { id: 'review', page: './screens/review.tui.json' }
            ]
          }
        }
      })
    );

    assert.strictEqual(shouldRefresh, true);
  });
});
