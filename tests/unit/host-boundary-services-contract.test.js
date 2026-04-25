const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('host boundary service contract guards (Sprint 1/2)', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

  it('services contract does not import vscode directly', () => {
    const source = read('src/types/services.ts');
    assert.ok(!/from ['"]vscode['"]/.test(source), 'src/types/services.ts must not import vscode directly');
  });

  it('common runtime factory does not import vscode directly', () => {
    const source = read('src/services/common-runtime-factory.ts');
    assert.ok(!/from ['"]vscode['"]/.test(source), 'common-runtime-factory must not import vscode directly');
    assert.ok(
      source.includes('export function createApplicationRuntime'),
      'common-runtime-factory should expose createApplicationRuntime'
    );
  });

  it('host neutral shapes are defined in src/types/host.ts', () => {
    const source = read('src/types/host.ts');
    for (const name of [
      'DisposableLike',
      'UriLike',
      'TextDocumentLike',
      'CompletionContextLike',
      'CompletionItemLike',
      'CompletionListLike',
      'WebviewPanelLike'
    ]) {
      assert.ok(source.includes(`interface ${name}`), `missing host shape: ${name}`);
    }
  });

  it('event manager registers completion provider through adapter', () => {
    const source = read('src/services/event-manager.ts');
    assert.ok(
      source.includes('toVscodeCompletionItemProvider(this.services.completionProvider)'),
      'EventManager should route completion providers through toVscodeCompletionItemProvider'
    );
  });
});
