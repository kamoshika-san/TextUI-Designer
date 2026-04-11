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
});
