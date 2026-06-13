import type { NodeSnapshot } from '../types'

interface Props {
  node:      NodeSnapshot
  flashKind: 'killed' | 'revived' | 'leader' | undefined
}

const ROLE_COL: Record<string, string> = {
  LEADER:    '#3B82F6',
  CANDIDATE: '#F59E0B',
  FOLLOWER:  '#64748B',
}

/**
 * Stylized server node: rounded card with role-tinted header,
 * a database/disk silhouette icon, big N-id, role label.
 * Designed to read at a glance — not literal but server-themed.
 */
export function ServerIcon({ node, flashKind }: Props) {
  const { alive, role } = node
  const col      = alive ? (ROLE_COL[role] ?? '#64748B') : '#475569'
  const headerH  = 22
  const W = 110, H = 96
  const halfW = W / 2, halfH = H / 2

  return (
    <g>

      {/* Outer breathing aura — leader */}
      {alive && role === 'LEADER' && (
        <rect
          x={-halfW - 10} y={-halfH - 10}
          width={W + 20} height={H + 20}
          rx={16}
          fill="none"
          stroke={col}
          strokeWidth={1.5}
          opacity={0.45}
          className="aura-leader"
        />
      )}

      {/* Spinning dashed border — candidate */}
      {alive && role === 'CANDIDATE' && (
        <rect
          x={-halfW - 5} y={-halfH - 5}
          width={W + 10} height={H + 10}
          rx={13}
          fill="none"
          stroke={col}
          strokeWidth={1.4}
          strokeDasharray="9 5"
          opacity={0.6}
        >
          <animate attributeName="stroke-dashoffset"
            from="0" to="-28" dur="1.2s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Flash ring */}
      {flashKind && (
        <rect
          x={-halfW - 2} y={-halfH - 2}
          width={W + 4} height={H + 4}
          rx={12}
          fill="none" strokeWidth={3}
          className={
            flashKind === 'killed'  ? 'node-kill-ring' :
            flashKind === 'revived' ? 'node-revive-ring' : 'node-leader-ring'
          }
          stroke={
            flashKind === 'killed'  ? '#EF4444' :
            flashKind === 'revived' ? '#8B5CF6' : '#3B82F6'
          }
        />
      )}

      {/* Drop shadow */}
      <rect
        x={-halfW + 2} y={-halfH + 4}
        width={W} height={H}
        rx={10}
        fill="black"
        opacity={alive ? 0.4 : 0.2}
      />

      {/* Card body */}
      <rect
        x={-halfW} y={-halfH}
        width={W} height={H}
        rx={10}
        fill="var(--server-bg)"
        stroke={alive ? col : '#374151'}
        strokeWidth={1.8}
        opacity={alive ? 1 : 0.55}
      />

      {/* Subtle inner highlight (top sheen) */}
      <rect
        x={-halfW + 1.5} y={-halfH + 1.5}
        width={W - 3} height={H / 2 - 5}
        rx={9}
        fill="url(#server-sheen)"
        opacity={alive ? 0.35 : 0.15}
        pointerEvents="none"
      />

      {/* Role header strip */}
      <path
        d={`M${-halfW},${-halfH + headerH}
            L${-halfW},${-halfH + 10}
            Q${-halfW},${-halfH} ${-halfW + 10},${-halfH}
            L${halfW - 10},${-halfH}
            Q${halfW},${-halfH} ${halfW},${-halfH + 10}
            L${halfW},${-halfH + headerH}
            Z`}
        fill={alive ? col : '#1F2937'}
        opacity={alive ? 0.92 : 0.55}
      />

      {/* Header divider */}
      <line
        x1={-halfW + 4} y1={-halfH + headerH}
        x2={halfW - 4}  y2={-halfH + headerH}
        stroke="rgba(0,0,0,0.35)" strokeWidth={1}
      />

      {/* Status LED on header */}
      <circle cx={-halfW + 12} cy={-halfH + 11} r={3.6}
        fill="rgba(255,255,255,0.95)" opacity={alive ? 1 : 0.45}>
        {alive && role === 'LEADER' && (
          <animate attributeName="opacity" values="1;0.45;1" dur="1.4s" repeatCount="indefinite" />
        )}
      </circle>
      {alive && (
        <circle cx={-halfW + 12} cy={-halfH + 11} r={5.5}
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
      )}

      {/* Role label */}
      <text
        x={-halfW + 22} y={-halfH + 15}
        fontSize={11} fontWeight={700}
        fill="white"
        opacity={alive ? 0.95 : 0.5}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.14em"
        style={{ textTransform: 'uppercase', userSelect: 'none' }}
      >
        {alive ? role.toLowerCase() : 'offline'}
      </text>

      {/* ── Body content ─────────────────────────────────────── */}
      {alive ? (
        <g>
          {/* Big node ID */}
          <text
            x={-halfW + 12} y={-halfH + headerH + 28}
            fontSize={22} fontWeight={800}
            fill="var(--text)"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            letterSpacing="-0.5px"
            style={{ userSelect: 'none' }}
          >
            N{node.id}
          </text>

          {/* Server stack icon — right side */}
          <g transform={`translate(${halfW - 26}, ${-halfH + headerH + 12})`}>
            {/* Three rack units */}
            {[0, 1, 2].map(i => (
              <g key={i} transform={`translate(0, ${i * 8})`}>
                <rect width={20} height={6} rx={1.2}
                  fill="var(--server-strip)"
                  stroke={col} strokeWidth={0.7} opacity={0.85} />
                <circle cx={3} cy={3} r={0.9} fill={col} opacity={0.9}>
                  {role === 'LEADER' && (
                    <animate attributeName="opacity"
                      values="0.9;0.3;0.9" dur={`${0.8 + i * 0.3}s`}
                      repeatCount="indefinite" />
                  )}
                </circle>
                <circle cx={6} cy={3} r={0.9} fill={col} opacity={0.5} />
              </g>
            ))}
          </g>

          {/* Term + log stats */}
          <g transform={`translate(${-halfW + 12}, ${halfH - 14})`}>
            <text fontSize={10} fill="var(--text3)"
              fontFamily="ui-monospace, monospace"
              letterSpacing="0.06em"
              style={{ userSelect: 'none' }}>
              term {node.term}
            </text>
            <text x={50} fontSize={10} fill="var(--text3)"
              fontFamily="ui-monospace, monospace"
              letterSpacing="0.06em"
              style={{ userSelect: 'none' }}>
              log {node.log?.length ?? 0}
            </text>
          </g>
        </g>
      ) : (
        <g>
          {/* Offline X across body */}
          <line x1={-halfW + 16} y1={-halfH + headerH + 14}
            x2={halfW - 16}  y2={halfH - 14}
            stroke="#EF4444" strokeWidth={2} opacity={0.5} />
          <line x1={halfW - 16}  y1={-halfH + headerH + 14}
            x2={-halfW + 16} y2={halfH - 14}
            stroke="#EF4444" strokeWidth={2} opacity={0.5} />
          <text
            x={0} y={halfH - 14}
            textAnchor="middle"
            fontSize={10} fill="#EF4444"
            fontFamily="ui-monospace, monospace"
            letterSpacing="0.1em" opacity={0.7}
            style={{ userSelect: 'none' }}
          >
            N{node.id} · offline
          </text>
        </g>
      )}
    </g>
  )
}
