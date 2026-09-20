import type { AnimFrame, CellStatus, GraphEdge, GraphState } from './types';

/** 图遍历：固定的一张无向图，演示 DFS 与 BFS 的访问顺序与辅助结构。 */

export const GRAPH_NODES = [
  { id: 'A', x: 18, y: 14 },
  { id: 'B', x: 48, y: 8 },
  { id: 'C', x: 80, y: 18 },
  { id: 'D', x: 20, y: 52 },
  { id: 'E', x: 52, y: 46 },
  { id: 'F', x: 82, y: 56 },
];

const EDGE_PAIRS: [string, string][] = [
  ['A', 'B'],
  ['A', 'D'],
  ['B', 'C'],
  ['B', 'E'],
  ['C', 'F'],
  ['D', 'E'],
  ['E', 'F'],
];

export type GraphMode = 'dfs' | 'bfs';

export const GRAPH_MODES: { id: GraphMode; label: string; blurb: string }[] = [
  {
    id: 'dfs',
    label: 'DFS',
    blurb: '深度优先：沿一条路走到底再回退，用递归/栈实现，类似树的先序遍历',
  },
  {
    id: 'bfs',
    label: 'BFS',
    blurb: '广度优先：一层一层向外扩展，用队列实现，可求无权图最短路径',
  },
];

/** 邻接表（按字母序，保证遍历顺序确定） */
export function adjacency(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of GRAPH_NODES) map.set(node.id, []);
  for (const [a, b] of EDGE_PAIRS) {
    map.get(a)?.push(b);
    map.get(b)?.push(a);
  }
  for (const list of map.values()) list.sort();
  return map;
}

function baseEdges(): GraphEdge[] {
  return EDGE_PAIRS.map(([from, to]) => ({ from, to }));
}

function graphState(
  visited: Set<string>,
  current: string | null,
  frontier: string[],
  treeEdges: [string, string][],
  order: string[],
  structure: string,
  structureLabel: string,
): GraphState {
  const edges = baseEdges().map((edge) => {
    const used = treeEdges.some(
      ([a, b]) => (a === edge.from && b === edge.to) || (a === edge.to && b === edge.from),
    );
    return { ...edge, status: (used ? 'ok' : 'idle') as CellStatus };
  });
  const nodes = GRAPH_NODES.map((node) => ({
    ...node,
    status: (node.id === current
      ? 'active'
      : visited.has(node.id)
        ? 'done'
        : frontier.includes(node.id)
          ? 'warn'
          : 'idle') as CellStatus,
  }));
  return {
    nodes,
    edges,
    badges: [
      { label: '访问序列', value: order.length ? order.join(' → ') : '（空）', tone: 'good' },
      { label: structureLabel, value: structure || '空' },
      { label: '已访问', value: `${visited.size} / ${GRAPH_NODES.length}` },
    ],
    caption: '绿色节点是已访问、橙色是已进入待访问集合、亮色是当前访问的节点；绿色边是遍历生成的树边。',
  };
}

