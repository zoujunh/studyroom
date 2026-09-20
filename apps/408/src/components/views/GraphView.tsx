import { RichText } from '../Markdown';
import { BadgeRow } from './MatrixView';
import type { CellStatus, GraphState } from '../../visual/types';

const NODE_FILL: Record<CellStatus, string> = {
  idle: 'var(--color-surface-2)',
  active: 'var(--color-brand)',
  ok: 'var(--color-good)',
  warn: 'var(--color-hard)',
  bad: 'var(--color-again)',
  done: 'var(--color-brand-dark)',
};

const EDGE_COLOR: Record<CellStatus, string> = {
  idle: 'var(--color-line)',
  active: 'var(--color-brand)',
  ok: 'var(--color-good)',
  warn: 'var(--color-hard)',
  bad: 'var(--color-again)',
  done: 'var(--color-brand-dark)',
};

/** 图遍历可视化：固定坐标的无向图 + 访问状态着色。 */
export function GraphView({ state }: { state: GraphState }) {
  const nodeMap = new Map(state.nodes.map((node) => [node.id, node]));

  return (
    <div className="space-y-3">
      <BadgeRow badges={state.badges} />

      <div className="rounded-xl border border-line bg-surface-2/50 p-2">
        <svg viewBox="0 0 100 70" className="h-[210px] w-full">
          {/* 边 */}
          {state.edges.map((edge, index) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const active = edge.status && edge.status !== 'idle';
            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={EDGE_COLOR[edge.status ?? 'idle']}
                  strokeWidth={active ? 1.4 : 0.8}
                />
                {edge.weight !== undefined ? (
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 1.2}
                    fontSize="3.4"
                    textAnchor="middle"
                    fill="var(--color-ink-3)"
                  >
                    {edge.weight}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* 节点 */}
          {state.nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={5}
                fill={NODE_FILL[node.status ?? 'idle']}
                stroke="var(--color-surface)"
                strokeWidth={0.8}
              />
              <text
                x={node.x}
                y={node.y + 1.4}
                fontSize="4.4"
                textAnchor="middle"
                fill={node.status && node.status !== 'idle' ? '#ffffff' : 'var(--color-ink)'}
                fontWeight="600"
              >
                {node.label ?? node.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {state.caption ? (
        <p className="text-[11.5px] leading-relaxed text-ink-3">
          <RichText source={state.caption} />
        </p>
      ) : null}
    </div>
  );
}
