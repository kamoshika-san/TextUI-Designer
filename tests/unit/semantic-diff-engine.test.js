const assert = require('assert');

describe('semantic diff extractor and structure changes', () => {
  let semanticDiff;

  before(() => {
    semanticDiff = require('../../out/services/semantic-diff');
  });

  it('builds canonical semantic diff IR with screen scope and normalization hooks', () => {
    const dsl = {
      page: {
        id: 'profile-page',
        title: 'Profile',
        layout: 'vertical',
        components: [
          {
            Input: {
              id: 'email-input',
              label: 'Email',
              padding: 8
            }
          }
        ]
      }
    };

    const ir = semanticDiff.buildSemanticDiffIR(dsl, { documentPath: 'profile.tui.yml' });
    const screen = ir.screens[0];
    const inputNode = screen.rootNode.children[0];

    assert.strictEqual(ir.schemaVersion, 'semantic-diff-ir/v1');
    assert.strictEqual(ir.entryDocumentPath, 'profile.tui.yml');
    assert.strictEqual(screen.screenKey, 'profile-page');
    assert.strictEqual(screen.rootNode.nodeId, 'screen:profile-page:root');
    assert.strictEqual(inputNode.nodeId, 'stable:profile-page:Input:email-input');
    assert.strictEqual(inputNode.props.label.value, 'Email');
    assert.strictEqual(inputNode.props.required.value, false);
    assert.strictEqual(inputNode.props.required.explicitness, 'derived-default');
    assert.deepStrictEqual(inputNode.layout.padding.value, {
      top: 8,
      right: 8,
      bottom: 8,
      left: 8
    });
    assert.strictEqual(inputNode.sourceRef.entityPath, '/page/components/0');
  });

  it('extracts nested child components from form fields and item component slots', () => {
    const dsl = {
      page: {
        id: 'settings-page',
        title: 'Settings',
        layout: 'vertical',
        components: [
          {
            Form: {
              id: 'settings-form',
              fields: [
                { Input: { id: 'email', label: 'Email' } }
              ],
              actions: [
                { Button: { id: 'save', label: 'Save' } }
              ]
            }
          },
          {
            Tabs: {
              id: 'settings-tabs',
              items: [
                {
                  label: 'General',
                  components: [{ Text: { id: 'general-copy', value: 'Hello' } }]
                }
              ]
            }
          }
        ]
      }
    };

    const ir = semanticDiff.buildSemanticDiffIR(dsl);
    const formNode = ir.screens[0].rootNode.children[0];
    const tabsNode = ir.screens[0].rootNode.children[1];

    assert.strictEqual(formNode.children.length, 2);
    assert.strictEqual(formNode.children[0].sourceRef.entityPath, '/page/components/0/fields/0');
    assert.strictEqual(formNode.children[1].sourceRef.entityPath, '/page/components/0/actions/0');
    assert.strictEqual(tabsNode.children[0].sourceRef.entityPath, '/page/components/1/items/0/components/0');
  });

  it('detects conservative structural moves via stable ids', () => {
    const previous = semanticDiff.buildSemanticDiffIR({
      page: {
        id: 'dashboard-page',
        title: 'Dashboard',
        layout: 'vertical',
        components: [
          { Text: { id: 'hero-title', value: 'Welcome' } },
          { Container: { id: 'panel', components: [] } }
        ]
      }
    });

    const next = semanticDiff.buildSemanticDiffIR({
      page: {
        id: 'dashboard-page',
        title: 'Dashboard',
        layout: 'vertical',
        components: [
          {
            Container: {
              id: 'panel',
              components: [{ Text: { id: 'hero-title', value: 'Welcome' } }]
            }
          }
        ]
      }
    });

    const changes = semanticDiff.computeStructureSemanticChanges(previous, next);
    const move = changes.find(
      change => change.type === 'MoveComponent' && change.componentId === 'stable:dashboard-page:Text:hero-title'
    );

    assert.strictEqual(changes.filter(change => change.type === 'MoveComponent').length, 2);
    assert.ok(move);
    assert.strictEqual(move.componentId, 'stable:dashboard-page:Text:hero-title');
    assert.strictEqual(move.fromParentId, 'screen:dashboard-page:root');
    assert.strictEqual(move.toParentId, 'stable:dashboard-page:Container:panel');
  });

  it('falls back to remove plus add when stable-id continuity is ambiguous', () => {
    const previous = semanticDiff.buildSemanticDiffIR({
      page: {
        id: 'settings-page',
        title: 'Settings',
        layout: 'vertical',
        components: [
          { Text: { id: 'dup', value: 'First' } },
          { Text: { id: 'dup', value: 'Second' } }
        ]
      }
    });

    const next = semanticDiff.buildSemanticDiffIR({
      page: {
        id: 'settings-page',
        title: 'Settings',
        layout: 'vertical',
        components: [
          { Container: { id: 'holder', components: [{ Text: { id: 'dup', value: 'First' } }] } }
        ]
      }
    });

    const changes = semanticDiff.computeStructureSemanticChanges(previous, next);
    const ambiguousRemovals = changes.filter(change => change.type === 'RemoveComponent');
    const ambiguousAdditions = changes.filter(
      change => change.type === 'AddComponent' && change.ambiguityReason === 'multiple-candidates'
    );

    assert.strictEqual(changes.some(change => change.type === 'MoveComponent'), false);
    assert.ok(ambiguousRemovals.length >= 2);
    assert.ok(ambiguousAdditions.length >= 1);
    assert.strictEqual(ambiguousRemovals[0].ambiguityReason, 'multiple-candidates');
    assert.strictEqual(ambiguousAdditions[0].ambiguityReason, 'multiple-candidates');
  });
});