export function buildGraph(modeId: GraphMode): AnimFrame<GraphState>[] {
  const mode = GRAPH_MODES.find((item) => item.id === modeId) ?? GRAPH_MODES[0];
  const adj = adjacency();
  const frames: AnimFrame<GraphState>[] = [];
  const visited = new Set<string>();
  const order: string[] = [];
  const treeEdges: [string, string][] = [];
  const start = 'A';

  const frontier: string[] = [start];
  frames.push({
    state: graphState(visited, null, frontier, treeEdges, order, start, mode.id === 'dfs' ? '栈' : '队列'),
    note: `${mode.label} 从顶点 ${start} 出发。${mode.blurb}。邻接表中每个顶点的邻接点按字母序排列：${[...adj.entries()]
      .map(([key, list]) => `${key}: ${list.join('')}`)
      .join('，')}。`,
    counters: { 已访问: 0 },
  });

  if (mode.id === 'dfs') {
    // 显式栈的迭代写法，便于逐步展示
    const stack: string[] = [start];
    const inStack = new Set<string>([start]);
    const iterIndex = new Map<string, number>();
    let guard = 0;

    while (stack.length && guard < 60) {
      guard += 1;
      const node = stack[stack.length - 1];
      if (!visited.has(node)) {
        visited.add(node);
        order.push(node);
        if (order.length > 1) treeEdges.push([order[order.length - 2], node]);
        frames.push({
          state: graphState(visited, node, stack.filter((id) => !visited.has(id)), treeEdges, order, stack.join(' > '), '栈（栈底 → 栈顶）'),
          note: `访问 ${node}（第 ${order.length} 个）。已访问序列：${order.join(' → ')}。`,
          counters: { 已访问: visited.size },
        });
      }
      const neighbors = adj.get(node) ?? [];
      const index = iterIndex.get(node) ?? 0;
      const next = neighbors.slice(index).find((id) => !visited.has(id) && !inStack.has(id));
      if (next) {
        iterIndex.set(node, neighbors.indexOf(next) + 1);
        stack.push(next);
        inStack.add(next);
        frames.push({
          state: graphState(visited, node, stack.filter((id) => !visited.has(id)), treeEdges, order, stack.join(' > '), '栈（栈底 → 栈顶）'),
          note: `${node} 还有未访问的邻接点 ${next}，压栈后继续深入。`,
          counters: { 已访问: visited.size },
        });
      } else {
        stack.pop();
        inStack.delete(node);
        frames.push({
          state: graphState(visited, node, stack.filter((id) => !visited.has(id)), treeEdges, order, stack.join(' > ') || '空', '栈（栈底 → 栈顶）'),
          note: `${node} 的邻接点都已访问，回退（出栈）。${stack.length ? `回到 ${stack[stack.length - 1]}。` : '栈已空，遍历结束。'}`,
          counters: { 已访问: visited.size },
        });
      }
    }
  } else {
    const queue: string[] = [start];
    const inQueue = new Set<string>([start]);
    visited.add(start);
    order.push(start);
    frames.push({
      state: graphState(visited, start, queue.filter((id) => !visited.has(id) || id === start), treeEdges, order, queue.join(' > '), '队列（队头 → 队尾）'),
      note: `访问起点 ${start} 并入队。`,
      counters: { 已访问: visited.size },
    });

    let guard = 0;
    while (queue.length && guard < 60) {
      guard += 1;
      const node = queue.shift() as string;
      inQueue.delete(node);
      const neighbors = (adj.get(node) ?? []).filter((id) => !visited.has(id));
      for (const next of neighbors) {
        visited.add(next);
        order.push(next);
        treeEdges.push([node, next]);
        queue.push(next);
        inQueue.add(next);
      }
      frames.push({
        state: graphState(visited, node, queue, treeEdges, order, queue.join(' > ') || '空', '队列（队头 → 队尾）'),
        note: neighbors.length
          ? `${node} 出队，把它的未访问邻接点 ${neighbors.join('、')} 依次入队。访问序列：${order.join(' → ')}。`
          : `${node} 出队，没有未访问的邻接点。访问序列：${order.join(' → ')}。`,
        counters: { 已访问: visited.size },
      });
    }
  }

  const finalState = graphState(visited, null, [], treeEdges, order, '', mode.id === 'dfs' ? '栈' : '队列');
  finalState.badges = [
    { label: '访问序列', value: order.join(' → '), tone: 'good' },
    { label: '树边数', value: String(treeEdges.length) },
    { label: '已访问', value: `${visited.size} / ${GRAPH_NODES.length}` },
  ];
  frames.push({
    state: finalState,
    note: `${mode.label} 遍历完成，访问序列：${order.join(' → ')}，共 ${treeEdges.length} 条树边（生成树）。${
      mode.id === 'bfs'
        ? 'BFS 的访问顺序天然是按层扩展的，因此可以求无权图的最短路径长度。'
        : 'DFS 类似树的先序遍历，可用于连通性判断与拓扑排序（有向无环图）。'
    }`,
    counters: { 已访问: visited.size, 树边: treeEdges.length },
  });

  return frames;
}
