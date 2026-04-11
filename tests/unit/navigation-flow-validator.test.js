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

  it('uses flow.policy.loops to downgrade or suppress cycle diagnostics', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-nav-policy-'));

    try {
      fs.mkdirSync(path.join(tempDir, 'screens'));
      fs.writeFileSync(path.join(tempDir, 'screens', 'start.tui.yml'), 'page:\n  id: start\n  title: Start\n  layout: vertical\n  components: []\n');
      fs.writeFileSync(path.join(tempDir, 'screens', 'review.tui.yml'), 'page:\n  id: review\n  title: Review\n  layout: vertical\n  components: []\n');

      const warnIssues = validateNavigationFlow({
        flow: {
          id: 'policy-warn',
          version: '2',
          title: 'Policy Warn',
          entry: 'start',
          policy: { loops: 'warn' },
          screens: [
            { id: 'start', page: './screens/start.tui.yml' },
            { id: 'review', page: './screens/review.tui.yml', kind: 'review' }
          ],
          transitions: [
            { id: 't1', from: 'start', to: 'review', trigger: 'next' },
            { id: 't2', from: 'review', to: 'start', trigger: 'back', kind: 'loop' }
          ]
        }
      }, { sourcePath: path.join(tempDir, 'warn.tui.flow.yml') });

      const allowIssues = validateNavigationFlow({
        flow: {
          id: 'policy-allow',
          version: '2',
          title: 'Policy Allow',
          entry: 'start',
          policy: { loops: 'allow' },
          screens: [
            { id: 'start', page: './screens/start.tui.yml' },
            { id: 'review', page: './screens/review.tui.yml', kind: 'review' }
          ],
          transitions: [
            { id: 't1', from: 'start', to: 'review', trigger: 'next' },
            { id: 't2', from: 'review', to: 'start', trigger: 'back', kind: 'loop' }
          ]
        }
      }, { sourcePath: path.join(tempDir, 'allow.tui.flow.yml') });

      const warnCycle = warnIssues.find(issue => issue.code === NAV_ERROR_CODES.CYCLE_DETECTED);
      assert.ok(warnCycle);
      assert.strictEqual(warnCycle.level, 'warning');
      assert.ok(!allowIssues.some(issue => issue.code === NAV_ERROR_CODES.CYCLE_DETECTED));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports duplicate transition identities', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-nav-duplicate-transition-'));

    try {
      fs.mkdirSync(path.join(tempDir, 'screens'));
      fs.writeFileSync(path.join(tempDir, 'screens', 'start.tui.yml'), 'page:\n  id: start\n  title: Start\n  layout: vertical\n  components: []\n');
      fs.writeFileSync(path.join(tempDir, 'screens', 'a.tui.yml'), 'page:\n  id: a\n  title: A\n  layout: vertical\n  components: []\n');
      fs.writeFileSync(path.join(tempDir, 'screens', 'b.tui.yml'), 'page:\n  id: b\n  title: B\n  layout: vertical\n  components: []\n');

      const issues = validateNavigationFlow({
        flow: {
          id: 'duplicate-transition',
          version: '2',
          title: 'Duplicate Transition',
          entry: 'start',
          screens: [
            { id: 'start', page: './screens/start.tui.yml' },
            { id: 'a', page: './screens/a.tui.yml' },
            { id: 'b', page: './screens/b.tui.yml' }
          ],
          transitions: [
            { id: 'dup', from: 'start', to: 'a', trigger: 'go-a' },
            { id: 'dup', from: 'start', to: 'b', trigger: 'go-b' }
          ]
        }
      }, { sourcePath: path.join(tempDir, 'duplicate.tui.flow.yml') });

      const duplicateIssues = issues.filter(issue => issue.code === NAV_ERROR_CODES.DUPLICATE_TRANSITION_ID);
      assert.strictEqual(duplicateIssues.length, 2);
      assert.ok(duplicateIssues.every(issue => issue.level === 'error'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
