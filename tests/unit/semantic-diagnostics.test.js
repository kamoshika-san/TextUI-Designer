const assert = require('assert');
const { SemanticDiagnosticEngine } = require('../../out/services/diagnostics/semantic-diagnostic-engine');

describe('SemanticDiagnosticEngine', () => {
  const engine = new SemanticDiagnosticEngine();

  it('detects missing alt text in Image', async () => {
    const dsl = `
page:
  components:
    - Image:
        src: "test.png"
`;
    const results = await engine.analyze(dsl);
    const altError = results.find(r => r.code === 'TUI_DESIGN_001');
    assert.ok(altError, 'Should detect missing alt');
    assert.strictEqual(altError.severity, 'warning');
  });

  it('detects missing label in Button', async () => {
    const dsl = `
page:
  components:
    - Button:
        kind: "primary"
`;
    const results = await engine.analyze(dsl);
    const labelError = results.find(r => r.code === 'TUI_DESIGN_002');
    assert.ok(labelError, 'Should detect missing label');
    assert.strictEqual(labelError.severity, 'error');
  });

  it('does not report when valid', async () => {
    const dsl = `
page:
  components:
    - Image:
        src: "test.png"
        alt: "Valid alt"
    - Button:
        label: "Click me"
`;
    const results = await engine.analyze(dsl);
    assert.strictEqual(results.length, 0);
  });
});
