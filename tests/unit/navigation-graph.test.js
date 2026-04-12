const assert = require('assert');

describe('navigation-graph', () => {
  let buildNavigationGraph;
  let collectReachableScreenIds;
  let collectReverseReachableScreenIds;
  let getTerminalScreenIds;
  let findShortestNavigationRoute;
  let findNavigationCycles;

  before(() => {
    ({
      buildNavigationGraph,
      collectReachableScreenIds,
      collectReverseReachableScreenIds,
      getTerminalScreenIds,
      findShortestNavigationRoute,
      findNavigationCycles
    } = require('../../out/shared/navigation-graph'));
  });

  it('builds adjacency, reverse adjacency, and terminal lookup from a flow DSL', () => {
    const graph = buildNavigationGraph({
      flow: {
        id: 'support',
        version: '2',
        title: 'Support',
        entry: 'start',
        screens: [
          { id: 'start', page: './screens/start.tui.yml', kind: 'screen' },
          { id: 'triage', page: './screens/triage.tui.yml', kind: 'decision' },
          { id: 'resolved', page: './screens/resolved.tui.yml', kind: 'terminal', terminal: { kind: 'success' } },
          { id: 'cancelled', page: './screens/cancelled.tui.yml', kind: 'terminal', terminal: { kind: 'cancel' } }
        ],
        transitions: [
          { id: 't-start-triage', from: 'start', to: 'triage', trigger: 'next' },
          { id: 't-triage-resolved', from: 'triage', to: 'resolved', trigger: 'resolve' },
          { from: 'triage', to: 'cancelled', trigger: 'cancel' }
        ]
      }
    });

    assert.deepStrictEqual(
      (graph.adjacency.get('triage') ?? []).map(edge => edge.to),
      ['resolved', 'cancelled']
    );
    assert.deepStrictEqual(
      (graph.reverseAdjacency.get('resolved') ?? []).map(edge => edge.from),
      ['triage']
    );
    assert.deepStrictEqual(getTerminalScreenIds(graph).sort(), ['cancelled', 'resolved']);
    assert.deepStrictEqual(getTerminalScreenIds(graph, 'success'), ['resolved']);
    assert.ok(graph.edgeById.has('t-start-triage'));
    assert.ok(graph.edgeById.has('triage::cancel::cancelled'));
  });

  it('supports reachability and reverse-reachability queries', () => {
    const graph = buildNavigationGraph({
      flow: {
        id: 'ops',
        title: 'Ops',
        entry: 'queue',
        screens: [
          { id: 'queue', page: './queue.tui.yml' },
          { id: 'assign', page: './assign.tui.yml' },
          { id: 'done', page: './done.tui.yml', terminal: { kind: 'success' } },
          { id: 'orphan', page: './orphan.tui.yml' }
        ],
        transitions: [
          { from: 'queue', to: 'assign', trigger: 'next' },
          { from: 'assign', to: 'done', trigger: 'close' }
        ]
      }
    });

    assert.deepStrictEqual(
      [...collectReachableScreenIds(graph)].sort(),
      ['assign', 'done', 'queue']
    );
    assert.deepStrictEqual(
      [...collectReverseReachableScreenIds(graph, 'done')].sort(),
      ['assign', 'done', 'queue']
    );
  });

  it('finds the shortest route to a terminal screen and reports cycles', () => {
    const graph = buildNavigationGraph({
      flow: {
        id: 'approval',
        version: '2',
        title: 'Approval',
        entry: 'draft',
        screens: [
          { id: 'draft', page: './draft.tui.yml' },
          { id: 'review', page: './review.tui.yml', kind: 'review' },
          { id: 'rework', page: './rework.tui.yml' },
          { id: 'approved', page: './approved.tui.yml', terminal: { kind: 'success' } }
        ],
        transitions: [
          { from: 'draft', to: 'review', trigger: 'submit' },
          { from: 'review', to: 'rework', trigger: 'changes' },
          { from: 'rework', to: 'review', trigger: 'resubmit' },
          { from: 'review', to: 'approved', trigger: 'approve' }
        ]
      }
    });

    const route = findShortestNavigationRoute(graph, { toTerminalKind: 'success' });
    assert.deepStrictEqual(route, {
      screenIds: ['draft', 'review', 'approved'],
      transitionIds: ['draft::submit::review', 'review::approve::approved']
    });

    const cycles = findNavigationCycles(graph);
    assert.deepStrictEqual(cycles, [['review', 'rework', 'review']]);
  });

  it('detects duplicate transition identities without silently overwriting lookup state', () => {
    const graph = buildNavigationGraph({
      flow: {
        id: 'collision',
        version: '2',
        title: 'Collision',
        entry: 'start',
        screens: [
          { id: 'start', page: './start.tui.yml' },
          { id: 'a', page: './a.tui.yml' },
          { id: 'b', page: './b.tui.yml' }
        ],
        transitions: [
          { id: 'dup', from: 'start', to: 'a', trigger: 'go-a' },
          { id: 'dup', from: 'start', to: 'b', trigger: 'go-b' }
        ]
      }
    });

    assert.strictEqual(graph.edgeById.has('dup'), false);
    assert.deepStrictEqual(
      (graph.duplicateEdgeIds.get('dup') ?? []).map(edge => edge.to).sort(),
      ['a', 'b']
    );
    assert.deepStrictEqual(
      (graph.adjacency.get('start') ?? []).map(edge => edge.id),
      ['dup', 'dup']
    );
  });
});

