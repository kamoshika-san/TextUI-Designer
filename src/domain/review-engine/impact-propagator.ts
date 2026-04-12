/**
 * Review Engine — Impact Propagator
 * T-RE2-005 / T-RE2-006 / T-RE2-007 / T-RE2-008
 *
 * changeId → nodeId マッピングと BFS による影響範囲探索を提供する。
 */

import type { ChangeId, Change } from './diff-ir';
import type { DependencyGraph } from './dependency-graph';

// ── Impact 型 ─────────────────────────────────────────────────────────────────

/**
 * 変更の影響範囲。BFS/DFS で算出する。
 * T-RE2-008
 */
export interface Impact {
  changeId: ChangeId;
  /** 直接影響するノード ID 一覧（depth 1） */
  direct: string[];
  /** 間接影響するノード ID 一覧（depth 2 以上） */
  indirect: string[];
  /** 影響する navigation エッジの to ノード ID 一覧 */
  navigation: string[];
}

// ── changeId → nodeId マッピング ──────────────────────────────────────────────

/**
 * Change の componentId / stableId を DependencyGraph の nodeId に対応付ける。
 * T-RE2-005
 *
 * マッピング戦略:
 * 1. Change.semanticChange.componentId が graph.nodes に完全一致 → そのまま使用
 * 2. stableId を含む nodeId を部分一致で検索
 * 3. 一致なし → 空配列
 *
 * @returns Map<ChangeId, string[]>  1 changeId → 複数 nodeId 対応
 */
export function mapChangesToNodes(
  changes: Change[],
  graph: DependencyGraph
): Map<ChangeId, string[]> {
  const result = new Map<ChangeId, string[]>();

  for (const change of changes) {
    const componentId = change.semanticChange.componentId;
    const matched: string[] = [];

    // 完全一致
    if (graph.nodes.has(componentId)) {
      matched.push(componentId);
    } else {
      // 部分一致: nodeId に componentId が含まれるノードを検索
      for (const nodeId of graph.nodes.keys()) {
        if (nodeId.includes(componentId)) {
          matched.push(nodeId);
        }
      }
    }

    result.set(change.changeId, matched);
  }

  return result;
}

// ── Impact Propagation ────────────────────────────────────────────────────────

export interface PropagateImpactOptions {
  /** BFS の最大深度（デフォルト: 3） */
  maxDepth?: number;
}

/**
 * 指定ノードから BFS で影響範囲を探索し、Impact を返す。
 * T-RE2-007
 *
 * - depth 1 の到達ノード → direct
 * - depth 2 以上の到達ノード → indirect
 * - navigation エッジで到達したノード → navigation にも追加
 * - visited セットで循環を防止
 */
export function propagateImpact(
  changeId: ChangeId,
  startNodeId: string,
  graph: DependencyGraph,
  options: PropagateImpactOptions = {}
): Impact {
  const maxDepth = options.maxDepth ?? 3;
  const direct: string[] = [];
  const indirect: string[] = [];
  const navigation: string[] = [];
  const visited = new Set<string>([startNodeId]);

  // BFS キュー: { nodeId, depth }
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) { continue; }
    const { nodeId, depth } = item;

    if (depth >= maxDepth) { continue; }

    // このノードから出るエッジを探索
    for (const edge of graph.edges) {
      if (edge.from !== nodeId) { continue; }
      const { to, kind } = edge;

      if (visited.has(to)) { continue; }
      visited.add(to);

      const nextDepth = depth + 1;

      if (nextDepth === 1) {
        direct.push(to);
      } else {
        indirect.push(to);
      }

      if (kind === 'navigation') {
        navigation.push(to);
      }

      queue.push({ nodeId: to, depth: nextDepth });
    }
  }

  return { changeId, direct, indirect, navigation };
}

/**
 * Change 配列と DependencyGraph から全 Change の Impact を一括算出する。
 */
export function propagateAllImpacts(
  changes: Change[],
  graph: DependencyGraph,
  options: PropagateImpactOptions = {}
): Impact[] {
  const mapping = mapChangesToNodes(changes, graph);
  const impacts: Impact[] = [];

  for (const change of changes) {
    const nodeIds = mapping.get(change.changeId) ?? [];

    if (nodeIds.length === 0) {
      // マッピングなし → 空 Impact
      impacts.push({ changeId: change.changeId, direct: [], indirect: [], navigation: [] });
      continue;
    }

    // 複数ノードにマッピングされる場合は最初のノードを代表として使用
    const impact = propagateImpact(change.changeId, nodeIds[0], graph, options);
    impacts.push(impact);
  }

  return impacts;
}
