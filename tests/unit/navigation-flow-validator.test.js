const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('navigation-flow-validator', () => {
  let validateNavigationFlow;
  let NAV_ERROR_CODES;

  before(() => {
    ({ validateNavigationFlow } = require('../../out/shared/navigation-flow-validator'));
    ({ NAV_ERROR_CODES } = require('../../out/shared/nav-error-codes'));
  });

  it('accepts a valid navigation flow with existing page files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-nav-valid-'));

    try {
      fs.mkdirSync(path.join(tempDir, 'screens'));
      fs.writeFileSync(path.join(tempDir, 'screens', 'cart.tui.yml'), 'page:\n  id: cart\n  title: Cart\n  layout: vertical\n  components: []\n');
      fs.writeFileSync(path.join(tempDir, 'screens', 'confirm.tui.yml'), 'page:\n  id: confirm\n  title: Confirm\n  layout: vertical\n  components: []\n');

      const issues = validateNavigationFlow({
        flow: {
          id: 'checkout',
          title: 'Checkout',
          entry: 'cart',
          screens: [
            { id: 'cart', page: './screens/cart.tui.yml' },
            { id: 'confirm', page: './screens/confirm.tui.yml' }
          ],
          transitions: [
            { from: 'cart', to: 'confirm', trigger: 'next' }
          ]
        }
      }, { sourcePath: path.join(tempDir, 'app.tui.flow.yml') });

      assert.deepStrictEqual(issues, []);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports semantic navigation issues with the expected NAV codes', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-nav-invalid-'));

    try {
      fs.mkdirSync(path.join(tempDir, 'screens'));
      fs.writeFileSync(path.join(tempDir, 'screens', 'home.tui.yml'), 'page:\n  id: home\n  title: Home\n  layout: vertical\n  components: []\n');

      const issues = validateNavigationFlow({
        flow: {
          id: 'broken',
          title: 'Broken',
          entry: 'home',
          screens: [
            { id: 'home', page: './screens/home.tui.yml' },
            { id: 'home', page: './screens/duplicate-home.tui.yml' },
            { id: 'loop', page: './screens/loop.tui.yml' },
            { id: 'isolated', page: './screens/isolated.tui.yml' }
          ],
          transitions: [
            { from: 'home', to: 'missing-entry', trigger: 'broken-entry-check' },
            { from: 'home', to: 'loop', trigger: 'next' },
            { from: 'loop', to: 'home', trigger: 'back' },
            { from: 'loop', to: 'missing-screen', trigger: 'escape' }
          ]
        }
      }, { sourcePath: path.join(tempDir, 'app.tui.flow.yml') });

      const entryIssues = validateNavigationFlow({
        flow: {
          id: 'broken-entry',
          title: 'Broken Entry',
          entry: 'missing-entry',
          screens: [
            { id: 'home', page: './screens/home.tui.yml' }
          ],
          transitions: []
        }
      }, { sourcePath: path.join(tempDir, 'entry.tui.flow.yml') });

      const codes = new Set(issues.map(issue => issue.code));
      assert.ok(codes.has(NAV_ERROR_CODES.TRANSITION_ENDPOINT_NOT_FOUND));
      assert.ok(codes.has(NAV_ERROR_CODES.PAGE_NOT_FOUND));
      assert.ok(codes.has(NAV_ERROR_CODES.CYCLE_DETECTED));
      assert.ok(codes.has(NAV_ERROR_CODES.UNREACHABLE_SCREEN));
      assert.ok(codes.has(NAV_ERROR_CODES.DUPLICATE_SCREEN_ID));
      assert.ok(entryIssues.some(issue => issue.code === NAV_ERROR_CODES.ENTRY_NOT_FOUND));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