describe('findAllNavigationRoutes', () => {
  let buildNavigationGraph;
  let findAllNavigationRoutes;

  before(() => {
    ({ buildNavigationGraph, findAllNavigationRoutes } = require('../../out/shared/navigation-graph'));
  });

  it('returns a single route for a simple linear flow', () => {
    const graph = buildNavigationGraph({
      flow: {
        id: 'linear',
        title: 'Linear',
        entry: 'a',
        screens: [
          { id: 'a', page: './a.tui.yml' },
          { id: 'b', page: './b.tui.yml' },
          { id: 'c', page: './c.tui.yml' }
        ],
        transitions: [
          { from: 'a', to: 'b', trigger: 'next' },
          { from: 'b', to: 'c', trigger: 'next' }
        ]
      }
    });

    const routes = findAllNavigationRoutes(graph, { toScreenId: 'c' });
    assert.strictEqual(routes.length, 1);
    assert.deepStrictEqual(routes[0].screenIds, ['a', 'b', 'c']);
    assert.deepStrictEqual(routes[0].triggers, ['next', 'next']);
    assert.strictEqual(routes[0].length, 2);
  });

  it('returns multiple routes for a branching flow, sorted by length', () => {
    // a -> b -> d (short)
    // a -> c -> d (short, same length)
    const graph = buildNavigationGraph({
      flow: {
        id: 'branch',
        title: 'Branch',
        entry: 'a',
        screens: [
          { id: 'a', page: './a.tui.yml' },
          { id: 'b', page: './b.tui.yml' },
          { id: 'c', page: './c.tui.yml' },
          { id: 'd', page: './d.tui.yml' }
        ],
        transitions: [
          { from: 'a', to: 'b', trigger: 'go-b' },
          { from: 'a', to: 'c', trigger: 'go-c' },
          { from: 'b', to: 'd', trigger: 'finish' },
          { from: 'c', to: 'd', trigger: 'finish' }
        ]
      }
    });

    const routes = findAllNavigationRoutes(graph, { toScreenId: 'd' });
    assert.strictEqual(routes.length, 2);
    // Both routes have length 2
    assert.ok(routes.every(r => r.length === 2));
    const allScreenPaths = routes.map(r => r.screenIds.join('->'));
    assert.ok(allScreenPaths.includes('a->b->d'));
    assert.ok(allScreenPaths.includes('a->c->d'));
  });

  it('excludes loop-back paths (loop-free only)', () => {
    // a -> b -> c -> b (loop) -> c is excluded
    // Only valid loop-free path: a -> b -> c
    const graph = buildNavigationGraph({
      flow: {
        id: 'loop',
        title: 'Loop',
        entry: 'a',
        screens: [
          { id: 'a', page: './a.tui.yml' },
          { id: 'b', page: './b.tui.yml' },
          { id: 'c', page: './c.tui.yml' }
        ],
        transitions: [
          { from: 'a', to: 'b', trigger: 'next' },
          { from: 'b', to: 'c', trigger: 'next' },
          { from: 'c', to: 'b', trigger: 'back' }  // loop back
        ]
      }
    });

    const routes = findAllNavigationRoutes(graph, { toScreenId: 'c' });
    assert.strictEqual(routes.length, 1);
    assert.deepStrictEqual(routes[0].screenIds, ['a', 'b', 'c']);
  });

  it('returns empty array when target is unreachable', () => {
    const graph = buildNavigationGraph({
      flow: {
        id: 'unreachable',
        title: 'Unreachable',
        entry: 'a',
        screens: [
          { id: 'a', page: './a.tui.yml' },
          { id: 'b', page: './b.tui.yml' },
          { id: 'orphan', page: './orphan.tui.yml' }
        ],
        transitions: [
          { from: 'a', to: 'b', trigger: 'next' }
        ]
      }
    });

    const routes = findAllNavigationRoutes(graph, { toScreenId: 'orphan' });
    assert.deepStrictEqual(routes, []);
  });

  it('respects maxRoutes limit', () => {
    // a -> b1 -> c, a -> b2 -> c, a -> b3 -> c, a -> b4 -> c, a -> b5 -> c, a -> b6 -> c
    const screens = [
      { id: 'a', page: './a.tui.yml' },
      { id: 'c', page: './c.tui.yml' },
      ...Array.from({ length: 6 }, (_, i) => ({ id: `b${i + 1}`, page: `./b${i + 1}.tui.yml` }))
    ];
    const transitions = Array.from({ length: 6 }, (_, i) => ([
      { from: 'a', to: `b${i + 1}`, trigger: `go-b${i + 1}` },
      { from: `b${i + 1}`, to: 'c', trigger: 'finish' }
    ])).flat();

    const graph = buildNavigationGraph({
      flow: { id: 'many', title: 'Many', entry: 'a', screens, transitions }
    });

    const routes = findAllNavigationRoutes(graph, { toScreenId: 'c', maxRoutes: 3 });
    assert.strictEqual(routes.length, 3);
  });

  it('returns trivial route when entry equals target', () => {
    const graph = buildNavigationGraph({
      flow: {
        id: 'self',
        title: 'Self',
        entry: 'a',
        screens: [{ id: 'a', page: './a.tui.yml' }],
        transitions: []
      }
    });

    const routes = findAllNavigationRoutes(graph, { toScreenId: 'a' });
    assert.strictEqual(routes.length, 1);
    assert.deepStrictEqual(routes[0].screenIds, ['a']);
    assert.strictEqual(routes[0].length, 0);
  });
});
