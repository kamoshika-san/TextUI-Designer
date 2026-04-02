const assert = require('assert');

describe('buildRenderTargetsFromDiffResult', () => {
  let diff;

  const makeDsl = (components) => ({
    page: {
      id: 'page-1',
      title: 'Sample',
      layout: 'vertical',
      components
    }
  });

  before(() => {
    diff = require('../../out/core/textui-core-diff');
  });

  it('maps diff entity refs into stable page/component render targets', () => {
    const previous = diff.createNormalizedDiffDocument(
      makeDsl([
        { Text: { id: 'headline', text: 'Before' } }
      ]),
      { side: 'previous', sourcePath: '/tmp/prev.tui.yml' }
    );
    const next = diff.createNormalizedDiffDocument(
      makeDsl([
        { Text: { id: 'headline', text: 'After' } },
        { Button: { id: 'cta', label: 'Continue' } }
      ]),
      { side: 'next', sourcePath: '/tmp/next.tui.yml' }
    );

    const result = diff.createDiffResultSkeleton(previous, next);
    const targets = diff.buildRenderTargetsFromDiffResult(result);

    const pageTarget = targets.find(target => target.scope === 'page');
    const textTarget = targets.find(target => target.entityKey === 'component:Text:headline');
    const buttonTarget = targets.find(target => target.next?.path === '/page/components/1');

    assert.ok(pageTarget);
    assert.deepStrictEqual(pageTarget.eventKinds, ['update']);
    assert.strictEqual(pageTarget.resolution, 'resolved');
    assert.strictEqual(pageTarget.previous.path, '/page');
    assert.strictEqual(pageTarget.next.path, '/page');

    assert.ok(textTarget);
    assert.strictEqual(textTarget.resolution, 'resolved');
    assert.strictEqual(textTarget.previous.path, '/page/components/0');
    assert.strictEqual(textTarget.next.path, '/page/components/0');
    assert.ok(textTarget.eventKinds.includes('update'));

    assert.ok(buttonTarget);
    assert.strictEqual(buttonTarget.resolution, 'resolved');
    assert.strictEqual(buttonTarget.next.path, '/page/components/1');
    assert.strictEqual(buttonTarget.previous, undefined);
    assert.deepStrictEqual(buttonTarget.eventKinds, ['add']);
  });
});
