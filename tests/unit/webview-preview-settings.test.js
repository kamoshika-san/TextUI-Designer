const assert = require('assert');
const path = require('path');

describe('webview preview settings parsing', () => {
  const originalWindow = global.window;
  global.window = {
    location: {
      search: ''
    }
  };
  const {
    readPreviewSettings
  } = require(path.resolve(__dirname, '../../out/renderer/use-webview-messages.js'));

  after(() => {
    global.window = originalWindow;
  });

  it('defaults the update indicator to visible when preview settings are missing', () => {
    assert.deepStrictEqual(readPreviewSettings(undefined), {
      showUpdateIndicator: true,
      showJumpToDslHoverIndicator: false
    });
  });

  it('reads both update-indicator and jump-to-DSL visibility flags from preview settings', () => {
    assert.deepStrictEqual(
      readPreviewSettings({
        preview: {
          showUpdateIndicator: false
        },
        jumpToDsl: {
          showHoverIndicator: true
        }
      }),
      {
        showUpdateIndicator: false,
        showJumpToDslHoverIndicator: true
      }
    );
  });
});
