/**
 * Review Engine — DependencyGraph
 * T-RE2-001 / T-RE2-002 / T-RE2-003
 *
 * DSL コンポーネント間の参照関係・layout 階層・navigation flow・template include を
 * グラフとして表現する。
 *
 * NavigationGraph（src/shared/navigation-graph.ts）は画面遷移フロー専用。
 * DependencyGraph はコンポーネント依存関係専用で責務が異なる。
 */

import type { TextUIDSL, ComponentDef } from '../dsl-types';

// ── 型定義 ────────────────────────────────────────────────────────────────────

export type DependencyEdgeKind =
  | 'child'        // 親子関係（layout 階層）
  | 'navigation'   // onClick 等の遷移先参照
  | 'include';     // $include による DSL ファイル参照

export interface DependencyNode {
  /** ノードの一意 ID（例: "screen:home:btn-submit"） */
  nodeId: string;
  /** コンポーネント種別（例: "Button", "Input", "screen"） */
  kind: string;
  /** 画面 ID */
  screenId: string;
  /** 親ノード ID（ルートノードは undefined） */
  parentId?: string;
  /** DSL 上の stable-id（あれば） */
  stableId?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  kind: DependencyEdgeKind;
}

export interface GraphMeta {
  screenCount: number;
  nodeCount: number;
  edgeCount: number;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  /** 親 nodeId → 子 nodeId[] の隣接リスト */
  childrenOf: Map<string, string[]>;
  meta: GraphMeta;
}

// ── DSL → DependencyGraph 変換 ────────────────────────────────────────────────

/** ComponentDef から kind 文字列を取り出す */
function getComponentKind(comp: ComponentDef): string {
  if (typeof comp !== 'object' || comp === null) { return 'Unknown'; }
  const keys = Object.keys(comp);
  return keys[0] ?? 'Unknown';
}

/** ComponentDef から stable-id を取り出す（あれば） */
function getStableId(comp: ComponentDef): string | undefined {
  const kind = getComponentKind(comp);
  const def = (comp as Record<string, unknown>)[kind];
  if (typeof def === 'object' && def !== null) {
    const id = (def as Record<string, unknown>)['id'];
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

/** ComponentDef から onClick 等の navigate 先を取り出す */
function extractNavigationTargets(comp: ComponentDef): string[] {
  const kind = getComponentKind(comp);
  const def = (comp as Record<string, unknown>)[kind];
  if (typeof def !== 'object' || def === null) { return []; }

  const targets: string[] = [];
  const onClick = (def as Record<string, unknown>)['onClick'];
  if (typeof onClick === 'string') {
    // "navigate('/screen-id')" パターンを簡易抽出
    const match = onClick.match(/navigate\(['"]([^'"]+)['"]\)/);
    if (match?.[1]) { targets.push(match[1]); }
  }
  return targets;
}

/** ComponentDef から子コンポーネント配列を取り出す */
function getChildComponents(comp: ComponentDef): ComponentDef[] {
  const kind = getComponentKind(comp);
  const def = (comp as Record<string, unknown>)[kind];
  if (typeof def !== 'object' || def === null) { return []; }

  const children = (def as Record<string, unknown>)['components'];
  if (Array.isArray(children)) { return children as ComponentDef[]; }

  // slot 系（items / fields 等）
  const items = (def as Record<string, unknown>)['items'];
  if (Array.isArray(items)) { return items as ComponentDef[]; }

  return [];
}

/**
 * コンポーネントツリーを再帰的に走査してノード・エッジを収集する。
 * 循環参照は visited セットで防ぐ。
 */
function traverseComponents(
  components: ComponentDef[],
  screenId: string,
  parentId: string,
  nodes: Map<string, DependencyNode>,
  edges: DependencyEdge[],
  childrenOf: Map<string, string[]>,
  visited: Set<string>,
  indexPath: string
): void {
  components.forEach((comp, i) => {
    const kind = getComponentKind(comp);
    const stableId = getStableId(comp);
    const nodeId = stableId
      ? `stable:${screenId}:${kind}:${stableId}`
      : `pos:${screenId}:${indexPath}:${i}`;

    if (visited.has(nodeId)) { return; }
    visited.add(nodeId);

    nodes.set(nodeId, { nodeId, kind, screenId, parentId, stableId });

    // 親子エッジ
    edges.push({ from: parentId, to: nodeId, kind: 'child' });
    const siblings = childrenOf.get(parentId) ?? [];
    siblings.push(nodeId);
    childrenOf.set(parentId, siblings);

    // navigation エッジ
    for (const target of extractNavigationTargets(comp)) {
      const targetNodeId = `screen:${target}:root`;
      edges.push({ from: nodeId, to: targetNodeId, kind: 'navigation' });
    }

    // 子コンポーネントを再帰処理
    const children = getChildComponents(comp);
    if (children.length > 0) {
      childrenOf.set(nodeId, []);
      traverseComponents(children, screenId, nodeId, nodes, edges, childrenOf, visited, `${indexPath}:${i}`);
    }
  });
}

/**
 * TextUIDSL から DependencyGraph を構築する。
 *
 * - page.components の親子関係を child エッジとして表現
 * - onClick の navigate() 参照を navigation エッジとして表現
 * - $include は include エッジとして表現（MVP では文字列検出のみ）
 */
export function buildDependencyGraph(dsl: TextUIDSL): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  const edges: DependencyEdge[] = [];
  const childrenOf = new Map<string, string[]>();
  const visited = new Set<string>();

  // 単一ページ DSL を想定（multi-page は pages[] 拡張で対応）
  const page = dsl.page;
  if (!page) {
    return {
      nodes,
      edges,
      childrenOf,
      meta: { screenCount: 0, nodeCount: 0, edgeCount: 0 }
    };
  }

  const screenId = page.id ?? 'default';
  const rootNodeId = `screen:${screenId}:root`;

  nodes.set(rootNodeId, { nodeId: rootNodeId, kind: 'screen', screenId });
  childrenOf.set(rootNodeId, []);

  const components = page.components ?? [];
  traverseComponents(components, screenId, rootNodeId, nodes, edges, childrenOf, visited, '');

  // $include エッジ（文字列として DSL に含まれる場合）
  // TextUIDSL の $include フィールドは dsl-types で定義されていないため、
  // unknown キャストで安全に取り出す
  const rawIncludes = (dsl as unknown as Record<string, unknown>)['$include'];
  if (Array.isArray(rawIncludes)) {
    for (const inc of rawIncludes) {
      if (typeof inc === 'string') {
        const includeNodeId = `include:${inc}`;
        nodes.set(includeNodeId, { nodeId: includeNodeId, kind: '$include', screenId });
        edges.push({ from: rootNodeId, to: includeNodeId, kind: 'include' });
      }
    }
  }

  return {
    nodes,
    edges,
    childrenOf,
    meta: {
      screenCount: 1,
      nodeCount: nodes.size,
      edgeCount: edges.length
    }
  };
}
