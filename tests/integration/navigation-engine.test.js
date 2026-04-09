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
});
