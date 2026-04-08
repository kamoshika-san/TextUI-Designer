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

  it('does not over-update an unchanged parent when only a nested child changes', () => {
    const previous = diff.createNormalizedDiffDocument(
      makeDsl([
        {
          Container: {
            id: 'panel',
            components: [
              { Text: { id: 'headline', text: 'Before' } },
              { Text: { id: 'caption', text: 'Static' } }
            ]
          }
        }
      ]),
      { side: 'previous', sourcePath: '/tmp/prev.tui.yml' }
    );
    const next = diff.createNormalizedDiffDocument(
      makeDsl([
        {
          Container: {
            id: 'panel',
            components: [
              { Text: { id: 'headline', text: 'After' } },
              { Text: { id: 'caption', text: 'Static' } }
            ]
          }
        }
      ]),
      { side: 'next', sourcePath: '/tmp/next.tui.yml' }
    );

    const result = diff.createDiffResultSkeleton(previous, next);
    const targets = diff.buildRenderTargetsFromDiffResult(result);
    const panelTarget = targets.find(target => target.entityKey === 'component:Container:panel');
    const headlineTarget = targets.find(target => target.entityKey === 'component:Text:headline');
    const captionTarget = targets.find(target => target.entityKey === 'component:Text:caption');

    assert.ok(headlineTarget);
    assert.strictEqual(panelTarget, undefined);
    assert.strictEqual(captionTarget, undefined);
  });

  it('keeps adjacent sibling updates scoped to the changed sibling plus page target', () => {
    const previous = diff.createNormalizedDiffDocument(
      makeDsl([
        { Text: { id: 'left', text: 'Left' } },
        { Text: { id: 'right', text: 'Right' } }
      ]),
      { side: 'previous', sourcePath: '/tmp/prev.tui.yml' }
    );
    const next = diff.createNormalizedDiffDocument(
      makeDsl([
        { Text: { id: 'left', text: 'Left updated' } },
        { Text: { id: 'right', text: 'Right' } }
      ]),
      { side: 'next', sourcePath: '/tmp/next.tui.yml' }
    );

    const result = diff.createDiffResultSkeleton(previous, next);
    const targets = diff.buildRenderTargetsFromDiffResult(result);
    const leftTarget = targets.find(target => target.entityKey === 'component:Text:left');
    const rightTarget = targets.find(target => target.entityKey === 'component:Text:right');
    const pageTarget = targets.find(target => target.scope === 'page');

    assert.ok(pageTarget);
    assert.ok(leftTarget);
    assert.strictEqual(rightTarget, undefined);
  });
});
