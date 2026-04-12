/**
 * Review Engine — Impact Propagator テスト
 * T-RE2-006 / T-RE2-009
 */

const assert = require('assert');

describe('review-engine: mapChangesToNodes', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  function makeGraph(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));
    const childrenOf = new Map(nodes.map(n => [n.nodeId, []]));
    return {
      nodes: nodeMap,
      edges,
      childrenOf,
      meta: { screenCount: 1, nodeCount: nodes.length, edgeCount: edges.length }
    };
  }

  function makeChange(changeId, componentId) {
    return {
      changeId,
      type: 'UpdateProps',
      semanticChange: { type: 'UpdateProps', layer: 'behavior', componentId, identityBasis: 'stable-id' },
      metadata: {}
    };
  }

  it('maps changeId to exact nodeId when componentId matches', () => {
    const graph = makeGraph(
      [{ nodeId: 'stable:home:Button:btn-1', kind: 'Button', screenId: 'home', stableId: 'btn-1' }],
      []
    );
    const changes = [makeChange('c0', 'stable:home:Button:btn-1')];
    const mapping = re.mapChangesToNodes(changes, graph);
    assert.deepStrictEqual(mapping.get('c0'), ['stable:home:Button:btn-1']);
  });

  it('maps changeId by partial match on componentId', () => {
    const graph = makeGraph(
      [{ nodeId: 'stable:home:Button:btn-submit', kind: 'Button', screenId: 'home', stableId: 'btn-submit' }],
      []
    );
    const changes = [makeChange('c0', 'btn-submit')];
    const mapping = re.mapChangesToNodes(changes, graph);
    assert.ok(mapping.get('c0').length > 0, 'should find partial match');
    assert.ok(mapping.get('c0')[0].includes('btn-submit'));
  });

  it('returns empty array when no match found', () => {
    const graph = makeGraph(
      [{ nodeId: 'stable:home:Button:btn-1', kind: 'Button', screenId: 'home' }],
      []
    );
    const changes = [makeChange('c0', 'nonexistent-id')];
    const mapping = re.mapChangesToNodes(changes, graph);
    assert.deepStrictEqual(mapping.get('c0'), []);
  });

  it('handles multiple changes independently', () => {
    const graph = makeGraph(
      [
        { nodeId: 'stable:home:Button:btn-a', kind: 'Button', screenId: 'home' },
        { nodeId: 'stable:home:Input:input-b', kind: 'Input', screenId: 'home' }
      ],
      []
    );
    const changes = [
      makeChange('c0', 'stable:home:Button:btn-a'),
      makeChange('c1', 'stable:home:Input:input-b')
    ];
    const mapping = re.mapChangesToNodes(changes, graph);
    assert.deepStrictEqual(mapping.get('c0'), ['stable:home:Button:btn-a']);
    assert.deepStrictEqual(mapping.get('c1'), ['stable:home:Input:input-b']);
  });
});

