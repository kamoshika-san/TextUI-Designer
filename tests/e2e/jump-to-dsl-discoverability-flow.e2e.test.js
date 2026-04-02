const assert = require('assert');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const {
  wrapWithPreviewJumpShell
} = require('../../out/renderer/registered-component-kernel');

describe('Jump-to-DSL discoverability flow E2E (T-627)', () => {
  let webviewManager;
  let testFilePath;

  const createPositionAt = (content) => (offset) => {
    const safeOffset = Math.max(0, Math.min(offset, content.length));
    const sliced = content.slice(0, safeOffset);
    const lines = sliced.split('\n');
    return {
      line: lines.length - 1,
      character: (lines[lines.length - 1] || '').length
    };
  };

  beforeEach(() => {
    global.cleanupMocks();
    if (!global.WebViewManagerFactory || typeof global.WebViewManagerFactory.createForTest !== 'function') {
      const factoryPath = path.resolve(__dirname, '../mocks/webview-manager-factory.js');
      const { WebViewManagerFactory } = require(factoryPath);
      global.WebViewManagerFactory = WebViewManagerFactory;
    }

    webviewManager = global.WebViewManagerFactory.createForTest(global.vscode);

    testFilePath = path.join(__dirname, 'jump-to-dsl-discoverability-e2e.tui.yml');
    fs.writeFileSync(testFilePath, `page:
  id: jump-to-dsl-e2e
  components:
    - Button:
        label: "Jump me"
`, 'utf8');
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (webviewManager && typeof webviewManager.dispose === 'function') {
      try {
        webviewManager.dispose();
      } catch (_error) {
        // no-op for simulated e2e cleanup
      }
    }
    global.cleanupMocks();
  });

  it('covers shell markup, badge visibility contract, modifier click, and DSL jump resolution', async () => {
    const jumpCalls = [];
    const node = wrapWithPreviewJumpShell(
      'jump-flow',
      {
        dslPath: '/page/components/0',
        onJumpToDsl: (dslPath, componentName) => {
          jumpCalls.push({ dslPath, componentName });
        }
      },
      React.createElement('button', { type: 'button' }, 'Jump me'),
      'Button'
    );

    const markup = renderToStaticMarkup(React.createElement(React.Fragment, null, node));
    assert.match(markup, /textui-jump-target/);
    assert.match(markup, /textui-jump-badge/);
    assert.match(markup, />Button</);
    assert.match(markup, />DSL</);

    let prevented = false;
    let stopped = false;
    node.props.onClick({
      ctrlKey: true,
      shiftKey: true,
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation: () => {
        stopped = true;
      },
      currentTarget: {
        classList: {
          add() {},
          remove() {}
        }
      }
    });

    assert.strictEqual(prevented, true);
    assert.strictEqual(stopped, true);
    assert.deepStrictEqual(jumpCalls, [
      { dslPath: '/page/components/0', componentName: 'Button' }
    ]);

    const yamlContent = fs.readFileSync(testFilePath, 'utf8');
    const document = {
      fileName: testFilePath,
      getText: () => yamlContent,
      positionAt: createPositionAt(yamlContent)
    };

    let shownEditor = null;
    webviewManager._testHelpers.extendedVscode.workspace.openTextDocument = async () => document;
    webviewManager._testHelpers.extendedVscode.window.showTextDocument = async (openedDocument) => {
      shownEditor = {
        document: openedDocument,
        selection: null
      };
      return shownEditor;
    };

    webviewManager.setLastTuiFile(testFilePath);
    await webviewManager.openPreview();
    const panel = webviewManager.getPanel();
    assert.ok(panel && typeof panel._messageHandler === 'function', 'message handler should be available');

    await panel._messageHandler({
      type: 'jump-to-dsl',
      dslPath: jumpCalls[0].dslPath,
      componentName: jumpCalls[0].componentName
    });

    assert.ok(shownEditor, 'editor should open for jump-to-dsl');
    assert.ok(shownEditor.selection, 'selection should be applied to the resolved DSL location');
  });
});
