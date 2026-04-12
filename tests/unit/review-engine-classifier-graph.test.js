/**
 * Review Engine — Change Classifier + DependencyGraph テスト
 * T-RE3-003 / T-RE2-004
 */

const assert = require('assert');

describe('review-engine: Change Classifier', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  // ── classifySemanticChangeType ────────────────────────────────────────────

  it('classifies UpdateLayout as layout', () => {
    assert.strictEqual(re.classifySemanticChangeType('UpdateLayout'), 'layout');
  });

  it('classifies MoveComponent as layout', () => {
    assert.strictEqual(re.classifySemanticChangeType('MoveComponent'), 'layout');
  });

  it('classifies UpdateStyle as style', () => {
    assert.strictEqual(re.classifySemanticChangeType('UpdateStyle'), 'style');
  });

  it('classifies UpdateCondition as behavior', () => {
    assert.strictEqual(re.classifySemanticChangeType('UpdateCondition'), 'behavior');
  });

  it('classifies UpdateEvent as behavior', () => {
    assert.strictEqual(re.classifySemanticChangeType('UpdateEvent'), 'behavior');
  });

  it('classifies UpdateBinding as behavior', () => {
    assert.strictEqual(re.classifySemanticChangeType('UpdateBinding'), 'behavior');
  });

  it('classifies UpdateProps as content', () => {
    assert.strictEqual(re.classifySemanticChangeType('UpdateProps'), 'content');
  });

  it('classifies AddComponent as content', () => {
    assert.strictEqual(re.classifySemanticChangeType('AddComponent'), 'content');
  });

  it('classifies RemoveComponent as content', () => {
    assert.strictEqual(re.classifySemanticChangeType('RemoveComponent'), 'content');
  });

  // ── classifyChange ────────────────────────────────────────────────────────

  it('classifyChange attaches classType to metadata', () => {
    const change = {
      changeId: 'change-0',
      type: 'UpdateLayout',
      semanticChange: { type: 'UpdateLayout', layer: 'visual', componentId: 'btn', identityBasis: 'stable-id' },
      metadata: {}
    };
    const result = re.classifyChange(change);
    assert.strictEqual(result.metadata.classType, 'layout');
  });

  it('classifyChange does not mutate the original change', () => {
    const change = {
      changeId: 'change-1',
      type: 'UpdateStyle',
      semanticChange: { type: 'UpdateStyle', layer: 'visual', componentId: 'btn', identityBasis: 'stable-id' },
      metadata: {}
    };
    re.classifyChange(change);
    assert.strictEqual(change.metadata.classType, undefined);
  });

  it('classifyChanges classifies all changes in array', () => {
    const changes = [
      { changeId: 'c0', type: 'AddComponent', semanticChange: { type: 'AddComponent', layer: 'structure', componentId: 'x', identityBasis: 'stable-id' }, metadata: {} },
      { changeId: 'c1', type: 'UpdateEvent',  semanticChange: { type: 'UpdateEvent',  layer: 'behavior', componentId: 'y', identityBasis: 'stable-id' }, metadata: {} },
    ];
    const results = re.classifyChanges(changes);
    assert.strictEqual(results[0].metadata.classType, 'content');
    assert.strictEqual(results[1].metadata.classType, 'behavior');
  });
});

describe('review-engine: DependencyGraph', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  // ── 空 DSL ───────────────────────────────────────────────────────────────

  it('returns empty graph for DSL with no page', () => {
    const graph = re.buildDependencyGraph({});
    assert.strictEqual(graph.meta.nodeCount, 0);
    assert.strictEqual(graph.meta.edgeCount, 0);
  });

  // ── 基本的な親子関係 ──────────────────────────────────────────────────────

  it('creates root node for page', () => {
    const dsl = {
      page: { id: 'home', title: 'Home', components: [] }
    };
    const graph = re.buildDependencyGraph(dsl);
    assert.ok(graph.nodes.has('screen:home:root'), 'root node should exist');
    assert.strictEqual(graph.meta.screenCount, 1);
  });

  it('creates child nodes for page components', () => {
    const dsl = {
      page: {
        id: 'home',
        title: 'Home',
        components: [
          { Button: { id: 'btn-submit', label: 'Submit' } },
          { Input:  { id: 'email-input', label: 'Email' } }
        ]
      }
    };
    const graph = re.buildDependencyGraph(dsl);
    // root + 2 components
    assert.strictEqual(graph.meta.nodeCount, 3);
    // 2 child edges
    assert.strictEqual(graph.edges.filter(e => e.kind === 'child').length, 2);
  });

  it('creates child edges from root to each component', () => {
    const dsl = {
      page: {
        id: 'profile',
        title: 'Profile',
        components: [
          { Text: { id: 'title-text', content: 'Hello' } }
        ]
      }
    };
    const graph = re.buildDependencyGraph(dsl);
    const rootId = 'screen:profile:root';
    const children = graph.childrenOf.get(rootId) ?? [];
    assert.strictEqual(children.length, 1);
    assert.ok(children[0].includes('title-text'), `child should reference stable id: ${children[0]}`);
  });

  // ── navigation エッジ ─────────────────────────────────────────────────────

  it('creates navigation edge for onClick navigate()', () => {
    const dsl = {
      page: {
        id: 'login',
        title: 'Login',
        components: [
          { Button: { id: 'go-home', label: 'Go Home', onClick: "navigate('/home')" } }
        ]
      }
    };
    const graph = re.buildDependencyGraph(dsl);
    const navEdges = graph.edges.filter(e => e.kind === 'navigation');
    assert.strictEqual(navEdges.length, 1);
    assert.ok(navEdges[0].to.includes('home'), `navigation target should include 'home': ${navEdges[0].to}`);
  });

  // ── $include エッジ ───────────────────────────────────────────────────────

  it('creates include edge for $include entries', () => {
    const dsl = {
      $include: ['shared/header.tui.yml'],
      page: { id: 'dashboard', title: 'Dashboard', components: [] }
    };
    const graph = re.buildDependencyGraph(dsl);
    const includeEdges = graph.edges.filter(e => e.kind === 'include');
    assert.strictEqual(includeEdges.length, 1);
    assert.ok(includeEdges[0].to.includes('header'), `include target should reference header: ${includeEdges[0].to}`);
  });
});
