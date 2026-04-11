const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('navigation engine integration', () => {
  let TextUICoreEngine;

  before(() => {
    ({ TextUICoreEngine } = require('../../out/core/textui-core-engine'));
  });

  it('validateFlow resolves linked page files from the flow document path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-nav-engine-'));
    const screensDir = path.join(tmpDir, 'screens');
    fs.mkdirSync(screensDir, { recursive: true });
    fs.writeFileSync(path.join(screensDir, 'home.tui.yml'), 'page:\n  id: home\n  title: Home\n  layout: vertical\n  components: []\n', 'utf8');
    fs.writeFileSync(path.join(screensDir, 'details.tui.yml'), 'page:\n  id: details\n  title: Details\n  layout: vertical\n  components: []\n', 'utf8');

    try {
      const engine = new TextUICoreEngine();
      const result = engine.validateFlow({
        dsl: {
          flow: {
            id: 'catalog',
            title: 'Catalog',
            entry: 'home',
            screens: [
              { id: 'home', page: './screens/home.tui.yml', title: 'Home' },
              { id: 'details', page: './screens/details.tui.yml', title: 'Details' }
            ],
            transitions: [
              { from: 'home', to: 'details', trigger: 'open', label: 'Open details' }
            ]
          }
        },
        sourcePath: path.join(tmpDir, 'app.tui.flow.yml')
      });

      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.diagnostics, []);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('compareFlow returns diagnostics when a revision points to missing linked pages', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-nav-compare-'));
    const screensDir = path.join(tmpDir, 'screens');
    fs.mkdirSync(screensDir, { recursive: true });
    fs.writeFileSync(path.join(screensDir, 'home.tui.yml'), 'page:\n  id: home\n  title: Home\n  layout: vertical\n  components: []\n', 'utf8');

    try {
      const engine = new TextUICoreEngine();
      const result = engine.compareFlow({
        previousDsl: {
          flow: {
            id: 'catalog',
            title: 'Catalog',
            entry: 'home',
            screens: [
              { id: 'home', page: './screens/home.tui.yml', title: 'Home' }
            ],
            transitions: []
          }
        },
        nextDsl: {
          flow: {
            id: 'catalog',
            title: 'Catalog v2',
            entry: 'details',
            screens: [
              { id: 'details', page: './screens/missing.tui.yml', title: 'Details' }
            ],
            transitions: []
          }
        },
        previousSourcePath: path.join(tmpDir, 'app.tui.flow.yml'),
        nextSourcePath: path.join(tmpDir, 'app.tui.flow.yml')
      });

      assert.strictEqual(result.ok, false);
      assert.ok(result.diagnostics.some(issue => issue.code === 'NAV_003'));
      assert.ok(result.diagnostics[0].message.includes('[next]'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('compareFlow preserves stable transition ids and v2 terminal metadata in semantic results', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-nav-compare-v2-'));
    const screensDir = path.join(tmpDir, 'screens');
    fs.mkdirSync(screensDir, { recursive: true });
    fs.writeFileSync(path.join(screensDir, 'review.tui.yml'), 'page:\n  id: review\n  title: Review\n  layout: vertical\n  components: []\n', 'utf8');
    fs.writeFileSync(path.join(screensDir, 'approval.tui.yml'), 'page:\n  id: approval\n  title: Approval\n  layout: vertical\n  components: []\n', 'utf8');

    try {
      const engine = new TextUICoreEngine();
      const result = engine.compareFlow({
        previousDsl: {
          flow: {
            id: 'approval-flow',
            version: '2',
            title: 'Approval Flow',
            entry: 'review',
            policy: { loops: 'warn', terminalScreensRequired: true },
            screens: [
              { id: 'review', page: './screens/review.tui.yml', title: 'Review', kind: 'review' },
              { id: 'approval', page: './screens/approval.tui.yml', title: 'Approval', kind: 'terminal', terminal: { kind: 'success', outcome: 'approved' } }
            ],
            transitions: [
              { id: 't-review-approval', from: 'review', to: 'approval', trigger: 'submit', kind: 'forward' }
            ]
          }
        },
        nextDsl: {
          flow: {
            id: 'approval-flow',
            version: '2',
            title: 'Approval Flow',
            entry: 'review',
            policy: { loops: 'allow', terminalScreensRequired: true },
            screens: [
              { id: 'review', page: './screens/review.tui.yml', title: 'Review', kind: 'review' },
              { id: 'approval', page: './screens/approval.tui.yml', title: 'Approval', kind: 'terminal', terminal: { kind: 'failure', outcome: 'manual-review' } }
            ],
            transitions: [
              { id: 't-review-approval', from: 'review', to: 'approval', trigger: 'approve', kind: 'escalation', guard: { expression: 'risk.accepted' } }
            ]
          }
        },
        previousSourcePath: path.join(tmpDir, 'app-prev.tui.flow.yml'),
        nextSourcePath: path.join(tmpDir, 'app-next.tui.flow.yml')
      });

      assert.strictEqual(result.ok, true);
      assert.ok(result.result.events.some(event => event.entity === 'transition' && event.kind === 'update' && event.def.key === 't-review-approval'));
      assert.ok(result.semantic.findings.some(finding => finding.target.entity === 'screen' && finding.target.key === 'approval'));
      assert.strictEqual(result.semantic.findings.some(finding => finding.target.entity === 'flow' && finding.target.key === 'loopPolicy'), true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
