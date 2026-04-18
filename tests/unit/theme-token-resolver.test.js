const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveDslTokens } = require('../../out/cli/theme-token-resolver');

describe('theme-token-resolver traversal abstraction', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-token-resolver-'));
    fs.writeFileSync(path.join(tmpDir, 'textui-theme.yml'), `
theme:
  name: test
  tokens:
    color:
      primary:
        value: "#123456"
      secondary:
        value: "#654321"
`);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves token in nested Tabs/Accordion/TreeView components', () => {
    const sourcePath = path.join(tmpDir, 'sample.tui.yml');
    const dsl = {
      page: {
        id: 'p',
        title: 't',
        layout: 'vertical',
        components: [
          {
            Tabs: {
              items: [
                {
                  components: [
                    {
                      Accordion: {
                        items: [
                          {
                            components: [
                              {
                                TreeView: {
                                  items: [
                                    {
                                      components: [
                                        {
                                          Text: {
                                            value: 'deep',
                                            token: 'color.primary'
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                }
                              }
                            ]
                          }
                        ]
                      }
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    };

    const result = resolveDslTokens({ dsl, sourcePath, onError: 'error' });
    const resolvedToken = result.dsl.page.components[0].Tabs.items[0].components[0].Accordion.items[0].components[0].TreeView.items[0].components[0].Text.token;

    assert.strictEqual(resolvedToken, '#123456');
    assert.deepStrictEqual(result.issues, []);
  });

  it('recognizes DatePicker as built-in component and resolves token', () => {
    const sourcePath = path.join(tmpDir, 'datepicker.tui.yml');
    const dsl = {
      page: {
        id: 'p',
        title: 't',
        layout: 'vertical',
        components: [
          {
            DatePicker: {
              label: 'Date',
              token: 'color.secondary'
            }
          }
        ]
      }
    };

    const result = resolveDslTokens({ dsl, sourcePath, onError: 'error' });
    assert.strictEqual(result.dsl.page.components[0].DatePicker.token, '#654321');
    assert.deepStrictEqual(result.issues, []);
  });

  it('accepts plural theme tokens while keeping color.* as the external token path', () => {
    fs.writeFileSync(path.join(tmpDir, 'textui-theme.yml'), `
theme:
  name: test
  tokens:
    colors:
      primary:
        value: "#abcdef"
`);

    const sourcePath = path.join(tmpDir, 'plural-theme.tui.yml');
    const dsl = {
      page: {
        id: 'p',
        title: 't',
        layout: 'vertical',
        components: [
          {
            Button: {
              label: 'ok',
              token: 'color.primary'
            }
          }
        ]
      }
    };

    const result = resolveDslTokens({ dsl, sourcePath, onError: 'error' });
    assert.strictEqual(result.dsl.page.components[0].Button.token, '#abcdef');
    assert.deepStrictEqual(result.issues, []);
  });

  it('falls back to default preview theme tokens when no textui-theme exists', () => {
    fs.rmSync(path.join(tmpDir, 'textui-theme.yml'));
    const sourcePath = path.join(tmpDir, 'default-theme.tui.yml');
    const dsl = {
      page: {
        id: 'p',
        title: 't',
        layout: 'vertical',
        components: [
          {
            Button: {
              label: 'ok',
              token: 'color.primary'
            }
          }
        ]
      }
    };

    const result = resolveDslTokens({ dsl, sourcePath, onError: 'error' });
    assert.strictEqual(result.dsl.page.components[0].Button.token, '#3B82F6');
    assert.deepStrictEqual(result.issues, []);
  });
});