describe('review-engine: propagateImpact', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  function makeGraph(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));
    const childrenOf = new Map(nodes.map(n => [n.nodeId, []]));
    return { nodes: nodeMap, edges, childrenOf, meta: { screenCount: 1, nodeCount: nodes.length, edgeCount: edges.length } };
  }

  it('returns empty impact for isolated node', () => {
    const graph = makeGraph(
      [{ nodeId: 'node-a', kind: 'Button', screenId: 'home' }],
      []
    );
    const impact = re.propagateImpact('c0', 'node-a', graph);
    assert.deepStrictEqual(impact.direct, []);
    assert.deepStrictEqual(impact.indirect, []);
    assert.deepStrictEqual(impact.navigation, []);
  });

  it('classifies depth-1 neighbors as direct', () => {
    const graph = makeGraph(
      [
        { nodeId: 'root', kind: 'screen', screenId: 'home' },
        { nodeId: 'child-a', kind: 'Button', screenId: 'home' },
        { nodeId: 'child-b', kind: 'Input', screenId: 'home' }
      ],
      [
        { from: 'root', to: 'child-a', kind: 'child' },
        { from: 'root', to: 'child-b', kind: 'child' }
      ]
    );
    const impact = re.propagateImpact('c0', 'root', graph);
    assert.ok(impact.direct.includes('child-a'));
    assert.ok(impact.direct.includes('child-b'));
    assert.deepStrictEqual(impact.indirect, []);
  });

  it('classifies depth-2 neighbors as indirect', () => {
    const graph = makeGraph(
      [
        { nodeId: 'root', kind: 'screen', screenId: 'home' },
        { nodeId: 'child', kind: 'Form', screenId: 'home' },
        { nodeId: 'grandchild', kind: 'Input', screenId: 'home' }
      ],
      [
        { from: 'root', to: 'child', kind: 'child' },
        { from: 'child', to: 'grandchild', kind: 'child' }
      ]
    );
    const impact = re.propagateImpact('c0', 'root', graph, { maxDepth: 3 });
    assert.ok(impact.direct.includes('child'));
    assert.ok(impact.indirect.includes('grandchild'));
  });

  it('respects maxDepth and does not traverse beyond it', () => {
    const graph = makeGraph(
      [
        { nodeId: 'n0', kind: 'screen', screenId: 'home' },
        { nodeId: 'n1', kind: 'A', screenId: 'home' },
        { nodeId: 'n2', kind: 'B', screenId: 'home' },
        { nodeId: 'n3', kind: 'C', screenId: 'home' }
      ],
      [
        { from: 'n0', to: 'n1', kind: 'child' },
        { from: 'n1', to: 'n2', kind: 'child' },
        { from: 'n2', to: 'n3', kind: 'child' }
      ]
    );
    const impact = re.propagateImpact('c0', 'n0', graph, { maxDepth: 2 });
    assert.ok(impact.direct.includes('n1'));
    assert.ok(impact.indirect.includes('n2'));
    assert.ok(!impact.direct.includes('n3') && !impact.indirect.includes('n3'), 'n3 should not be reached at maxDepth=2');
  });

  it('does not loop on circular graph', () => {
    const graph = makeGraph(
      [
        { nodeId: 'a', kind: 'A', screenId: 'home' },
        { nodeId: 'b', kind: 'B', screenId: 'home' }
      ],
      [
        { from: 'a', to: 'b', kind: 'child' },
        { from: 'b', to: 'a', kind: 'child' }  // 循環
      ]
    );
    // 無限ループしないことを確認（タイムアウトしなければ OK）
    const impact = re.propagateImpact('c0', 'a', graph, { maxDepth: 5 });
    assert.ok(Array.isArray(impact.direct));
    assert.ok(Array.isArray(impact.indirect));
  });

  it('classifies navigation edges into impact.navigation', () => {
    const graph = makeGraph(
      [
        { nodeId: 'btn', kind: 'Button', screenId: 'home' },
        { nodeId: 'screen:dashboard:root', kind: 'screen', screenId: 'dashboard' }
      ],
      [
        { from: 'btn', to: 'screen:dashboard:root', kind: 'navigation' }
      ]
    );
    const impact = re.propagateImpact('c0', 'btn', graph);
    assert.ok(impact.navigation.includes('screen:dashboard:root'));
    assert.ok(impact.direct.includes('screen:dashboard:root'));
  });
});

describe('review-engine: propagateAllImpacts', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  it('returns empty impact for change with no node mapping', () => {
    const graph = {
      nodes: new Map(),
      edges: [],
      childrenOf: new Map(),
      meta: { screenCount: 0, nodeCount: 0, edgeCount: 0 }
    };
    const changes = [{
      changeId: 'c0',
      type: 'AddComponent',
      semanticChange: { type: 'AddComponent', layer: 'structure', componentId: 'unknown', identityBasis: 'stable-id' },
      metadata: {}
    }];
    const impacts = re.propagateAllImpacts(changes, graph);
    assert.strictEqual(impacts.length, 1);
    assert.strictEqual(impacts[0].changeId, 'c0');
    assert.deepStrictEqual(impacts[0].direct, []);
  });

  it('returns one Impact per Change', () => {
    const graph = {
      nodes: new Map([
        ['node-x', { nodeId: 'node-x', kind: 'Button', screenId: 'home' }],
        ['node-y', { nodeId: 'node-y', kind: 'Input', screenId: 'home' }]
      ]),
      edges: [],
      childrenOf: new Map(),
      meta: { screenCount: 1, nodeCount: 2, edgeCount: 0 }
    };
    const changes = [
      { changeId: 'c0', type: 'UpdateProps', semanticChange: { type: 'UpdateProps', layer: 'behavior', componentId: 'node-x', identityBasis: 'stable-id' }, metadata: {} },
      { changeId: 'c1', type: 'UpdateProps', semanticChange: { type: 'UpdateProps', layer: 'behavior', componentId: 'node-y', identityBasis: 'stable-id' }, metadata: {} }
    ];
    const impacts = re.propagateAllImpacts(changes, graph);
    assert.strictEqual(impacts.length, 2);
    assert.strictEqual(impacts[0].changeId, 'c0');
    assert.strictEqual(impacts[1].changeId, 'c1');
  });
});
